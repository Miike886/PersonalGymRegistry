# Variantes de ejercicios

## Propósito y comportamiento

- Elegir una variante por ejercicio y sesión en PPL y FREE: Smith, una máquina concreta u otra alternativa, sin cambiar la plantilla de rutina.
- Crear variantes reutilizables desde la sesión, con nombre y registro de carga tal como se ingresa o por mano. El peso sigue siendo manual, sin conversiones ni cálculos de máquinas.
- El registro Original conserva los ejercicios y series anteriores. No se asignan variantes retroactivamente ni se renombran ejercicios existentes.
- Referencias recientes y gráficas separan el ejercicio y la variante; el detalle histórico muestra ambos nombres.
- La selección se guarda en el servidor, sobrevive a recargas y solo puede cambiarse cuando el ejercicio no tiene series. Cambiarla limpia peso, repeticiones y tipo de carga en borrador para no reutilizar datos de otra máquina. Los borradores incluyen la identidad de variante y se descartan si el servidor tiene otra selección al recuperar la sesión.

## API y datos

- Migración Alembic 0006: catálogo `exercise_variants`, selección y snapshots de nombre y convención en `workout_exercises`. Los registros anteriores permanecen con variante nula (Original).
- `GET /exercises` incluye variantes. `PUT /workout-exercises/{id}/variant` elige un `variant_id` (nulo para Original) o crea y selecciona mediante `name` y `load_convention`.
- API autenticada, bloqueo por sesión, rechazo de variantes de otro ejercicio, sesiones finalizadas y cambios con series. Crear un nombre existente reutiliza su variante si coincide la convención.
- Aplicar 0006 antes de desplegar backend y frontend. El downgrade se rechaza si borraría selecciones de variantes.

## Límites

- Una variante por ejercicio en cada sesión; sin mezcla por serie, edición retroactiva, renombrado o eliminación de variantes.
- Las variantes se eligen explícitamente por sesión; no modifican la elección predeterminada de las rutinas.

## Verificación y entrega

- Rama: `feature/exercise-variants`.
- Backend: `uv run --locked pytest -q`, 71 pruebas correctas. Migración SQLite con series históricas, snapshots, validación, autorización, reutilización y rechazo de cambios con series o sesión finalizada.
- Frontend: `npm.cmd test` y `npm.cmd run build`, correctos. Referencias y gráficas separan Original y cada variante.
- Navegador Edge/API/proxy con base temporal: creación y reintento tras error, fallo de refresco posterior al guardado, reutilización, selección Original, borradores, cambio externo de selección y recarga, bloqueo con series, detalle histórico y gráficas separadas. Diseños comprobados a 320/375/1440 px; capturas móviles inspeccionadas.
- PostgreSQL: cuatro regresiones correctas en CI con migraciones reales, incluida selección en espera mientras otra conexión registra una serie, incluso con relaciones ORM previamente cargadas. No hay servidor PostgreSQL local activo.
- PR [#29](https://github.com/Miike886/PersonalGymRegistry/pull/29), abierta contra `main`, sin fusionar. Los cinco jobs de Verify pasaron en `b3eeefe`: backend, PostgreSQL, auditorías, modelos/build y navegador Chromium en Linux.
- Quality-gate: revisados título, descripción y diff de los 16 archivos contra `main`, contratos API, snapshots, aislamiento por variante, bloqueo concurrente, recuperación de borradores, acceso privado, migración y rollback, y pantallas móviles. Resueltos refresco fallido tras guardar selección y borradores incompatibles con otra variante. Sin hallazgos bloqueantes; `git diff --check` correcto.
- No se ha desplegado ni modificado la base de producción. Los previews automáticos de Vercel no certifican producción; antes de publicar se requiere aplicar 0006. La comprobación física en iPhone/Android sigue siendo manual.
