from openai import AsyncOpenAI
import os
import logging
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.models import Content, Message as DBMessage, Conversation, Site
from typing import List

load_dotenv()
logger = logging.getLogger(__name__)

def get_ai_client():
    load_dotenv(override=True)  # Reload .env on every call so token changes take effect
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        # Use real OpenAI (no daily limit, pay per use ~$0.0001/chat)
        logger.info("Using real OpenAI API")
        return AsyncOpenAI(api_key=openai_key)
    else:
        # Use GitHub Models (50 req/day free)
        github_token = os.getenv("GITHUB_TOKEN")
        logger.info(f"Using GitHub Models API with token: {github_token[:10]}...")
        return AsyncOpenAI(
            api_key=github_token,
            base_url="https://models.inference.ai.azure.com"
        )

async def generate_response(db: AsyncSession, site_id: int, conversation_id: int, user_message: str):
    # Fetch site configuration
    site_result = await db.execute(select(Site).filter(Site.id == site_id))
    site = site_result.scalars().first()
    if not site:
        logger.error(f"Site configuration NOT FOUND for site_id: {site_id}")
        return "Site configuration not found."

    # Debug logs for content population
    logger.info(f"--- AI DEBUG FOR SITE {site_id} ---")
    logger.info(f"Bot Name: {site.bot_name}")
    logger.info(f"Crawled Content Length: {len(site.crawled_content or '')}")
    logger.info(f"Manual Content Length: {len(site.manual_content or '')}")

    # Fetch conversation history
    result = await db.execute(select(DBMessage).filter(DBMessage.conversation_id == conversation_id).order_by(DBMessage.created_at))
    history = result.scalars().all()
    
    system_content = f"""You are {site.bot_name}, a friendly and helpful human assistant working for {site.name} ({site.url}).

Your goal is to help visitors by answering their questions in a warm, professional, and conversational manner. Speak as a representative of the company (use "we", "us", "our").

Personality Guidelines:
1. **Be Helpful & Human**: Don't just list facts. Explain things clearly as if you're talking to a friend.
2. **Inclusive Language**: Always speak as part of the {site.name} team. (e.g., "We offer free shipping" instead of "They offer free shipping").
3. **Tone**: Stay professional yet enthusiastic about the brand.
4. **Natural Greeting**: If this is the start of the conversation, use the following greeting: "{site.bot_greeting}". If you've already greeted them, just be helpful.

Knowledge Constraints:
1. Use the "Crawled Website Content" and "Manual Extra Content" below as your primary source of truth.
2. If a visitor asks something not covered in the content, say something like: "That's a great question! I don't have that specific detail right here, but I'd recommend reaching out to our support team so we can get that answered for you."
3. NEVER mention that you are an AI, a language model, or powered by OpenMind/GPT. You are {site.bot_name}.

--- 
CRAWLED WEBSITE CONTENT:
{site.crawled_content or "No content crawled yet."}

---
MANUAL EXTRA CONTENT (FAQ/DETAILS):
{site.manual_content or "No manual content provided."}
"""
    
    # Log the full system prompt for verification
    logger.debug(f"FULL SYSTEM PROMPT:\n{system_content}")

    messages = [
        {"role": "system", "content": system_content}
    ]
    
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    
    messages.append({"role": "user", "content": user_message})
    
    ai_client = get_ai_client()
    try:
        response = await ai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7
        )
        ai_content = response.choices[0].message.content
    except Exception as e:
        logger.error(f"AI API ERROR: {str(e)}")
        raise e
    
    # Save messages
    db_user_msg = DBMessage(conversation_id=conversation_id, role="user", content=user_message)
    db_ai_msg = DBMessage(conversation_id=conversation_id, role="assistant", content=ai_content)
    db.add_all([db_user_msg, db_ai_msg])
    await db.commit()
    
    return ai_content
