# Cierre de sesiones olvidadas

## Propósito y comportamiento

- Las sesiones activas caducan a las cinco horas desde su inicio, sin depender de que la PWA permanezca abierta.
- Al finalizar manual o automáticamente, el final es la hora de registro de la última serie conservada, incluido calentamiento. Editar una serie no modifica esa hora. Sin series, el final coincide con el inicio y la duración es cero.
- Se conservan todas las series y no se recalculan sesiones ya finalizadas. El cierre limpia el descanso y permite iniciar otro entrenamiento.
- El servidor comprueba la caducidad al leer entrenamientos y antes de aceptar mutaciones. Una sesión caducada rechaza nuevas series o ediciones. Finalizar de nuevo devuelve la sesión cerrada sin cambiar sus tiempos.
- La app abierta solicita la comprobación al alcanzar el límite, recupera errores y retira la sesión activa y sus borradores cuando el servidor confirma el cierre. El historial se consulta después de comprobar la sesión activa y se reconcilia con ella para mostrar el cierre en esa misma actualización.

## Implementación y límites

- Sin cambios de esquema, dependencias ni migraciones. Rama independiente desde `main`; no incorpora variantes ni depende de la migración 0006 pendiente.
- El cierre persistido ocurre en la primera consulta pertinente después del límite. Sin solicitudes no hay un proceso programado en segundo plano; la duración final siempre usa la última serie, aunque se vuelva días después.
- La hora de registro es la referencia disponible; no se estima el instante físico de terminación de una serie. No hay edición retroactiva ni reparación automática del historial anterior.

## Verificación y entrega

- Rama: `feature/automatic-session-finish`.
- Backend: `uv run --locked pytest -q`, 82 pruebas correctas. Cubren cierre manual y automático, límite exacto, última serie entre ejercicios, calentamientos, series editadas/eliminadas, duración cero, rechazo persistido de escrituras, nuevo entrenamiento, privacidad e historial previo intacto.
- Frontend: `npm.cmd run build` y `npm.cmd test`, correctos; tiempos UTC, límite exacto y relojes recuperados sin inflación.
- Edge/API/proxy con base temporal: cierre manual sin tiempo ocioso, llegada real al límite con la app abierta, fallo de consulta y reintento, aviso y navegación al historial, conservación de series, limpieza de borradores e inicio posterior. Comprobado a 320/375/1440 px y captura móvil inspeccionada.
- PostgreSQL: cinco regresiones correctas en CI con migraciones reales, incluidas dos lecturas de cierre simultáneas y escritura en espera con una fecha de inicio ORM desactualizada.
- PR [#30](https://github.com/Miike886/PersonalGymRegistry/pull/30), abierta contra `main`, sin fusionar. Los checks remotos de Verify se consultan en la misma PR.
- Quality-gate: revisados título, descripción y diff de los 13 archivos contra `main`, reglas de cierre, preservación de series e historial, privacidad, bloqueo concurrente, relojes, recuperación y pantallas móviles. Resuelta la carrera entre lectura de sesión activa e historial; build y navegador repetidos correctamente. Sin hallazgos bloqueantes; `git diff --check` correcto.
- Sin despliegue ni cambios en producción. No se modificó la PR #29 pendiente. La validación física en iPhone/Android sigue siendo manual.
