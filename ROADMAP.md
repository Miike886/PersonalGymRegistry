# Próximas features

Ideas detectadas durante el uso real. Cada feature se definirá y entregará en su propia rama y pull request.

## Navegación durante una sesión activa

- Estado: pendiente.
- Problema: una sesión iniciada ocupa toda la aplicación e impide volver a Inicio, Historial y detalles.
- Permitir explorar las pantallas mientras la sesión continúa activa.
- Mostrar una acción persistente y visible para retomar el entrenamiento en curso.
- Cambiar de pantalla nunca debe finalizar ni cancelar la sesión, ni perder las series guardadas o los datos que se están escribiendo.
- Conservar la regla de una única sesión activa y su recuperación al reabrir la aplicación.
- Fuera de la slice de login y autorización.

## Ejercicio nuevo por texto libre

- Estado: pendiente.
- En una sesión FREE, permitir escribir un ejercicio que no existe en la lista desde el selector de agregar o sustituir.
- Definir si se conserva en el catálogo para siguientes sesiones, cómo evitar duplicados y qué convención de carga usa.
- Mantener su nombre como snapshot histórico de la sesión.

## Tiempo de sesión y descanso de 2:45

- Estado: pendiente.
- Mostrar el tiempo transcurrido de la sesión en vivo.
- Mostrar el descanso y reiniciarlo a 2 minutos y 45 segundos al registrar una nueva serie.
- El descanso actual es de 3 minutos para series de trabajo; esta feature debe cambiar esa duración.
- Alinear si los calentamientos también reinician el descanso antes de implementarlo.

## Continuidad al cambiar de aplicación y temporizador superpuesto

- Estado: pendiente de exploración técnica.
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

- Estado: pendiente.
- Calendario visual de los días con entrenamientos finalizados y acceso a sus sesiones.
- Detalle y criterios: [Calendario de asistencia](features/workout-attendance-calendar.md).

## Cargas en libras

- Estado: pendiente de alinear el historial e implementar.
- Usar lb por defecto, conforme al gimnasio del propietario.
- Confirmar el significado de las cargas anteriores antes de convertirlas o cambiar sus etiquetas.
- Detalle y criterios: [Cargas en libras](features/pounds-load-units.md).
