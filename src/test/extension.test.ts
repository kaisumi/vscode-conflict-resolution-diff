import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  activate,
  showResolvedConflictDiff,
  showUncommittedResolutionDiff,
} from '../extension';

interface TestDocument {
  content: string;
  language: string;
}

function createDependencies(overrides: {
  workspaceFolderPath?: string;
  gitStdout?: string;
  gitError?: unknown;
  inputValue?: string;
} = {}) {
  const calls = {
    runGit: [] as Array<{ args: string[]; cwd: string }>,
    openTextDocument: [] as TestDocument[],
    showTextDocument: [] as Array<{ document: TestDocument; options: { preview: boolean } }>,
    showErrorMessage: [] as string[],
    showInputBox: [] as vscode.InputBoxOptions[],
  };

  const dependencies = {
    getWorkspaceFolderPath: () => overrides.workspaceFolderPath,
    runGit: async (args: string[], cwd: string) => {
      calls.runGit.push({ args, cwd });

      if (overrides.gitError) {
        throw overrides.gitError;
      }

      return overrides.gitStdout ?? 'diff --git a/file.txt b/file.txt';
    },
    openTextDocument: async (document: TestDocument) => {
      calls.openTextDocument.push(document);
      return document;
    },
    showTextDocument: async (document: TestDocument, options: { preview: boolean }) => {
      calls.showTextDocument.push({ document, options });
    },
    showErrorMessage: (message: string) => {
      calls.showErrorMessage.push(message);
    },
    showInputBox: async (options: vscode.InputBoxOptions) => {
      calls.showInputBox.push(options);
      return overrides.inputValue;
    },
  };

  return { calls, dependencies };
}

suite('Extension Test Suite', () => {
  test('showUncommittedResolutionDiff shows an error without a workspace folder', async () => {
    const { calls, dependencies } = createDependencies();

    await showUncommittedResolutionDiff(dependencies);

    assert.deepStrictEqual(calls.showErrorMessage, ['Open a workspace folder first.']);
    assert.strictEqual(calls.runGit.length, 0);
    assert.strictEqual(calls.openTextDocument.length, 0);
  });

  test('showUncommittedResolutionDiff runs git diff AUTO_MERGE and opens a diff document', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      gitStdout: 'diff --git a/file.txt b/file.txt\n',
    });

    await showUncommittedResolutionDiff(dependencies);

    assert.deepStrictEqual(calls.runGit, [
      { args: ['diff', '--no-ext-diff', '--no-textconv', '--no-color', 'AUTO_MERGE'], cwd: '/workspace' },
    ]);
    assert.deepStrictEqual(calls.openTextDocument, [
      { content: 'diff --git a/file.txt b/file.txt\n', language: 'diff' },
    ]);
    assert.deepStrictEqual(calls.showTextDocument, [
      {
        document: { content: 'diff --git a/file.txt b/file.txt\n', language: 'diff' },
        options: { preview: false },
      },
    ]);
  });

  test('showUncommittedResolutionDiff shows fallback text when git returns empty stdout', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      gitStdout: '',
    });

    await showUncommittedResolutionDiff(dependencies);

    assert.deepStrictEqual(calls.openTextDocument, [
      { content: 'No diff found.', language: 'diff' },
    ]);
  });

  test('showUncommittedResolutionDiff reports git errors', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      gitError: new Error('bad revision AUTO_MERGE'),
    });

    await showUncommittedResolutionDiff(dependencies);

    assert.deepStrictEqual(calls.showErrorMessage, [
      'Failed to run git diff AUTO_MERGE: bad revision AUTO_MERGE',
    ]);
    assert.strictEqual(calls.openTextDocument.length, 0);
  });

  test('showResolvedConflictDiff shows an error without a workspace folder', async () => {
    const { calls, dependencies } = createDependencies({
      inputValue: 'abc1234',
    });

    await showResolvedConflictDiff(dependencies);

    assert.deepStrictEqual(calls.showErrorMessage, ['Open a workspace folder first.']);
    assert.strictEqual(calls.showInputBox.length, 0);
    assert.strictEqual(calls.runGit.length, 0);
  });

  test('showResolvedConflictDiff rejects invalid commit input', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      inputValue: '--help',
    });

    await showResolvedConflictDiff(dependencies);

    assert.deepStrictEqual(calls.showErrorMessage, ['Enter a valid commit SHA.']);
    assert.strictEqual(calls.runGit.length, 0);
    assert.strictEqual(calls.openTextDocument.length, 0);
  });

  test('showResolvedConflictDiff runs git show remerge diff for the entered commit', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      inputValue: 'abc1234',
      gitStdout: 'diff --git a/resolved.txt b/resolved.txt\n',
    });

    await showResolvedConflictDiff(dependencies);

    assert.deepStrictEqual(calls.showInputBox, [
      {
        prompt: 'Paste a merge commit SHA',
        placeHolder: 'merge commit hash, e.g. abc1234',
      },
    ]);
    assert.deepStrictEqual(calls.runGit, [
      {
        args: ['show', '--no-ext-diff', '--no-textconv', '--remerge-diff', '--format=', '--no-color', 'abc1234'],
        cwd: '/workspace',
      },
    ]);
    assert.deepStrictEqual(calls.openTextDocument, [
      { content: 'diff --git a/resolved.txt b/resolved.txt\n', language: 'diff' },
    ]);
    assert.deepStrictEqual(calls.showTextDocument, [
      {
        document: { content: 'diff --git a/resolved.txt b/resolved.txt\n', language: 'diff' },
        options: { preview: false },
      },
    ]);
  });

  test('showResolvedConflictDiff does nothing when commit input is cancelled', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
    });

    await showResolvedConflictDiff(dependencies);

    assert.strictEqual(calls.showInputBox.length, 1);
    assert.strictEqual(calls.runGit.length, 0);
    assert.strictEqual(calls.openTextDocument.length, 0);
    assert.strictEqual(calls.showTextDocument.length, 0);
  });

  test('showResolvedConflictDiff shows fallback text when git returns empty stdout', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      inputValue: 'abc1234',
      gitStdout: '',
    });

    await showResolvedConflictDiff(dependencies);

    assert.deepStrictEqual(calls.openTextDocument, [
      { content: 'No diff found.', language: 'diff' },
    ]);
  });

  test('showResolvedConflictDiff reports git errors', async () => {
    const { calls, dependencies } = createDependencies({
      workspaceFolderPath: '/workspace',
      inputValue: 'abc1234',
      gitError: new Error('not a merge commit'),
    });

    await showResolvedConflictDiff(dependencies);

    assert.deepStrictEqual(calls.showErrorMessage, [
      'Failed to run: not a merge commit',
    ]);
    assert.strictEqual(calls.openTextDocument.length, 0);
  });

  test('activate registers contributed commands and the actions tree provider', async () => {
    const subscriptions: Array<{ dispose(): unknown }> = [];
    const context = { subscriptions } as vscode.ExtensionContext;

    activate(context);

    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes('conflict-resolution-diff.showUncommittedResolutionDiff'));
    assert.ok(commands.includes('conflict-resolution-diff.showResolvedConflictDiff'));
    assert.ok(subscriptions.length >= 3);
  });
});
