"""
MASTER MIND PHOTOGRAPHY — FastAPI Main Application
Provides full-featured REST API for auth, projects, RAW/photo upload,
Lightroom-style subject/gradient/brush masking, reference color analysis,
3 cinematic variant generations, interactive localized adjustments, and variant download.
"""

import os
import json
import uuid
import shutil
from pathlib import Path
from typing import Optional, List

from fastapi import (
    FastAPI, Depends, HTTPException, UploadFile, File,
    Form, status, BackgroundTasks
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
import cv2
import numpy as np

from database import get_db, init_db, User, Project, Variant, Analysis
from auth import verify_password, hash_password, create_access_token, decode_token
from image_processor import (
    save_upload, process_project, analyze_reference,
    generate_subject_mask, apply_custom_adjustments, STORAGE_DIR, _load_image
)

# ─────────────────────────── App Setup ──────────────────────────

app = FastAPI(title="MASTER MIND PHOTOGRAPHY API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR.mkdir(exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@app.on_event("startup")
async def startup():
    init_db()


# ─────────────────────── Schemas ─────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class ProjectOut(BaseModel):
    id: int
    name: str
    status: str
    original_path: Optional[str] = None
    reference_path: Optional[str] = None
    subject_mask_path: Optional[str] = None

    class Config:
        from_attributes = True


class VariantOut(BaseModel):
    id: int
    variant_type: str
    label: str
    output_path: Optional[str] = None

    class Config:
        from_attributes = True


class AdjustRequest(BaseModel):
    variant_id: Optional[int] = None
    mask_type: str = "entire"  # entire | subject | background | linear | radial | brush
    mask_base64: Optional[str] = None
    linear_angle: float = 0.0
    radial_cx: float = 0.5
    radial_cy: float = 0.5
    radial_radius: float = 0.45
    exposure: float = 0.0
    contrast: float = 0.0
    highlights: float = 0.0
    shadows: float = 0.0
    temperature: float = 0.0
    tint: float = 0.0
    saturation: float = 0.0
    clarity: float = 0.0
    vignette: float = 0.0
    grain: float = 0.0


# ────────────────────── Auth Helpers ────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Invalid token subject")
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid user identifier")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ────────────────────── Auth Routes ────────────────────────────

@app.post("/auth/register", response_model=Token, status_code=201)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        username=body.username.strip(),
        email=body.email.strip().lower(),
        hashed_password=hash_password(body.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, username=user.username, email=user.email)
    )


@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, username=user.username, email=user.email)
    )


@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ─────────────────────── Project Routes ─────────────────────────

@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(
    name: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = Project(name=name.strip() or "Untitled Master Mind Project", owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects", response_model=List[ProjectOut])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Project).filter(Project.owner_id == current_user.id).order_by(Project.created_at.desc()).all()


@app.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()


# ───────────────────── Upload Routes ────────────────────────────

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp",
    ".cr2", ".nef", ".arw", ".dng", ".orf", ".rw2"
}
MAX_FILE_SIZE = 120 * 1024 * 1024  # 120 MB


def _validate_file(file: UploadFile):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Supported: JPEG, PNG, WEBP, TIFF, DNG, CR2, NEF, ARW"
        )


@app.post("/projects/{project_id}/upload/original")
async def upload_original(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    _validate_file(file)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 120 MB)")
    path = save_upload(content, file.filename)
    p.original_path = path
    # Reset variants and masks on new original upload
    p.subject_mask_path = None
    p.status = "pending"
    db.commit()
    return {"message": "Original photograph uploaded successfully", "path": path}


@app.post("/projects/{project_id}/upload/reference")
async def upload_reference(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    _validate_file(file)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 120 MB)")
    path = save_upload(content, file.filename)
    p.reference_path = path
    db.commit()
    return {"message": "Reference photograph uploaded successfully", "path": path}


@app.post("/projects/{project_id}/preload-sample")
def preload_sample_data(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Copies bundled high-quality portrait and golden hour reference into this project."""
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    sample_orig = STORAGE_DIR / "sample_original.jpg"
    sample_ref = STORAGE_DIR / "sample_reference.jpg"

    if not sample_orig.exists() or not sample_ref.exists():
        from seed_samples import create_sample_images
        create_sample_images()

    p_orig = STORAGE_DIR / f"proj_{project_id}_orig_{uuid.uuid4().hex[:6]}.jpg"
    p_ref = STORAGE_DIR / f"proj_{project_id}_ref_{uuid.uuid4().hex[:6]}.jpg"

    shutil.copy(str(sample_orig), str(p_orig))
    shutil.copy(str(sample_ref), str(p_ref))

    p.original_path = str(p_orig)
    p.reference_path = str(p_ref)
    p.status = "pending"
    db.commit()
    return {"message": "Sample photo pair loaded successfully"}


# ───────────────────── Masking Routes ────────────────────────────

@app.post("/projects/{project_id}/generate-mask")
def generate_mask_endpoint(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes OpenCV GrabCut segmentation to isolate subject and background.
    Saves feathered binary mask and updates project.
    """
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p or not p.original_path:
        raise HTTPException(status_code=400, detail="Original photograph is required to isolate subject")

    mask_float = generate_subject_mask(p.original_path)
    mask_uint8 = (mask_float * 255.0).astype(np.uint8)

    mask_filename = f"mask_subject_{project_id}_{uuid.uuid4().hex[:6]}.png"
    mask_path = STORAGE_DIR / mask_filename
    cv2.imwrite(str(mask_path), mask_uint8)

    p.subject_mask_path = str(mask_path)
    db.commit()

    return {
        "message": "Subject mask generated successfully via GrabCut segmentation",
        "mask_url": f"/storage/{mask_filename}"
    }


# ───────────────────── Processing Routes ────────────────────────

def _do_process(project_id: int):
    """Executes reference analysis and generates 3 cinematic variants."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        p = db.query(Project).filter(Project.id == project_id).first()
        if not p or not p.original_path or not p.reference_path:
            return
        p.status = "processing"
        db.commit()

        result = process_project(p.original_path, p.reference_path, project_id)

        # Clear existing analysis & variants
        db.query(Variant).filter(Variant.project_id == project_id).delete()
        db.query(Analysis).filter(Analysis.project_id == project_id).delete()

        # Save analysis
        an = Analysis(
            project_id=project_id,
            brightness=str(result["analysis"]["brightness"]),
            contrast=str(result["analysis"]["contrast"]),
            saturation=str(result["analysis"]["saturation"]),
            dominant_hue=str(result["analysis"]["dominant_hue"]),
            color_temp=result["analysis"]["color_temp"],
            tint=result["analysis"].get("tint", "Neutral"),
            palette=json.dumps(result["analysis"].get("palette", [])),
            style_notes=result["analysis"]["style_notes"],
        )
        db.add(an)

        # Save variants
        for key, path in result["paths"].items():
            v = Variant(
                project_id=project_id,
                variant_type=key,
                label=result["labels"][key],
                output_path=path,
            )
            db.add(v)

        p.status = "done"
        db.commit()
    except Exception as e:
        try:
            p.status = "error"
            db.commit()
        except Exception:
            pass
        print(f"Processing error on project {project_id}: {e}")
    finally:
        db.close()


@app.post("/projects/{project_id}/process")
async def start_processing(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if not p.original_path or not p.reference_path:
        raise HTTPException(status_code=400, detail="Upload both original and reference images first")
    if p.status == "processing":
        raise HTTPException(status_code=400, detail="Already processing")

    background_tasks.add_task(_do_process, project_id)
    return {"message": "Processing started", "status": "processing"}


# ─────────────────── Interactive Adjustment Route ───────────────────

@app.post("/projects/{project_id}/adjust")
def apply_adjustments_endpoint(
    project_id: int,
    req: AdjustRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Applies real-time localized or global adjustments (Exposure, Contrast,
    Highlights, Shadows, Temperature, Tint, Saturation, Clarity, Grain, Vignette)
    to a variant or the original photo, blending via the selected mask.
    """
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    base_path = p.original_path
    if req.variant_id:
        v = db.query(Variant).filter(Variant.id == req.variant_id, Variant.project_id == project_id).first()
        if v and v.output_path:
            base_path = v.output_path

    if not base_path or not Path(base_path).exists():
        raise HTTPException(status_code=400, detail="Target image not found to adjust")

    # Load subject mask cache if available
    subject_cache = None
    if p.subject_mask_path and Path(p.subject_mask_path).exists():
        try:
            m_img = cv2.imread(p.subject_mask_path, cv2.IMREAD_GRAYSCALE)
            if m_img is not None:
                orig_img = _load_image(base_path)
                w, h = orig_img.size
                if m_img.shape[:2] != (h, w):
                    m_img = cv2.resize(m_img, (w, h), interpolation=cv2.INTER_LINEAR)
                subject_cache = (m_img / 255.0).astype(np.float32)
        except Exception:
            subject_cache = None

    adj_img, _ = apply_custom_adjustments(
        base_image_path=base_path,
        mask_type=req.mask_type,
        mask_base64=req.mask_base64,
        linear_angle=req.linear_angle,
        radial_cx=req.radial_cx,
        radial_cy=req.radial_cy,
        radial_radius=req.radial_radius,
        exposure=req.exposure,
        contrast=req.contrast,
        highlights=req.highlights,
        shadows=req.shadows,
        temperature=req.temperature,
        tint=req.tint,
        saturation=req.saturation,
        clarity=req.clarity,
        vignette=req.vignette,
        grain=req.grain,
        subject_mask_cache=subject_cache
    )

    # Save as custom or updated variant
    filename = f"adjusted_{project_id}_{uuid.uuid4().hex[:8]}.jpg"
    out_path = STORAGE_DIR / filename
    adj_img.save(str(out_path), "JPEG", quality=94)

    # Create new custom variant
    custom_variant = Variant(
        project_id=project_id,
        variant_type="custom",
        label=f"Studio Fine-Tune ({req.mask_type.capitalize()} Mask)",
        output_path=str(out_path),
        settings_json=req.json()
    )
    db.add(custom_variant)
    db.commit()
    db.refresh(custom_variant)

    return {
        "message": "Adjustments applied successfully",
        "variant": {
            "id": custom_variant.id,
            "variant_type": custom_variant.variant_type,
            "label": custom_variant.label,
            "url": f"/storage/{filename}",
        }
    }


# ───────────────────── Status & Download Routes ─────────────────────

@app.get("/projects/{project_id}/status")
def get_status(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    variants = db.query(Variant).filter(Variant.project_id == project_id).order_by(Variant.id.asc()).all()
    analysis = db.query(Analysis).filter(Analysis.project_id == project_id).first()

    variant_data = [
        {
            "id": v.id,
            "variant_type": v.variant_type,
            "label": v.label,
            "url": f"/storage/{Path(v.output_path).name}" if v.output_path and Path(v.output_path).exists() else None,
        }
        for v in variants
    ]

    analysis_data = None
    if analysis:
        palette_list = []
        if analysis.palette:
            try:
                palette_list = json.loads(analysis.palette)
            except Exception:
                palette_list = []
        analysis_data = {
            "brightness": analysis.brightness,
            "contrast": analysis.contrast,
            "saturation": analysis.saturation,
            "dominant_hue": analysis.dominant_hue,
            "color_temp": analysis.color_temp,
            "tint": analysis.tint or "Neutral",
            "palette": palette_list,
            "style_notes": analysis.style_notes,
        }

    orig_url = f"/storage/{Path(p.original_path).name}" if p.original_path and Path(p.original_path).exists() else None
    ref_url = f"/storage/{Path(p.reference_path).name}" if p.reference_path and Path(p.reference_path).exists() else None
    mask_url = f"/storage/{Path(p.subject_mask_path).name}" if p.subject_mask_path and Path(p.subject_mask_path).exists() else None

    return {
        "id": p.id,
        "name": p.name,
        "status": p.status,
        "variants": variant_data,
        "analysis": analysis_data,
        "original_url": orig_url,
        "reference_url": ref_url,
        "subject_mask_url": mask_url,
    }


@app.get("/projects/{project_id}/variants/{variant_id}/download")
def download_variant(
    project_id: int,
    variant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    v = db.query(Variant).filter(Variant.id == variant_id, Variant.project_id == project_id).first()
    if not v or not v.output_path or not Path(v.output_path).exists():
        raise HTTPException(status_code=404, detail="Variant file not found")
    p = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not p:
        raise HTTPException(status_code=403, detail="Access denied")
    return FileResponse(
        v.output_path,
        media_type="image/jpeg",
        filename=f"mastermind_{v.variant_type}_{p.name.replace(' ', '_').lower()}.jpg"
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "MASTER MIND PHOTOGRAPHY API", "version": "1.0.0"}
