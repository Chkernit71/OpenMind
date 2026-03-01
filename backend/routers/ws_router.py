from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import JWTError, jwt
import logging

from backend.db.database import get_db
from backend.services.ws_manager import manager
from backend.services import auth as auth_service
from backend.models import models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/monitor/{site_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    site_id: int,
    token: str = Query(...)
):
    # Manual JWT Validation (WebSocket headers are limited)
    db_gen = get_db()
    db = await db_gen.__anext__()
    
    try:
        payload = jwt.decode(token, auth_service.SECRET_KEY, algorithms=[auth_service.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            await websocket.close(code=4003)
            return
        
        user = await auth_service.get_user_by_email(db, email=email)
        if not user:
            await websocket.close(code=4003)
            return
            
        # Verify site ownership
        result = await db.execute(
            select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == user.id)
        )
        site = result.scalars().first()
        if not site:
            await websocket.close(code=4003)
            return

        # Connect
        await manager.connect(site_id, websocket)
        
        try:
            while True:
                # Keep connection alive and listen for any client messages (though we mostly push)
                data = await websocket.receive_text()
                # We could handle pings or other client-side commands here if needed
        except WebSocketDisconnect:
            manager.disconnect(site_id, websocket)
            
    except JWTError:
        await websocket.close(code=4003)
    except Exception as e:
        logger.error(f"WebSocket Error: {str(e)}")
        await websocket.close(code=1011)
    finally:
        await db.close()
