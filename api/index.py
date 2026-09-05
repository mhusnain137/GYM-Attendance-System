import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'app'))
sys.path.insert(0, os.path.join(BASE_DIR, 'app', 'api'))
sys.path.insert(0, os.path.join(BASE_DIR, 'app', 'recognition'))

from app.api.main import app

# Vercel Serverless ASGI / WSGI Handler
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception as e:
    handler = app

# Export app directly as well
app = app
