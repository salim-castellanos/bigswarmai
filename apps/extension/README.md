# BigSwarmAI

Multi-agent research inside the folder you have open. An orchestrator splits the objective. Agents read your files, share a finding while they work, and leave a cited report. No extra API key: it uses the chat models VS Code already has.

Investigación con varios agentes en la carpeta abierta. Un orquestador reparte el objetivo. Los agentes leen tus archivos, comparten un hallazgo mientras trabajan y dejan un informe con fuentes. Sin otra clave: usa los modelos que VS Code ya tiene.

## Requirements

- VS Code 1.95 or newer.
- A chat model available in VS Code.
- A folder to open. That folder is the problem you want the swarm to work on.

## Use

1. Open a folder and select BigSwarmAI in the activity bar.
2. **Initialize folder** the first time.
3. **Connect**. Load the models, choose the orchestrator and the agents, then **Save** and **Test**.
4. **+ Objective** for a principal objective, or a sub-objective under a parent.
5. Select the node. Keep the strategy as `board`, set the agent count, and press **Start**.
6. **Discoveries**, **Log**, and **Result** each open an editor tab. The lightbulb is Discoveries, the lines are Log, and the check is Result.

**Start** skips a node that already has a result. **Run again** repeats the selected node. **Stop** ends the run that is going. A green dot is a current result. An amber dot means the objective text changed after that result.

## What the folder keeps

| Path | What it is |
| --- | --- |
| `.bigswarm/objectives.json` | The objective tree. |
| `.bigswarm/events/` | Discoveries: claim, why it matters, source. |
| `.bigswarm/results/` | The conclusion of each run. |
| `.bigswarm/log.json` | The log, oldest first. It survives a reload. |

## Develop

The extension lives in `apps/extension` and reads the folder through `apps/desktop/src/workspace.ts`.

```bash
cd apps/extension
npm install
npm run compile
```

Press F5 from `apps/extension`. The launch name is **BigSwarmAI**.

## License

MIT
