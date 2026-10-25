# Volver del entrenamiento y descanso visible al navegar

## Comportamiento

- La cabecera del entrenamiento incluye una flecha «Volver», con nombre accesible «Volver a la aplicación».
- Al iniciar o recuperar un entrenamiento después de recargar, vuelve a Entrenar. Si se retoma desde Historial, detalle, Progreso o Ajustes, vuelve a esa pantalla.
- La barra persistente para retomar muestra el descanso pendiente en todas las vistas de navegación. Al terminar el descanso muestra el tiempo transcurrido de sesión.
- Los relojes usan las marcas de tiempo del servidor; navegar no reinicia ni detiene el descanso, ni finaliza el entrenamiento.
- La sesión permanece montada para conservar los campos escritos. La barra está situada encima de la navegación inferior.

## Implementación y límites

- Solo frontend: sin cambios de API, persistencia ni migraciones.
- El destino de regreso se conserva durante la visita actual; una recarga recupera la sesión con regreso a Entrenar.
- La visibilidad aquí cubre las pantallas dentro de la app. La ventana externa opcional conserva sus límites existentes.

## Verificación

- Pasaron `npm.cmd run build` y `node scripts/test-owner-auth.mjs` con API/proxy y base temporal aislada.
- El flujo cubre regreso contextual desde las cuatro pestañas y un detalle, descanso visible en esas pantallas, plazo del servidor sin cambios, conservación del peso escrito y sustitución del descanso por tiempo de sesión al omitirlo.
- Sin desbordamiento ni solapamiento entre la barra de sesión y los menús a 320, 375, 768 y 1440 px; captura móvil revisada. `git diff --check` pasó.

## Entrega

- Rama: `feature/workout-back-navigation-global-timer`, basada en `feature/contextual-exercise-history` (PR #25).
- PR: [#24](https://github.com/Miike886/PersonalGymRegistry/pull/24), fusionada en su base e integrada en `main` mediante PR #25.
- Quality-gate: revisados título, descripción, cuatro archivos y diff contra su rama base; regreso contextual, privacidad, conservación de sesión y borradores, reloj basado en servidor y espacio móvil entre barras. Sin hallazgos bloqueantes. Checks backend, build y navegador pasaron en GitHub; sin cambios de datos, migraciones ni despliegue de producción.
