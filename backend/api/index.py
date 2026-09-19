"""Vercel Python Function entrypoint.

Deploy this directory as a separate Vercel project; FastAPI routes remain
available at their normal paths (for example /health and /workouts).
"""
from app.main import app

__all__ = ["app"]
