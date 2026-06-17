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
}

export function deactivate() {}
