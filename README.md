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
