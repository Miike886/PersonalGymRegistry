# Salud del repositorio

## Estado comprobado

Revisión del 24 de octubre de 2026, hora de México. Base: `main` en `3fa3ef6` (PR #26). El checkout local se actualizó por fast-forward desde `origin/main`.

- Las PR #1–#26 están fusionadas, directamente en `main` o mediante sus PR de integración. No hay PR abiertas al consultar GitHub.
- El workflow Verify de esa base pasó sus tres jobs: backend, frontend y navegador autenticado.
- README, ROADMAP y documentos de entrega reflejan las integraciones reales. El estado de Git no certifica el despliegue ni la activación de producción.

## Correcciones de mantenimiento

- Lockfile npm actualizado: Vite 8.3.5, fast-uri 3.1.9, source-map-js 1.2.2 y serialize-javascript 7.1.4. La auditoría inicial notificaba cuatro paquetes afectados, dos de severidad alta; después de actualizar reporta cero vulnerabilidades conocidas. También cambian dependencias transitivas del build. No se usó `--force`.
- `backend/requirements.txt` incluye `pwdlib[argon2]`, necesario para importar la autenticación. La instalación recomendada y reproducible sigue siendo `uv sync --locked --dev`; requirements usa rangos abiertos.
- Git ignora bases SQLite y sus archivos journal/WAL/SHM para reducir el riesgo de versionar datos privados. No se encontraron bases SQLite versionadas.
- Se conservaron las ramas existentes y no se cambiaron reglas de entrenamiento, esquema, secretos ni destinos de producción.

## Trabajo local que aún no está integrado

`feature/repository-hardening` conserva tres commits exclusivos según `git cherry origin/main feature/repository-hardening`:

| Commit | Trabajo |
| --- | --- |
| `f6a9f4a` | Bloqueo de mutaciones, integridad de base de datos y pruebas de regresión |
| `39b1586` | Respuestas tardías de navegación, eliminación protegida y referencias históricas |
| `c6288a2` | Informe de revisión y estados de entrega |

Esta rama mezcla correcciones con cambios ya superados por #25/#26. Además cambia el descanso para que los calentamientos no lo reinicien, mientras la regla actual de `main` y sus pruebas indican que cada serie lo reinicia. Su informe es evidencia histórica de esa rama, no del estado de `main`.

Antes de incorporarla: comparar cada corrección con `main`, reproducir los fallos todavía vigentes y portar solo los cambios necesarios con sus regresiones; mantener la regla de dominio vigente hasta aclarar el requisito de calentamientos. Verificar concurrencia real con PostgreSQL para los bloqueos: SQLite no implementa `FOR UPDATE`. No fusionar toda la rama como actualización rutinaria ni eliminarla.

`feature/smart-set-entry` aparece fuera de la ascendencia de `main`, pero su commit `5a0e500` es equivalente por patch-id a código ya integrado (`git cherry` lo marca con `-`); no requiere otra entrega.

## Verificación de esta revisión

- `cd backend; uv run --locked pytest -q`: 54 pruebas correctas. Persisten dos avisos de deprecación de Starlette/httpx y AnyIO; no se ocultan.
- `cd frontend; npm.cmd test`: modelos de calendario, progreso y referencias correctos.
- `cd frontend; npm.cmd run build`: TypeScript, Vite y generación PWA correctos después de actualizar dependencias.
- `npm.cmd audit --json`: cero vulnerabilidades conocidas después de actualizar. Esta auditoría cubre npm; no certifica dependencias Python.
- `node scripts/test-owner-auth.mjs`: flujo real Edge/API/proxy correcto con base SQLite temporal, registro/login, privacidad, recuperación y borradores, errores/reintentos, navegación, calendarios/gráficas y anchos responsive. Se ejecutó fuera del sandbox porque este impidió arrancar los servidores locales.
- `git diff --check`: correcto. Los patrones de exclusión SQLite se comprobaron con `git check-ignore`.

Revisión final: se inspeccionaron los diffs de documentación, dependencias e instalación frente a `main`, las PR y los checks remotos. Sin bloqueantes para estos ajustes de mantenimiento. Las correcciones funcionales exclusivas de la rama de hardening siguen pendientes y no están certificadas por estas pruebas. Los cambios de esta revisión son locales, sin publicación ni despliegue.

## Prioridades siguientes

1. Resolver el trabajo exclusivo de hardening con pruebas contra el `main` vigente, empezando por mutaciones y concurrencia PostgreSQL.
2. Auditar dependencias Python y atender las deprecaciones de pruebas en un cambio acotado. Mantener las instalaciones de CI basadas en locks.
3. Confirmar por separado backend/frontend publicados, migración 0005, activación privada y continuidad en iPhone/Android/PWA. Usar una base aislada para previews; el proxy preview apunta por defecto a producción.
4. Antes de eliminar ramas fusionadas, verificar diferencias por contenido y patch-id, especialmente en ramas apiladas. La limpieza de nombres no debe perder trabajo exclusivo.

## Rutina de mantenimiento

- Antes de empezar, actualizar referencias y comprobar `git status`, la base y las PR abiertas.
- Mantener un documento por feature y actualizar sus estados reales al cerrar la entrega; separar verificación local, CI, integración y producción.
- Usar `uv sync --locked --dev` y `npm ci`; revisar explícitamente los cambios de locks y auditar npm al actualizarlos.
- Ejecutar backend, modelos, build y flujo de navegador cuando cambien dependencias de compilación o comportamiento compartido. Terminar con `git diff --check`.
- Nuevas features conservan su rama y PR aisladas; las investigaciones, documentación y correcciones siguen la excepción de AGENTS.md. No hay una nueva feature ni una PR en esta revisión.
