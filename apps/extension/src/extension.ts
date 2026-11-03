import * as vscode from "vscode";
import {
  addDiscovery,
  addObjective,
  connectionReady,
  deleteObjective,
  isInitialized,
  openWorkspace,
  readEvents,
  readObjectives,
  updateObjective,
  writeRunResult,
  objectiveHasResult,
  latestRun,
  listRuns,
  timelineInstant,
  readLog,
  appendLog,
  resultIsStale,
  WorkspaceError,
  type Discovery,
  type ListedModel,
  type ObjectiveNode,
} from "../../desktop/src/workspace.ts";

const ORCH = "bigswarm.orchestratorModelId";
const AGENT = "bigswarm.agentModelId";
const ORCH_LABEL = "bigswarm.orchestratorLabel";
const AGENT_LABEL = "bigswarm.agentLabel";
const VERIFIED = "bigswarm.verified";

type State = {
  folder: string | null;
  initialized: boolean;
  objectives: ObjectiveNode[];
  events: Discovery[];
  orchestratorId: string;
  agentId: string;
  orchestratorLabel: string;
  agentLabel: string;
  ready: boolean;
  message: string;
};

let models: ListedModel[] = [];
const sideViews: { refresh: () => void }[] = [];

type FeedLine = { t: number; at: string; who: string; text: string };
const feed: FeedLine[] = [];
const doing: Record<string, string> = {};
let runControl: { token: vscode.CancellationTokenSource; stopped: boolean } | null = null;

class RunStopped extends Error {
  constructor() {
    super("Stopped");
    this.name = "RunStopped";
  }
}

function stamp(t: number): string {
  const date = new Date(t);
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function trace(who: string, text: string): void {
  const t = Date.now();
  const line = { t, at: stamp(t), who, text };
  doing[who] = text;
  feed.push(line);
  if (feed.length > 200) feed.shift();
  const root = rootPath();
  if (root && isInitialized(root)) {
    try {
      appendLog(root, line);
    } catch {
      /* la línea sigue en memoria */
    }
  }
  for (const view of sideViews) view.refresh();
}

function loadFeed(): void {
  feed.length = 0;
  const root = rootPath();
  if (!root || !isInitialized(root)) return;
  for (const line of readLog(root)) feed.push(line);
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new PanelProvider(context);
  sideViews.push(provider);
  loadFeed();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("bigswarm.panel", provider),
    vscode.commands.registerCommand("bigswarm.openConnection", () => openConnection(context, provider)),
    vscode.commands.registerCommand("bigswarm.openAssistant", () => openAssistant(context, provider)),
    vscode.commands.registerCommand("bigswarm.showFindings", () => findingsTab.open(context, true)),
    vscode.commands.registerCommand("bigswarm.showLog", () => nowTab.open(context, true)),
    vscode.commands.registerCommand("bigswarm.showResult", () => resultTab.open(context, true)),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      loadFeed();
      provider.refresh();
    }),
  );
}

export function deactivate(): void {}

function rootPath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const files = folders.filter((folder) => folder.uri.scheme === "file");
  const initialized = files.find((folder) => isInitialized(folder.uri.fsPath));
  return (initialized ?? files[0])?.uri.fsPath;
}

function saved(context: vscode.ExtensionContext): {
  orchestratorId: string;
  agentId: string;
  orchestratorLabel: string;
  agentLabel: string;
} {
  return {
    orchestratorId: context.globalState.get<string>(ORCH) ?? "",
    agentId: context.globalState.get<string>(AGENT) ?? "",
    orchestratorLabel: context.globalState.get<string>(ORCH_LABEL) ?? "",
    agentLabel: context.globalState.get<string>(AGENT_LABEL) ?? "",
  };
}

function isReady(context: vscode.ExtensionContext): boolean {
  const choice = saved(context);
  return Boolean(choice.orchestratorId && choice.agentId && context.globalState.get<boolean>(VERIFIED) === true);
}

function snapshot(context: vscode.ExtensionContext, message = ""): State {
  const root = rootPath();
  const choice = saved(context);
  if (!root) {
    return {
      folder: null,
      initialized: false,
      objectives: [],
      events: [],
      ...choice,
      ready: false,
      message: message || "Open a folder in the IDE.",
    };
  }
  const initialized = isInitialized(root);
  return {
    folder: root,
    initialized,
    objectives: initialized ? readObjectives(root) : [],
    events: initialized ? readEvents(root) : [],
    ...choice,
    ready: isReady(context),
    message,
  };
}

class PanelProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.onDidChangeVisibility(() => {
      if (view.visible) this.refresh();
    });
    view.webview.onDidReceiveMessage((message) => this.onMessage(message));
    this.refresh();
  }

  refresh(message = ""): void {
    if (this.view) {
      const state = snapshot(this.context, message);
      this.view.webview.html = panelHtml(state);
    }
    for (const view of sideViews) {
      if (view !== this) view.refresh();
    }
    nowTab.update(this.context);
    resultTab.update(this.context);
    findingsTab.update(this.context);
  }

  private async onMessage(message: { type: string; source?: string; id?: string; strategyId?: string; agentCount?: number; again?: boolean }): Promise<void> {
    const root = rootPath();
    try {
      if (message.type === "stop") {
        if (runControl) {
          runControl.stopped = true;
          runControl.token.cancel();
          this.refresh("Stopping…");
        }
        return;
      }
      if (message.type === "init") {
        if (!root) return;
        openWorkspace(root);
        this.refresh("Folder initialized.");
        return;
      }
      if (message.type === "connect") {
        openConnection(this.context, this);
        return;
      }
      if (message.type === "assistant") {
        openAssistant(this.context, this, message.id);
        return;
      }
      if (message.type === "edit" && message.id) {
        openAssistant(this.context, this, undefined, message.id);
        return;
      }
      if (message.type === "delete" && root && message.id) {
        const picked = await vscode.window.showWarningMessage(
          "Delete this objective and the sub-objectives under it?",
          { modal: true },
          "Delete",
        );
        if (picked !== "Delete") return;
        deleteObjective(root, message.id);
        this.refresh("Objective deleted.");
        return;
      }
      if (message.type === "showNow") {
        nowTab.open(this.context, true);
        return;
      }
      if (message.type === "showResult") {
        resultTab.open(this.context, true);
        return;
      }
      if (message.type === "showFindings") {
        findingsTab.open(this.context, true);
        return;
      }
      if (message.type === "open" && root && message.source) {
        const target = vscode.Uri.joinPath(vscode.Uri.file(root), message.source);
        try {
          await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(target));
        } catch {
          this.refresh("That source is not a file in the folder.");
        }
        return;
      }
      if (message.type === "saveNode" && root && message.id) {
        updateObjective(root, message.id, {
          strategyId: message.strategyId,
          agentCount: Number(message.agentCount),
        });
        this.refresh("Node saved.");
        return;
      }
      if (message.type === "start" && root && message.id) {
        await startNode(this.context, this, root, message.id, message.strategyId, Number(message.agentCount), Boolean(message.again));
      }
    } catch (error) {
      this.refresh(error instanceof WorkspaceError ? error.message : "Could not write the folder.");
    }
  }
}

function themeCss(): string {
  return `body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: transparent; }
  button, input, select, textarea { font: inherit; }
  button { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); border: none; border-radius: 2px; padding: 3px 8px; cursor: pointer; }
  button.primary { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
  input, select, textarea { color: var(--vscode-input-foreground, var(--vscode-foreground)); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); border-radius: 2px; box-sizing: border-box; }
  .hint { opacity: 0.75; margin: 0; }
  .card { border: 1px solid var(--vscode-widget-border, rgba(128,128,128,.35)); border-radius: 6px; padding: 8px 10px; margin: 0 0 8px; }
  .card header { display: flex; gap: 8px; align-items: baseline; font-size: 11px; opacity: 0.75; margin-bottom: 4px; }
  .badge { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 8px; padding: 0 6px; }
  .log { list-style: none; margin: 0; padding: 0; }
  .log li { padding: 5px 0; border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,.25)); font-size: 12px; line-height: 1.45; }
  .log time { font-family: var(--vscode-editor-font-family, monospace); opacity: 0.7; margin-right: 6px; }
  .log .who { font-weight: 600; margin-right: 6px; }`;
}

function panelHtml(state: State): string {
  const catalog = state.objectives.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    text: node.text,
    strategyId: node.strategyId,
    agentCount: node.agentCount,
    t: timelineInstant(node),
    done: state.folder ? objectiveHasResult(state.folder, node.id) : false,
    stale: state.folder ? resultIsStale(state.folder, node) : false,
  }));
  const ids = new Set(catalog.map((node) => node.id));
  const byParent = new Map<string | null, typeof catalog>();
  for (const node of catalog) {
    const parent = node.parentId && ids.has(node.parentId) ? node.parentId : null;
    const list = byParent.get(parent) ?? [];
    list.push(node);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.t - b.t);
  const branch = (parent: string | null): string => {
    const list = byParent.get(parent) ?? [];
    if (!list.length) return "";
    return `<ul>${list
      .map((node) => {
        const children = byParent.get(node.id) ?? [];
        const twist = children.length
          ? `<button type="button" class="twist" data-twist="${escapeHtml(node.id)}" aria-label="Collapse">−</button>`
          : `<span class="twist"></span>`;
        const mark = node.stale ? " stale" : node.done ? " done" : "";
        const markTitle = node.stale ? "Objective changed since this result" : node.done ? "Has a result" : "No result yet";
        return `<li data-node="${escapeHtml(node.id)}"><div class="row" role="treeitem" tabindex="0" data-id="${escapeHtml(node.id)}" title="${escapeHtml(node.text)}">${twist}<span class="label">${escapeHtml(node.text)}</span><span class="mark${mark}" title="${markTitle}"></span></div>${children.length ? `<div class="kids">${branch(node.id)}</div>` : ""}</li>`;
      })
      .join("")}</ul>`;
  };
  const tree = branch(null);
  const ready = state.folder && state.initialized;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<style>
  ${themeCss()}
  html, body { height: 100%; margin: 0; }
  body { padding: 8px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; gap: 8px; min-width: 0; }
  .banner { margin: 0; font-size: 12px; }
  .toolbar { display: flex; align-items: center; gap: 6px; }
  .spacer { flex: 1; }
  .status { display: flex; align-items: center; gap: 6px; font-size: 11px; opacity: 0.85; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-testing-iconPassed, #89d185); flex: 0 0 8px; }
  .dot.warn { background: var(--vscode-editorWarning-foreground, #cca700); }
  .toolbar button { padding: 2px 8px; }
  .scroll { flex: 1; min-height: 0; min-width: 0; overflow-x: hidden; overflow-y: auto; }
  .tree, .tree ul, .tree li, .kids, .row { min-width: 0; max-width: 100%; box-sizing: border-box; }
  .tree, .tree ul { list-style: none; margin: 0; padding: 0; width: 100%; }
  .kids { margin: 0; padding-left: 16px; border-left: 1px solid var(--vscode-tree-indentGuidesStroke, rgba(128,128,128,.45)); }
  .row { width: 100%; display: flex; align-items: flex-start; gap: 6px; text-align: left; background: transparent; color: inherit; border: none; border-radius: 4px; padding: 3px 4px; cursor: pointer; overflow: hidden; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row.selected { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  span.twist { width: 14px; height: 14px; flex: 0 0 14px; }
  button.twist { width: 14px; height: 14px; margin-top: 2px; flex: 0 0 14px; padding: 0; border: 1px solid var(--vscode-tree-indentGuidesStroke, rgba(128,128,128,.8)); border-radius: 2px; background: transparent; color: inherit; font-family: var(--vscode-editor-font-family, Consolas, monospace); font-size: 12px; line-height: 12px; }
  .label { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .mark { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex: 0 0 6px; background: var(--vscode-disabledForeground); opacity: 0.45; }
  .opens { display: flex; gap: 4px; min-width: 0; }
  .opens button { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 11px; line-height: 1.15; padding: 6px 2px; text-align: center; }
  .opens svg { width: 16px; height: 16px; flex: 0 0 16px; }
  .opens span { max-width: 100%; }
  .mark.done { background: var(--vscode-testing-iconPassed, #89d185); opacity: 1; }
  .mark.stale { background: var(--vscode-editorWarning-foreground, #cca700); opacity: 1; }
  .inspector { flex-shrink: 0; border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,.35)); padding-top: 8px; }
  .inspector h2 { font-size: 12px; font-weight: 600; margin: 0 0 8px; line-height: 1.35; }
  .fields { display: flex; gap: 8px; }
  .fields label { flex: 1; font-size: 11px; display: flex; flex-direction: column; gap: 3px; }
  .fields input { width: 100%; padding: 2px 4px; }
  .actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
</style></head><body>
  ${state.message ? `<p class="banner">${escapeHtml(state.message)}</p>` : ""}
  ${ready ? `<div class="toolbar"><span class="status"><span class="dot${state.ready ? "" : " warn"}"></span>${state.ready ? "Ready" : "No model"}</span><span class="spacer"></span>${runControl ? `<button type="button" id="stop">Stop</button>` : ""}<button type="button" id="connect">Connect</button><button type="button" id="add" class="primary">+ Objective</button></div><div class="opens" role="group" aria-label="Open a panel"><button type="button" id="findings"><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.2a4.2 4.2 0 0 0-2.1 7.8c.3.2.4.5.4.8v.7h3.4v-.7c0-.3.1-.6.4-.8A4.2 4.2 0 0 0 8 1.2zM6.4 12h3.2v.6a1.6 1.6 0 0 1-3.2 0V12z"/></svg><span>Discoveries</span></button><button type="button" id="now"><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 3h12v1.4H2V3zm0 4.3h12v1.4H2V7.3zM2 11.6h8v1.4H2v-1.4z"/></svg><span>Log</span></button><button type="button" id="result"><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.4 11.2 3.2 8l1-1 2.2 2.2 5.4-5.4 1 1z"/></svg><span>Result</span></button></div>` : ""}
  <div class="scroll tree">${tree || (state.folder && state.initialized ? `<p class="hint">No objectives yet.</p>` : "")}${state.folder && !state.initialized ? `<button type="button" id="init" class="primary">Initialize folder</button>` : ""}</div>
  ${ready ? `<div class="inspector" id="inspector"></div>` : ""}
  <script>
    const vscode = acquireVsCodeApi();
    const catalog = ${JSON.stringify(catalog).replace(/</g, "\\u003c")};
    const ui = vscode.getState() || { selected: null, closed: {} };
    ui.closed = ui.closed || {};
    const box = document.getElementById("inspector");
    function button(label, primary) {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = label;
      if (primary) el.className = "primary";
      return el;
    }
    function paint() {
      for (const item of document.querySelectorAll("[data-node]")) {
        const id = item.dataset.node;
        const kids = item.querySelector(":scope > .kids");
        const twist = item.querySelector(":scope > .row .twist");
        const closed = Boolean(ui.closed[id]);
        if (kids) kids.hidden = closed;
        if (twist && twist.tagName === "BUTTON") {
          twist.textContent = closed ? "+" : "−";
          twist.setAttribute("aria-label", closed ? "Expand" : "Collapse");
        }
        item.querySelector(":scope > .row").classList.toggle("selected", ui.selected === id);
      }
      if (!box) return;
      box.replaceChildren();
      const node = catalog.find((item) => item.id === ui.selected);
      if (!node) {
        const hint = document.createElement("p");
        hint.className = "hint";
        hint.textContent = catalog.length ? "Select an objective to run, edit, or add a sub-objective." : "Add an objective to start.";
        box.append(hint);
        return;
      }
      const title = document.createElement("h2");
      title.textContent = node.text;
      box.append(title);
      if (node.stale) {
        const stale = document.createElement("p");
        stale.className = "hint";
        stale.textContent = "The text changed after the last result. Start runs it again.";
        box.append(stale);
      }
      const fields = document.createElement("div");
      fields.className = "fields";
      const strategy = document.createElement("input");
      strategy.value = node.strategyId;
      const agents = document.createElement("input");
      agents.type = "number";
      agents.min = "1";
      agents.value = String(node.agentCount);
      for (const [name, input] of [["Strategy", strategy], ["Agents", agents]]) {
        const label = document.createElement("label");
        label.append(name, input);
        fields.append(label);
      }
      const actions = document.createElement("div");
      actions.className = "actions";
      const start = button("Start", true);
      const edit = button("Edit", false);
      const child = button("+ Sub-objective", false);
      const drop = button("Delete", false);
      const repeat = node.done ? button("Run again", false) : null;
      actions.append(start, edit, child, drop);
      if (repeat) actions.append(repeat);
      box.append(fields, actions);
      const payload = (runAgain) => ({ id: node.id, strategyId: strategy.value, agentCount: Number(agents.value), again: runAgain });
      const persist = () => vscode.postMessage({ type: "saveNode", id: node.id, strategyId: strategy.value, agentCount: Number(agents.value) });
      strategy.addEventListener("change", persist);
      agents.addEventListener("change", persist);
      start.onclick = () => vscode.postMessage({ type: "start", ...payload(false) });
      if (repeat) repeat.onclick = () => vscode.postMessage({ type: "start", ...payload(true) });
      edit.onclick = () => vscode.postMessage({ type: "edit", id: node.id });
      child.onclick = () => vscode.postMessage({ type: "assistant", id: node.id });
      drop.onclick = () => vscode.postMessage({ type: "delete", id: node.id });
    }
    document.getElementById("init")?.addEventListener("click", () => vscode.postMessage({ type: "init" }));
    document.getElementById("stop")?.addEventListener("click", () => vscode.postMessage({ type: "stop" }));
    document.getElementById("connect")?.addEventListener("click", () => vscode.postMessage({ type: "connect" }));
    document.getElementById("add")?.addEventListener("click", () => vscode.postMessage({ type: "assistant" }));
    document.getElementById("findings")?.addEventListener("click", () => vscode.postMessage({ type: "showFindings" }));
    document.getElementById("now")?.addEventListener("click", () => vscode.postMessage({ type: "showNow" }));
    document.getElementById("result")?.addEventListener("click", () => vscode.postMessage({ type: "showResult" }));
    document.querySelector(".scroll")?.addEventListener("click", (event) => {
      const twist = event.target.closest("[data-twist]");
      if (twist) {
        ui.closed[twist.dataset.twist] = !ui.closed[twist.dataset.twist];
        vscode.setState(ui);
        paint();
        return;
      }
      const row = event.target.closest(".row");
      if (!row) return;
      ui.selected = row.dataset.id;
      vscode.setState(ui);
      paint();
    });
    paint();
  </script>
</body></html>`;
}

async function askModel(model: vscode.LanguageModelChat, prompt: string): Promise<string> {
  if (runControl?.stopped) throw new RunStopped();
  const token = runControl?.token ?? new vscode.CancellationTokenSource();
  const owned = !runControl;
  try {
    const response = await model.sendRequest([vscode.LanguageModelChatMessage.User(prompt)], {}, token.token);
    let text = "";
    for await (const part of response.text) text += part;
    if (runControl?.stopped) throw new RunStopped();
    return text;
  } catch (error) {
    if (runControl?.stopped) throw new RunStopped();
    throw error;
  } finally {
    if (owned) token.dispose();
  }
}

function readJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function startNode(
  context: vscode.ExtensionContext,
  panel: PanelProvider,
  root: string,
  id: string,
  strategyId: string | undefined,
  agentCount: number,
  again: boolean,
): Promise<void> {
  const choice = saved(context);
  const ready = isReady(context);
  if (!ready) {
    panel.refresh("Connect a model. Open Connect, load the models, and save.");
    void vscode.window.showWarningMessage("BigSwarmAI: connect a model before starting.");
    return;
  }
  const node = updateObjective(root, id, { strategyId, agentCount });
  if (node.strategyId !== "board") {
    panel.refresh("That strategy does not run yet. Keep board.");
    return;
  }
  const needsWork = (nodeId: string): boolean => {
    const item = readObjectives(root).find((entry) => entry.id === nodeId);
    if (!item) return false;
    if (!objectiveHasResult(root, nodeId) || resultIsStale(root, item)) return true;
    return readObjectives(root).some((entry) => entry.parentId === nodeId && needsWork(entry.id));
  };
  if (!again && !needsWork(node.id)) {
    panel.refresh("Already finished. Use Run again to repeat this objective.");
    return;
  }
  if (runControl) {
    panel.refresh("A run is already going. Use Stop first.");
    return;
  }
  runControl = { token: new vscode.CancellationTokenSource(), stopped: false };
  let stopped = false;
  let hold = "";
  try {
  panel.refresh("Starting…");
  trace("Orchestrator", `assigns «${node.text}»`);
  trace(node.text, "running");
  nowTab.open(context, true);
  void vscode.window.showInformationMessage(`BigSwarmAI: starting «${node.text}». The Log tab has the detail.`);
  const [orchestrator] = await vscode.lm.selectChatModels({ id: choice.orchestratorId });
  const [agentModel] = await vscode.lm.selectChatModels({ id: choice.agentId });
  if (!orchestrator || !agentModel) {
    trace("Orchestrator", "could not find the models");
    hold = "Connect a model.";
    panel.refresh(hold);
    return;
  }
  await runPlanned(node);
  resultTab.open(context, true);
  void vscode.window.showInformationMessage("BigSwarmAI: result ready. The Result tab is open.");

  async function runPlanned(current: ObjectiveNode): Promise<boolean> {
    const children = readObjectives(root).filter((item) => item.parentId === current.id);
    const pending = children.filter((item) => needsWork(item.id));
    let childRan = false;
    if (pending.length) {
      const catalog = pending
        .map((item) => {
          const run = latestRun(root, item.id);
          return `- id ${item.id}: ${item.text}. ${run ? `Ya tiene resultado: ${run.conclusion || run.summary}` : "Sin resultado."}`;
        })
        .join("\n");
      trace("Orchestrator", `plans how to run the sub-objectives of «${current.text}»`);
      panel.refresh(`Planning «${current.text}».`);
      const planText = await askModel(
        orchestrator,
        `Vas a ejecutar «${current.text}».
Estos son solo sus subobjetivos directos que aún no terminan:
${catalog}
Decide cuáles necesitas, en qué orden, y cuáles pueden correr a la vez.
Responde solo JSON: {"waves":[["id-a","id-b"],["id-c"]]}
Cada lista interna corre en paralelo. La siguiente lista espera a que la anterior termine.
No inventes ids. No incluyas uno que no esté en la lista.`,
      );
      const plan = readJsonObject(planText);
      const allowed = new Set(pending.map((item) => item.id));
      const waves = Array.isArray(plan?.waves)
        ? plan.waves
            .map((wave) => (Array.isArray(wave) ? wave.map((item) => String(item)).filter((item) => allowed.has(item)) : []))
            .filter((wave) => wave.length > 0)
        : [];
      const chosen = waves.length ? waves : [pending.map((item) => item.id)];
      for (const wave of chosen) {
        const names = wave.map((itemId) => children.find((item) => item.id === itemId)?.text ?? itemId);
        trace("Orchestrator", wave.length > 1 ? `in parallel: ${names.join(" · ")}` : `in series: ${names[0]}`);
        panel.refresh(wave.length > 1 ? `Waiting for ${wave.length} sub-objectives in parallel.` : `Waiting for «${names[0]}».`);
        const ran = await Promise.all(wave.map(async (itemId) => {
          const child = children.find((item) => item.id === itemId);
          if (!child || !needsWork(child.id)) {
            if (child) trace("Orchestrator", `«${child.text}» already has a result. It will not run again.`);
            return false;
          }
          return runPlanned(child);
        }));
        if (ran.some(Boolean)) childRan = true;
      }
    }
    const currentNode = readObjectives(root).find((entry) => entry.id === current.id);
    const stale = currentNode ? resultIsStale(root, currentNode) : false;
    const forceSelf = again && current.id === id;
    if (!forceSelf && objectiveHasResult(root, current.id) && !stale && !childRan) {
      trace("Orchestrator", `«${current.text}» already has a result. It will not run again.`);
      return false;
    }
    await runObjective(current);
    return true;
  }

  async function runObjective(node: ObjectiveNode): Promise<void> {
  const children = readObjectives(root).filter((item) => item.parentId === node.id);
  const readyChildren = children.filter((item) => objectiveHasResult(root, item.id));
  const missingChildren = children.filter((item) => !objectiveHasResult(root, item.id));
  const childNotes = children.map((item) => {
    const run = latestRun(root, item.id);
    return run ? `${item.text}: ${run.conclusion || run.summary}` : `${item.text}: sin resultado`;
  });
  const note = missingChildren.length
    ? `These sub-objectives still need a run if the principal needs them: ${missingChildren.map((item) => item.text).join(", ")}. Already have a result: ${readyChildren.map((item) => item.text).join(", ") || "none"}.`
    : children.length
      ? `The principal can use the results of: ${readyChildren.map((item) => item.text).join(", ")}.`
      : "This node has no sub-objectives.";
  trace("Orchestrator", note);
  const known = readEvents(root).map((event) => event.claim).join("\n");
  trace("Orchestrator", "asks for the split");
  panel.refresh("The orchestrator is assigning work.");
  const planText = await askModel(
    orchestrator,
    `Objetivo: ${node.text}
Subobjetivos:
${childNotes.join("\n") || "ninguno"}
${note}
Ya descubierto:
${known || "nada"}
Si un subobjetivo no tiene resultado, no inventes ese dato: el ángulo debe decir que hay que ejecutarlo.
Reparte el trabajo en ${node.agentCount} ángulos distintos. Responde solo JSON: {"angles":["..."]}`,
  );
  const plan = readJsonObject(planText);
  const angles = Array.isArray(plan?.angles) ? plan.angles.map((item) => String(item)).filter(Boolean) : [];
  while (angles.length < node.agentCount) angles.push(node.text);
  trace("Orchestrator", `delivered ${Math.min(angles.length, node.agentCount)} angles`);
  let published = 0;
  const discoveries: { claim: string; why: string; source: string }[] = [];
  const usage: string[] = [];
  for (let index = 0; index < node.agentCount; index += 1) {
    if (runControl?.stopped) throw new RunStopped();
    const name = `Agent ${index + 1}`;
    trace(name, angles[index]);
    panel.refresh(`${name} de ${node.agentCount}`);
    const reply = await askModel(
      agentModel,
      `Ángulo: ${angles[index]}
Objetivo: ${node.text}
Ya descubierto:
${known || "nada"}
Si hay un hallazgo que cambiaría lo que otro agente haría, responde solo JSON {"claim":"...","why":"...","source":"modelo"}.
Si no, responde solo JSON {"skip":true}.`,
    );
    usage.push(`${name}: ${reply.length} characters`);
    const found = readJsonObject(reply);
    if (!found || found.skip || !found.claim || !found.why || !found.source) {
      trace(name, "nothing new to share");
      continue;
    }
    const claim = String(found.claim);
    const why = String(found.why);
    const source = String(found.source);
    addDiscovery(root, { claim, why, source, objectiveId: node.id });
    discoveries.push({ claim, why, source });
    published += 1;
    trace(name, `shared: ${claim}`);
    void vscode.window.showInformationMessage(`BigSwarmAI shared: ${claim}`);
    panel.refresh(`${name} shared a discovery.`);
  }
  const summary = published === 1 ? "1 discovery" : published ? `${published} discoveries` : "no new finding";
  trace("Orchestrator", "writes the final result");
  panel.refresh("Writing the final result.");
  const conclusion = await askModel(
    orchestrator,
    `Objetivo: ${node.text}
${note}
Descubrimientos de esta corrida:
${discoveries.map((item) => `- ${item.claim}: ${item.why}`).join("\n") || "ninguno"}
Escribe el resultado final en uno o dos párrafos. No repitas la lista. Si faltan subobjetivos, dilo al inicio.`,
  );
  writeRunResult(root, {
    objectiveId: node.id,
    objectiveText: node.text,
    parentId: node.parentId,
    summary,
    note,
    discoveries,
    conclusion: conclusion.trim(),
  });
  trace(node.text, "result ready");
  trace("Orchestrator", `closed «${node.text}». ${usage.join(". ")}`);
  panel.refresh(`Closed «${node.text}».`);
  }
  } catch (error) {
    if (!(error instanceof RunStopped)) throw error;
    stopped = true;
    trace("Orchestrator", "stopped");
  } finally {
    runControl?.token.dispose();
    runControl = null;
    panel.refresh(stopped ? "Stopped." : hold);
  }
}

function openConnection(context: vscode.ExtensionContext, panel: PanelProvider): void {
  const view = vscode.window.createWebviewPanel("bigswarm.connection", "Connection", vscode.ViewColumn.Active, {
    enableScripts: true,
  });
  const render = (message = "") => {
    const choice = saved(context);
    view.webview.html = connectionHtml(models, choice, message);
  };
  render("Loading the saved connection…");
  void refreshModels().then(async () => {
    const choice = saved(context);
    const orchestrator = models.find((model) => model.id === choice.orchestratorId);
    const agent = models.find((model) => model.id === choice.agentId);
    if (orchestrator) {
      await context.globalState.update(ORCH_LABEL, `${orchestrator.name} (${orchestrator.vendor})`);
    }
    if (agent) await context.globalState.update(AGENT_LABEL, `${agent.name} (${agent.vendor})`);
    render(models.length ? "Models loaded. The previous choice stays selected." : "No models. Run Chat: Manage Language Models.");
    panel.refresh();
  });
  view.webview.onDidReceiveMessage(async (message: { type: string; orchestratorId?: string; agentId?: string }) => {
    if (message.type === "load") {
      await refreshModels();
      render(models.length ? "Models loaded. The previous choice stays selected." : "No models. Run Chat: Manage Language Models.");
      panel.refresh();
      return;
    }
    if (message.type === "save" && message.orchestratorId && message.agentId) {
      const orchestrator = models.find((model) => model.id === message.orchestratorId);
      const agent = models.find((model) => model.id === message.agentId);
      await context.globalState.update(ORCH, message.orchestratorId);
      await context.globalState.update(AGENT, message.agentId);
      await context.globalState.update(ORCH_LABEL, orchestrator ? `${orchestrator.name} (${orchestrator.vendor})` : message.orchestratorId);
      await context.globalState.update(AGENT_LABEL, agent ? `${agent.name} (${agent.vendor})` : message.agentId);
      const ready = connectionReady(models, message.orchestratorId, message.agentId);
      await context.globalState.update(VERIFIED, ready);
      render(ready ? "Connection ready." : "Those models are not in the loaded list.");
      panel.refresh(ready ? "Connection ready." : "Connect a model.");
      return;
    }
    if (message.type === "test") {
      const choice = saved(context);
      try {
        const [model] = await vscode.lm.selectChatModels({ id: choice.orchestratorId });
        if (!model) throw new Error("The orchestrator model is not available.");
        const token = new vscode.CancellationTokenSource();
        const response = await model.sendRequest(
          [vscode.LanguageModelChatMessage.User("Responde ok")],
          {},
          token.token,
        );
        for await (const _part of response.text) {
          break;
        }
        await context.globalState.update(VERIFIED, true);
        void vscode.window.showInformationMessage("BigSwarmAI: the test replied.");
        render("The test replied.");
        panel.refresh("Connection ready.");
      } catch (error) {
        const text = error instanceof Error ? error.message : "The test failed.";
        await context.globalState.update(VERIFIED, false);
        void vscode.window.showErrorMessage(`BigSwarmAI: ${text}`);
        render(text);
        panel.refresh("Connect a model.");
      }
    }
  });
}

async function refreshModels(): Promise<void> {
  const found = await vscode.lm.selectChatModels();
  models = found.map((model) => ({ id: model.id, vendor: model.vendor, name: model.name }));
}

function connectionHtml(
  list: ListedModel[],
  choice: { orchestratorId: string; agentId: string; orchestratorLabel: string; agentLabel: string },
  message: string,
): string {
  const options = (selectedId: string, selectedLabel: string) => {
    const rows = list.some((model) => model.id === selectedId) || !selectedId
      ? list
      : [{ id: selectedId, vendor: "", name: selectedLabel || selectedId }, ...list];
    return rows
      .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.vendor ? `${model.name} (${model.vendor})` : model.name)}</option>`)
      .join("");
  };
  return page("Connection", `${message ? `<p class="hint">${escapeHtml(message)}</p>` : ""}
    <label>Orchestrator <select id="orch">${options(choice.orchestratorId, choice.orchestratorLabel)}</select></label>
    <label>Agents <select id="agent">${options(choice.agentId, choice.agentLabel)}</select></label>
    <div class="actions">
      <button id="load">Load models</button>
      <button id="save" class="primary">Save</button>
      <button id="test">Test</button>
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      const orch = document.getElementById("orch");
      const agent = document.getElementById("agent");
      if (orch) orch.value = ${JSON.stringify(choice.orchestratorId)};
      if (agent) agent.value = ${JSON.stringify(choice.agentId)};
      document.getElementById("load").onclick = () => vscode.postMessage({ type: "load" });
      document.getElementById("save").onclick = () => vscode.postMessage({ type: "save", orchestratorId: orch.value, agentId: agent.value });
      document.getElementById("test").onclick = () => vscode.postMessage({ type: "test" });
    </script>`);
}

function openAssistant(context: vscode.ExtensionContext, panel: PanelProvider, parentId?: string, editId?: string): void {
  const root = rootPath();
  const view = vscode.window.createWebviewPanel("bigswarm.assistant", "Objective", vscode.ViewColumn.Active, {
    enableScripts: true,
  });
  const draw = (message = "") => {
    const nodes = root && isInitialized(root) ? readObjectives(root) : [];
    const options = [`<option value="">New objective</option>`]
      .concat(nodes.map((node) => `<option value="${escapeHtml(node.id)}">Edit: ${escapeHtml(node.text)}</option>`))
      .join("");
    const parents = [`<option value="">None</option>`]
      .concat(nodes.map((node) => `<option value="${escapeHtml(node.id)}">${escapeHtml(node.text)}</option>`))
      .join("");
    const stored = JSON.stringify(nodes).replace(/</g, "\\u003c");
    view.webview.html = page(
      "Objective",
      `<p class="hint">${escapeHtml(message || (nodes.length ? "Create one, or pick a saved objective to edit." : "Write the first objective."))}</p>
       <label>Saved objective <select id="mode">${options}</select></label>
       <label>What to achieve <textarea id="text"></textarea></label>
       <label>Parent <select id="parent">${parents}</select></label>
       <div class="actions"><button id="save" class="primary">Save</button></div>
       <script>
         const vscode = acquireVsCodeApi();
         const nodes = ${stored};
         const mode = document.getElementById("mode");
         const text = document.getElementById("text");
         const parent = document.getElementById("parent");
         function fill() {
           const node = nodes.find((item) => item.id === mode.value);
           text.value = node ? node.text : "";
           parent.value = node && node.parentId ? node.parentId : "";
         }
         mode.addEventListener("change", fill);
         const presetParent = ${JSON.stringify(parentId ?? "")};
         const presetEdit = ${JSON.stringify(editId ?? "")};
         if (presetEdit) {
           mode.value = presetEdit;
           fill();
         } else if (presetParent) {
           mode.value = "";
           fill();
           parent.value = presetParent;
         } else {
           fill();
         }
         document.getElementById("save").onclick = () => vscode.postMessage({
           type: "save",
           id: mode.value || null,
           text: text.value,
           parentId: parent.value || null
         });
       </script>`,
    );
  };
  draw();
  view.webview.onDidReceiveMessage((message: { type: string; id?: string | null; text?: string; parentId?: string | null }) => {
    if (message.type !== "save" || !root) return;
    try {
      if (!isInitialized(root)) openWorkspace(root);
      if (message.id) {
        updateObjective(root, message.id, { text: message.text ?? "", parentId: message.parentId || null });
      } else {
        addObjective(root, message.text ?? "", message.parentId || null);
      }
      panel.refresh("Objective saved.");
      draw("Objective saved.");
    } catch (error) {
      draw(error instanceof WorkspaceError ? error.message : "Could not write the folder.");
    }
  });
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<style>
  ${themeCss()}
  body { padding: 20px 24px; max-width: 40rem; line-height: 1.4; }
  h1 { font-size: 1.15rem; font-weight: 600; margin: 0 0 8px; }
  label { display: block; margin-top: 14px; font-size: 12px; }
  label input, label select, label textarea { display: block; width: 100%; margin-top: 4px; padding: 4px 6px; }
  textarea { min-height: 8rem; resize: vertical; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

class LiveTab {
  private panel?: vscode.WebviewPanel;

  constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly render: (state: State) => string,
  ) {}

  open(context: vscode.ExtensionContext, reveal: boolean): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(this.id, this.title, vscode.ViewColumn.Beside, { enableScripts: true });
      this.panel.webview.onDidReceiveMessage(async (message: { type?: string; source?: string }) => {
        if (message.type !== "open" || !message.source) return;
        const root = rootPath();
        if (!root) return;
        try {
          await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(vscode.Uri.joinPath(vscode.Uri.file(root), message.source)),
          );
        } catch {
          /* el origen no es un archivo */
        }
      });
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    } else if (reveal) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    }
    this.panel.webview.html = this.render(snapshot(context));
  }

  update(context: vscode.ExtensionContext): void {
    if (!this.panel) return;
    this.panel.webview.html = this.render(snapshot(context));
  }
}

const nowTab = new LiveTab("bigswarm.nowTab", "Log", nowHtml);
const resultTab = new LiveTab("bigswarm.resultTab", "Result", resultHtml);
const findingsTab = new LiveTab("bigswarm.findingsTab", "Discoveries", discoveriesHtml);

function slicePage(body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<style>
  ${themeCss()}
  html, body { height: 100%; margin: 0; }
  body { padding: 10px 12px; box-sizing: border-box; height: 100%; overflow: auto; }
  .card h3 { font-size: 13px; font-weight: 600; margin: 0 0 6px; line-height: 1.35; }
  .card p { margin: 0 0 6px; line-height: 1.45; }
  .card button { margin-top: 8px; }
</style></head><body>${body}</body></html>`;
}

function discoveriesHtml(state: State): string {
  const events = [...state.events]
    .sort((a, b) => timelineInstant(a) - timelineInstant(b))
    .map((event) => {
      const owner = state.objectives.find((node) => node.id === event.objectiveId);
      const where = owner ? escapeHtml(owner.text) : "";
      const file = event.source && event.source !== "modelo" && !event.source.startsWith("model");
      return `<article class="card"><header><time>${escapeHtml(stamp(timelineInstant(event)))}</time>${where ? `<span>${where}</span>` : ""}</header><p class="claim">${escapeHtml(event.claim)}</p>${file ? `<button type="button" data-source="${escapeHtml(event.source)}">Open source</button>` : ""}</article>`;
    })
    .join("");
  return slicePage(`${events || `<p class="hint">No discoveries yet.</p>`}
    <script>
      const vscode = acquireVsCodeApi();
      for (const button of document.querySelectorAll("[data-source]")) {
        button.addEventListener("click", () => vscode.postMessage({ type: "open", source: button.dataset.source }));
      }
    </script>`);
}

function nowHtml(state: State): string {
  const lines = [...feed]
    .sort((a, b) => a.t - b.t)
    .map((line) => `<li><time>${escapeHtml(line.at)}</time><span class="who">${escapeHtml(line.who)}</span><span>${escapeHtml(line.text)}</span></li>`)
    .join("");
  return slicePage(`<p class="hint">Oldest first.</p><ol class="log">${lines || "<li>Nothing running.</li>"}</ol><script>window.scrollTo(0, document.body.scrollHeight);</script>`);
}

function resultHtml(state: State): string {
  const runs = state.folder && isInitialized(state.folder) ? listRuns(state.folder) : [];
  const blocks = runs
    .map((run) => {
      const node = state.objectives.find((item) => item.id === run.objectiveId);
      const kind = node?.parentId || run.parentId ? "Sub-objective" : "Principal";
      const title = node?.text || run.objectiveText;
      const text = run.conclusion || run.summary;
      return `<article class="card"><header><span class="badge">${escapeHtml(kind)}</span><time>${escapeHtml(stamp(timelineInstant(run)))}</time></header><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${run.note ? `<p class="hint">${escapeHtml(run.note)}</p>` : ""}</article>`;
    })
    .join("");
  return slicePage(blocks || `<p class="hint">No result yet. Select an objective and press Start. The conclusion stays here and in .bigswarm/results.</p>`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
