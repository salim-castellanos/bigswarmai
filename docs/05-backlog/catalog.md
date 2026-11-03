# Catálogo — backlog

Padre de `docs/05-backlog/`. Jerarquía módulo → épica → feature → HU.

## Módulos

| Módulo | Para qué |
| --- | --- |
| [01-workspace](01-workspace/) | La carpeta-problema: memoria, objetivo, tablero y herramientas |

## Mapa

```text
01-workspace /
  E-001-problema /
    F-001-carpeta /
      HU-001-abrir-carpeta.md
      HU-002-objetivo.md
    F-002-tablero /
      HU-003-descubrimiento.md
    F-003-lectura /
      HU-004-leer-carpeta.md
    F-004-ejecucion /
      HU-005-editar-comando.md
      HU-006-lanzar-enjambre.md
      HU-007-parar-reanudar.md
      HU-008-mcp.md
    F-005-panel /
      HU-009-panel.md
      HU-010-conexion.md
      HU-011-asistente.md
```

| ID | Tipo | Título | Padre | needs |
| --- | --- | --- | --- | --- |
| E-001 | épica | Un problema que se puede retomar | 01-workspace | — |
| F-001 | feature | Carpeta con memoria | E-001 | — |
| HU-001 | HU | Abrir carpeta e inicializar o cargar | F-001 | — |
| HU-002 | HU | Guardar un objetivo | F-001 | HU-001 |
| F-002 | feature | Tablero de descubrimientos | E-001 | F-001 |
| HU-003 | HU | Publicar un descubrimiento significativo | F-002 | HU-001 |
| F-003 | feature | Lectura de la carpeta | E-001 | F-001 |
| HU-004 | HU | Listar, buscar y leer | F-003 | HU-001 |
| F-004 | feature | Ejecución del enjambre | E-001 | F-002, F-003 |
| HU-005 | HU | Editar y ejecutar con pregunta | F-004 | HU-004 |
| HU-006 | HU | Lanzar el enjambre con un proveedor | F-004 | HU-002, HU-003, HU-004 |
| HU-007 | HU | Parar y reanudar | F-004 | HU-006 |
| HU-008 | HU | Conectar un MCP a un objetivo | F-004 | HU-006 |
| F-005 | feature | Panel en el IDE | E-001 | F-001 |
| HU-009 | HU | Ver el panel en la carpeta abierta | F-005 | HU-001 |
| HU-010 | HU | Conectar orquestador y agentes | F-005 | HU-009 |
| HU-011 | HU | Asistente de objetivo y subobjetivos | F-005 | HU-009 |

El runbook `001-ventana` ejecutó el módulo de archivos (HU-001…HU-004) con un formulario. El siguiente corte es el panel: HU-009, HU-010 y HU-011. HU-005…HU-008 siguen después.
