'use client';
import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Play,
  RotateCw
} from 'lucide-react';
import { getFileUrl } from '@/lib/api';

interface UploadSectionProps {
  originalUrl?: string;
  referenceUrl?: string;
  isProcessing: boolean;
  onUploadOriginal: (file: File) => Promise<void>;
  onUploadReference: (file: File) => Promise<void>;
  onPreloadSample: () => Promise<void>;
  onStartProcessing: () => Promise<void>;
}

export default function UploadSection({
  originalUrl,
  referenceUrl,
  isProcessing,
  onUploadOriginal,
  onUploadReference,
  onPreloadSample,
  onStartProcessing,
}: UploadSectionProps) {
  const origInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const [origLoading, setOrigLoading] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOrigChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setOrigLoading(true);
    try {
      await onUploadOriginal(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload original');
    } finally {
      setOrigLoading(false);
    }
  };

  const handleRefChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setRefLoading(true);
    try {
      await onUploadReference(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload reference');
    } finally {
      setRefLoading(false);
    }
  };

  const handleSampleClick = async () => {
    setErrorMsg(null);
    setSampleLoading(true);
    try {
      await onPreloadSample();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load demo photos');
    } finally {
      setSampleLoading(false);
    }
  };

  const canProcess = Boolean(originalUrl && referenceUrl && !isProcessing);

  return (
    <div className="w-full bg-[#0d0e14] border border-[#202230] rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background ambient gold gradient */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-5 mb-5 border-b border-[#1c1d29] gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <span>Photo Source &amp; Reference Studio</span>
            <span className="text-xs font-sans font-normal text-gray-400 bg-[#161722] border border-[#262837] px-2.5 py-0.5 rounded-full">
              RAW / DNG / TIFF / JPG Support
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Upload your target RAW photograph alongside your desired cinematic reference photo.
          </p>
        </div>

        {/* Quick Sample Button */}
        <button
          onClick={handleSampleClick}
          disabled={sampleLoading || isProcessing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#151722] hover:bg-[#1e202f] border border-[#d4af37]/40 text-xs font-semibold text-[#d4af37] transition-all hover:scale-[1.02] shadow-sm disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{sampleLoading ? 'Loading Sample Pair...' : 'Quick Demo: Load Sample Photos'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Card 1: Original RAW/Photo */}
        <div className="relative flex flex-col bg-[#11121b] border border-[#222434] rounded-xl p-4 transition-all hover:border-[#35384e]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
              Original Photograph (RAW / Standard)
            </span>
            {originalUrl && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Loaded
              </span>
            )}
          </div>

          <input
            type="file"
            ref={origInputRef}
            onChange={handleOrigChange}
            accept=".jpg,.jpeg,.png,.webp,.tiff,.tif,.dng,.cr2,.nef,.arw,.orf,.rw2"
            className="hidden"
          />

          <div
            onClick={() => origInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl h-52 flex flex-col items-center justify-center p-3 text-center transition-all overflow-hidden relative group ${
              originalUrl
                ? 'border-[#2d3043] bg-black/40'
                : 'border-[#282a3c] bg-[#141521] hover:border-[#d4af37]/60 hover:bg-[#181927]'
            }`}
          >
            {originalUrl ? (
              <>
                <img
                  src={getFileUrl(originalUrl)}
                  alt="Original Photograph"
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs gap-1.5 backdrop-blur-[2px]">
                  <RotateCw className="w-5 h-5 text-[#d4af37]" />
                  <span>Click to Replace Original Photo</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#1c1e2c] flex items-center justify-center text-[#d4af37]">
                  {origLoading ? (
                    <RotateCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-200">
                    {origLoading ? 'Uploading & parsing...' : 'Click or Drag to Upload Original Photo'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Accepts RAW (DNG, CR2, NEF, ARW) or JPG, PNG, TIFF up to 120MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Reference Photo */}
        <div className="relative flex flex-col bg-[#11121b] border border-[#222434] rounded-xl p-4 transition-all hover:border-[#35384e]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Cinematic Reference Photo
            </span>
            {referenceUrl && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Loaded
              </span>
            )}
          </div>

          <input
            type="file"
            ref={refInputRef}
            onChange={handleRefChange}
            accept=".jpg,.jpeg,.png,.webp,.tiff,.tif"
            className="hidden"
          />

          <div
            onClick={() => refInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl h-52 flex flex-col items-center justify-center p-3 text-center transition-all overflow-hidden relative group ${
              referenceUrl
                ? 'border-[#2d3043] bg-black/40'
                : 'border-[#282a3c] bg-[#141521] hover:border-cyan-400/60 hover:bg-[#181927]'
            }`}
          >
            {referenceUrl ? (
              <>
                <img
                  src={getFileUrl(referenceUrl)}
                  alt="Reference Photograph"
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs gap-1.5 backdrop-blur-[2px]">
                  <RotateCw className="w-5 h-5 text-cyan-400" />
                  <span>Click to Replace Reference Photo</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#1c1e2c] flex items-center justify-center text-cyan-400">
                  {refLoading ? (
                    <RotateCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-200">
                    {refLoading ? 'Uploading & parsing...' : 'Click or Drag to Upload Reference Photo'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Accepts movie stills, magazine scans, editorial grading references
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Process Trigger Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#12141e] border border-[#232536] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1a1c2a] flex items-center justify-center text-[#d4af37]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {canProcess ? 'Ready for Master Color Grading' : 'Upload Both Photos to Begin'}
            </h4>
            <p className="text-[11px] text-gray-400">
              Generates 3 distinct cinematic variants using LAB transfer, tone split grading &amp; GrabCut subject masking.
            </p>
          </div>
        </div>

        <button
          onClick={onStartProcessing}
          disabled={!canProcess}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c49f30] to-[#aa851f] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#d4af37]/20"
        >
          {isProcessing ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Analyzing &amp; Rendering 3 Variants...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-black" />
              <span>Analyze &amp; Generate 3 Variants</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
