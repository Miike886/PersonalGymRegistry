# Cargas en libras

## Propósito

Usar libras (lb) como unidad habitual de registro y consulta, conforme al gimnasio del propietario.

## Comportamiento previsto

- Introducir y visualizar las cargas en libras por defecto.
- Mostrar la unidad de forma explícita en formularios, series, sugerencias, historial y referencias recientes.
- Conservar la distinción entre carga total, carga por mano, peso corporal, carga adicional y asistencia.
- Mostrar lb en las futuras gráficas y comparaciones.

## Historial y migración por alinear

- Actualmente el contrato de la aplicación interpreta las cargas como kilogramos.
- Antes de migrar, confirmar si los números ya capturados representan kilogramos o si se escribieron libras a pesar de la etiqueta kg.
- No convertir automáticamente ni limitarse a cambiar etiquetas sin aclarar ese significado.
- Definir una unidad explícita de almacenamiento o una conversión coherente en los límites de la API; conservar el significado de los snapshots históricos.
- Alinear precisión, redondeo e incrementos de carga y aplicar una migración si cambia el esquema persistente.
- Actualizar la skill de dominio cuando se implemente el nuevo contrato de unidades.

## Límites

- Feature futura: todavía no implementada; las reglas actuales siguen usando kg.
- No se presupone un selector de unidades ni soporte multigimnasio.

## Criterios de verificación futuros

- Registro, edición, recuperación y sugerencias en lb.
- Historial preservado según la unidad real de los registros anteriores.
- Casos por mano, peso corporal, carga adicional y asistencia.
- Conversiones y redondeos sin acumulación de errores al consultar o editar.

## Entrega

- Estado: pendiente de alineación del historial e implementación.
- Rama y pull request de implementación: por crear cuando se inicie esta slice.
