import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { addDiscovery, listNames, openWorkspace, readSlice, saveObjective, searchText } from "../src/workspace.ts";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bigswarm-"));
}

test("inicializa una carpeta vacía", () => {
  const root = tempDir();
  const opened = openWorkspace(root);
  assert.equal(opened.created, true);
  assert.equal(fs.existsSync(path.join(root, ".bigswarm", "workspace.json")), true);
  assert.equal(fs.readFileSync(path.join(root, ".bigswarm", "objective.md"), "utf8"), "");
  assert.equal(fs.statSync(path.join(root, ".bigswarm", "events")).isDirectory(), true);
  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /bigswarm:start/);
  assert.match(agents, /bigswarm:end/);
});

test("no pisa un AGENTS.md previo ni duplica la sección", () => {
  const root = tempDir();
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Proyecto\n\nNo borrar.\n", "utf8");
  openWorkspace(root);
  openWorkspace(root);
  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /No borrar/);
  assert.equal(agents.split("bigswarm:start").length, 2);
});

test("cargar no recrea los eventos", () => {
  const root = tempDir();
  openWorkspace(root);
  const event = addDiscovery(root, { claim: "El tope es 3", why: "El objetivo asumía 10", source: "notas.txt" });
  const again = openWorkspace(root);
  assert.equal(again.created, false);
  assert.equal(again.events.length, 1);
  assert.equal(again.events[0].id, event.id);
});

test("una ruta que no es carpeta no deja marca", () => {
  const root = tempDir();
  const file = path.join(root, "archivo.txt");
  fs.writeFileSync(file, "x", "utf8");
  assert.throws(() => openWorkspace(file), /No se pudo escribir la carpeta/);
  assert.equal(fs.existsSync(path.join(file, ".bigswarm")), false);
});

test("guarda el objetivo y lo recupera", () => {
  const root = tempDir();
  openWorkspace(root);
  saveObjective(root, "lograr el informe");
  saveObjective(root, "lograr el informe corto");
  const again = openWorkspace(root);
  assert.equal(again.objective, "lograr el informe corto");
});

test("no escribe objetivo sin marca", () => {
  const root = tempDir();
  assert.throws(() => saveObjective(root, "x"), /no está inicializada/);
  assert.equal(fs.existsSync(path.join(root, ".bigswarm", "objective.md")), false);
});

test("publica un descubrimiento y rechaza uno incompleto", () => {
  const root = tempDir();
  openWorkspace(root);
  const before = fs.readdirSync(path.join(root, ".bigswarm", "events"));
  assert.throws(() => addDiscovery(root, { claim: "algo", why: "importa", source: "  " }), /Falta la afirmación/);
  assert.deepEqual(fs.readdirSync(path.join(root, ".bigswarm", "events")), before);
  const event = addDiscovery(root, { claim: "El puerto es 4", why: "Cierra la duda del objetivo", source: "readme" });
  const saved = JSON.parse(fs.readFileSync(path.join(root, ".bigswarm", "events", `${event.id}.json`), "utf8"));
  assert.equal(saved.claim, "El puerto es 4");
  assert.equal(saved.why, "Cierra la duda del objetivo");
  assert.equal(saved.source, "readme");
});

test("listar, buscar y leer no crean eventos y no salen de la carpeta", () => {
  const root = tempDir();
  openWorkspace(root);
  fs.writeFileSync(path.join(root, "notas.txt"), "linea uno\nel tope es 3\n", "utf8");
  const outside = path.join(path.dirname(root), "secreto.txt");
  fs.writeFileSync(outside, "no leer", "utf8");
  const names = listNames(root);
  assert.ok(names.includes("notas.txt"));
  const hits = searchText(root, "tope es 3");
  assert.deepEqual(hits, [{ file: "notas.txt", line: 2 }]);
  assert.match(readSlice(root, "notas.txt"), /tope es 3/);
  assert.throws(() => readSlice(root, "../secreto.txt"), /fuera de la carpeta/);
  assert.equal(fs.readdirSync(path.join(root, ".bigswarm", "events")).length, 0);
  fs.unlinkSync(outside);
});
