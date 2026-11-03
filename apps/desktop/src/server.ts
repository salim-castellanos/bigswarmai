import http from "node:http";
import {
  WorkspaceError,
  addDiscovery,
  listNames,
  openWorkspace,
  readSlice,
  saveObjective,
  searchText,
} from "./workspace.ts";

type Body = Record<string, string>;

function readBody(req: http.IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Body);
      } catch {
        reject(new WorkspaceError("No se pudo escribir la carpeta"));
      }
    });
    req.on("error", reject);
  });
}

export function startServer(port: number): Promise<http.Server> {
  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGE);
      return;
    }
    if (req.method !== "POST" || !req.url?.startsWith("/api/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const body = await readBody(req);
      const path = body.path ?? "";
      let payload: unknown;
      if (req.url === "/api/open") payload = openWorkspace(path);
      else if (req.url === "/api/objective") {
        payload = { objective: saveObjective(path, body.text ?? "") };
      } else if (req.url === "/api/discovery") {
        payload = {
          event: addDiscovery(path, {
            claim: body.claim ?? "",
            why: body.why ?? "",
            source: body.source ?? "",
          }),
        };
      } else if (req.url === "/api/list") payload = { names: listNames(path) };
      else if (req.url === "/api/search") payload = { hits: searchText(path, body.query ?? "") };
      else if (req.url === "/api/read") payload = { text: readSlice(path, body.file ?? "") };
      else {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
    } catch (error) {
      const message = error instanceof WorkspaceError ? error.message : "No se pudo escribir la carpeta";
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: message }));
    }
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

const PAGE = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>BigSwarmAI</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; max-width: 42rem; }
    label { display: block; margin-top: 1rem; }
    input, textarea { width: 100%; }
    pre { white-space: pre-wrap; background: #f4f4f4; padding: 0.75rem; }
    button { margin-top: 0.5rem; margin-right: 0.5rem; }
  </style>
</head>
<body>
  <h1>BigSwarmAI</h1>
  <label>Carpeta <input id="folder" /></label>
  <button id="open">Abrir</button>
  <p id="status"></p>
  <label>Objetivo <textarea id="objective" rows="4"></textarea></label>
  <button id="save">Guardar objetivo</button>
  <h2>Lectura</h2>
  <button id="list">Listar</button>
  <label>Buscar <input id="query" /></label>
  <button id="search">Buscar</button>
  <label>Archivo <input id="file" /></label>
  <button id="read">Leer</button>
  <pre id="output"></pre>
  <h2>Descubrimiento</h2>
  <label>Afirmación <input id="claim" /></label>
  <label>Por qué importa <input id="why" /></label>
  <label>Origen <input id="source" /></label>
  <button id="publish">Publicar</button>
  <ul id="events"></ul>
  <script>
    const folder = document.querySelector("#folder");
    const status = document.querySelector("#status");
    const objective = document.querySelector("#objective");
    const output = document.querySelector("#output");
    const events = document.querySelector("#events");
    function showEvents(list) {
      events.innerHTML = "";
      for (const event of list) {
        const item = document.createElement("li");
        item.textContent = event.claim + " — " + event.why + " (" + event.source + ")";
        events.append(item);
      }
    }
    async function post(url, body) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "error");
      return data;
    }
    document.querySelector("#open").onclick = async () => {
      try {
        const data = await post("/api/open", { path: folder.value });
        status.textContent = data.created ? "Carpeta inicializada." : "Carpeta cargada.";
        objective.value = data.objective;
        showEvents(data.events);
      } catch (error) {
        status.textContent = error.message;
      }
    };
    document.querySelector("#save").onclick = async () => {
      try {
        await post("/api/objective", { path: folder.value, text: objective.value });
        status.textContent = "Objetivo guardado.";
      } catch (error) {
        status.textContent = error.message;
      }
    };
    document.querySelector("#list").onclick = async () => {
      try {
        const data = await post("/api/list", { path: folder.value });
        output.textContent = data.names.join("\\n");
      } catch (error) {
        status.textContent = error.message;
      }
    };
    document.querySelector("#search").onclick = async () => {
      try {
        const data = await post("/api/search", { path: folder.value, query: document.querySelector("#query").value });
        output.textContent = data.hits.map((hit) => hit.file + ":" + hit.line).join("\\n");
      } catch (error) {
        status.textContent = error.message;
      }
    };
    document.querySelector("#read").onclick = async () => {
      try {
        const data = await post("/api/read", { path: folder.value, file: document.querySelector("#file").value });
        output.textContent = data.text;
      } catch (error) {
        status.textContent = error.message;
      }
    };
    document.querySelector("#publish").onclick = async () => {
      try {
        const data = await post("/api/discovery", {
          path: folder.value,
          claim: document.querySelector("#claim").value,
          why: document.querySelector("#why").value,
          source: document.querySelector("#source").value,
        });
        status.textContent = "Descubrimiento publicado.";
        const item = document.createElement("li");
        item.textContent = data.event.claim + " — " + data.event.why + " (" + data.event.source + ")";
        events.append(item);
      } catch (error) {
        status.textContent = error.message;
      }
    };
  </script>
</body>
</html>
`;
