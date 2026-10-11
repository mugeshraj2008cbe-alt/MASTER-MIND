"""
End-to-End automated integration test for MASTER MIND PHOTOGRAPHY
Tests all endpoints, image processing, GrabCut masking, variant generation, and localized adjustments.
"""
import requests
import time
import sys
import io

# Ensure UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def test_full_pipeline():
    print("[1/8] Testing backend health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("      [OK] Backend healthy:", r.json())

    print("[2/8] Testing user registration & login...")
    username = f"cinematographer_{int(time.time())}"
    email = f"{username}@studio.com"
    password = "MasterMindSecret2024!"
    
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    token_data = reg_res.json()
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"      [OK] Registered user '{username}', token acquired.")

    print("[3/8] Creating new project...")
    proj_res = requests.post(f"{BASE_URL}/projects", data={"name": "Vogue Cinematic Grading"}, headers=headers)
    assert proj_res.status_code == 201, f"Create project failed: {proj_res.text}"
    project = proj_res.json()
    project_id = project["id"]
    print(f"      [OK] Project created with ID: {project_id}")

    print("[4/8] Preloading sample photo pair (portrait original + golden hour reference)...")
    load_res = requests.post(f"{BASE_URL}/projects/{project_id}/preload-sample", headers=headers)
    assert load_res.status_code == 200, f"Preload failed: {load_res.text}"
    print("      [OK] Photo pair preloaded into storage.")

    print("[5/8] Triggering reference analysis and 3 cinematic variants generation...")
    proc_res = requests.post(f"{BASE_URL}/projects/{project_id}/process", headers=headers)
    assert proc_res.status_code == 200, f"Processing start failed: {proc_res.text}"
    
    # Poll status until done
    for attempt in range(25):
        time.sleep(1.0)
        status_res = requests.get(f"{BASE_URL}/projects/{project_id}/status", headers=headers)
        status_data = status_res.json()
        print(f"      Status: {status_data['status']} (attempt {attempt+1})")
        if status_data["status"] == "done":
            break
        elif status_data["status"] == "error":
            raise RuntimeError("Processing failed with status: error")
    
    assert status_data["status"] == "done", "Processing did not complete in time"
    variants = status_data["variants"]
    analysis = status_data["analysis"]
    print(f"      [OK] Generated {len(variants)} variants:")
    for v in variants:
        print(f"        - [{v['variant_type']}] {v['label']} -> {v['url']}")
    print(f"      [OK] Reference Photographic DNA Analysis:")
    print(f"        - Brightness: {analysis['brightness']}, Contrast: {analysis['contrast']}")
    print(f"        - Color Temp: {analysis['color_temp']}, Tint: {analysis['tint']}")
    print(f"        - Dominant Swatches: {analysis['palette']}")
    print(f"        - Style Notes: {analysis['style_notes']}")

    print("[6/8] Testing OpenCV GrabCut subject isolation mask...")
    mask_res = requests.post(f"{BASE_URL}/projects/{project_id}/generate-mask", headers=headers)
    assert mask_res.status_code == 200, f"Mask generation failed: {mask_res.text}"
    mask_data = mask_res.json()
    print(f"      [OK] Subject mask generated successfully -> {mask_data['mask_url']}")

    print("[7/8] Testing localized Lightroom-style adjustments...")
    adj_payload = {
        "variant_id": variants[0]["id"],
        "mask_type": "subject",
        "exposure": 25.0,
        "contrast": 15.0,
        "temperature": 20.0,
        "tint": -5.0,
        "saturation": 10.0,
        "clarity": 30.0,
        "vignette": 20.0,
        "grain": 15.0
    }
    adj_res = requests.post(f"{BASE_URL}/projects/{project_id}/adjust", json=adj_payload, headers=headers)
    assert adj_res.status_code == 200, f"Adjustments failed: {adj_res.text}"
    adj_data = adj_res.json()
    print(f"      [OK] Localized adjustment applied -> {adj_data['variant']['label']}: {adj_data['variant']['url']}")

    print("[8/8] Testing variant file download endpoint...")
    v_id = variants[0]["id"]
    dl_res = requests.get(f"{BASE_URL}/projects/{project_id}/variants/{v_id}/download", headers=headers)
    assert dl_res.status_code == 200, f"Download failed: {dl_res.status_code}"
    assert len(dl_res.content) > 1000, "Downloaded file is empty or corrupted"
    print(f"      [OK] Download endpoint verified ({len(dl_res.content)} bytes received).")

    print("\n========================================================")
    print("ALL 8 END-TO-END WORKFLOW TESTS PASSED PERFECTLY!")
    print("========================================================")

if __name__ == "__main__":
    test_full_pipeline()
