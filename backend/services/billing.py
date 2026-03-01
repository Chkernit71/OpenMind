import stripe
import os
from dotenv import load_dotenv
from fastapi import Request, HTTPException
from backend.models.models import User
from sqlalchemy.ext.asyncio import AsyncSession

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

async def create_checkout_session(user_email: str, price_id: str):
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=user_email,
            line_items=[
                {
                    'price': price_id,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=f"{os.getenv('BACKEND_URL')}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('BACKEND_URL')}/billing/cancel",
        )
        return checkout_session.url
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def handle_stripe_webhook(payload: bytes, sig_header: str):
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Update user's subscription status in DB
        # This would require an AsyncSession which isn't easily provided to this sync-ish context
        # In a real app, you'd use a background task or a separate service
        pass
    
    return {"status": "success"}
