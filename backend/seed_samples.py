"""
Generates high quality demo images for instant testing:
1. sample_original.jpg - A dramatic portrait with subject and background
2. sample_reference.jpg - A warm cinematic golden hour reference
"""
import numpy as np
import cv2
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

STORAGE_DIR = Path(__file__).parent / "storage"
STORAGE_DIR.mkdir(exist_ok=True)

def create_sample_images():
    w, h = 1200, 1600
    
    # ── 1. Create Sample Original: Cinematic Portrait ──
    # Background: architectural studio with cool tones
    y, x = np.mgrid[0:h, 0:w]
    bg_b = 60 + (y / h) * 40 + np.sin(x / 100) * 15
    bg_g = 55 + (y / h) * 35 + np.sin(x / 120) * 10
    bg_r = 50 + (y / h) * 30 + np.cos(x / 110) * 10
    bg = np.stack([bg_b, bg_g, bg_r], axis=2).clip(0, 255).astype(np.uint8)
    
    # Draw pillars / background lines
    cv2.line(bg, (250, 0), (250, h), (40, 45, 55), 35)
    cv2.line(bg, (950, 0), (950, h), (45, 48, 58), 45)
    bg = cv2.GaussianBlur(bg, (51, 51), 0)
    
    # Subject: Portrait silhouette / character in center
    cx, cy = w // 2, int(h * 0.55)
    
    # Shoulders / body
    cv2.ellipse(bg, (cx, cy + 450), (380, 500), 0, 0, 360, (25, 25, 30), -1)
    # Neck
    cv2.rectangle(bg, (cx - 70, cy + 80), (cx + 70, cy + 220), (140, 160, 205), -1)
    # Head / Face oval
    cv2.ellipse(bg, (cx, cy - 20), (160, 210), 0, 0, 360, (150, 175, 220), -1)
    # Hair
    cv2.ellipse(bg, (cx, cy - 110), (180, 140), 0, 180, 360, (20, 20, 25), -1)
    cv2.circle(bg, (cx - 150, cy - 30), 60, (20, 20, 25), -1)
    cv2.circle(bg, (cx + 150, cy - 30), 60, (20, 20, 25), -1)
    # Rim light on subject
    cv2.ellipse(bg, (cx - 10, cy - 20), (163, 213), 0, 120, 240, (190, 215, 255), 6)
    
    orig_path = STORAGE_DIR / "sample_original.jpg"
    cv2.imwrite(str(orig_path), bg, [cv2.IMWRITE_JPEG_QUALITY, 94])
    
    # ── 2. Create Sample Reference: Golden Hour Cinematic Mood ──
    # Rich sunset warm gradients: deep amber, gold, teal sky
    ref_b = 30 + 160 * (1.0 - (y / h) ** 1.5)
    ref_g = 80 + 100 * np.sin((y / h) * np.pi)
    ref_r = 190 + 55 * np.cos((y / h) * 1.2)
    ref = np.stack([ref_b, ref_g, ref_r], axis=2).clip(0, 255).astype(np.uint8)
    
    # Warm sun flare
    sun_x, sun_y = int(w * 0.7), int(h * 0.35)
    for r in range(400, 20, -25):
        alpha = int(255 * (1.0 - r / 400.0))
        cv2.circle(ref, (sun_x, sun_y), r, (alpha // 3, alpha // 2, alpha), -1)
    ref = cv2.GaussianBlur(ref, (65, 65), 0)
    
    ref_path = STORAGE_DIR / "sample_reference.jpg"
    cv2.imwrite(str(ref_path), ref, [cv2.IMWRITE_JPEG_QUALITY, 94])
    print(f"Generated sample files: {orig_path} and {ref_path}")

if __name__ == "__main__":
    create_sample_images()
