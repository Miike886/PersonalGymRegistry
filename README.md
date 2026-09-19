# Gym Session Tracker

Primer vertical slice móvil para registrar entrenamientos personales. La API es la fuente de verdad: una sesión activa persiste al cerrar la PWA hasta que se finaliza explícitamente.

## Inicio local

1. Copia `.env.example` a `.env`.
2. Inicia PostgreSQL: `docker compose up -d db`.
3. En una terminal: `cd backend`, ejecuta `uv sync`, después `uv run alembic upgrade head` y `uv run python seed.py`. Esto crea y administra automáticamente `.venv` y usa `uv.lock` para instalaciones reproducibles.
4. Inicia la API: desde `backend`, `uv run uvicorn app.main:app --reload`.
5. En otra terminal: `cd frontend`, ejecuta `npm install` y `npm run dev`.

La interfaz queda disponible en `http://localhost:5173` y la documentación de la API en `http://localhost:8000/docs`.

## Alcance incluido

- Rutinas PUSH, PULL, LEGS y FREE con datos de ejemplo editables.
- Una única sesión activa, protegida por validación de API y un índice parcial en PostgreSQL.
- Copia histórica de ejercicios al iniciar una sesión, alta excepcional, omisión y reordenamiento mediante API.
- Registro rápido de series, calentamiento, finalización explícita e historial básico.
- Manifiesto PWA y diseño mobile-first.

> En una instalación nueva usa Alembic como fuente de esquema. `create_all` en el arranque existe solo para facilitar pruebas locales ligeras.

## Piloto de producción

Configura `APP_ENV=production`, `DATABASE_URL`, `API_TOKEN`, `CORS_ORIGINS`, `VITE_API_URL` y `VITE_API_TOKEN` en los entornos de despliegue. Ejecuta `uv run alembic upgrade head` y `uv run python seed.py` explícitamente contra la base de Neon antes de iniciar la API. En producción el backend no crea tablas automáticamente.

El token compartido protege un piloto personal, pero no sustituye autenticación de usuarios para una API pública.

Para Vercel crea dos proyectos desde el mismo repositorio: uno con Root Directory `frontend` y otro con Root Directory `backend`. Configura `CORS_ORIGINS` con el dominio del frontend y `ALLOWED_HOSTS` con el dominio del backend. Antes del primer tráfico ejecuta las migraciones y el seed desde un entorno con acceso a Neon.
