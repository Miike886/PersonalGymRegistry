# Cargas en libras

## Propósito

Usar libras (lb) como unidad habitual de registro y consulta, conforme al gimnasio del propietario.

## Comportamiento previsto

- Introducir y visualizar las cargas en libras por defecto.
- Mostrar la unidad de forma explícita en formularios, series, sugerencias, historial y referencias recientes.
- Conservar la distinción entre carga total, carga por mano, peso corporal, carga adicional y asistencia.
- Mostrar lb en las futuras gráficas y comparaciones.

## Historial y migración

- Migración 0003 añade `load_unit`: kg para datos existentes; las nuevas series por API usan lb por defecto.
- API admite kg/lb explícitos; formularios nuevos registran lb. Las sugerencias solo precargan registros lb, mientras que las referencias muestran ambas unidades explícitamente.
- Antes de migrar, confirmar si los números ya capturados representan kilogramos o si se escribieron libras a pesar de la etiqueta kg.
- No convertir automáticamente ni limitarse a cambiar etiquetas sin aclarar ese significado.
- La unidad se almacena por serie; no se ejecutan conversiones implícitas.
- Alinear precisión, redondeo e incrementos de carga y aplicar una migración si cambia el esquema persistente.
- La skill de dominio refleja las unidades explícitas por serie.

## Límites

- Implementada en esta rama: nuevas series en lb; registros anteriores conservan kg y sus números originales.
- No se presupone un selector de unidades ni soporte multigimnasio.

## Verificación

- Suite backend: 32 pruebas; incluye valores por defecto, validación y migración desde registros anteriores.
- Build de TypeScript/Vite/PWA correcto.
- Los registros históricos mantienen su valor; una reversión de migración se rechaza si eliminar la unidad reinterpretaría series lb como kg.
- Las referencias muestran unidad por serie y conservan las variantes de peso corporal, asistencia y carga adicional.

## Entrega

- Estado: implementada, pendiente de revisión; la reinterpretación de cargas históricas queda diferida.
- Rama: `feature/pounds-load-units` (base `feature/owner-login`).
- Pull request: [#12](https://github.com/Miike886/PersonalGymRegistry/pull/12), abierta; depende de #11.
