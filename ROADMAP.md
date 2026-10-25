# Estado de features y pendientes

Ideas detectadas durante el uso real. Cada feature se definirá y entregará en su propia rama y pull request.

Las PR #12–#20 se integraron en `main` mediante la PR [#21](https://github.com/Miike886/PersonalGymRegistry/pull/21), fusionada el 22 de octubre de 2026. La activación y comprobación de producción se documentan por separado.

Estado comprobado el 24 de octubre de 2026 (hora de México): las PR #22–#26 también están fusionadas; no hay PR abiertas. La prioridad actual es [mantener saludable el repositorio](docs/repository-health.md). Esto no implica que todo el trabajo local esté integrado: existe una rama de hardening pendiente de revisión.

## Entregas recientes

- [PR #22](https://github.com/Miike886/PersonalGymRegistry/pull/22): navegación inferior e historial con calendario. Ajustes conserva su placeholder.
- [PR #23](https://github.com/Miike886/PersonalGymRegistry/pull/23): referencias por ejercicio, fusionada en la rama de navegación; llegó a `main` mediante #25.
- [PR #24](https://github.com/Miike886/PersonalGymRegistry/pull/24): regreso al navegar y descanso global; llegó a `main` mediante #25.
- [PR #25](https://github.com/Miike886/PersonalGymRegistry/pull/25): historial contextual debajo de cada ejercicio.
- [PR #26](https://github.com/Miike886/PersonalGymRegistry/pull/26): seguimiento por ejercicio, selector, anterior/siguiente, reordenamiento y navegación inferior durante la sesión.

## Configuración de cuenta y aplicación

- Estado: feature futura; por ahora existe un acceso placeholder en la navegación inferior.
- Definir qué opciones personales y de la aplicación son necesarias antes de implementar su comportamiento.

## Navegación durante una sesión activa

- Estado: implementada en PR #13 e integrada en `main` mediante PR #21.
- Problema: una sesión iniciada ocupa toda la aplicación e impide volver a Inicio, Historial y detalles.
- Permitir explorar las pantallas mientras la sesión continúa activa.
- Mostrar una acción persistente y visible para retomar el entrenamiento en curso.
- Cambiar de pantalla nunca debe finalizar ni cancelar la sesión, ni perder las series guardadas o los datos que se están escribiendo.
- Conservar la regla de una única sesión activa y su recuperación al reabrir la aplicación.
- Fuera de la slice de login y autorización.

## Ejercicio nuevo por texto libre

- Estado: implementada en PR #14 e integrada en `main` mediante PR #21.
- En una sesión FREE, permitir escribir un ejercicio que no existe en la lista desde el selector de agregar o sustituir.
- Definir si se conserva en el catálogo para siguientes sesiones, cómo evitar duplicados y qué convención de carga usa.
- Mantener su nombre como snapshot histórico de la sesión.

## Tiempo de sesión y descanso de 2:45

- Estado: implementado en PR #15 e integrado en `main` mediante PR #21.
- Mostrar el tiempo transcurrido de la sesión en vivo.
- Mostrar el descanso y reiniciarlo a 2 minutos y 45 segundos al registrar una nueva serie.
- Sustituye el descanso anterior de 3 minutos por 2:45 persistente en el servidor.
- Cada serie nueva, incluidos calentamientos, reinicia el descanso según el requisito de cada registro. Editar una serie no lo reinicia.

## Continuidad al cambiar de aplicación y temporizador superpuesto

- Estado: continuidad y ventana flotante opcional implementadas en PR #16 e integradas en `main` mediante PR #21. Superposición externa móvil no disponible universalmente.
- Poder salir del navegador o PWA del celular, usar otras aplicaciones y retomar el entrenamiento conservando su estado.
- Recalcular los tiempos usando marcas de tiempo al volver, para reflejar el tiempo realmente transcurrido.
- Evaluar la posibilidad de mantener visible un temporizador superpuesto fuera de la aplicación.
- Verificar por separado Safari/iPhone, Chrome/Android y PWA instalada; definir alternativas según el soporte real de cada plataforma.

## Gráficas y exploración del progreso

- Estado: gráficas con filtros y métricas conservadoras implementadas en PR #18 e integradas en `main` mediante PR #21.
- Visualizaciones del entrenamiento a lo largo del tiempo.
- Consultas por ejercicio, sesión y periodos de tiempo.
- Alinear las métricas concretas y cómo comparar cargas totales, por mano, asistidas y de peso corporal.
- Diseñar las vistas a partir del historial real, manteniendo intactos los registros originales.

## Pulido visual posterior

- Estado: pendiente de más detalles del usuario.
- Se entrega aparte pulido funcional de formularios, errores y protección contra envíos repetidos; no sustituye la futura alineación estética.
- Pulido funcional: PR #19, integrado en `main` mediante PR #21.
- Conservar la dirección Performance con verde lima como base.
- Recopilar observaciones del uso real y ajustar el diseño según esos casos.

## Calendario de asistencia

- Estado: implementado en PR #17 e integrado en `main` mediante PR #21.
- Calendario visual de los días con entrenamientos finalizados y acceso a sus sesiones.
- Detalle y criterios: [Calendario de asistencia](features/workout-attendance-calendar.md).

## Cargas en libras

- Estado: implementada en PR #12 e integrada en `main` mediante PR #21. Los registros históricos conservan su unidad y valor; no se presupone el estado actual de la base de producción.
- Usar lb por defecto, conforme al gimnasio del propietario.
- Las sesiones futuras usan lb por defecto; no se convierten registros anteriores.
- Detalle y criterios: [Cargas en libras](features/pounds-load-units.md).

## Registro de la cuenta propietaria

- Estado: implementado en PR #20 e integrado en `main` mediante PR #21.
- Permite crear una sola cuenta con un código privado de activación, conserva el historial y cierra el registro después de crearla.
- Detalle y activación: [Registro propietario](features/owner-registration.md).
