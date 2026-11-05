# Lecciones — BigSwarmAI

La regla genérica está en el molde, `docs/00-howto/enjambre.md`. Aquí solo queda cómo se vio en este producto. El harness de esta app es `docs/03-architecture/02-harness-investigacion.md` (`investigate` 3).

| Síntoma | Qué pasó | Regla aquí |
| --- | --- | --- |
| Tras `read_board` la bitácora se cortaba | La vuelta siguiente al modelo fallaba y no se escribía el error | El fallo va a `.bigswarm/errors.json` y a una línea de la bitácora |
| «Resultado listo» con el informe vacío | Los agentes respondieron `skip` porque el tablero ya tenía notas | El tablero no es prueba. El informe de `research/` solo trae lo que esta corrida aportó |
| Un subobjetivo en `1/30` y el otro en `31/30` | Un solo id activo recibía las llamadas de las dos ramas | Cada llamada se carga al nodo que la hizo. El tope para esa fila |
| Run again no rehacía los subobjetivos | Solo repetía el nodo seleccionado | Run again recorre ese nodo y los que cuelgan de él. Start se salta lo ya hecho |
| No hubo `fetch_url` | La descripción decía «solo si no está en la carpeta» y el tablero parecía tener el dato | No obligar la web. Decir que una nota del tablero no es el dato de fuera |
