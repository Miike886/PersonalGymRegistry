# Salud del repositorio

## Estado comprobado

Revisión iniciada el 24 de octubre de 2026, hora de México. Base remota: `main` en `3fa3ef6` (PR #26). Los primeros ajustes de documentación y dependencias quedaron registrados en el commit local `ac18255`; las correcciones de integridad posteriores se registran en otro commit de mantenimiento.

- Las PR #1–#26 están fusionadas, directamente en `main` o mediante sus PR de integración. No hay PR abiertas al consultar GitHub.
- El workflow Verify de esa base pasó sus tres jobs originales. El workflow local añade control de requirements, auditorías y concurrencia PostgreSQL; su ejecución remota y programación semanal comenzarán después de publicarlo.
- README, ROADMAP y documentos de entrega reflejan las integraciones reales. El estado de Git no certifica el despliegue ni la activación de producción.

## Correcciones de mantenimiento

- Lockfile npm actualizado: Vite 8.3.5, fast-uri 3.1.9, source-map-js 1.2.2 y serialize-javascript 7.1.4. La auditoría inicial notificaba cuatro paquetes afectados, dos de severidad alta; después de actualizar reporta cero vulnerabilidades conocidas. También cambian dependencias transitivas del build. No se usó `--force`.
- `backend/requirements.txt` se genera desde las dependencias runtime de `uv.lock`, con versiones exactas y marcadores de plataforma. `scripts/check_requirements.py` lo genera y comprueba; CI rechaza divergencias. No incluye las herramientas dev. La instalación de desarrollo usa `uv sync --locked --dev`.
- La auditoría de todos los paquetes de `uv.lock`, incluidos desarrollo y otras plataformas, detectó `PYSEC-2026-4320` en certifi 2026.7.22. Se actualizó a 2026.10.23; `scripts/audit_python.py` pasa sin vulnerabilidades conocidas. El script no instala las dependencias auditadas.
- Git ignora bases SQLite y sus archivos journal/WAL/SHM para reducir el riesgo de versionar datos privados. No se encontraron bases SQLite versionadas.
- Se conservaron las ramas existentes y no se cambiaron reglas de entrenamiento, esquema, secretos ni destinos de producción. El seed ahora requiere migraciones previas, SQLite valida claves foráneas y las mutaciones PostgreSQL comparten un bloqueo por entrenamiento.

## Resolución de la rama de hardening

Se revisaron los tres commits exclusivos de `feature/repository-hardening` contra el `main` vigente. Se portaron selectivamente; no se fusionó la rama completa:

| Commit | Resolución |
| --- | --- |
| `f6a9f4a` | Recuperados bloqueo/refresco de mutaciones, conflicto 409 al crear sesiones simultáneas, inserción en posiciones ocupadas, rechazo de IDs inactivos, claves foráneas SQLite y seed con migraciones. Dependencias y privacidad ya alineadas. |
| `39b1586` | Recuperadas protección contra respuestas tardías, eliminación con guard y memorización adaptada a una sola tarjeta. Etiquetas de cargas desconocidas y reordenamiento ya estaban resueltos por #25/#26. |
| `c6288a2` | Sustituido por el estado actualizado de este documento y los documentos de features; el informe antiguo se conserva en su rama como evidencia histórica. |

La propuesta de no reiniciar descanso tras calentamientos no se incorporó: contradice la regla vigente, documentada y probada de que cada serie reinicia 165 segundos. No hay un cambio de requisito autorizado que justifique sustituirla. Tampoco se reintrodujo la lista antigua de tarjetas ni se cambió la presentación histórica.

Las regresiones recuperadas reprodujeron seis fallos antes de las correcciones; después pasan. Las cuatro pruebas adicionales de orden ya pasaban y se conservaron como casos de rangos grandes. `git cherry` seguirá mostrando commits exclusivos porque no se hizo cherry-pick: el contenido se adaptó al producto actual. La rama se conserva; no es una entrega pendiente de fusión completa.

`feature/smart-set-entry` aparece fuera de la ascendencia de `main`, pero su commit `5a0e500` es equivalente por patch-id a código ya integrado (`git cherry` lo marca con `-`); no requiere otra entrega.

## Verificación de esta revisión

- `cd backend; uv run --locked pytest -q`: 64 pruebas correctas después de recuperar las regresiones y actualizar certifi. Persisten dos avisos de deprecación de Starlette/httpx y AnyIO; no se ocultan.
- `cd frontend; npm.cmd test`: modelos de calendario, progreso y referencias correctos.
- `cd frontend; npm.cmd run build`: TypeScript, Vite y generación PWA correctos después de actualizar dependencias.
- `npm.cmd audit --package-lock-only --audit-level=low`: cero vulnerabilidades conocidas.
- `uv run --locked python ../scripts/check_requirements.py` y `uv run --locked python ../scripts/audit_python.py`: correctos; exportación runtime alineada y auditoría de todos los paquetes registry del lock sin vulnerabilidades conocidas.
- `node scripts/test-owner-auth.mjs`: flujo real Edge/API/proxy correcto con base SQLite temporal, registro/login, privacidad, recuperación y borradores, errores/reintentos, navegación, calendarios/gráficas y anchos responsive. Añadidas respuesta de detalle tardía y eliminación con doble activación, fallo y reintento. Se ejecutó fuera del sandbox porque este impidió arrancar los servidores locales.
- PostgreSQL: `uv run --locked pytest -q integration --tb=short` pasó las tres pruebas en PostgreSQL 16.15 portátil, escuchando solo en 127.0.0.1:55439. Cubren dos series concurrentes con posiciones 1/2, creación concurrente con respuesta 201/409 y rechazo de una escritura en espera tras finalizar la sesión, incluso con un objeto ORM desactualizado. Aplican migraciones a esquemas únicos, consultan `pg_blocking_pids` para demostrar bloqueo real y eliminan esos esquemas al terminar. Solo admiten una base loopback llamada `gym_integrity_test`. CI incluye PostgreSQL 16. Se usaron binarios portátiles porque Docker no podía arrancar sin WSL; no se instaló WSL ni se modificó producción.
- Sintaxis Python y estructura YAML del workflow verificadas localmente.
- `git diff --check`: correcto. Los patrones de exclusión SQLite se comprobaron con `git check-ignore`.

Revisión de calidad: se inspeccionaron los diffs contra la base vigente y la rama antigua, documentación de features, reglas de dominio, restricciones, rollback, ausencia de cambios de esquema y aislamiento de datos. El conflicto de creación solo traduce la restricción `uq_one_active_workout` a 409; otros errores de integridad se propagan. Sin hallazgos bloqueantes pendientes para estas correcciones. Los cambios son locales, sin publicación ni despliegue; los checks remotos de la base anterior no se presentan como validación de estos commits nuevos.

## Prioridades siguientes

1. Publicar los commits verificados para activar los cinco jobs de CI y la ejecución semanal. No se publica `main` automáticamente porque puede disparar despliegues de producción.
2. Atender las dos deprecaciones de herramientas de pruebas en un cambio acotado; no son avisos de vulnerabilidad y no se silencian.
3. Confirmar por separado backend/frontend publicados, migración 0005, activación privada y continuidad en iPhone/Android/PWA. Usar una base aislada para previews; el proxy preview apunta por defecto a producción.
4. Antes de eliminar ramas, verificar diferencias por contenido y patch-id, especialmente en ramas apiladas. La rama histórica de hardening se conserva con sus propuestas descartadas explícitas.

## Rutina de mantenimiento

- Antes de empezar, actualizar referencias y comprobar `git status`, la base y las PR abiertas.
- Mantener un documento por feature y actualizar sus estados reales al cerrar la entrega; separar verificación local, CI, integración y producción.
- Usar `uv sync --locked --dev` y `npm ci`; revisar explícitamente los cambios de locks y auditar npm al actualizarlos.
- Regenerar requirements con `scripts/check_requirements.py --write`; el workflow comprueba divergencias y auditorías en PR, push a main, cada lunes a las 09:23 UTC y bajo ejecución manual. Solo tiene permiso de lectura; no aplica actualizaciones ni publica código.
- Ejecutar backend, modelos, build y flujo de navegador cuando cambien dependencias de compilación o comportamiento compartido. Terminar con `git diff --check`.
- Nuevas features conservan su rama y PR aisladas; las investigaciones, documentación y correcciones siguen la excepción de AGENTS.md. No hay una nueva feature ni una PR en esta revisión.
