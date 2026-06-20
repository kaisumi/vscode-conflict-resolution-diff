import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const maxGitOutputBuffer = 10 * 1024 * 1024;

interface TextDocumentContent {
  content: string;
  language: string;
}

interface ShowTextDocumentOptions {
  preview: boolean;
}

interface ConflictResolutionDiffDependencies<TDocument = unknown> {
  getWorkspaceFolderPath: () => string | undefined;
  runGit: (args: string[], cwd: string) => Promise<string>;
  openTextDocument: (content: TextDocumentContent) => Promise<TDocument>;
  showTextDocument: (document: TDocument, options: ShowTextDocumentOptions) => Promise<void>;
  showErrorMessage: (message: string) => void;
  showInputBox: (options: vscode.InputBoxOptions) => Promise<string | undefined>;
}

const defaultDependencies: ConflictResolutionDiffDependencies<vscode.TextDocument> = {
  getWorkspaceFolderPath: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  runGit: async (args, cwd) => {
    const { stdout } = await execFileAsync(
      'git',
      args,
      {
        cwd,
        maxBuffer: maxGitOutputBuffer,
      }
    );

    return stdout;
  },
  openTextDocument: (content) => Promise.resolve(vscode.workspace.openTextDocument(content)),
  showTextDocument: async (document, options) => {
    await vscode.window.showTextDocument(document, options);
  },
  showErrorMessage: (message) => {
    vscode.window.showErrorMessage(message);
  },
  showInputBox: (options) => Promise.resolve(vscode.window.showInputBox(options)),
};

class ActionsTreeDataProvider implements vscode.TreeDataProvider<never> {
  getTreeItem(): vscode.TreeItem {
    throw new Error('This view does not provide tree items.');
  }

  getChildren(): never[] {
    return [];
  }
}

async function showDiffDocument<TDocument>(
  dependencies: ConflictResolutionDiffDependencies<TDocument>,
  stdout: string
) {
  const document = await dependencies.openTextDocument({
    content: stdout || 'No diff found.',
    language: 'diff',
  });

  await dependencies.showTextDocument(document, {
    preview: false,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function showUncommittedResolutionDiff<TDocument = unknown>(
  dependencies: ConflictResolutionDiffDependencies<TDocument> = defaultDependencies as unknown as ConflictResolutionDiffDependencies<TDocument>
) {
  const workspaceFolderPath = dependencies.getWorkspaceFolderPath();

  if (!workspaceFolderPath) {
    dependencies.showErrorMessage('Open a workspace folder first.');
    return;
  }

  try {
    const stdout = await dependencies.runGit(['diff', 'AUTO_MERGE'], workspaceFolderPath);

    await showDiffDocument(dependencies, stdout);
  } catch (error) {
    dependencies.showErrorMessage(`Failed to run git diff AUTO_MERGE: ${getErrorMessage(error)}`);
  }
}

export async function showResolvedConflictDiff<TDocument = unknown>(
  dependencies: ConflictResolutionDiffDependencies<TDocument> = defaultDependencies as unknown as ConflictResolutionDiffDependencies<TDocument>
) {
  const workspaceFolderPath = dependencies.getWorkspaceFolderPath();

  if (!workspaceFolderPath) {
    dependencies.showErrorMessage('Open a workspace folder first.');
    return;
  }

  const commit = await dependencies.showInputBox({
    prompt: 'Show resolved conflict diff for merge commit',
    placeHolder: 'merge commit hash, e.g. abc1234',
  });

  if (!commit) {
    return;
  }

  try {
    const stdout = await dependencies.runGit(
      ['show', '--remerge-diff', '--format=', '--no-color', commit],
      workspaceFolderPath
    );

    await showDiffDocument(dependencies, stdout);
  } catch (error) {
    dependencies.showErrorMessage(`Failed to run: ${getErrorMessage(error)}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'conflict-resolution-diff.actions',
      new ActionsTreeDataProvider()
    )
  );

  const disposable = vscode.commands.registerCommand(
    'conflict-resolution-diff.showUncommittedResolutionDiff',
    () => showUncommittedResolutionDiff()
  );

  context.subscriptions.push(disposable);


  const disposable2 = vscode.commands.registerCommand(
    'conflict-resolution-diff.showResolvedConflictDiff',
    () => showResolvedConflictDiff()
  );
  context.subscriptions.push(disposable2);
}

export function deactivate() {}
