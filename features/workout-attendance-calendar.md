# Calendario de asistencia

## Propósito

Mostrar visualmente qué días se entrenó, a partir de las sesiones del historial.

## Comportamiento previsto

- Calendario mensual con los días que tienen entrenamientos finalizados destacados.
- Navegación entre meses y selección de un día para consultar sus sesiones.
- Mostrar el tipo de rutina y permitir abrir el detalle histórico existente.
- Usar la fecha local de inicio del entrenamiento para ubicarlo en el calendario.
- Excluir sesiones en curso o canceladas. Si se elimina una sesión del historial, actualizar su marca de asistencia.
- Representar varias sesiones en un mismo día sin contarlas como días distintos.

## Impacto de implementación por definir

- Revisar si la API de historial necesita consultas por rango de fechas.
- Mantener coherencia entre calendario, historial y zona horaria.
- Diseñar la navegación y los indicadores para pantallas móviles.

## Límites

- Feature futura: todavía no implementada.
- La asistencia se deriva del historial; no se incluye registro manual de asistencia ni planificación de rutinas.

## Criterios de verificación futuros

- Días con una, varias o ninguna sesión; navegación de meses y cambios de año.
- Fechas cercanas a medianoche y conversión a la zona horaria local.
- Exclusión de sesiones activas/canceladas y actualización tras eliminar una sesión.
- Accesibilidad y legibilidad de indicadores y controles móviles.

## Entrega

- Estado: pendiente de implementación.
- Rama y pull request de implementación: por crear cuando se inicie esta slice.
