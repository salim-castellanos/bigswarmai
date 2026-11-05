# BigSwarmAI

**English** | [Español](./README.es.md)

VS Code extension for multi-agent research in the folder you have open. An orchestrator assigns the work. Agents read your files, share a finding while they work, and leave a cited report.

The extension does not ask for an API key. It uses the models you already connected in VS Code.

## What you do with it

- Initialize the open folder. BigSwarmAI writes a small `.bigswarm` directory and a section in `AGENTS.md`.
- Pick two models: one for the orchestrator, one for the agents.
- Write a principal objective and hang sub-objectives under it.
- Start a node. Finished nodes are skipped. **Run again** repeats the one you selected.
- Read **Discoveries**, **Log**, and **Result** in their own editor tabs.
- **Stop** a run while it is going.

A green dot means that node already has a result. An amber dot means the objective text changed after that result, so the next **Start** runs it again.

## Requirements

- VS Code 1.95 or newer.
- At least one chat model available to VS Code (for example GitHub Copilot, or another model you added in the editor).
- A folder to open. That folder is the problem, not the source of this extension.

## Install from source

```bash
git clone https://github.com/salim-castellanos/bigswarmai.git
cd bigswarmai/apps/extension
npm install
npm run compile
```

Open `apps/extension` in VS Code and press F5. The launch configuration is **BigSwarmAI**.

To build a VSIX on Node 20:

```bash
npx --yes @vscode/vsce@2.32.0 package --allow-missing-repository --skip-license
```

Then install that file from the Extensions view: **Install from VSIX**.

## Use it

1. Open a folder and select the BigSwarmAI icon in the activity bar.
2. If the folder is new, choose **Initialize folder**.
3. **Connect**. Load the VS Code models, choose the orchestrator and the agents, **Save**, then **Test**.
4. **+ Objective**. Write what you want to achieve. Leave the parent empty for a principal objective, or pick a parent for a sub-objective.
5. Select the node in the tree. Set the strategy to `board` and the number of agents. **Start**.
6. Open **Discoveries**, **Log**, or **Result**. Each button opens an editor tab. **Log** also opens when a run starts, and **Result** opens when it finishes.

The only strategy that runs today is `board`. The orchestrator decides which direct sub-objectives are still needed, which can run together, and which must wait.

## The folder

| Path | What it is |
| --- | --- |
| `.bigswarm/workspace.json` | Marks the folder as a BigSwarmAI workspace. |
| `.bigswarm/objectives.json` | The objective tree: text, parent, strategy, agent count. |
| `.bigswarm/objective.md` | The principal objective, as plain text. |
| `.bigswarm/events/*.json` | One discovery per file: claim, why it matters, source. |
| `.bigswarm/results/<objective-id>/` | Each run, as JSON and Markdown. |
| `.bigswarm/log.json` | The run log, oldest first. It stays after you reload the window. |
| `AGENTS.md` | A section between `<!-- bigswarm:start -->` and `<!-- bigswarm:end -->`. The rest of the file is left as it was. |

Model ids are stored in the extension, not in the folder.

## Repository

| Path | What it is |
| --- | --- |
| `apps/extension` | The VS Code extension. |
| `apps/desktop/src/workspace.ts` | Folder memory used by the extension. |
| `docs/` | Product notes in Spanish: idea, screens, backlog. |

## License

[MIT](./LICENSE)
