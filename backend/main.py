from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from backend.routers import auth, sites, chat, billing
from backend.db.database import Base, engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="OpenMind API")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# CORS must allow all origins for the widget
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for the widget
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WIDGET_DIR = os.path.join(os.path.dirname(BASE_DIR), "widget")
app.mount("/static", StaticFiles(directory=WIDGET_DIR), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(sites.router)
app.include_router(chat.router)
app.include_router(billing.router)

@app.get("/")
async def root():
    return {"message": "OpenMind API is running"}

@app.get("/widget.js")
async def get_widget():
    # Helper endpoint to serve the widget directly
    from fastapi.responses import FileResponse
    response = FileResponse(os.path.join(WIDGET_DIR, "widget.js"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response
