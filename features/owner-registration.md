# Registro de la cuenta propietaria

## Propósito y comportamiento

- Crear una única cuenta desde la app y entrar inmediatamente, conservando todos los entrenamientos existentes.
- El formulario pide usuario, contraseña de 12–128 caracteres, confirmación y un código privado de activación configurado en el backend. Recuerda el dispositivo según la opción elegida.
- Sin credenciales previas, el formulario se muestra automáticamente cuando se habilita la activación. Con credenciales de entorno existe una acción Crear mi cuenta.
- Los errores conservan el formulario. Contraseñas distintas no se envían. Si falta habilitar el acceso, se explica en pantalla y se permite comprobarlo de nuevo.
- Después de crear la cuenta, el registro se cierra y solo se muestra el login. No hay cuentas adicionales ni separación multiusuario.

## API y persistencia

- GET /auth/registration devuelve únicamente available/configured; POST /auth/register exige origen permitido y OWNER_SETUP_TOKEN (20–256 caracteres, comparación constante).
- Migración 0005 añade owner_account con clave única 1 y CHECK id=1. No altera rutinas, sesiones de entrenamiento, series ni unidades históricas.
- La cuenta guarda solo el hash Argon2. El registro usa el bloqueo persistente del login, limita diez intentos fallidos por 15 minutos, revoca sesiones anteriores y crea una cookie HttpOnly con las reglas existentes. El downgrade se rechaza si eliminaría una cuenta registrada.
- Credenciales de entorno siguen funcionando hasta registrar la cuenta; después la cuenta de base de datos tiene prioridad. La clave primaria y el bloqueo impiden sustituir al propietario mediante otro registro.

## Activación y límites

- Desplegar migración y backend antes del frontend. Configurar un código aleatorio privado como OWNER_SETUP_TOKEN en el backend, compartirlo solo con el propietario y eliminarlo tras crear la cuenta. Nunca usar VITE_ para este secreto.
- El registro permanece cerrado después de crear la cuenta aunque quede el código configurado. Sin código suficientemente largo permanece cerrado; nadie puede reclamar el historial solo por encontrar la URL.
- No incluye recuperación por email, cambio de contraseña en UI ni despliegue automático. La recuperación de una cuenta registrada requiere intervención administrativa en la base; cambiar las variables de credenciales anteriores no la reemplaza.

## Verificación y entrega

- Verificado: 51 pruebas backend, incluidas migraciones con historial y protección de credenciales; build TypeScript/Vite/PWA; pruebas de modelos frontend y flujo real Edge/API/proxy. Registro móvil revisado a 375px; login/regresiones existentes en 320, 375, 430, 768 y 1440px.
- El flujo real cubre confirmación y código incorrectos, creación con entrada inmediata, historial conservado, registro cerrado al salir, posterior login y persistencia de sesión. Base aislada temporal; sin modificar producción.
- Quality-gate: revisados título, descripción, archivos y diff de PR #20 contra su base; autorización, activación privada, exclusión de segunda cuenta, preservación del historial, migración, cookies y errores móviles. Sin hallazgos bloqueantes. Se protegió el downgrade para no eliminar credenciales y se serializó la lectura de credenciales de login con el registro; pruebas relevantes repetidas correctamente. CI remoto se comprueba al entregar.
- Rama: feature/owner-registration; base: feature/session-interaction-polish (PR #19).
- Pull request: [#20](https://github.com/Miike886/PersonalGymRegistry/pull/20), abierta; sin merge ni despliegue de producción.
