"""
MASTER MIND PHOTOGRAPHY — Core Image Processing Engine
Analyzes reference photograph and generates 3 cinematic variants,
extracts Lightroom-style masks (Subject, Background, Linear/Radial Gradient, Brush),
and applies localized adjustments.
"""

import os
import uuid
import base64
import numpy as np
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import cv2

STORAGE_DIR = Path(__file__).parent / "storage"
STORAGE_DIR.mkdir(exist_ok=True)


# ─────────────────────────── Format & Loading ────────────────────────────

def _pil_to_cv(img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)


def _cv_to_pil(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))


def _load_image(path: str) -> Image.Image:
    """Load image from path supporting JPEG, PNG, WEBP, TIFF, and RAW formats."""
    ext = Path(path).suffix.lower()
    if ext in (".cr2", ".nef", ".arw", ".dng", ".orf", ".rw2"):
        try:
            import rawpy
            with rawpy.imread(path) as raw:
                rgb = raw.postprocess(use_camera_wb=True, half_size=False)
            return Image.fromarray(rgb)
        except Exception:
            pass  # Fallback to standard open
    try:
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)
        return img.convert("RGB")
    except Exception:
        # Fallback to OpenCV
        cv_img = cv2.imread(path)
        if cv_img is not None:
            return _cv_to_pil(cv_img)
        raise ValueError(f"Unable to read image at: {path}")


def save_upload(file_bytes: bytes, original_filename: str) -> str:
    """Save raw uploaded bytes to storage and return absolute path."""
    ext = Path(original_filename).suffix.lower() or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = STORAGE_DIR / name
    with open(dest, "wb") as f:
        f.write(file_bytes)
    return str(dest)


# ─────────────────────── Reference Analysis ─────────────────────

def analyze_reference(ref_path: str) -> dict:
    """
    In-depth cinematic style analysis of reference photograph:
    - Luminance & Dynamic Range
    - Contrast (standard deviation in perceptual L* channel)
    - Saturation & Color Vibrancy
    - Dominant Hue & Color Temp (Kelvin shift)
    - Tint (Green / Magenta bias)
    - Dominant Palette (top 5 hex colors via K-Means)
    - Cinematic Style Classification
    """
    img = _load_image(ref_path)
    # Thumbnail for fast analysis
    analysis_img = img.copy()
    analysis_img.thumbnail((800, 800), Image.BILINEAR)
    cv_img = _pil_to_cv(analysis_img)

    lab = cv2.cvtColor(cv_img, cv2.COLOR_BGR2Lab)
    l_channel = lab[:, :, 0].astype(np.float32)
    a_channel = lab[:, :, 1].astype(np.float32)
    b_channel = lab[:, :, 2].astype(np.float32)

    brightness = float(np.mean(l_channel)) / 255.0
    contrast = float(np.std(l_channel)) / 128.0

    # Chroma in LAB
    chroma = np.sqrt((a_channel - 128) ** 2 + (b_channel - 128) ** 2)
    saturation = float(np.mean(chroma)) / 70.0
    saturation = min(max(saturation, 0.0), 1.0)

    # Color temperature: b* > 128 is yellow (warm), b* < 128 is blue (cool)
    mean_b = float(np.mean(b_channel))
    color_temp_score = (mean_b - 128.0) / 30.0
    color_temp = "Warm Golden" if color_temp_score > 0.15 else ("Cool Teal" if color_temp_score < -0.15 else "Neutral Daylight")

    # Tint: a* > 128 is magenta, a* < 128 is green
    mean_a = float(np.mean(a_channel))
    tint_score = (mean_a - 128.0) / 25.0
    tint = "Magenta Shift" if tint_score > 0.15 else ("Green/Emerald Shift" if tint_score < -0.15 else "Neutral Tint")

    # Dominant Hue in HSV
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0], None, [180], [0, 180])
    dominant_hue = int(np.argmax(hist) * 2)  # Scale to 0-360 deg

    # Palette extraction (5 dominant colors using KMeans)
    pixels = cv_img.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    k = 5
    _, _, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_RANDOM_CENTERS)
    palette = []
    for c in centers:
        b, g, r = int(np.clip(c[0], 0, 255)), int(np.clip(c[1], 0, 255)), int(np.clip(c[2], 0, 255))
        palette.append(f"#{r:02x}{g:02x}{b:02x}")

    # Cinematic classification logic
    if brightness < 0.38 and contrast > 0.48:
        style_notes = "Moody Noir — Deep shadows, dramatic contrast, cinematic edge roll-off"
    elif color_temp_score > 0.2 and saturation > 0.4:
        style_notes = "Sunset Golden Hour — Rich warm highlights, amber midtones, cinematic warmth"
    elif color_temp_score < -0.15 and contrast > 0.4:
        style_notes = "Teal & Orange Blockbuster — High visual separation, cool shadows with warm accents"
    elif brightness > 0.62 and saturation < 0.35:
        style_notes = "Airy High-Key — Soft highlights, pastel saturation, editorial clean aesthetic"
    else:
        style_notes = "Balanced Modern Film — Natural tone curves, rich micro-contrast, organic analog feel"

    return {
        "brightness": round(brightness, 3),
        "contrast": round(contrast, 3),
        "saturation": round(saturation, 3),
        "dominant_hue": dominant_hue,
        "color_temp": color_temp,
        "tint": tint,
        "palette": palette,
        "style_notes": style_notes,
    }


# ──────────────────── Lightroom-Inspired Masking Engine ──────────────────────

def generate_subject_mask(image_path: str) -> np.ndarray:
    """
    Computes subject segmentation mask using OpenCV GrabCut algorithm
    with edge-adaptive center priors. Returns normalized [0.0, 1.0] float32 mask.
    """
    img = _load_image(image_path)
    # Downscale for performance during mask solving
    orig_w, orig_h = img.size
    solve_dim = 600
    scale = min(solve_dim / max(orig_w, orig_h), 1.0)
    proc_w, proc_h = int(orig_w * scale), int(orig_h * scale)
    
    cv_small = cv2.resize(_pil_to_cv(img), (proc_w, proc_h), interpolation=cv2.INTER_AREA)
    
    mask = np.zeros((proc_h, proc_w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    
    # Adaptive rectangular prior for portrait/subject photography
    margin_x = int(proc_w * 0.12)
    margin_y = int(proc_h * 0.08)
    rect = (margin_x, margin_y, max(1, proc_w - 2 * margin_x), max(1, proc_h - 2 * margin_y))
    
    try:
        cv2.grabCut(cv_small, mask, rect, bgd_model, fgd_model, 4, cv2.GC_INIT_WITH_RECT)
        sub_binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
    except Exception:
        # Fallback to radial oval subject prior
        Y, X = np.ogrid[:proc_h, :proc_w]
        cy, cx = proc_h / 2, proc_w / 2
        ry, rx = proc_h * 0.38, proc_w * 0.32
        sub_binary = np.clip(1.0 - (((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2), 0.0, 1.0).astype(np.float32)

    # Feather mask for smooth, natural photographic blending
    feather_kernel = int(max(proc_w, proc_h) * 0.04) | 1
    sub_feathered = cv2.GaussianBlur(sub_binary, (feather_kernel, feather_kernel), 0)
    
    # Scale back to full resolution
    full_mask = cv2.resize(sub_feathered, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
    return np.clip(full_mask, 0.0, 1.0)


def generate_linear_gradient_mask(w: int, h: int, angle_deg: float = 0.0) -> np.ndarray:
    """
    Generates a graduated linear filter mask (e.g. for sky or foreground ground).
    angle 0 = top-to-bottom, 180 = bottom-to-top, 90 = left-to-right.
    """
    rad = np.deg2rad(angle_deg)
    y, x = np.mgrid[0:h, 0:w]
    # Center coordinates
    xc = (x - w / 2) / (w / 2)
    yc = (y - h / 2) / (h / 2)
    proj = -xc * np.sin(rad) + yc * np.cos(rad)
    # Map [-1, 1] to [0, 1]
    mask = (proj + 1.0) / 2.0
    return np.clip(mask, 0.0, 1.0).astype(np.float32)


def generate_radial_gradient_mask(w: int, h: int, cx: float = 0.5, cy: float = 0.5, radius: float = 0.45) -> np.ndarray:
    """
    Generates an elliptical radial mask with feathered roll-off.
    """
    y, x = np.mgrid[0:h, 0:w]
    dx = (x / w) - cx
    dy = (y / h) - cy
    dist = np.sqrt(dx * dx + dy * dy) / radius
    mask = np.clip(1.0 - dist, 0.0, 1.0)
    # Cosine smoothing curve
    mask = 0.5 * (1.0 - np.cos(np.pi * mask))
    return mask.astype(np.float32)


def parse_brush_mask(b64_string: str, target_w: int, target_h: int) -> np.ndarray:
    """Decodes user-painted base64 PNG mask and scales it to image dimensions."""
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    raw_bytes = base64.b64decode(b64_string)
    nparr = np.frombuffer(raw_bytes, np.uint8)
    mask_img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if mask_img is None:
        return np.ones((target_h, target_w), dtype=np.float32)
    # Extract alpha or grayscale
    if len(mask_img.shape) == 3 and mask_img.shape[2] == 4:
        gray = mask_img[:, :, 3]
    else:
        gray = cv2.cvtColor(mask_img, cv2.COLOR_BGR2GRAY) if len(mask_img.shape) == 3 else mask_img
    resized = cv2.resize(gray, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
    feather = int(max(target_w, target_h) * 0.015) | 1
    blurred = cv2.GaussianBlur(resized, (feather, feather), 0)
    return (blurred / 255.0).astype(np.float32)


# ──────────────────── Image Adjustment Primitives ──────────────────────

def _histogram_match(src: np.ndarray, ref: np.ndarray) -> np.ndarray:
    """
    Performs true perceptual histogram matching in LAB color space.
    Accurately transfers luminance distribution and color grading
    from the reference photograph.
    """
    src_lab = cv2.cvtColor(src, cv2.COLOR_BGR2Lab).astype(np.float32)
    ref_lab = cv2.cvtColor(ref, cv2.COLOR_BGR2Lab).astype(np.float32)
    matched = src_lab.copy()

    for ch in range(3):
        src_ch = src_lab[:, :, ch].ravel()
        ref_ch = ref_lab[:, :, ch].ravel()

        src_hist, bins = np.histogram(src_ch, 256, [0, 256], density=True)
        ref_hist, _ = np.histogram(ref_ch, 256, [0, 256], density=True)

        src_cdf = src_hist.cumsum()
        ref_cdf = ref_hist.cumsum()

        src_cdf = src_cdf / (src_cdf[-1] + 1e-8)
        ref_cdf = ref_cdf / (ref_cdf[-1] + 1e-8)

        lut = np.interp(src_cdf, ref_cdf, bins[:-1])
        bin_centers = (bins[:-1] + bins[1:]) / 2.0
        mapped = np.interp(src_ch, bin_centers, lut)
        matched[:, :, ch] = mapped.reshape(src_lab[:, :, ch].shape)

    matched = np.clip(matched, 0, 255).astype(np.uint8)
    return cv2.cvtColor(matched, cv2.COLOR_Lab2BGR)


def _apply_split_toning(bgr: np.ndarray, shadow_tint: tuple, highlight_tint: tuple) -> np.ndarray:
    """
    Tints shadows and highlights independently.
    shadow_tint & highlight_tint: (B_shift, G_shift, R_shift) in range [-40, 40]
    """
    img_f = bgr.astype(np.float32)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    shadow_mask = np.clip(1.0 - (gray * 2.0), 0.0, 1.0)[:, :, np.newaxis]
    highlight_mask = np.clip((gray - 0.5) * 2.0, 0.0, 1.0)[:, :, np.newaxis]

    for ch in range(3):
        img_f[:, :, ch] += shadow_tint[ch] * shadow_mask[:, :, 0]
        img_f[:, :, ch] += highlight_tint[ch] * highlight_mask[:, :, 0]

    return np.clip(img_f, 0, 255).astype(np.uint8)


def _apply_vignette(img: Image.Image, strength: float = 0.3) -> Image.Image:
    if strength <= 0:
        return img
    arr = np.array(img, dtype=np.float32)
    h, w = arr.shape[:2]
    Y, X = np.ogrid[:h, :w]
    cx, cy = w / 2, h / 2
    dist = np.sqrt(((X - cx) / cx) ** 2 + ((Y - cy) / cy) ** 2)
    mask = np.clip(1.0 - (strength * 0.8) * np.clip(dist - 0.2, 0, 1), 0, 1)
    mask = mask[:, :, np.newaxis]
    return Image.fromarray(np.clip(arr * mask, 0, 255).astype(np.uint8))


def _apply_film_grain(img: Image.Image, amount: float = 0.02) -> Image.Image:
    if amount <= 0:
        return img
    arr = np.array(img, dtype=np.float32)
    # Gaussian noise with zero mean
    noise = np.random.normal(0, amount * 255.0, arr.shape).astype(np.float32)
    return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))


# ────────────────────── 3 Distinct Variant Generators ───────────────────────

def _generate_natural_cinematic(orig: Image.Image, analysis: dict) -> Image.Image:
    """
    Variant 1: Natural Cinematic
    Organic film aesthetic with lifted shadows, rich natural skin tones,
    gentle highlight compression, subtle warm split toning, and analog grain.
    """
    # 1. Subtle exposure boost and contrast
    img = ImageEnhance.Brightness(orig).enhance(1.04)
    img = ImageEnhance.Contrast(img).enhance(1.12)
    img = ImageEnhance.Color(img).enhance(0.95)  # Slight film desaturation
    img = ImageEnhance.Sharpness(img).enhance(1.20)

    # 2. Warm natural split toning (warm shadows, soft airy highlights)
    cv_img = _pil_to_cv(img)
    # (B, G, R) shifts
    cv_img = _apply_split_toning(cv_img, shadow_tint=(-3, 2, 7), highlight_tint=(4, 0, -2))
    img = _cv_to_pil(cv_img)

    # 3. Organic subtle grain & light vignette
    img = _apply_film_grain(img, amount=0.018)
    img = _apply_vignette(img, strength=0.22)
    return img


def _generate_moody_cinematic(orig: Image.Image, analysis: dict) -> Image.Image:
    """
    Variant 2: Moody Cinematic
    Dramatic deep blacks, crushed shadow curves, high micro-contrast,
    signature teal shadows and amber highlights, bold vignette, textured 35mm grain.
    """
    # 1. Moody exposure dip with punchy contrast
    img = ImageEnhance.Brightness(orig).enhance(0.90)
    img = ImageEnhance.Contrast(img).enhance(1.36)
    img = ImageEnhance.Color(img).enhance(0.82)
    img = ImageEnhance.Sharpness(img).enhance(1.15)

    # 2. Blockbuster Teal & Orange split toning
    cv_img = _pil_to_cv(img)
    # Teal shadows: +B, +G, -R; Warm highlights: -B, +G, +R
    cv_img = _apply_split_toning(cv_img, shadow_tint=(14, 5, -8), highlight_tint=(-10, 3, 12))
    img = _cv_to_pil(cv_img)

    # 3. Pronounced vignette & atmospheric film grain
    img = _apply_film_grain(img, amount=0.032)
    img = _apply_vignette(img, strength=0.48)
    return img


def _generate_reference_match(orig: Image.Image, ref: Image.Image, analysis: dict) -> Image.Image:
    """
    Variant 3: Reference Match
    Precise reference transfer: matches the reference image's color palette,
    tonal balance, and mood using LAB histogram distribution mapping.
    """
    orig_cv = _pil_to_cv(orig)
    ref_cv = _pil_to_cv(ref)

    # Match dimensions for optimal histogram transfer
    if ref_cv.shape[:2] != orig_cv.shape[:2]:
        ref_cv = cv2.resize(ref_cv, (orig_cv.shape[1], orig_cv.shape[0]), interpolation=cv2.INTER_AREA)

    matched_cv = _histogram_match(orig_cv, ref_cv)
    img = _cv_to_pil(matched_cv)

    # Polish with subtle clarity and analog grain
    img = ImageEnhance.Sharpness(img).enhance(1.10)
    img = _apply_film_grain(img, amount=0.015)
    img = _apply_vignette(img, strength=0.20)
    return img


# ────────────────────── Complete Adjustment Pipeline ───────────────────────

def apply_custom_adjustments(
    base_image_path: str,
    mask_type: str = "entire",
    mask_base64: str = None,
    linear_angle: float = 0.0,
    radial_cx: float = 0.5,
    radial_cy: float = 0.5,
    radial_radius: float = 0.45,
    exposure: float = 0.0,      # -100 to +100
    contrast: float = 0.0,      # -100 to +100
    highlights: float = 0.0,    # -100 to +100
    shadows: float = 0.0,       # -100 to +100
    temperature: float = 0.0,   # -100 (cool) to +100 (warm)
    tint: float = 0.0,          # -100 (green) to +100 (magenta)
    saturation: float = 0.0,    # -100 to +100
    clarity: float = 0.0,       # -100 to +100
    vignette: float = 0.0,      # 0 to 100
    grain: float = 0.0,         # 0 to 100
    subject_mask_cache: np.ndarray = None,
) -> tuple[Image.Image, np.ndarray]:
    """
    Applies fine-grained Lightroom-inspired adjustments to base image,
    either across the entire frame or localized to a mask
    (subject, background, linear gradient, radial gradient, brush).
    """
    base_img = _load_image(base_image_path)
    w, h = base_img.size

    # 1. Determine mask
    if mask_type == "subject":
        mask = subject_mask_cache if subject_mask_cache is not None else generate_subject_mask(base_image_path)
    elif mask_type == "background":
        sub_mask = subject_mask_cache if subject_mask_cache is not None else generate_subject_mask(base_image_path)
        mask = 1.0 - sub_mask
    elif mask_type == "linear":
        mask = generate_linear_gradient_mask(w, h, angle_deg=linear_angle)
    elif mask_type == "radial":
        mask = generate_radial_gradient_mask(w, h, cx=radial_cx, cy=radial_cy, radius=radial_radius)
    elif mask_type == "brush" and mask_base64:
        mask = parse_brush_mask(mask_base64, w, h)
    else:
        # Entire frame
        mask = np.ones((h, w), dtype=np.float32)

    # 2. Apply adjustments to a copy of the image
    adjusted = base_img.copy()

    # Exposure adjustment (-100 to 100 -> factor 0.3 to 2.2)
    if exposure != 0:
        exp_factor = 1.0 + (exposure / 100.0) * 0.75
        adjusted = ImageEnhance.Brightness(adjusted).enhance(max(0.1, exp_factor))

    # Contrast (-100 to 100 -> factor 0.5 to 1.8)
    if contrast != 0:
        cnt_factor = 1.0 + (contrast / 100.0) * 0.65
        adjusted = ImageEnhance.Contrast(adjusted).enhance(max(0.2, cnt_factor))

    # Saturation (-100 to 100 -> factor 0.0 to 2.2)
    if saturation != 0:
        sat_factor = 1.0 + (saturation / 100.0) * 0.90
        adjusted = ImageEnhance.Color(adjusted).enhance(max(0.0, sat_factor))

    # Clarity / Sharpness (-100 to 100 -> factor 0.0 to 2.5)
    if clarity != 0:
        clr_factor = 1.0 + (clarity / 100.0) * 1.1
        adjusted = ImageEnhance.Sharpness(adjusted).enhance(max(0.0, clr_factor))

    cv_adj = _pil_to_cv(adjusted).astype(np.float32)

    # Temperature (Blue <-> Amber) and Tint (Green <-> Magenta) in OpenCV BGR
    # BGR format:
    # Warm (+temp): Increase Red (+temp*0.4), Decrease Blue (-temp*0.4)
    # Magenta (+tint): Increase Red & Blue, Decrease Green
    if temperature != 0 or tint != 0:
        t_shift = (temperature / 100.0) * 35.0
        tint_shift = (tint / 100.0) * 25.0

        cv_adj[:, :, 0] -= t_shift * 0.7         # Blue channel
        cv_adj[:, :, 1] -= tint_shift * 0.8      # Green channel
        cv_adj[:, :, 2] += t_shift * 0.7 + tint_shift * 0.5  # Red channel

    # Highlights and Shadows adjustment
    if highlights != 0 or shadows != 0:
        gray = cv2.cvtColor(np.clip(cv_adj, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
        hl_mask = np.clip((gray - 0.5) * 2.0, 0.0, 1.0)[:, :, np.newaxis]
        sh_mask = np.clip(1.0 - (gray * 2.0), 0.0, 1.0)[:, :, np.newaxis]

        hl_shift = (highlights / 100.0) * 45.0
        sh_shift = (shadows / 100.0) * 45.0

        for ch in range(3):
            cv_adj[:, :, ch] += hl_shift * hl_mask[:, :, 0]
            cv_adj[:, :, ch] += sh_shift * sh_mask[:, :, 0]

    cv_adj = np.clip(cv_adj, 0, 255).astype(np.uint8)
    adjusted_img = _cv_to_pil(cv_adj)

    # 3. Alpha blend adjusted image with base image using the mask
    orig_arr = np.array(base_img, dtype=np.float32)
    adj_arr = np.array(adjusted_img, dtype=np.float32)
    m_3d = mask[:, :, np.newaxis]

    composite_arr = orig_arr * (1.0 - m_3d) + adj_arr * m_3d
    final_img = Image.fromarray(np.clip(composite_arr, 0, 255).astype(np.uint8))

    # 4. Global finishing effects (Grain & Vignette)
    if grain > 0:
        final_img = _apply_film_grain(final_img, amount=(grain / 100.0) * 0.06)
    if vignette > 0:
        final_img = _apply_vignette(final_img, strength=(vignette / 100.0) * 0.75)

    return final_img, mask


# ──────────────────────── Public API ────────────────────────────

def process_project(original_path: str, reference_path: str, project_id: int) -> dict:
    """
    Main workflow entry point.
    Processes original RAW/photo against reference photo, generates 3 variants,
    computes analysis, and saves outputs.
    """
    orig = _load_image(original_path)
    ref = _load_image(reference_path)
    analysis = analyze_reference(reference_path)

    # Limit maximum dimension for responsive processing
    MAX_DIM = 2400
    if max(orig.size) > MAX_DIM:
        orig.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
    if max(ref.size) > MAX_DIM:
        ref.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)

    variants = {
        "natural": _generate_natural_cinematic(orig, analysis),
        "moody": _generate_moody_cinematic(orig, analysis),
        "reference": _generate_reference_match(orig, ref, analysis),
    }

    labels = {
        "natural": "Natural Cinematic",
        "moody": "Moody Cinematic",
        "reference": "Reference Match",
    }

    paths = {}
    for key, img in variants.items():
        filename = f"project_{project_id}_{key}_{uuid.uuid4().hex[:8]}.jpg"
        out_path = STORAGE_DIR / filename
        img.save(str(out_path), "JPEG", quality=93)
        paths[key] = str(out_path)

    return {"paths": paths, "labels": labels, "analysis": analysis}
