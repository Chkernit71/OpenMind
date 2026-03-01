from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Site Schemas
class SiteBase(BaseModel):
    name: str
    url: str
    bot_name: Optional[str] = "Assistant"
    bot_greeting: Optional[str] = "Hello! How can I help you today?"
    manual_content: Optional[str] = None

class SiteCreate(SiteBase):
    pass

class Site(SiteBase):
    id: int
    owner_id: int
    status: str
    api_key: str
    crawled_content: Optional[str] = None
    backend_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Content Schemas
class ContentBase(BaseModel):
    url: str
    title: Optional[str] = None
    text_content: str

class Content(ContentBase):
    id: int
    site_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Chat Schemas
class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    site_id: int
    visitor_id: Optional[str] = None

class Conversation(ConversationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    messages: List[Message] = []
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    visitor_id: Optional[str] = None
