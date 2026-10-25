# Seguimiento de sesión por ejercicio

## Comportamiento

- El seguimiento muestra una sola tarjeta de ejercicio y su historial contextual.
- Un selector numerado y botones anterior/siguiente permiten alternar sin una lista vertical de tarjetas.
- El control de posición dentro de la tarjeta permite cambiar su lugar en esta sesión. El ejercicio seleccionado permanece seleccionado tras reordenar; la plantilla de rutina y los snapshots no se modifican.
- Peso, repeticiones, tipo de carga y calentamiento se conservan por ejercicio. El ejercicio seleccionado se recupera con el borrador de la pestaña después de recargar.
- La navegación inferior permanece visible durante el seguimiento. Con una sesión activa, Entrenar vuelve a ella; al explorar otras pestañas se conserva el descanso y la acción de retomar.
- FREE muestra un estado inicial para agregar un ejercicio. Los ejercicios omitidos siguen disponibles en el selector para reanudarlos.

## Implementación y límites

- Selección local por ID de ejercicio de sesión; el servidor mantiene el orden y los registros como fuente de verdad.
- Se corrige el reordenamiento de API en dos fases para evitar colisiones temporales de posiciones únicas.
- Sin nuevas tablas, migraciones, recomendaciones de carga ni sincronización offline.

## Verificación

- Pasaron `npm test`, build TypeScript/Vite/PWA y 54 pruebas backend, incluidas tres regresiones de orden en ambas direcciones y posiciones grandes, conservando IDs, series, snapshots y plantilla.
- Pasó `node scripts/test-owner-auth.mjs` con API y base temporal: una sola tarjeta, selector/flechas, borradores y calentamientos independientes, recuperación de selección al recargar, orden fallido/reintento, omitir/reanudar, historial contextual, FREE vacío y alta de ejercicio, y navegación inferior con descanso activo.
- Sin desbordamiento a 320, 375, 768 y 1440 px; la tarjeta y su historial pueden mostrarse completos por encima de los menús. Capturas móviles y escritorio revisadas. `git diff --check` pasó.

## Entrega

- Rama: `feature/focused-session-exercises`, basada en la entrega de historial contextual (PR #25).
- PR: pendiente de implementación y verificación.
