from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging
from backend.db.database import get_db
from backend.models import schemas, models
from backend.services import ai as ai_service

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

async def verify_api_key(x_api_key: str = Header(...), db: AsyncSession = Depends(get_db)):
    # Ensure we load all necessary fields
    result = await db.execute(
        select(models.Site).filter(models.Site.api_key == x_api_key)
    )
    site = result.scalars().first()
    if not site:
        logger.warning(f"Invalid API Key attempt: {x_api_key}")
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    logger.info(f"API Key verified for site: {site.name} (ID: {site.id})")
    logger.info(f"Site content check: crawled={len(site.crawled_content or '')}, manual={len(site.manual_content or '')}")
    return site

@router.post("/message", response_model=schemas.Message)
async def chat_message(
    request: schemas.ChatRequest,
    site: models.Site = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db)
):
    # Log message request
    logger.info(f"New chat message for site {site.id} from visitor {request.visitor_id}")
    
    # Find or create conversation
    conv_result = await db.execute(
        select(models.Conversation)
        .filter(models.Conversation.site_id == site.id, models.Conversation.visitor_id == request.visitor_id)
        .order_by(models.Conversation.created_at.desc())
    )
    conversation = conv_result.scalars().first()
    
    if not conversation:
        logger.info(f"Creating new conversation for visitor {request.visitor_id}")
        conversation = models.Conversation(site_id=site.id, visitor_id=request.visitor_id)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    try:
        ai_response_content = await ai_service.generate_response(
            db, site.id, conversation.id, request.message
        )
        
        # Broadcast to live monitor
        from backend.services.ws_manager import manager
        from datetime import datetime
        
        await manager.broadcast_to_site(site.id, {
            "type": "new_message",
            "conversation_id": conversation.id,
            "visitor_id": request.visitor_id,
            "user_message": request.message,
            "bot_reply": ai_response_content,
            "timestamp": datetime.utcnow().isoformat(),
            "site_id": site.id
        })
        
        # Fetch the latest message (the one we just saved in generate_response)
        msg_result = await db.execute(
            select(models.Message)
            .filter(models.Message.conversation_id == conversation.id, models.Message.role == "assistant")
            .order_by(models.Message.created_at.desc())
        )
        return msg_result.scalars().first()
    except Exception as e:
        logger.error(f"Chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during chat")
