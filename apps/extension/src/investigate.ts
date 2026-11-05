import * as vscode from "vscode";
import fs from "node:fs";
import path from "node:path";
import { readEvents, readSlice, searchText, WorkspaceError } from "../../desktop/src/workspace.ts";

export const HARNESS_ID = "investigate";
export const HARNESS_VERSION = 3;

const SKIP = new Set([".git", "node_modules", ".bigswarm"]);
const MAX_ROUNDS = 6;
const MAX_FETCHES = 3;
const MAX_NAMES = 80;

export const investigateTools: vscode.LanguageModelChatTool[] = [
  {
    name: "list_files",
    description:
      "List file and folder names under a relative path in the open workspace. Use this first to see what is already there. Does not read file contents. Skips .git, node_modules, and .bigswarm.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Relative path. Empty means the workspace root." } },
    },
  },
  {
    name: "search_text",
    description:
      "Find a short exact phrase in workspace files. Start with a short query, then narrow. Returns up to 30 hits as path and line number.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "A short exact phrase." } },
      required: ["query"],
    },
  },
  {
    name: "read_slice",
    description:
      "Read the beginning of one workspace file, at most 8000 characters. Use it after list_files or search_text, on a path you already saw.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Relative file path." } },
      required: ["path"],
    },
  },
  {
    name: "read_board",
    description:
      "Read discoveries already written in this workspace. Use it to avoid repeating a claim. These notes are not evidence: a fact still needs a file you read or a page you opened. Other agents may add claims while you work; the harness also shows the latest board before each answer.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "fetch_url",
    description:
      "Read one public http or https page. Use it when the workspace files do not contain the fact. A claim already on the board is not that fact. The operator approves each new site. The text is truncated.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "A public http or https URL." } },
      required: ["url"],
    },
  },
];

function field(input: object, key: string): string {
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function listFiles(root: string, relative: string): string {
  const base = path.resolve(root, relative || ".");
  const prefix = path.resolve(root);
  if (base !== prefix && !base.startsWith(prefix + path.sep)) return "That path is outside the workspace.";
  if (!fs.existsSync(base)) return "That path is not in the workspace.";
  const names: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (names.length >= MAX_NAMES || depth > 2) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (names.length >= MAX_NAMES) return;
      if (SKIP.has(entry.name) || entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full);
      names.push(entry.isDirectory() ? `${rel}/` : rel);
      if (entry.isDirectory()) walk(full, depth + 1);
    }
  };
  if (fs.statSync(base).isDirectory()) walk(base, 0);
  else names.push(path.relative(root, base));
  return names.sort().join("\n") || "No files.";
}

function readBoard(root: string): string {
  const lines = readEvents(root).slice(-40).map((event) => `- ${event.claim} — ${event.why} (${event.source})`);
  return lines.join("\n") || "No discoveries yet.";
}

async function fetchUrl(raw: string, approve: (origin: string) => Promise<boolean>): Promise<string> {
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return "That is not a URL.";
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return "Only http and https.";
  const allowed = await approve(target.origin);
  if (!allowed) return "The operator denied this site.";
  const response = await fetch(target.href, { signal: AbortSignal.timeout(15000), redirect: "follow" });
  const text = await response.text();
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function normalizeSource(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

export function sourceIsGrounded(source: string, read: string[]): boolean {
  const key = source.trim().toLowerCase();
  if (key === "objective" || key === "board") return true;
  const wanted = normalizeSource(source);
  if (!wanted) return false;
  return read.some((item) => normalizeSource(item) === wanted);
}

async function runTool(
  root: string,
  name: string,
  input: object,
  approve: (origin: string) => Promise<boolean>,
): Promise<{ body: string; cite?: string }> {
  try {
    if (name === "list_files") return { body: listFiles(root, field(input, "path")) };
    if (name === "search_text") {
      const query = field(input, "query").trim();
      if (!query) return { body: "Give a short query." };
      const hits = searchText(root, query);
      return { body: hits.map((hit) => `${hit.file}:${hit.line}`).join("\n") || "No matches." };
    }
    if (name === "read_slice") {
      const file = field(input, "path").trim();
      if (!file) return { body: "Give a path." };
      return { body: readSlice(root, file), cite: file };
    }
    if (name === "read_board") return { body: readBoard(root) };
    if (name === "fetch_url") {
      const raw = field(input, "url").trim();
      const body = await fetchUrl(raw, approve);
      const opened = body !== "That is not a URL." && body !== "Only http and https." && body !== "The operator denied this site.";
      return opened ? { body, cite: raw } : { body };
    }
    return { body: "Unknown tool." };
  } catch (error) {
    if (error instanceof WorkspaceError) return { body: error.message };
    return { body: "The tool failed." };
  }
}

const MODEL_WAIT_MS = 90_000;

async function readModel(
  model: vscode.LanguageModelChat,
  messages: vscode.LanguageModelChatMessage[],
  tools: vscode.LanguageModelChatTool[] | undefined,
  parent: vscode.CancellationToken,
): Promise<{ text: string; calls: vscode.LanguageModelToolCallPart[] }> {
  const local = new vscode.CancellationTokenSource();
  const subscription = parent.onCancellationRequested(() => local.cancel());
  const timer = setTimeout(() => local.cancel(), MODEL_WAIT_MS);
  try {
    const response = await model.sendRequest(messages, tools ? { tools } : {}, local.token);
    let text = "";
    const calls: vscode.LanguageModelToolCallPart[] = [];
    for await (const part of response.stream) {
      if (local.token.isCancellationRequested) break;
      if (part instanceof vscode.LanguageModelTextPart) text += part.value;
      else if (part instanceof vscode.LanguageModelToolCallPart) calls.push(part);
    }
    if (local.token.isCancellationRequested && !parent.isCancellationRequested) {
      throw new Error("The model took too long.");
    }
    return { text, calls };
  } finally {
    clearTimeout(timer);
    subscription.dispose();
    local.dispose();
  }
}

export async function investigate(input: {
  model: vscode.LanguageModelChat;
  prompt: string;
  root: string;
  token: vscode.CancellationToken;
  approve: (origin: string) => Promise<boolean>;
  onTool: (name: string) => void;
  onCall: () => void;
  onWait: (text: string) => void;
  onError: (message: string) => void;
}): Promise<{ text: string; sources: string[] }> {
  const messages: vscode.LanguageModelChatMessage[] = [vscode.LanguageModelChatMessage.User(input.prompt)];
  const sources: string[] = [];
  const notes: string[] = [];
  let fetches = 0;
  const withBoard = (base: vscode.LanguageModelChatMessage[]): vscode.LanguageModelChatMessage[] => [
    ...base,
    vscode.LanguageModelChatMessage.User(
      `Board right now, including claims other agents wrote while you were working:\n${readBoard(input.root)}\nDo not repeat a claim already here word for word. A new distinction is worth sharing. The board is not evidence of an outside fact.`,
    ),
  ];
  const finishFromNotes = async (): Promise<{ text: string; sources: string[] }> => {
    input.onCall();
    input.onWait("answering from what was read");
    const done = await readModel(
      input.model,
      withBoard([vscode.LanguageModelChatMessage.User(`${input.prompt}\n\nWhat the tools returned:\n${notes.join("\n\n") || "nothing"}`)]),
      undefined,
      input.token,
    );
    return { text: done.text, sources };
  };
  try {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    if (input.token.isCancellationRequested) throw new Error("Stopped");
    input.onCall();
    input.onWait(round === 0 ? "asking the model" : "asking the model again");
    let turn: { text: string; calls: vscode.LanguageModelToolCallPart[] };
    try {
      turn = await readModel(input.model, withBoard(messages), investigateTools, input.token);
    } catch (error) {
      if (input.token.isCancellationRequested) throw error;
      if (round === 0 && !notes.length) {
        input.onCall();
        const plain = await readModel(input.model, withBoard(messages), undefined, input.token);
        return { text: plain.text, sources };
      }
      return finishFromNotes();
    }
    if (!turn.calls.length) return { text: turn.text, sources };
    const results: vscode.LanguageModelToolResultPart[] = [];
    for (const call of turn.calls) {
      if (call.name === "fetch_url") {
        fetches += 1;
        if (fetches > MAX_FETCHES) {
          const body = "Fetch budget is spent. Use what you already have.";
          notes.push(`${call.name}: ${body}`);
          results.push(new vscode.LanguageModelToolResultPart(call.callId, [new vscode.LanguageModelTextPart(body)]));
          continue;
        }
      }
      input.onTool(call.name);
      const output = await runTool(input.root, call.name, call.input ?? {}, input.approve);
      if (output.cite) sources.push(output.cite);
      notes.push(`${call.name}: ${output.body.slice(0, 1500)}`);
      input.onWait(`${call.name} done`);
      results.push(new vscode.LanguageModelToolResultPart(call.callId, [new vscode.LanguageModelTextPart(output.body)]));
    }
    messages.splice(
      0,
      messages.length,
      vscode.LanguageModelChatMessage.User(
        `${input.prompt}\n\nWhat the tools returned so far:\n${notes.join("\n\n")}\n\nIf you need another tool, call it. If you can answer, reply with only the JSON.`,
      ),
    );
    void results;
  }
  return await finishFromNotes();
  } catch (error) {
    if (input.token.isCancellationRequested || (error instanceof Error && error.name === "NodeBudget")) throw error;
    const message = error instanceof Error ? error.message : "The model request failed.";
    input.onError(message);
    if (!notes.length) return { text: "{\"skip\":true}", sources };
    try {
      return await finishFromNotes();
    } catch (again) {
      input.onError(again instanceof Error ? again.message : "The model request failed.");
      return { text: "{\"skip\":true}", sources };
    }
  }
}
