from google import genai
from google.genai import types
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

def get_gemini_client():
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_CLOUD_API_KEY")
    if not api_key:
        return None
    
    # As per user screenshot: vertexai=True
    return genai.Client(
        vertexai=True,
        api_key=api_key
    )

def get_openai_client():
    load_dotenv(override=True)
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return AsyncOpenAI(api_key=openai_key)
    
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        return AsyncOpenAI(
            api_key=github_token,
            base_url="https://models.inference.ai.azure.com"
        )
    return None

async def generate_response(db: AsyncSession, site_id: int, conversation_id: int, user_message: str):
    load_dotenv(override=True)
    
    # Fetch site configuration
    site_result = await db.execute(select(Site).filter(Site.id == site_id))
    site = site_result.scalars().first()
    if not site:
        logger.error(f"Site configuration NOT FOUND for site_id: {site_id}")
        return "Site configuration not found."

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
    
    openai_client = get_openai_client()
    # Check if we have a real OpenAI key (not GitHub fallback)
    openai_key = os.getenv("OPENAI_API_KEY")
    is_real_openai = openai_key and openai_key.startswith("sk-")
    
    if is_real_openai and openai_client:
        try:
            # User specifically wants gpt-5-nano
            model_name = "gpt-5-nano"
            logger.info(f"Using OpenAI with model: {model_name}")
            
            messages = [{"role": "system", "content": system_content}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": user_message})
            
            response = await openai_client.chat.completions.create(
                model=model_name,
                messages=messages
                # temperature=1 is required, allowing default
            )
            ai_content = response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI GPT-5 ERROR: {str(e)}")
            raise e
    else:
        # Fallback to Gemini SDK
        gemini_client = get_gemini_client()
        if gemini_client:
            try:
                model_id = "gemini-2.5-flash-lite"
                logger.info(f"Using Gemini with model: {model_id}")
                
                contents = []
                for msg in history:
                    contents.append(types.Content(
                        role="user" if msg.role == "user" else "model",
                        parts=[types.Part.from_text(text=msg.content)]
                    ))
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=user_message)]
                ))
                
                config = types.GenerateContentConfig(
                    system_instruction=system_content,
                    temperature=0.7,
                )
                
                response = gemini_client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=config
                )
                ai_content = response.text
            except Exception as e:
                logger.error(f"Gemini SDK ERROR: {str(e)}")
                raise e
        else:
            # Final fallback to GitHub Models/OpenAI with gpt-4o
            if not openai_client:
                raise Exception("No AI client configured")
                
            model_name = "gpt-4o"
            logger.info(f"Using Fallback OpenAI/GitHub with model: {model_name}")
            
            messages = [{"role": "system", "content": system_content}]
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            messages.append({"role": "user", "content": user_message})
            
            try:
                response = await openai_client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.7
                )
                ai_content = response.choices[0].message.content
            except Exception as e:
                logger.error(f"Fallback SDK ERROR: {str(e)}")
                raise e
    
    # Save messages
    db_user_msg = DBMessage(conversation_id=conversation_id, role="user", content=user_message)
    db_ai_msg = DBMessage(conversation_id=conversation_id, role="assistant", content=ai_content)
    db.add_all([db_user_msg, db_ai_msg])
    await db.commit()
    
    return ai_content
