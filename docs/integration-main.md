# Integración en main de las entregas #12–#20

## Alcance

La PR #21 llevó a `main` las entregas ya implementadas y verificadas que se habían integrado entre ramas de features. Fue una PR de integración, sin nuevas features ni cambios adicionales en el código de producto.

Este documento conserva la auditoría de aquella integración. Para la base vigente tras las PR #22–#26, comprobaciones recientes y trabajo local sin integrar, consultar [salud del repositorio](repository-health.md).

| PR original | Entrega |
| --- | --- |
| #12 | Cargas nuevas en libras y conservación de unidades históricas |
| #13 | Navegación durante una sesión activa |
| #14 | Ejercicios por texto libre en sesiones FREE |
| #15 | Tiempo de sesión y descanso persistente de 2:45 |
| #16 | Continuidad y temporizador flotante donde existe soporte |
| #17 | Calendario de asistencia |
| #18 | Gráficas de progreso |
| #19 | Registro y edición de series con errores recuperables |
| #20 | Registro único de la cuenta propietaria |

## Auditoría de ramas

- Base revisada: `origin/main` en `cf60ad5`.
- La rama `origin/feature/session-interaction-polish` en `ab3055c` contiene todo el código vigente de #12–#20 y se incorpora con un merge a `feature/integrate-pending-to-main`, creada desde main.
- Se revisaron todas las ramas locales y remotas. Los commits restantes de las ramas de dependencia son merges que no añaden código exclusivo.
- La única excepción no-merge, `5a0e500` de `feature/smart-set-entry`, es equivalente por patch-id a un cambio ya incorporado. No requiere otra entrega ni reintroducir archivos antiguos.
- Las ramas de despliegue y `feature/rest-timer` no tienen commits pendientes fuera de main. No se eliminan ni se modifican ramas originales.

## Despliegue y límites

- La base de producción debe estar en Alembic 0005 antes de publicar el backend. El propietario mostró la revisión 0005 tras ejecutar las migraciones desde Neon; esta entrega no vuelve a ejecutar migraciones contra producción.
- Mantener `OWNER_SETUP_TOKEN` como secreto del backend de producción durante la creación de la cuenta y retirarlo después. El registro se cierra al crearla.
- Tras integrar a main, comprobar los despliegues de backend y frontend y GET /api/auth/registration. Una respuesta 404 indica un backend que aún no contiene el registro; guardar una variable o redeployar código anterior no incorpora la feature. Esta comprobación de despliegue es distinta de la integración a `main`.
- Se conservan las limitaciones originales: sin superposición móvil universal, sincronización offline ni recuperación automática de contraseña; sin reinterpretar las cargas históricas.

## Verificación y revisión

- Verificado localmente: 51 pruebas backend (incluidas migraciones, unidades, timers y autorización); build TypeScript/Vite/PWA; pruebas de modelos de calendario y progreso; flujo real Edge/API/proxy con base temporal aislada, registro único, login, recuperación de sesión, navegación, temporizadores, calendario, gráficas y edición segura.
- `git diff --check origin/main` pasa. El código de producto, configuración y CI coinciden con la rama acumulativa revisada; los ajustes adicionales son de documentación de integración y estados de entrega.
- Quality-gate: revisados título, descripción, 42 archivos y diff de PR #21 contra main, documentos de features y reglas de dominio. Autorización, registro único, snapshots, unidades, historial de solo lectura, migraciones, temporizadores y recuperación móvil mantienen sus invariantes; sin hallazgos bloqueantes. Checks remotos se comprueban al entregar. La validación real de suspensión en iPhone/Android y activación de producción sigue siendo manual.
- PR de integración: [#21](https://github.com/Miike886/PersonalGymRegistry/pull/21), fusionada en `main` el 22 de octubre de 2026.
