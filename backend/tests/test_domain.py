import os
os.environ["DATABASE_URL"]="sqlite:///./test_gym.db"
from fastapi.testclient import TestClient
from app.main import app

def test_health():
    with TestClient(app) as client:
        assert client.get('/health').json() == {'status':'ok'}
