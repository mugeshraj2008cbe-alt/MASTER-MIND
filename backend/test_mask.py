"""
Test script to verify OpenCV image processing, Grabcut subject masking,
and variant generation.
"""
import numpy as np
import cv2
from PIL import Image

def test():
    # Create synthetic test image
    img = np.zeros((400, 600, 3), dtype=np.uint8)
    # Background: blue sky and green grass
    img[:200, :] = [235, 180, 100]  # BGR sky
    img[200:, :] = [60, 140, 50]    # BGR grass
    # Subject: warm circle/person in center
    cv2.circle(img, (300, 220), 80, (40, 60, 200), -1)

    # Test GrabCut subject mask
    mask = np.zeros(img.shape[:2], np.uint8)
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    rect = (150, 80, 300, 280)
    cv2.grabCut(img, mask, rect, bgdModel, fgdModel, 3, cv2.GC_INIT_WITH_RECT)
    sub_mask = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
    print("GrabCut mask shape:", sub_mask.shape, "Subject pixels:", np.sum(sub_mask))

test()
