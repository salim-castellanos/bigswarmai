import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addObjective,
  connectionReady,
  deleteObjective,
  openWorkspace,
  readObjectives,
  updateObjective,
  writeRunResult,
  writeVisibleReport,
  latestRun,
  objectiveHasResult,
  appendLog,
  readLog,
  resultIsStale,
} from "../src/workspace.ts";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bigswarm-"));
}

test("la conexión está lista solo si los dos modelos existen", () => {
  const models = [
    { id: "opus", vendor: "anthropic", name: "Opus" },
    { id: "sonnet", vendor: "anthropic", name: "Sonnet" },
  ];
  assert.equal(connectionReady(models, "opus", "sonnet"), true);
  assert.equal(connectionReady(models, "opus", "opus"), true);
  assert.equal(connectionReady(models, "opus", "missing"), false);
  assert.equal(connectionReady([], "opus", "sonnet"), false);
});

test("el asistente arma principal y subobjetivo", () => {
  const root = tempDir();
  openWorkspace(root);
  assert.throws(() => addObjective(root, "   ", null), /vacío/);
  assert.equal(fs.existsSync(path.join(root, ".bigswarm", "objectives.json")), false);
  const principal = addObjective(root, "lograr el informe", null);
  const child = addObjective(root, "reunir fuentes", principal.id);
  assert.equal(child.parentId, principal.id);
  assert.equal(child.strategyId, "board");
  assert.equal(child.agentCount, 1);
  assert.equal(fs.readFileSync(path.join(root, ".bigswarm", "objective.md"), "utf8"), "lograr el informe");
  const again = readObjectives(root);
  assert.equal(again.length, 2);
  assert.equal(again[0].text, "lograr el informe");
});

test("cambiar estrategia y cantidad queda en el nodo", () => {
  const root = tempDir();
  openWorkspace(root);
  const principal = addObjective(root, "lograr el informe", null);
  const updated = updateObjective(root, principal.id, { strategyId: "board", agentCount: 4 });
  assert.equal(updated.agentCount, 4);
  assert.equal(readObjectives(root)[0].agentCount, 4);
  const edited = updateObjective(root, principal.id, { text: "lograr el informe corto" });
  assert.equal(edited.text, "lograr el informe corto");
  assert.equal(readObjectives(root)[0].text, "lograr el informe corto");
  assert.throws(() => updateObjective(root, principal.id, { agentCount: 0 }), /al menos 1/);
});

test("la corrida queda en un archivo del objetivo", () => {
  const root = tempDir();
  openWorkspace(root);
  const principal = addObjective(root, "lograr el informe", null);
  const child = addObjective(root, "reunir fuentes", principal.id);
  assert.equal(objectiveHasResult(root, child.id), false);
  writeRunResult(root, {
    objectiveId: child.id,
    objectiveText: child.text,
    parentId: child.parentId,
    summary: "1 descubrimiento(s)",
    note: "Este nodo no tiene subobjetivos.",
    conclusion: "El informe puede cerrarse con las tres fuentes.",
    discoveries: [{ claim: "Hay tres fuentes", why: "Cierran el subobjetivo", source: "modelo" }],
  });
  assert.equal(objectiveHasResult(root, child.id), true);
  assert.match(latestRun(root, child.id)?.summary ?? "", /descubrimiento/);
  assert.equal(resultIsStale(root, child), false);
  updateObjective(root, child.id, { text: "reunir otras fuentes" });
  const changed = readObjectives(root).find((item) => item.id === child.id);
  assert.equal(resultIsStale(root, changed ?? child), true);
  const report = writeVisibleReport(root, latestRun(root, child.id)!);
  assert.ok(report.startsWith("research/"));
  assert.equal(fs.existsSync(path.join(root, report)), true);
});

test("la bitácora queda en la carpeta", () => {
  const root = tempDir();
  openWorkspace(root);
  assert.equal(readLog(root).length, 0);
  appendLog(root, { t: 1, at: "00:00:00.001", who: "Orchestrator", text: "assigns" });
  appendLog(root, { t: 2, at: "00:00:01.001", who: "Agent 1", text: "shared" });
  const lines = readLog(root);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].who, "Agent 1");
});

test("eliminar un principal quita sus subobjetivos", () => {
  const root = tempDir();
  openWorkspace(root);
  const principal = addObjective(root, "lograr el informe", null);
  addObjective(root, "reunir fuentes", principal.id);
  deleteObjective(root, principal.id);
  assert.equal(readObjectives(root).length, 0);
});
