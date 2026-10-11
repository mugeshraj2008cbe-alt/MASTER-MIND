'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Layers,
  Sun,
  Flame,
  Paintbrush,
  RotateCcw,
  Check,
  Compass,
  CircleDot,
  UserCheck,
  Disc,
  X
} from 'lucide-react';
import { AdjustParams, Variant, getFileUrl } from '@/lib/api';

interface LightroomSidebarProps {
  projectId: number;
  originalUrl?: string;
  activeVariant?: Variant | null;
  subjectMaskUrl?: string;
  isGeneratingMask: boolean;
  onGenerateSubjectMask: () => Promise<void>;
  onApplyAdjustments: (params: AdjustParams) => Promise<void>;
}

export default function LightroomSidebar({
  projectId,
  originalUrl,
  activeVariant,
  subjectMaskUrl,
  isGeneratingMask,
  onGenerateSubjectMask,
  onApplyAdjustments,
}: LightroomSidebarProps) {
  // Mask state
  const [maskType, setMaskType] = useState<'entire' | 'subject' | 'background' | 'linear' | 'radial' | 'brush'>('entire');
  const [linearAngle, setLinearAngle] = useState(0); // 0 to 360 deg
  const [radialRadius, setRadialRadius] = useState(0.45); // 0.1 to 1.0

  // Sliders state
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);

  const [isApplying, setIsApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Brush modal state
  const [showBrushModal, setShowBrushModal] = useState(false);
  const [brushBase64, setBrushBase64] = useState<string | undefined>(undefined);
  const [brushSize, setBrushSize] = useState(30);
  const [isPainting, setIsPainting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleResetSliders = () => {
    setExposure(0);
    setContrast(0);
    setHighlights(0);
    setShadows(0);
    setTemperature(0);
    setTint(0);
    setSaturation(0);
    setClarity(0);
    setVignette(0);
    setGrain(0);
  };

  const handleApply = async () => {
    setIsApplying(true);
    setSuccessMsg(false);
    try {
      const params: AdjustParams = {
        variant_id: activeVariant?.id || null,
        mask_type: maskType,
        mask_base64: maskType === 'brush' ? brushBase64 : undefined,
        linear_angle: linearAngle,
        radial_radius: radialRadius,
        radial_cx: 0.5,
        radial_cy: 0.5,
        exposure,
        contrast,
        highlights,
        shadows,
        temperature,
        tint,
        saturation,
        clarity,
        vignette,
        grain,
      };
      await onApplyAdjustments(params);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  // Brush canvas functions
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveBrushMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setBrushBase64(dataUrl);
    setShowBrushModal(false);
  };

  const drawOnCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.fillStyle = 'rgba(235, 77, 75, 0.75)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div className="w-full bg-[#0d0e14] border border-[#202230] rounded-2xl p-5 shadow-2xl flex flex-col gap-5">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#1c1d29]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-serif font-bold text-white uppercase tracking-wider">
              Lightroom Masking &amp; Colorist Engine
            </h3>
            <p className="text-[10px] text-gray-400">
              Apply localized tonal adjustments to active photo
            </p>
          </div>
        </div>
        <button
          onClick={handleResetSliders}
          title="Reset Sliders to 0"
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded bg-[#161723] hover:bg-[#1e202f] border border-[#27293b] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* SECTION 1: Masking Tools Selection */}
      <div className="bg-[#11121b] border border-[#222434] rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
            Mask Isolation Target
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {maskType.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setMaskType('entire')}
            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all ${
              maskType === 'entire'
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md shadow-[#d4af37]/20'
                : 'bg-[#161825] border-[#26283a] text-gray-300 hover:border-gray-500'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Entire Frame</span>
          </button>

          <button
            onClick={() => setMaskType('subject')}
            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all ${
              maskType === 'subject'
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md shadow-[#d4af37]/20'
                : 'bg-[#161825] border-[#26283a] text-gray-300 hover:border-gray-500'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Subject Mask</span>
          </button>

          <button
            onClick={() => setMaskType('background')}
            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all ${
              maskType === 'background'
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md shadow-[#d4af37]/20'
                : 'bg-[#161825] border-[#26283a] text-gray-300 hover:border-gray-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Background</span>
          </button>

          <button
            onClick={() => setMaskType('linear')}
            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all ${
              maskType === 'linear'
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md shadow-[#d4af37]/20'
                : 'bg-[#161825] border-[#26283a] text-gray-300 hover:border-gray-500'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Linear Grad</span>
          </button>

          <button
            onClick={() => setMaskType('radial')}
            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all ${
              maskType === 'radial'
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md shadow-[#d4af37]/20'
                : 'bg-[#161825] border-[#26283a] text-gray-300 hover:border-gray-500'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Radial Grad</span>
          </button>

          <button
            onClick={() => {
              setMaskType('brush');
              setShowBrushModal(true);
            }}
            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border flex flex-col items-center gap-1 transition-all ${
              maskType === 'brush'
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md shadow-[#d4af37]/20'
                : 'bg-[#161825] border-[#26283a] text-gray-300 hover:border-gray-500'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Brush Mask</span>
          </button>
        </div>

        {/* GrabCut Subject Mask Detect Button */}
        {(maskType === 'subject' || maskType === 'background') && (
          <div className="pt-2 border-t border-[#1e202f]">
            <button
              onClick={onGenerateSubjectMask}
              disabled={isGeneratingMask || !originalUrl}
              className="w-full py-2 px-3 rounded-lg bg-[#181a27] hover:bg-[#202235] border border-[#d4af37]/40 text-xs font-semibold text-[#d4af37] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isGeneratingMask
                  ? 'Solving GrabCut Segmentation...'
                  : subjectMaskUrl
                  ? 'Re-calculate Subject Detection'
                  : 'Detect & Isolate Subject (OpenCV GrabCut)'}
              </span>
            </button>
            {subjectMaskUrl && (
              <span className="text-[10px] text-emerald-400 mt-1 block text-center">
                ✓ Mask generated and cached for localized grading
              </span>
            )}
          </div>
        )}

        {/* Linear Gradient Direction Controls */}
        {maskType === 'linear' && (
          <div className="pt-2 border-t border-[#1e202f] space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Gradient Angle</span>
              <span className="text-[#d4af37] font-mono">{linearAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={linearAngle}
              onChange={(e) => setLinearAngle(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Radial Gradient Radius Controls */}
        {maskType === 'radial' && (
          <div className="pt-2 border-t border-[#1e202f] space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Radial Radius</span>
              <span className="text-[#d4af37] font-mono">{Math.round(radialRadius * 100)}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={radialRadius * 100}
              onChange={(e) => setRadialRadius(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>
        )}

        {/* Brush Mask trigger */}
        {maskType === 'brush' && (
          <div className="pt-2 border-t border-[#1e202f]">
            <button
              onClick={() => setShowBrushModal(true)}
              className="w-full py-1.5 px-3 rounded-lg bg-[#181a27] hover:bg-[#202235] border border-[#2b2e42] text-xs font-semibold text-gray-200 flex items-center justify-center gap-2"
            >
              <Paintbrush className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{brushBase64 ? 'Edit Painted Brush Mask' : 'Paint Brush Mask on Canvas'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: Tone Sliders */}
      <div className="bg-[#11121b] border border-[#222434] rounded-xl p-3.5 space-y-3">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          Tone &amp; Dynamic Range
        </span>

        {/* Exposure */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Exposure</span>
            <span className="font-mono text-white">{exposure > 0 ? `+${exposure}` : exposure}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={exposure}
            onChange={(e) => setExposure(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Contrast</span>
            <span className="font-mono text-white">{contrast > 0 ? `+${contrast}` : contrast}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Highlights */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Highlights</span>
            <span className="font-mono text-white">{highlights > 0 ? `+${highlights}` : highlights}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={highlights}
            onChange={(e) => setHighlights(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Shadows */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Shadows</span>
            <span className="font-mono text-white">{shadows > 0 ? `+${shadows}` : shadows}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={shadows}
            onChange={(e) => setShadows(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* SECTION 3: Color Sliders */}
      <div className="bg-[#11121b] border border-[#222434] rounded-xl p-3.5 space-y-3">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-[#d4af37]" />
          White Balance &amp; Color
        </span>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Temperature (Cool / Warm)</span>
            <span className="font-mono text-[#d4af37]">{temperature > 0 ? `+${temperature}` : temperature}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Tint */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Tint (Green / Magenta)</span>
            <span className="font-mono text-pink-400">{tint > 0 ? `+${tint}` : tint}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={tint}
            onChange={(e) => setTint(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Saturation</span>
            <span className="font-mono text-white">{saturation > 0 ? `+${saturation}` : saturation}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* SECTION 4: Presence & Analog Effects */}
      <div className="bg-[#11121b] border border-[#222434] rounded-xl p-3.5 space-y-3">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Presence &amp; Film Character
        </span>

        {/* Clarity */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Clarity &amp; Sharpness</span>
            <span className="font-mono text-white">{clarity > 0 ? `+${clarity}` : clarity}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={clarity}
            onChange={(e) => setClarity(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Film Grain */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>35mm Film Grain</span>
            <span className="font-mono text-white">{grain}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={grain}
            onChange={(e) => setGrain(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Vignette */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Edge Vignette</span>
            <span className="font-mono text-white">{vignette}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={vignette}
            onChange={(e) => setVignette(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        disabled={isApplying || !originalUrl}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c49f30] to-[#aa851f] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-40 transition-all shadow-lg shadow-[#d4af37]/20"
      >
        {isApplying ? (
          <span>Computing Pixel Transfer...</span>
        ) : successMsg ? (
          <span className="flex items-center gap-1.5 text-emerald-950 font-black">
            <Check className="w-4 h-4" />
            <span>Studio Adjustment Saved!</span>
          </span>
        ) : (
          <span>Apply Localized Adjustments</span>
        )}
      </button>

      {/* Interactive Brush Painting Modal */}
      {showBrushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl bg-[#0e1017] border border-[#272a3a] rounded-2xl p-6 shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-[#1f212f]">
              <div>
                <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-[#d4af37]" />
                  <span>Interactive Brush Mask Studio</span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  Paint directly over the area you want to adjust
                </p>
              </div>
              <button
                onClick={() => setShowBrushModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Area */}
            <div className="relative w-[500px] h-[360px] bg-black rounded-xl overflow-hidden border border-[#222434] cursor-crosshair">
              {originalUrl && (
                <img
                  src={getFileUrl(originalUrl)}
                  alt="Original Canvas Backdrop"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-60"
                />
              )}
              <canvas
                ref={canvasRef}
                width={500}
                height={360}
                onMouseDown={() => setIsPainting(true)}
                onMouseUp={() => setIsPainting(false)}
                onMouseLeave={() => setIsPainting(false)}
                onMouseMove={drawOnCanvas}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Brush Controls & Actions */}
            <div className="w-full flex items-center justify-between mt-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Brush Size:</span>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs font-mono text-white">{brushSize}px</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearCanvas}
                  className="px-3 py-1.5 rounded-lg bg-[#181926] hover:bg-[#202235] text-xs font-medium text-gray-300"
                >
                  Clear Canvas
                </button>
                <button
                  onClick={saveBrushMask}
                  className="px-4 py-1.5 rounded-lg bg-[#d4af37] text-black font-bold text-xs uppercase"
                >
                  Set Brush Mask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
