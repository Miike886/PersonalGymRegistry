# Variantes de ejercicios

## Propósito y comportamiento

- Elegir una variante por ejercicio y sesión en PPL y FREE: Smith, una máquina concreta u otra alternativa, sin cambiar la plantilla de rutina.
- Crear variantes reutilizables desde la sesión, con nombre y registro de carga tal como se ingresa o por mano. El peso sigue siendo manual, sin conversiones ni cálculos de máquinas.
- El registro Original conserva los ejercicios y series anteriores. No se asignan variantes retroactivamente ni se renombran ejercicios existentes.
- Referencias recientes y gráficas separan el ejercicio y la variante; el detalle histórico muestra ambos nombres.
- La selección se guarda en el servidor, sobrevive a recargas y solo puede cambiarse cuando el ejercicio no tiene series. Cambiarla limpia peso, repeticiones y tipo de carga en borrador para no reutilizar datos de otra máquina.

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
- Verificación y PR: pendientes de completar durante esta entrega.
