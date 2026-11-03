---
id: 002-panel
status: plan-ready
---

# Plan 002 — Panel

## Enfoque

El árbol y la regla de “conexión lista” viven en el módulo ya probado. La extensión de VS Code solo los muestra y llama a `vscode.lm`.

## Archivos y módulos

- `apps/desktop/src/workspace.ts` — nodos y `connectionReady`
- `apps/desktop/tests/objectives.test.ts`
- `apps/extension` — `package.json`, vista, pestañas Conexión y Agregar objetivo

## Riesgos

`selectChatModels` puede devolver vacío hasta que el operador cargue modelos en VS Code. La prueba del modelo abre el consentimiento de VS Code.

## Orden de construcción

Funciones y pruebas, después el paquete de la extensión.
