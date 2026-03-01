from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    sites = relationship("Site", back_populates="owner")

class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    status = Column(String, default="pending") # "pending", "crawling", "ready", "error"
    crawled_content = Column(Text, nullable=True)
    manual_content = Column(Text, nullable=True)
    bot_name = Column(String, default="Assistant")
    bot_greeting = Column(String, default="Hello! How can I help you today?")
    api_key = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="sites")
    contents = relationship("Content", back_populates="site", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="site")

class Content(Base):
    __tablename__ = "site_contents"
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    url = Column(String, nullable=False)
    title = Column(String)
    text_content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    site = relationship("Site", back_populates="contents")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"))
    visitor_id = Column(String) # For identifying visitors across sessions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    site = relationship("Site", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    conversation = relationship("Conversation", back_populates="messages")
