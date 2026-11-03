import fs from "node:fs";
import path from "node:path";

export const MARK_START = "<!-- bigswarm:start -->";
export const MARK_END = "<!-- bigswarm:end -->";

const SECTION = `${MARK_START}
# BigSwarmAI

This folder is a BigSwarmAI workspace.

- Objective: .bigswarm/objective.md
- Discoveries: .bigswarm/events/

Read the objective and the events before acting. Append a discovery only when it would change what another agent does. Include the claim, why it matters, and the source.
${MARK_END}
`;

export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export type Discovery = {
  id: string;
  t: number;
  claim: string;
  why: string;
  source: string;
  objectiveId?: string;
};

const READ_LIMIT = 8000;

function dot(root: string): string {
  return path.join(root, ".bigswarm");
}

export function isInitialized(root: string): boolean {
  return fs.existsSync(path.join(dot(root), "workspace.json"));
}

function assertDir(root: string): void {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new WorkspaceError("No se pudo escribir la carpeta");
  }
}

function assertReady(root: string): void {
  if (!isInitialized(root)) {
    throw new WorkspaceError("La carpeta no está inicializada");
  }
}

function inside(root: string, target: string): string {
  const base = fs.realpathSync(root);
  const resolved = fs.realpathSync(target);
  const rel = path.relative(base, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new WorkspaceError("La ruta queda fuera de la carpeta");
  }
  return resolved;
}

function readObjective(root: string): string {
  const file = path.join(dot(root), "objective.md");
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
}

export function readEvents(root: string): Discovery[] {
  const dir = path.join(dot(root), "events");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as Discovery);
}

export function openWorkspace(root: string): {
  created: boolean;
  objective: string;
  events: Discovery[];
} {
  assertDir(root);
  if (isInitialized(root)) {
    return { created: false, objective: readObjective(root), events: readEvents(root) };
  }
  const eventsDir = path.join(dot(root), "events");
  try {
    fs.mkdirSync(eventsDir, { recursive: true });
    fs.writeFileSync(path.join(dot(root), "objective.md"), "", "utf8");
    const agentsPath = path.join(root, "AGENTS.md");
    const prior = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, "utf8") : "";
    if (!prior.includes(MARK_START)) {
      const next = prior.length === 0 ? SECTION : `${prior.replace(/\s*$/, "")}\n\n${SECTION}`;
      fs.writeFileSync(agentsPath, next, "utf8");
    }
    fs.writeFileSync(
      path.join(dot(root), "workspace.json"),
      JSON.stringify({ schema: 1, product: "BigSwarmAI" }, null, 2),
      "utf8",
    );
  } catch {
    throw new WorkspaceError("No se pudo escribir la carpeta");
  }
  return { created: true, objective: "", events: [] };
}

export function saveObjective(root: string, text: string): string {
  assertReady(root);
  fs.writeFileSync(path.join(dot(root), "objective.md"), text, "utf8");
  return text;
}

export function addDiscovery(
  root: string,
  input: { claim: string; why: string; source: string; objectiveId?: string },
): Discovery {
  assertReady(root);
  const claim = input.claim.trim();
  const why = input.why.trim();
  const source = input.source.trim();
  if (!claim || !why || !source) {
    throw new WorkspaceError("Falta la afirmación, el porqué o el origen");
  }
  const event: Discovery = {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    t: Date.now(),
    claim,
    why,
    source,
  };
  if (input.objectiveId) event.objectiveId = input.objectiveId;
  fs.writeFileSync(
    path.join(dot(root), "events", `${event.id}.json`),
    JSON.stringify(event, null, 2),
    "utf8",
  );
  return event;
}

export function listNames(root: string): string[] {
  assertReady(root);
  return fs
    .readdirSync(root, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();
}

export function searchText(root: string, query: string): { file: string; line: number }[] {
  assertReady(root);
  const hits: { file: string; line: number }[] = [];
  const skip = new Set([".bigswarm", ".git", "node_modules"]);
  const walk = (dir: string): void => {
    if (hits.length >= 30) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (hits.length >= 30) return;
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      let text = "";
      try {
        if (fs.statSync(full).size > 200_000) continue;
        text = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].includes(query)) {
          hits.push({ file: path.relative(root, full), line: i + 1 });
          if (hits.length >= 30) return;
        }
      }
    }
  };
  walk(root);
  return hits;
}

export function readSlice(root: string, file: string): string {
  assertReady(root);
  const target = path.resolve(root, file);
  let resolved: string;
  try {
    resolved = inside(root, target);
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError("La ruta queda fuera de la carpeta");
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new WorkspaceError("La ruta queda fuera de la carpeta");
  return fs.readFileSync(resolved, "utf8").slice(0, READ_LIMIT);
}

export const DEFAULT_STRATEGY = "board";

export type ObjectiveNode = {
  id: string;
  t: number;
  parentId: string | null;
  text: string;
  strategyId: string;
  agentCount: number;
};

export type ListedModel = { id: string; vendor: string; name: string };

export function connectionReady(
  models: ListedModel[],
  orchestratorId: string,
  agentId: string,
): boolean {
  const ids = new Set(models.map((model) => model.id));
  return ids.has(orchestratorId) && ids.has(agentId);
}

function objectivesPath(root: string): string {
  return path.join(dot(root), "objectives.json");
}

export function readObjectives(root: string): ObjectiveNode[] {
  assertReady(root);
  const file = objectivesPath(root);
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { objectives?: ObjectiveNode[] };
  return parsed.objectives ?? [];
}

export function addObjective(root: string, text: string, parentId: string | null): ObjectiveNode {
  assertReady(root);
  const trimmed = text.trim();
  if (!trimmed) throw new WorkspaceError("El objetivo no puede estar vacío");
  const current = readObjectives(root);
  if (parentId && !current.some((node) => node.id === parentId)) {
    throw new WorkspaceError("El objetivo padre no está en el árbol");
  }
  const node: ObjectiveNode = {
    id: `obj-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    t: Date.now(),
    parentId,
    text: trimmed,
    strategyId: DEFAULT_STRATEGY,
    agentCount: 1,
  };
  current.push(node);
  fs.writeFileSync(objectivesPath(root), JSON.stringify({ objectives: current }, null, 2), "utf8");
  if (!parentId) fs.writeFileSync(path.join(dot(root), "objective.md"), trimmed, "utf8");
  return node;
}

export function deleteObjective(root: string, id: string): void {
  assertReady(root);
  const current = readObjectives(root);
  if (!current.some((node) => node.id === id)) throw new WorkspaceError("El objetivo no está en el árbol");
  const drop = new Set<string>();
  const walk = (target: string) => {
    drop.add(target);
    for (const node of current) {
      if (node.parentId === target) walk(node.id);
    }
  };
  walk(id);
  const next = current.filter((node) => !drop.has(node.id));
  fs.writeFileSync(objectivesPath(root), JSON.stringify({ objectives: next }, null, 2), "utf8");
  for (const gone of drop) {
    fs.rmSync(path.join(dot(root), "results", gone), { recursive: true, force: true });
  }
  for (const event of readEvents(root)) {
    if (event.objectiveId && drop.has(event.objectiveId)) {
      fs.rmSync(path.join(dot(root), "events", `${event.id}.json`), { force: true });
    }
  }
  const principal = next.find((node) => !node.parentId);
  fs.writeFileSync(path.join(dot(root), "objective.md"), principal?.text ?? "", "utf8");
}

export function updateObjective(
  root: string,
  id: string,
  patch: { text?: string; parentId?: string | null; strategyId?: string; agentCount?: number },
): ObjectiveNode {
  assertReady(root);
  const current = readObjectives(root);
  const node = current.find((item) => item.id === id);
  if (!node) throw new WorkspaceError("El objetivo no está en el árbol");
  if (patch.text !== undefined) {
    const trimmed = patch.text.trim();
    if (!trimmed) throw new WorkspaceError("El objetivo no puede estar vacío");
    node.text = trimmed;
  }
  if (patch.parentId !== undefined) {
    if (patch.parentId === id) throw new WorkspaceError("Un objetivo no puede colgar de sí mismo");
    if (patch.parentId && !current.some((item) => item.id === patch.parentId)) {
      throw new WorkspaceError("El objetivo padre no está en el árbol");
    }
    node.parentId = patch.parentId;
  }
  if (patch.strategyId) node.strategyId = patch.strategyId;
  if (patch.agentCount !== undefined) {
    if (!Number.isInteger(patch.agentCount) || patch.agentCount < 1) {
      throw new WorkspaceError("La cantidad de agentes tiene que ser al menos 1");
    }
    node.agentCount = patch.agentCount;
  }
  fs.writeFileSync(objectivesPath(root), JSON.stringify({ objectives: current }, null, 2), "utf8");
  if (!node.parentId) fs.writeFileSync(path.join(dot(root), "objective.md"), node.text, "utf8");
  return node;
}

export type RunRecord = {
  id: string;
  t: number;
  at: string;
  objectiveId: string;
  objectiveText: string;
  parentId: string | null;
  summary: string;
  note: string;
  discoveries: { claim: string; why: string; source: string }[];
  conclusion: string;
};

export function objectiveHasResult(root: string, objectiveId: string): boolean {
  if (readEvents(root).some((event) => event.objectiveId === objectiveId)) return true;
  const dir = path.join(dot(root), "results", objectiveId);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((name) => name.endsWith(".json"));
}

export function latestRun(root: string, objectiveId: string): RunRecord | null {
  const dir = path.join(dot(root), "results", objectiveId);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  if (!files.length) return null;
  return JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), "utf8")) as RunRecord;
}

export function resultIsStale(root: string, node: { id: string; text: string }): boolean {
  const run = latestRun(root, node.id);
  if (!run) return false;
  return run.objectiveText.trim() !== node.text.trim();
}

export type LogLine = { t: number; at: string; who: string; text: string };

export function readLog(root: string): LogLine[] {
  const file = path.join(dot(root), "log.json");
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line) => line && typeof line.t === "number" && typeof line.text === "string") as LogLine[];
  } catch {
    return [];
  }
}

export function appendLog(root: string, line: LogLine): void {
  assertReady(root);
  const kept = [...readLog(root), line].slice(-200);
  fs.writeFileSync(path.join(dot(root), "log.json"), JSON.stringify(kept, null, 2), "utf8");
}

export function listRuns(root: string): RunRecord[] {
  assertReady(root);
  const dir = path.join(dot(root), "results");
  if (!fs.existsSync(dir)) return [];
  const records: RunRecord[] = [];
  for (const objectiveId of fs.readdirSync(dir)) {
    const folder = path.join(dir, objectiveId);
    if (!fs.statSync(folder).isDirectory()) continue;
    for (const name of fs.readdirSync(folder)) {
      if (!name.endsWith(".json")) continue;
      records.push(JSON.parse(fs.readFileSync(path.join(folder, name), "utf8")) as RunRecord);
    }
  }
  return records.sort((a, b) => timelineInstant(a) - timelineInstant(b));
}

export function timelineInstant(record: { t?: number; at?: string; id?: string }): number {
  if (typeof record.t === "number") return record.t;
  if (record.at) {
    const parsed = Date.parse(record.at);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const match = /(\d{13})/.exec(record.id ?? "");
  return match ? Number(match[1]) : 0;
}

export function writeRunResult(root: string, input: Omit<RunRecord, "id" | "at" | "t">): RunRecord {
  assertReady(root);
  const t = Date.now();
  const record: RunRecord = { ...input, id: `run-${t}`, t, at: new Date(t).toISOString() };
  const dir = path.join(dot(root), "results", record.objectiveId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${record.id}.json`), JSON.stringify(record, null, 2), "utf8");
  const lines = [
    `# ${record.objectiveText}`,
    "",
    record.parentId ? `Subobjetivo de ${record.parentId}` : "Objetivo principal",
    "",
    record.note,
    "",
    "## Resultado",
    "",
    record.conclusion,
    "",
    record.summary,
    "",
    ...record.discoveries.map((item) => `- ${item.claim} — ${item.why} (${item.source})`),
    "",
  ];
  fs.writeFileSync(path.join(dir, `${record.id}.md`), lines.join("\n"), "utf8");
  return record;
}
