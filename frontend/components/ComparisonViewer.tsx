'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Variant, getFileUrl, getDownloadUrl } from '@/lib/api';
import {
  SplitSquareVertical,
  Columns,
  Eye,
  Download,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface ComparisonViewerProps {
  projectId: number;
  originalUrl?: string;
  activeVariant?: Variant | null;
  subjectMaskUrl?: string;
  activeMaskType?: string;
}

export default function ComparisonViewer({
  projectId,
  originalUrl,
  activeVariant,
  subjectMaskUrl,
  activeMaskType = 'none',
}: ComparisonViewerProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [showMaskOverlay, setShowMaskOverlay] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = () => setIsDragging(true);

  useEffect(() => {
    const handlePointerUp = () => setIsDragging(false);
    const handlePointerMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderPosition((x / rect.width) * 100);
    };

    if (isDragging) {
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('mousemove', handlePointerMove);
    }
    return () => {
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [isDragging]);

  if (!originalUrl) {
    return (
      <div className="w-full h-96 bg-[#0c0d13] border border-[#1e202d] rounded-2xl flex flex-col items-center justify-center p-6 text-center text-gray-500">
        <Sparkles className="w-8 h-8 mb-2 text-[#d4af37]/40" />
        <p className="text-sm font-semibold text-gray-300">Cinema Studio Viewer Idle</p>
        <p className="text-xs text-gray-500 mt-1">Upload photos above to begin inspection</p>
      </div>
    );
  }

  const editedUrl = activeVariant?.url ? getFileUrl(activeVariant.url) : getFileUrl(originalUrl);
  const origSrc = getFileUrl(originalUrl);

  return (
    <div className="w-full bg-[#0d0e14] border border-[#202230] rounded-2xl p-5 shadow-2xl mb-6">
      {/* Viewer Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-[#1c1d29] gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
            <span>Interactive Before / After Studio</span>
          </span>
          {activeVariant && (
            <span className="text-[11px] bg-[#161825] border border-[#2a2d42] text-[#d4af37] px-2.5 py-0.5 rounded-full font-medium">
              Active: {activeVariant.label}
            </span>
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* Split vs Side-by-side */}
          <div className="flex items-center bg-[#13141f] border border-[#232536] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'split' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'side-by-side' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Mask Overlay Toggle */}
          {subjectMaskUrl && (
            <button
              onClick={() => setShowMaskOverlay(!showMaskOverlay)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showMaskOverlay
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-[#151622] border-[#252839] text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showMaskOverlay ? 'Mask Overlay ON' : 'Show Mask (O)'}</span>
            </button>
          )}

          {/* Download Active Variant */}
          {activeVariant && (
            <a
              href={getDownloadUrl(projectId, activeVariant.id)}
              download
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#181926] hover:bg-[#202334] border border-[#2c2f42] text-xs font-semibold text-gray-200 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Export JPEG</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      {viewMode === 'split' ? (
        <div
          ref={containerRef}
          onMouseDown={handlePointerDown}
          className="relative w-full h-[520px] bg-black rounded-xl overflow-hidden cursor-ew-resize select-none border border-[#1a1b26]"
        >
          {/* Edited (After) - Base Full Layer */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={editedUrl}
              alt="Graded Result"
              className="w-full h-full object-contain pointer-events-none"
            />
            {/* Mask Ruby Overlay if active */}
            {showMaskOverlay && subjectMaskUrl && (
              <img
                src={getFileUrl(subjectMaskUrl)}
                alt="Subject Mask Overlay"
                className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-60 pointer-events-none filter hue-rotate-300"
              />
            )}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wider">
              After: {activeVariant ? activeVariant.label : 'Original'}
            </div>
          </div>

          {/* Original (Before) - Clipped by Slider Position */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <div
              className="relative h-full"
              style={{ width: containerRef.current?.clientWidth || '100%' }}
            >
              <img
                src={origSrc}
                alt="Original Before"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-gray-300 uppercase tracking-wider">
              Before (Original RAW)
            </div>
          </div>

          {/* Draggable Divider Bar */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.8)] pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0d0e14] border-2 border-[#d4af37] flex items-center justify-center shadow-xl">
              <SplitSquareVertical className="w-4 h-4 text-[#d4af37]" />
            </div>
          </div>
        </div>
      ) : (
        /* Side by Side Dual View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[520px]">
          {/* Before */}
          <div className="relative bg-black rounded-xl overflow-hidden border border-[#1a1b26] flex items-center justify-center">
            <img
              src={origSrc}
              alt="Original Before"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-gray-300 uppercase tracking-wider">
              Before (Original RAW)
            </div>
          </div>

          {/* After */}
          <div className="relative bg-black rounded-xl overflow-hidden border border-[#1a1b26] flex items-center justify-center">
            <img
              src={editedUrl}
              alt="Graded Result"
              className="w-full h-full object-contain"
            />
            {showMaskOverlay && subjectMaskUrl && (
              <img
                src={getFileUrl(subjectMaskUrl)}
                alt="Subject Mask Overlay"
                className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-60 filter hue-rotate-300"
              />
            )}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wider">
              After: {activeVariant ? activeVariant.label : 'Original'}
            </div>
          </div>
        </div>
      )}

      {/* Helpful Hint */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
        <span>Drag the vertical gold bar left/right to inspect pixel-perfect tonal response</span>
        <span>Resolution: Native RAW / Standard dynamic range</span>
      </div>
    </div>
  );
}
