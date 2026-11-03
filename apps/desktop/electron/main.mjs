import { app, BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.BIGSWARM_PORT ?? "4173";
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const child = spawn("node", [tsx, "src/cli.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, BIGSWARM_PORT: port },
});

app.whenReady().then(() => {
  const window = new BrowserWindow({ width: 880, height: 760 });
  window.loadURL(`http://127.0.0.1:${port}`);
});

app.on("window-all-closed", () => {
  child.kill();
  app.quit();
});
