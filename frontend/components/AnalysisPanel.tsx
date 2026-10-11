'use client';
import React from 'react';
import { Analysis } from '@/lib/api';
import { Palette, Sun, Flame, Sparkles, Activity, Layers } from 'lucide-react';

interface AnalysisPanelProps {
  analysis?: Analysis;
}

export default function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  if (!analysis) return null;

  const bVal = parseFloat(analysis.brightness) || 0.5;
  const cVal = parseFloat(analysis.contrast) || 0.5;
  const sVal = parseFloat(analysis.saturation) || 0.5;

  return (
    <div className="w-full bg-[#0d0e14] border border-[#202230] rounded-2xl p-6 shadow-xl mb-6">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#1c1d29]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-white uppercase tracking-wider">
              Reference Photographic DNA &amp; Cinematic Style
            </h3>
            <p className="text-[11px] text-gray-400">
              Extracted lighting ratios, chromatic temperature, and tonal curves from reference photo
            </p>
          </div>
        </div>

        <span className="text-xs bg-[#171926] text-[#d4af37] border border-[#d4af37]/30 px-3 py-1 rounded-full font-semibold">
          {analysis.style_notes.split('—')[0].trim()}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {/* Brightness */}
        <div className="bg-[#12131c] border border-[#212332] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              Luminance
            </span>
            <span className="text-white font-mono font-semibold">{Math.round(bVal * 100)}%</span>
          </div>
          <div className="w-full bg-[#1e202d] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, bVal * 100))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 mt-1 block">
            {bVal < 0.4 ? 'Low Key (Dark)' : bVal > 0.6 ? 'High Key (Bright)' : 'Balanced Midtones'}
          </span>
        </div>

        {/* Contrast */}
        <div className="bg-[#12131c] border border-[#212332] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Dynamic Contrast
            </span>
            <span className="text-white font-mono font-semibold">{Math.round(cVal * 100)}%</span>
          </div>
          <div className="w-full bg-[#1e202d] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, cVal * 100))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 mt-1 block">
            {cVal > 0.5 ? 'Steep Punchy Curve' : 'Gentle Filmic Roll-off'}
          </span>
        </div>

        {/* Saturation */}
        <div className="bg-[#12131c] border border-[#212332] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-rose-400" />
              Saturation
            </span>
            <span className="text-white font-mono font-semibold">{Math.round(sVal * 100)}%</span>
          </div>
          <div className="w-full bg-[#1e202d] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-pink-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, sVal * 100))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 mt-1 block">
            {sVal < 0.4 ? 'Subtle Muted Tones' : 'Vibrant Saturation'}
          </span>
        </div>

        {/* Temperature & Tint */}
        <div className="bg-[#12131c] border border-[#212332] rounded-xl p-3.5">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1.5">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#d4af37]" />
              Chromatic Temp
            </span>
            <span className="text-[#d4af37] font-semibold text-[11px]">{analysis.color_temp}</span>
          </div>
          <div className="w-full bg-gradient-to-r from-cyan-600 via-gray-500 to-amber-500 h-2 rounded-full" />
          <span className="text-[10px] text-gray-400 mt-1 block">
            Tint: <span className="text-gray-300 font-medium">{analysis.tint || 'Neutral'}</span>
          </span>
        </div>
      </div>

      {/* Dominant Palette & Detailed Notes */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#11121a] border border-[#202230] rounded-xl p-4">
        {/* Swatches */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
            Color Palette:
          </span>
          <div className="flex items-center gap-2">
            {analysis.palette && analysis.palette.length > 0 ? (
              analysis.palette.map((hex, idx) => (
                <div key={idx} className="flex flex-col items-center group">
                  <div
                    className="w-8 h-8 rounded-lg border border-white/20 shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[9px] text-gray-400 font-mono mt-1 opacity-80 group-hover:opacity-100">
                    {hex}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-500 font-mono">Standard RGB gamut</span>
            )}
          </div>
        </div>

        {/* Style description */}
        <div className="text-xs text-gray-300 bg-[#161824] border border-[#272a3d] px-3.5 py-2 rounded-lg max-w-lg">
          <span className="text-[#d4af37] font-semibold">Style Diagnosis: </span>
          {analysis.style_notes}
        </div>
      </div>
    </div>
  );
}
