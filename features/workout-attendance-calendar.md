# Calendario de asistencia

## Propósito y comportamiento

- Calendario mensual, de lunes a domingo, con días de asistencia destacados, cantidad de sesiones y acceso al detalle histórico.
- Botones mes anterior/siguiente e Ir a hoy; selección accesible de cualquier día y mensaje vacío explícito.
- Usa la fecha local de inicio. Dos sesiones en un día cuentan como un día de asistencia; los días muestran el número de sesiones.
- Excluye sesiones activas y canceladas; deriva las marcas del mismo historial que actualiza finalizar/eliminar.
- Navegable durante un entrenamiento sin perder borradores; Retomar sigue disponible.

## Implementación y límites

- Rejilla de botones semánticos responsive, sin nuevas dependencias.
- Reutiliza GET /workouts autenticado: no nueva API, tabla ni migración. La escala actual de un propietario permite filtrar el historial completo en memoria.
- No registro manual, planificación de rutinas ni cambio de fechas históricas. En volúmenes mayores se evaluará consulta por rango junto con paginación del historial.

## Verificación

- npm test ejecuta helpers reales: medianoche UTC/zona local, varias sesiones, exclusión de activas, eliminación y años bisiestos.
- Navegador real: Inicio → Calendario → día con asistencia → detalle → Retomar conserva los datos introducidos.
- Build TypeScript/PWA y regresiones backend antes de entrega; CI ejecuta pruebas del modelo de calendario.

## Entrega

- Rama feature/workout-attendance-calendar, base feature/background-session-continuity; PR #17, integrada en su base; integrada en `main` mediante [PR #21](../docs/integration-main.md).
- Quality gate: sin hallazgos bloqueantes tras revisar contrato, fechas locales, exclusión de activas, botones accesibles y navegación conservando borradores. Pruebas locales pasan; CI se verifica antes de entrega global.
