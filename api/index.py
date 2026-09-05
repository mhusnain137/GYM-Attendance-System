import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'app'))
sys.path.insert(0, os.path.join(BASE_DIR, 'app', 'api'))
sys.path.insert(0, os.path.join(BASE_DIR, 'app', 'recognition'))

from app.api.main import app

# Export FastAPI app for Vercel Serverless
app = app
