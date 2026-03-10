from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

load_dotenv()

import logging
from backend.routers import auth, sites, chat, billing, ws_router
from backend.db.database import Base, engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="OpenMind API")

# Static files for the widget
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WIDGET_DIR = os.path.join(os.path.dirname(BASE_DIR), "widget")

@app.get("/widget.js")
async def get_widget():
    # Helper endpoint to serve the widget directly
    logger.info("Serving widget.js request...")
    from fastapi.responses import FileResponse
    response = FileResponse(os.path.join(WIDGET_DIR, "widget.js"), media_type="application/javascript")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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

app.mount("/static", StaticFiles(directory=WIDGET_DIR), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(sites.router)
app.include_router(chat.router)
app.include_router(billing.router)
app.include_router(ws_router.router)

# Serve Frontend Production Build
DASHBOARD_DIR = os.path.join(os.path.dirname(BASE_DIR), "dashboard", "dist")

if os.path.exists(DASHBOARD_DIR):
    # Serve static assets (js, css, etc.) directly
    app.mount("/assets", StaticFiles(directory=os.path.join(DASHBOARD_DIR, "assets")), name="assets")

    # Serve SPA index.html for all non-API, non-widget paths
    from fastapi.responses import FileResponse as _FileResponse
    from fastapi import Request
    
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't intercept API or widget routes, but allow SPA paths like /sites/11/preview or /sites
        is_api_route = full_path.startswith(("auth/", "chat/", "billing/", "ws/", "static/"))
        
        # Determine if it's an API request to /sites or a page load
        if full_path.startswith("sites/"):
            # If it's to /sites/id/preview, it's a frontend route
            if "/preview" in full_path or full_path == "sites" or full_path == "sites/":
                is_api_route = False
            else:
                # If they are requesting HTML, it's a direct browser navigation to the SPA
                accept = request.headers.get("accept", "")
                if "text/html" in accept:
                    is_api_route = False
                else:
                    is_api_route = True
                    
        if is_api_route:
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
            
        index_path = os.path.join(DASHBOARD_DIR, "index.html")
        if os.path.exists(index_path):
            return _FileResponse(index_path)
        return {"message": "Dashboard not found"}
else:
    @app.get("/")
    async def root():
        return {"message": "OpenMind API is running (Dashboard not built yet)"}
