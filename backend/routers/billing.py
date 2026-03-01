from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.database import get_db
from backend.models import models, schemas
from backend.routers.auth import get_current_user
from backend.services import billing as billing_service
import os

router = APIRouter(prefix="/billing", tags=["billing"])

@router.post("/create-checkout-session")
async def create_checkout(
    price_id: str,
    current_user: models.User = Depends(get_current_user)
):
    checkout_url = await billing_service.create_checkout_session(
        user_email=current_user.email,
        price_id=price_id
    )
    return {"url": checkout_url}

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    return await billing_service.handle_stripe_webhook(payload, stripe_signature)

@router.get("/success")
async def billing_success(session_id: str):
    return {"message": "Subscription successful", "session_id": session_id}

@router.get("/cancel")
async def billing_cancel():
    return {"message": "Subscription cancelled"}
