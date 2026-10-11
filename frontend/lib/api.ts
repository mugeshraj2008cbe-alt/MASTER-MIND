export const API_BASE = process.env.NEXT_PUBLIC_API_URL !== undefined 
  ? process.env.NEXT_PUBLIC_API_URL 
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

function getHeaders(token?: string | null): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  status: string;
  original_path?: string;
  reference_path?: string;
  subject_mask_path?: string;
}

export interface Variant {
  id: number;
  variant_type: string;
  label: string;
  url?: string;
}

export interface Analysis {
  brightness: string;
  contrast: string;
  saturation: string;
  dominant_hue: string;
  color_temp: string;
  tint?: string;
  palette?: string[];
  style_notes: string;
}

export interface ProjectStatus {
  id: number;
  name: string;
  status: string;
  variants: Variant[];
  analysis?: Analysis;
  original_url?: string;
  reference_url?: string;
  subject_mask_url?: string;
}

export interface AdjustParams {
  variant_id?: number | null;
  mask_type: 'entire' | 'subject' | 'background' | 'linear' | 'radial' | 'brush';
  mask_base64?: string;
  linear_angle?: number;
  radial_cx?: number;
  radial_cy?: number;
  radial_radius?: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  temperature: number;
  tint: number;
  saturation: number;
  clarity: number;
  vignette: number;
  grain: number;
}

// ── Auth ──────────────────────────────────────────────────────────

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

// ── Projects ──────────────────────────────────────────────────────

export async function createProject(name: string, token: string): Promise<Project> {
  const form = new FormData();
  form.append('name', name);
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create project');
  }
  return res.json();
}

export async function listProjects(token: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Failed to list projects');
  return res.json();
}

export async function deleteProject(id: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete project');
}

// ── Uploads & Sample Preload ───────────────────────────────────────

export async function uploadOriginal(projectId: number, file: File, token: string): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/projects/${projectId}/upload/original`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
}

export async function uploadReference(projectId: number, file: File, token: string): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/projects/${projectId}/upload/reference`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
}

export async function preloadSampleData(projectId: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/preload-sample`, {
    method: 'POST',
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to preload sample photo pair');
  }
}

// ── Masking & Processing ──────────────────────────────────────────

export async function generateMask(projectId: number, token: string): Promise<{ mask_url: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/generate-mask`, {
    method: 'POST',
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate subject mask');
  }
  return res.json();
}

export async function startProcessing(projectId: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/process`, {
    method: 'POST',
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Processing failed to start');
  }
}

export async function getProjectStatus(projectId: number, token: string): Promise<ProjectStatus> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/status`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch project status');
  return res.json();
}

export async function applyAdjustments(
  projectId: number,
  params: AdjustParams,
  token: string
): Promise<{ message: string; variant: Variant }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/adjust`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to apply adjustments');
  }
  return res.json();
}

export function getFileUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export function getDownloadUrl(projectId: number, variantId: number): string {
  return `${API_BASE}/projects/${projectId}/variants/${variantId}/download`;
}
