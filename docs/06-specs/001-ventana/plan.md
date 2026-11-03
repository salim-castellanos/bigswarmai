---
id: 001-ventana
status: plan-ready
---

# Plan 001 — Ventana

Sale de la spec `001-ventana`. Cero scope nuevo.

## Enfoque

Un módulo TypeScript hace init, carga, objetivo, eventos y lectura. Un HTTP en `127.0.0.1` lo expone. Electron abre esa página.

## Archivos y módulos

- `apps/desktop/src/workspace.ts` — archivos del workspace y lectura
- `apps/desktop/src/server.ts` — los seis caminos de la spec
- `apps/desktop/src/main.ts` — Electron
- `apps/desktop/renderer/index.html` — pantalla `workspace`
- `apps/desktop/tests/workspace.test.ts` — la tabla de pruebas

## Riesgos

Electron no arranca en un entorno sin pantalla. Las pruebas no lo necesitan. La ventana sí.

## Orden de construcción

Módulo, pruebas, servidor, HTML, Electron.
