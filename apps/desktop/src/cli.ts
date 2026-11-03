import { startServer } from "./server.ts";

const port = Number(process.env.BIGSWARM_PORT ?? 4173);
await startServer(port);
console.log(`http://127.0.0.1:${port}`);
