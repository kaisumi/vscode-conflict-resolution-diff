# Conflict Resolution Diff

Conflict Resolution Diff is a Visual Studio Code extension for viewing Git conflict resolution diffs.

It helps you review what was changed while resolving merge conflicts, without manually typing Git commands every time.

## Features

- Show the diff of changes made while resolving an ongoing merge conflict.
- Show the conflict resolution diff for a merge commit.
- Open the result inside Visual Studio Code.

This extension is intended for developers who want to review conflict resolution changes separately from the full branch diff.

## How it works

When you are resolving a merge conflict, the extension uses Git's `AUTO_MERGE` reference to show the changes made during conflict resolution.

For an already-created merge commit, the extension uses Git's remerge diff output.

## Usage

Open the Conflict Resolution Diff view from the Activity Bar and run one of the available actions.

### Show unresolved conflict resolution diff

Use this while you are in the middle of resolving a merge conflict.

The extension shows the diff between the current working tree and Git's `AUTO_MERGE` reference.

### Show resolved conflict diff

Use this for a merge commit after conflict resolution has already been committed.

Enter the target merge commit when prompted, and the extension shows the remerge diff output for that commit.

## Requirements

- Visual Studio Code
- Git
- A Git repository
- For current conflict resolution diffs, the repository must be in a merge conflict resolution state.
- For resolved conflict diffs, the target commit must be a merge commit.

## Limitations

This is an initial version.

The extension currently focuses on showing conflict resolution diffs. The following features are not included yet:

- Split editor diff view
- Selecting merge commits from a list
- Advanced filtering by file

## Why this extension?

During code review, it is often useful to check only the changes that were introduced while resolving a conflict.

Git already provides commands for this, but they are not easy to discover or run repeatedly from inside the editor. This extension makes that workflow available from VS Code.

## Release Notes

### 0.0.1

Initial release.

- Show conflict resolution diff during an ongoing merge conflict.
- Show remerge diff for a merge commit.
