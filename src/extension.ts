import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'conflict-resolution-diff.showAutoMergeDiff',
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return;
      }

      try {
        const { stdout } = await execFileAsync(
          'git',
          ['diff', 'AUTO_MERGE'],
          {
            cwd: workspaceFolder.uri.fsPath,
            maxBuffer: 10 * 1024 * 1024,
          }
        );

        const document = await vscode.workspace.openTextDocument({
          content: stdout || 'No diff found.',
          language: 'diff',
        });

        await vscode.window.showTextDocument(document, {
          preview: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to run git diff AUTO_MERGE: ${message}`);
      }
    }
  );

  context.subscriptions.push(disposable);


  const disposable2 = vscode.commands.registerCommand(
    'conflict-resolution-diff.showResolvedConflictDiff',
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return;
      }
      const commit = await vscode.window.showInputBox({
        prompt: 'Show resolved conflict diff for merge commit',
        placeHolder: 'merge commit hash, e.g. abc1234',
      });

      try {
        const { stdout } = await execFileAsync(
          'git',
          ['show', '--remerge-diff', '--format=', '--no-color', `${commit}`],
          {
            cwd: workspaceFolder.uri.fsPath,
            maxBuffer: 10 * 1024 * 1024,
          }
        );

        const document = await vscode.workspace.openTextDocument({
          content: stdout || 'No diff found.',
          language: 'diff',
        });

        await vscode.window.showTextDocument(document, {
          preview: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to run: ${message}`);
      }
    }
  );
}

export function deactivate() {}
