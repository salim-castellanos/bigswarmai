---
updated: 2026-11-02
product_pct: 80
delivery_pct: 100
---

# Estado — BigSwarmAI

La idea está en `docs/01-steering/context/product.md`. Este archivo es el informe del producto de este workspace. El `STATUS.md` de la raíz sigue siendo el arquetipo Clave.

| | |
| --- | --- |
| Producto | Ventana que abre una carpeta, guarda el objetivo y los descubrimientos, y puede listar, buscar y leer |
| Avance de **producto** | **80%** — panel del IDE hecho; falta arrancar el enjambre |
| Avance de **entrega** | **100%** — `001-ventana` y `002-panel` en `ai-tested` |
| Siguiente | Arrancar el nodo elegido (HU-006) |
| Probar | Abre `example/apps/extension` y lanza la configuración **BigSwarmAI**. En la barra lateral, Enjambre. |
| Pedir | *sigue con HU-005* |

## Funcionalidades

| ID | Qué | Módulo / épica / feature | Estado HU | % |
| --- | --- | --- | --- | --- |
| HU-001 | Abrir carpeta e inicializar o cargar | 01-workspace / E-001 / F-001 | `done` | 100 |
| HU-002 | Guardar un objetivo | 01-workspace / E-001 / F-001 | `done` | 100 |
| HU-003 | Publicar un descubrimiento significativo | 01-workspace / E-001 / F-002 | `done` | 100 |
| HU-004 | Listar, buscar y leer | 01-workspace / E-001 / F-003 | `done` | 100 |
| HU-005 | Editar y ejecutar con pregunta | 01-workspace / E-001 / F-004 | `backlog` | 0 |
| HU-006 | Lanzar el enjambre con un proveedor | 01-workspace / E-001 / F-004 | `backlog` | 0 |
| HU-007 | Parar y reanudar | 01-workspace / E-001 / F-004 | `backlog` | 0 |
| HU-008 | Conectar un MCP a un objetivo | 01-workspace / E-001 / F-004 | `backlog` | 0 |
| HU-009 | Ver el panel en la carpeta abierta | 01-workspace / E-001 / F-005 | `done` | 100 |
| HU-010 | Conectar orquestador y agentes | 01-workspace / E-001 / F-005 | `done` | 100 |
| HU-011 | Asistente de objetivo y subobjetivos | 01-workspace / E-001 / F-005 | `done` | 100 |

`backlog` = hay HU, no spec `task-ready`. `done` = implement cerrado (G4 de la spec `001-ventana`).

## Avance por corte

| Corte | % | Cómo |
| --- | --- | --- |
| F-001 Carpeta | 100 | HU-001, HU-002 |
| F-002 Tablero | 100 | HU-003 |
| F-003 Lectura | 100 | HU-004 |
| F-004 Ejecución | 0 | HU-005…008 |
| F-005 Panel | 100 | HU-009…011 |
| Épica E-001 | 80 | promedio de F-001…005 |
| **Producto** | **80** | un módulo |

## Entrega (runbooks)

| Runbook | Status | Paso | % |
| --- | --- | --- | --- |
| [001-ventana](docs/07-runbooks/001-ventana/runbook.md) | `ai-tested` | implement | 100 |
| [002-panel](docs/07-runbooks/002-panel/runbook.md) | `ai-tested` | implement | 100 |

## Probado por la IA

- `001-ventana` — ocho pruebas del módulo de carpeta.
- `002-panel` — tres pruebas del árbol y de la conexión; la extensión compiló a `out/extension.js`. No abrí el host de VS Code.

## Aceptado por el humano

Ninguno.

## Cómo se calcula

La fórmula es la del molde (card `status`). Cada HU vale 0 / 50 / 100. Feature = promedio de HUs. Épica = promedio de features. Producto = promedio de módulos. Entrega = promedio del `progress` de los runbooks.

Al crear o avanzar un runbook, este archivo se reescribe en el mismo turno.
