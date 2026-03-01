from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from backend.db.database import get_db
from backend.models import schemas, models
from backend.routers.auth import get_current_user
from backend.services.crawler import crawl_site

router = APIRouter(prefix="/sites", tags=["sites"])

@router.post("/", response_model=schemas.Site)
async def create_site(
    site: schemas.SiteCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_site = models.Site(
        **site.model_dump(), 
        owner_id=current_user.id,
        status="crawling"
    )
    db.add(db_site)
    await db.commit()
    await db.refresh(db_site)
    
    # Trigger crawler in background
    background_tasks.add_task(do_crawl, db_site.id, db_site.url)
    
    return db_site

async def do_crawl(site_id: int, url: str):
    from backend.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            content = await crawl_site(url)
            result = await db.execute(select(models.Site).filter(models.Site.id == site_id))
            db_site = result.scalars().first()
            if db_site:
                db_site.crawled_content = content
                db_site.status = "ready"
                await db.commit()
        except Exception:
            result = await db.execute(select(models.Site).filter(models.Site.id == site_id))
            db_site = result.scalars().first()
            if db_site:
                db_site.status = "error"
                await db.commit()

@router.post("/{site_id}/recrawl", response_model=schemas.Site)
async def recrawl_site(
    site_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == current_user.id))
    db_site = result.scalars().first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    db_site.status = "crawling"
    await db.commit()
    await db.refresh(db_site)
    
    background_tasks.add_task(do_crawl, db_site.id, db_site.url)
    return db_site

@router.get("/", response_model=List[schemas.Site])
async def list_sites(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Site).filter(models.Site.owner_id == current_user.id))
    sites = result.scalars().all()
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    for s in sites:
        s.backend_url = backend_url
    return sites

@router.get("/{site_id}", response_model=schemas.Site)
async def get_site(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == current_user.id))
    db_site = result.scalars().first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    db_site.backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    return db_site

@router.delete("/{site_id}")
async def delete_site(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == current_user.id))
    db_site = result.scalars().first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    await db.delete(db_site)
    await db.commit()
    return {"message": "Site deleted"}

@router.get("/{site_id}/conversations", response_model=List[schemas.Conversation])
async def list_site_conversations(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify ownership
    site_result = await db.execute(select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == current_user.id))
    if not site_result.scalars().first():
        raise HTTPException(status_code=404, detail="Site not found")
    
    result = await db.execute(
        select(models.Conversation)
        .filter(models.Conversation.site_id == site_id)
        .order_by(models.Conversation.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{site_id}/debug")
async def debug_site(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == current_user.id))
    db_site = result.scalars().first()
    if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    return {
        "site_id": db_site.id,
        "name": db_site.name,
        "url": db_site.url,
        "status": db_site.status,
        "crawled_content_length": len(db_site.crawled_content or ""),
        "manual_content_length": len(db_site.manual_content or ""),
        "crawled_preview": (db_site.crawled_content or "")[:500]
    }

@router.get("/{site_id}/conversations/{conversation_id}", response_model=schemas.Conversation)
async def get_conversation_messages(
    site_id: int,
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify ownership
    site_result = await db.execute(select(models.Site).filter(models.Site.id == site_id, models.Site.owner_id == current_user.id))
    if not site_result.scalars().first():
        raise HTTPException(status_code=404, detail="Site not found")
    
    result = await db.execute(
        select(models.Conversation)
        .filter(models.Conversation.id == conversation_id, models.Conversation.site_id == site_id)
    )
    conversation = result.scalars().first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Fetch messages explicitly if not eager loaded
    msg_result = await db.execute(
        select(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc())
    )
    conversation.messages = msg_result.scalars().all()
    return conversation

@router.get("/{id}/conversations/active", response_model=List[schemas.Conversation])
async def get_active_conversations(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify ownership
    site_result = await db.execute(select(models.Site).filter(models.Site.id == id, models.Site.owner_id == current_user.id))
    if not site_result.scalars().first():
        raise HTTPException(status_code=404, detail="Site not found")
    
    from datetime import datetime, timedelta
    yesterday = datetime.utcnow() - timedelta(days=1)
    
    result = await db.execute(
        select(models.Conversation)
        .filter(models.Conversation.site_id == id, models.Conversation.updated_at >= yesterday)
        .order_by(models.Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
    # Eager load last message for each
    for conv in conversations:
        msg_result = await db.execute(
            select(models.Message)
            .filter(models.Message.conversation_id == conv.id)
            .order_by(models.Message.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalars().first()
        conv.messages = [last_msg] if last_msg else []
        
    return conversations
