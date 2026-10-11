"""
MASTER MIND PHOTOGRAPHY — FastAPI Backend
Database models and session management.
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./mastermind.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_path = Column(String(512))
    reference_path = Column(String(512))
    subject_mask_path = Column(String(512), nullable=True)
    status = Column(String(32), default="pending")   # pending | processing | done | error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    owner = relationship("User", back_populates="projects")
    variants = relationship("Variant", back_populates="project", cascade="all, delete-orphan")
    analysis = relationship("Analysis", back_populates="project", uselist=False, cascade="all, delete-orphan")


class Variant(Base):
    __tablename__ = "variants"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    variant_type = Column(String(32), nullable=False)   # natural | moody | reference | custom
    label = Column(String(64))
    output_path = Column(String(512))
    settings_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="variants")


class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    brightness = Column(String(16))
    contrast = Column(String(16))
    saturation = Column(String(16))
    dominant_hue = Column(String(16))
    color_temp = Column(String(32))
    tint = Column(String(32), nullable=True)
    palette = Column(Text, nullable=True)  # JSON string of hex array
    style_notes = Column(Text)
    project = relationship("Project", back_populates="analysis")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
