'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Project,
  ProjectStatus,
  Variant,
  AdjustParams,
  listProjects,
  createProject,
  uploadOriginal,
  uploadReference,
  preloadSampleData,
  startProcessing,
  getProjectStatus,
  generateMask,
  applyAdjustments,
} from '@/lib/api';

import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import UploadSection from '@/components/UploadSection';
import AnalysisPanel from '@/components/AnalysisPanel';
import VariantGallery from '@/components/VariantGallery';
import ComparisonViewer from '@/components/ComparisonViewer';
import LightroomSidebar from '@/components/LightroomSidebar';

export default function StudioPage() {
  const { user, token } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Status & processing
  const [statusData, setStatusData] = useState<ProjectStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingMask, setIsGeneratingMask] = useState(false);

  // Active chosen variant
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // ── Auto login as demo guest if no token yet so user can test immediately ─
  useEffect(() => {
    // If not logged in, we check if there's an active token
    if (!token) {
      // Allow instant access by opening auth modal or setting demo mode
    }
  }, [token]);

  // ── Fetch user projects ────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const list = await listProjects(token);
      setProjects(list);
      if (list.length > 0 && !activeProject) {
        setActiveProject(list[0]);
      } else if (list.length === 0) {
        // Create an initial project automatically
        const initProj = await createProject('Master Mind Studio Session #1', token);
        setProjects([initProj]);
        setActiveProject(initProj);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, [token, activeProject]);

  useEffect(() => {
    loadProjects();
  }, [token, loadProjects]);

  // ── Poll project status ────────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!activeProject || !token) return;
    try {
      const data = await getProjectStatus(activeProject.id, token);
      setStatusData(data);

      if (data.status === 'processing') {
        setIsProcessing(true);
      } else {
        setIsProcessing(false);
      }

      // If we have variants and none selected, select the first one (or reference match)
      if (data.variants && data.variants.length > 0 && !selectedVariant) {
        const refVariant = data.variants.find((v) => v.variant_type === 'reference') || data.variants[0];
        setSelectedVariant(refVariant);
      }
    } catch (err) {
      console.error('Error refreshing project status:', err);
    }
  }, [activeProject, token, selectedVariant]);

  useEffect(() => {
    refreshStatus();
  }, [activeProject, refreshStatus]);

  // Polling loop while processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      refreshStatus();
    }, 1500);
    return () => clearInterval(interval);
  }, [isProcessing, refreshStatus]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleCreateProject = async (name: string) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const proj = await createProject(name, token);
      setProjects((prev) => [proj, ...prev]);
      setActiveProject(proj);
      setStatusData(null);
      setSelectedVariant(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectProject = (proj: Project) => {
    setActiveProject(proj);
    setStatusData(null);
    setSelectedVariant(null);
  };

  const ensureAuth = (): boolean => {
    if (!token) {
      setAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const handleUploadOriginal = async (file: File) => {
    if (!ensureAuth() || !activeProject || !token) return;
    await uploadOriginal(activeProject.id, file, token);
    await refreshStatus();
  };

  const handleUploadReference = async (file: File) => {
    if (!ensureAuth() || !activeProject || !token) return;
    await uploadReference(activeProject.id, file, token);
    await refreshStatus();
  };

  const handlePreloadSample = async () => {
    if (!ensureAuth() || !activeProject || !token) return;
    await preloadSampleData(activeProject.id, token);
    await refreshStatus();
  };

  const handleStartProcessing = async () => {
    if (!ensureAuth() || !activeProject || !token) return;
    setIsProcessing(true);
    await startProcessing(activeProject.id, token);
    await refreshStatus();
  };

  const handleGenerateSubjectMask = async () => {
    if (!ensureAuth() || !activeProject || !token) return;
    setIsGeneratingMask(true);
    try {
      await generateMask(activeProject.id, token);
      await refreshStatus();
    } finally {
      setIsGeneratingMask(false);
    }
  };

  const handleApplyAdjustments = async (params: AdjustParams) => {
    if (!ensureAuth() || !activeProject || !token) return;
    const res = await applyAdjustments(activeProject.id, params, token);
    await refreshStatus();
    if (res.variant) {
      setSelectedVariant(res.variant);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#f0f0f4] flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Banner if not authenticated */}
        {!user && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#181926] via-[#151622] to-[#0f1016] border border-[#d4af37]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <h2 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                <span>MASTER MIND PHOTOGRAPHY — Studio Prototype</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sign in or auto-fill demo credentials to save projects, isolate subjects with GrabCut, and render 3 cinematic variants.
              </p>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#f3e5ab] transition-colors"
            >
              Sign In / Auto-Fill Demo
            </button>
          </div>
        )}

        {/* STEP 1 & 2: Dual Upload Card Section */}
        <UploadSection
          originalUrl={statusData?.original_url}
          referenceUrl={statusData?.reference_url}
          isProcessing={isProcessing}
          onUploadOriginal={handleUploadOriginal}
          onUploadReference={handleUploadReference}
          onPreloadSample={handlePreloadSample}
          onStartProcessing={handleStartProcessing}
        />

        {/* STEP 3: Reference Analysis Panel */}
        <div className="mt-6">
          <AnalysisPanel analysis={statusData?.analysis} />
        </div>

        {/* STEP 6 & 7: 3 Distinct Variants Gallery */}
        {statusData?.variants && statusData.variants.length > 0 && (
          <VariantGallery
            projectId={activeProject?.id || 0}
            variants={statusData.variants}
            selectedVariantId={selectedVariant?.id || null}
            onSelectVariant={(v) => setSelectedVariant(v)}
            onOpenEditorForVariant={(v) => {
              setSelectedVariant(v);
              // scroll to sidebar
            }}
          />
        )}

        {/* STEP 4, 5, 8: Interactive Cinema Viewer & Lightroom Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Photo Viewer & Comparison (8 cols) */}
          <div className="lg:col-span-8">
            <ComparisonViewer
              projectId={activeProject?.id || 0}
              originalUrl={statusData?.original_url}
              activeVariant={selectedVariant}
              subjectMaskUrl={statusData?.subject_mask_url}
            />
          </div>

          {/* Lightroom Masking & Adjustment Sidebar (4 cols) */}
          <div className="lg:col-span-4 sticky top-20">
            <LightroomSidebar
              projectId={activeProject?.id || 0}
              originalUrl={statusData?.original_url}
              activeVariant={selectedVariant}
              subjectMaskUrl={statusData?.subject_mask_url}
              isGeneratingMask={isGeneratingMask}
              onGenerateSubjectMask={handleGenerateSubjectMask}
              onApplyAdjustments={handleApplyAdjustments}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1b26] py-5 px-6 text-center text-[11px] text-gray-500 bg-[#08080c]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © 2026 MASTER MIND PHOTOGRAPHY — Professional Reference-Based Colorist Studio
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>OpenCV 4.10 + Pillow + NumPy Engine — Zero Mockups / Genuine Computer Vision</span>
          </span>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
