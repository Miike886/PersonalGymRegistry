# Próximas features

Ideas detectadas durante el uso real. Cada feature se definirá y entregará en su propia rama y pull request.

## Navegación durante una sesión activa

- Estado: implementada en PR #13; pendiente de aprobación.
- Problema: una sesión iniciada ocupa toda la aplicación e impide volver a Inicio, Historial y detalles.
- Permitir explorar las pantallas mientras la sesión continúa activa.
- Mostrar una acción persistente y visible para retomar el entrenamiento en curso.
- Cambiar de pantalla nunca debe finalizar ni cancelar la sesión, ni perder las series guardadas o los datos que se están escribiendo.
- Conservar la regla de una única sesión activa y su recuperación al reabrir la aplicación.
- Fuera de la slice de login y autorización.

## Ejercicio nuevo por texto libre

- Estado: implementada en PR #14; pendiente de aprobación.
- En una sesión FREE, permitir escribir un ejercicio que no existe en la lista desde el selector de agregar o sustituir.
- Definir si se conserva en el catálogo para siguientes sesiones, cómo evitar duplicados y qué convención de carga usa.
- Mantener su nombre como snapshot histórico de la sesión.

## Tiempo de sesión y descanso de 2:45

- Estado: implementado en PR #15; pendiente de aprobación.
- Mostrar el tiempo transcurrido de la sesión en vivo.
- Mostrar el descanso y reiniciarlo a 2 minutos y 45 segundos al registrar una nueva serie.
- Sustituye el descanso anterior de 3 minutos por 2:45 persistente en el servidor.
- Cada serie nueva, incluidos calentamientos, reinicia el descanso según el requisito de cada registro. Editar una serie no lo reinicia.

## Continuidad al cambiar de aplicación y temporizador superpuesto

- Estado: continuidad y ventana flotante opcional implementadas en PR #16; pendiente de aprobación. Superposición externa móvil no disponible universalmente.
- Poder salir del navegador o PWA del celular, usar otras aplicaciones y retomar el entrenamiento conservando su estado.
- Recalcular los tiempos usando marcas de tiempo al volver, para reflejar el tiempo realmente transcurrido.
- Evaluar la posibilidad de mantener visible un temporizador superpuesto fuera de la aplicación.
- Verificar por separado Safari/iPhone, Chrome/Android y PWA instalada; definir alternativas según el soporte real de cada plataforma.

## Gráficas y exploración del progreso

- Estado: pendiente de definición.
- Visualizaciones del entrenamiento a lo largo del tiempo.
- Consultas por ejercicio, sesión y periodos de tiempo.
- Alinear las métricas concretas y cómo comparar cargas totales, por mano, asistidas y de peso corporal.
- Diseñar las vistas a partir del historial real, manteniendo intactos los registros originales.

## Pulido visual posterior

- Estado: pendiente de más detalles del usuario.
- Conservar la dirección Performance con verde lima como base.
- Recopilar observaciones del uso real y ajustar el diseño según esos casos.

## Calendario de asistencia

- Estado: implementado en PR apilada de calendario; pendiente de aprobación.
- Calendario visual de los días con entrenamientos finalizados y acceso a sus sesiones.
- Detalle y criterios: [Calendario de asistencia](features/workout-attendance-calendar.md).

## Cargas en libras

- Estado: implementada en PR #12; pendiente de aprobación. La reinterpretación del historial anterior sigue pendiente de confirmación.
- Usar lb por defecto, conforme al gimnasio del propietario.
- Confirmar el significado de las cargas anteriores antes de convertirlas o cambiar sus etiquetas.
- Detalle y criterios: [Cargas en libras](features/pounds-load-units.md).
