# Gym Session Tracker

Primer vertical slice móvil para registrar entrenamientos personales. La API es la fuente de verdad: una sesión activa persiste al cerrar la PWA hasta que se finaliza explícitamente.

## Inicio local

1. Copia `.env.example` a `.env`.
2. Inicia PostgreSQL: `docker compose up -d db`.
3. En una terminal: `cd backend`, ejecuta `uv sync`, después `uv run alembic upgrade head` y `uv run python seed.py`. Esto crea y administra automáticamente `.venv` y usa `uv.lock` para instalaciones reproducibles.
4. Configura `OWNER_SETUP_TOKEN` en tu `.env` con un código privado aleatorio de 20 a 256 caracteres. Al abrir la app, crea tu usuario y contraseña usando ese código de activación; después elimina `OWNER_SETUP_TOKEN`. No publiques el código ni lo uses como contraseña. Alternativamente, el acceso anterior mediante `OWNER_USERNAME` y `OWNER_PASSWORD_HASH` sigue disponible mientras no exista una cuenta registrada.
5. Inicia la API: desde `backend`, `uv run uvicorn app.main:app --reload`.
6. En otra terminal: `cd frontend`, ejecuta `npm ci` y `npm run dev`. Abre `http://localhost:5173` e inicia sesión con el usuario y contraseña configurados.

La interfaz queda disponible en `http://localhost:5173` y la documentación de la API en `http://localhost:8000/docs`.

## Alcance incluido

- Rutinas PUSH, PULL, LEGS y FREE con datos de ejemplo editables.
- Una única sesión activa, protegida por validación de API y un índice parcial en PostgreSQL.
- Copia histórica de ejercicios al iniciar una sesión, alta excepcional, omisión y reordenamiento mediante API.
- Registro rápido de series, calentamiento, finalización explícita e historial básico.
- Manifiesto PWA y diseño mobile-first.

> En una instalación nueva usa Alembic como fuente de esquema. `create_all` en el arranque existe solo para facilitar pruebas locales ligeras.

## Acceso privado y producción

El acceso corresponde a una única cuenta propietaria. El registro inicial requiere un código privado y se cierra después de crearla; no hay registro público para otras personas. Todas las rutas de entrenamientos requieren sesión, también al llamar directamente al backend. El login se recuerda por 30 días en cada dispositivo si se mantiene seleccionada la casilla correspondiente. Sin ella, se usa una cookie de sesión sin Max-Age y el servidor limita el acceso a 12 horas.

Configura estas variables únicamente en el backend:

- `APP_ENV=production`
- `DATABASE_URL`: conexión Neon con `postgresql+psycopg://` y SSL.
- `OWNER_SETUP_TOKEN`: código privado aleatorio de 20 a 256 caracteres, guardado como Secret para la activación inicial. Introduce ese código en el formulario Crear mi cuenta, elige usuario y contraseña, y elimina luego este Secret. La cuenta y su hash Argon2 se guardan en la base; el código nunca se devuelve al navegador.
- `OWNER_USERNAME` y `OWNER_PASSWORD_HASH`: acceso anterior opcional, solo mientras no exista una cuenta registrada. Para ese modo, genera el hash con `uv run python -m app.auth_cli`; nunca guardes la contraseña en texto plano.
- `SESSION_DAYS=30`
- `CORS_ORIGINS=https://personal-gym-registry.vercel.app`
- `ALLOWED_HOSTS=personal-gym-registry-back.vercel.app`

Antes de publicar, ejecuta `uv run alembic upgrade head` contra Neon. Las migraciones conservan los entrenamientos y añaden sesiones, control de intentos y la tabla de cuenta propietaria (0005). Si ya tienes rutinas, no necesitas repetir el seed.

En el frontend elimina `VITE_API_TOKEN` y `VITE_API_URL`. Elimina también `API_TOKEN` del backend: el antiguo token público deja de conceder acceso.

Los proyectos Vercel mantienen las raíces `frontend` y `backend`. El frontend envía las solicitudes a `/api`; Vercel las dirige al backend definido en `frontend/vercel.json`. La cookie queda asociada al dominio del frontend y permite recordar la sesión sin depender de cookies de terceros. Vite aplica el mismo proxy en desarrollo y preview local.

Publica primero el backend con variables y migración listas, y después el frontend. Durante el cambio, un frontend antiguo puede pedir volver a cargar porque su token ya no funciona. Un preview del frontend apunta por defecto al backend de producción: para probar un backend preview hay que cambiar la dirección del proxy en un entorno aislado y autorizar el origen exacto del frontend preview.

Cerrar sesión revoca ese dispositivo. Crear la cuenta revoca todas las sesiones anteriores y conserva el historial. Una cuenta registrada tiene prioridad sobre las credenciales de entorno: cambiarlas ya no modifica su contraseña. No hay recuperación automática de contraseña para cuentas registradas; requiere intervención administrativa sobre la cuenta almacenada. En el modo anterior, cambiar `OWNER_PASSWORD_HASH` o `OWNER_USERNAME` invalida las sesiones. Diez intentos fallidos de login o activación bloquean ambos durante el resto de una ventana de 15 minutos, compartida entre instancias.

## Verificación del login

Ejecuta `uv run pytest -q` desde `backend`. Para comprobar el flujo real en navegador, instala las dependencias de ambos proyectos, ejecuta `npm run build` en `frontend` y después `node scripts/test-owner-auth.mjs` en esa misma carpeta. En Windows usa Edge instalado; en Linux ejecuta primero `npx playwright install --with-deps chromium`.

La prueba crea una base SQLite temporal y servidores exclusivos en los puertos 8319 y 4179; no usa la base de tu `.env` ni Neon. Se ejecuta también en CI.
