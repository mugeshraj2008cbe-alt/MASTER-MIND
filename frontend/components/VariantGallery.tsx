'use client';
import React from 'react';
import { Variant, getFileUrl, getDownloadUrl } from '@/lib/api';
import { Download, Check, Sparkles, Sliders, Eye } from 'lucide-react';

interface VariantGalleryProps {
  projectId: number;
  variants: Variant[];
  selectedVariantId: number | null;
  onSelectVariant: (v: Variant) => void;
  onOpenEditorForVariant: (v: Variant) => void;
}

export default function VariantGallery({
  projectId,
  variants,
  selectedVariantId,
  onSelectVariant,
  onOpenEditorForVariant,
}: VariantGalleryProps) {
  if (!variants || variants.length === 0) return null;

  const getVariantBadge = (type: string) => {
    switch (type) {
      case 'natural':
        return { label: 'Variant 1: Natural Cinematic', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' };
      case 'moody':
        return { label: 'Variant 2: Moody Cinematic', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' };
      case 'reference':
        return { label: 'Variant 3: Reference Match', color: 'border-[#d4af37]/40 text-[#d4af37] bg-[#d4af37]/10' };
      default:
        return { label: 'Studio Fine-Tuned', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' };
    }
  };

  const getVariantDescription = (type: string) => {
    switch (type) {
      case 'natural':
        return 'Organic analog film tone, lifted shadow detail, subtle warm highlights & soft grain';
      case 'moody':
        return 'Deep crushed blacks, high dynamic contrast, blockbuster teal & orange split toning';
      case 'reference':
        return 'Direct LAB perceptual histogram matching replicating exact reference colorist palette';
      default:
        return 'Custom localized adjustment with Lightroom-inspired mask refinements';
    }
  };

  return (
    <div className="w-full bg-[#0d0e14] border border-[#202230] rounded-2xl p-6 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-[#1c1d29] gap-3">
        <div>
          <h3 className="text-sm font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#d4af37]" />
            <span>Master Color Variants Gallery</span>
          </h3>
          <p className="text-[11px] text-gray-400">
            Select any generated variant to compare side-by-side or perform localized studio masking adjustments.
          </p>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {variants.length} Generated Variants
        </span>
      </div>

      {/* Grid of Variants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {variants.map((v) => {
          const isSelected = selectedVariantId === v.id;
          const badge = getVariantBadge(v.variant_type);
          const desc = getVariantDescription(v.variant_type);

          return (
            <div
              key={v.id}
              onClick={() => onSelectVariant(v)}
              className={`group relative flex flex-col bg-[#11121b] border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'border-[#d4af37] shadow-xl shadow-[#d4af37]/15 ring-1 ring-[#d4af37]/50'
                  : 'border-[#222434] hover:border-[#383b54]'
              }`}
            >
              {/* Header Badge */}
              <div className="p-3.5 pb-2 flex items-center justify-between bg-[#141521] border-b border-[#1f212f]">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>

                {isSelected && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#d4af37]">
                    <Check className="w-3.5 h-3.5" />
                    Active in Studio
                  </span>
                )}
              </div>

              {/* Image Preview Container */}
              <div className="relative h-64 bg-black overflow-hidden">
                <img
                  src={getFileUrl(v.url)}
                  alt={v.label}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                />

                {/* Hover Overlay Controls */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVariant(v);
                    }}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 backdrop-blur-md transition-all hover:scale-105"
                  >
                    <Eye className="w-4 h-4 text-[#d4af37]" />
                    <span>View / Compare</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditorForVariant(v);
                    }}
                    className="p-2.5 rounded-xl bg-[#d4af37] hover:bg-[#f3e5ab] text-black text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 shadow-md"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Fine-Tune</span>
                  </button>
                </div>
              </div>

              {/* Footer info & Download */}
              <div className="p-3.5 bg-[#12131c] flex flex-col justify-between flex-1">
                <div className="mb-3">
                  <h4 className="text-xs font-bold text-white mb-1">{v.label}</h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#1c1e2b]">
                  <span className="text-[10px] text-gray-500 font-mono uppercase">
                    Format: JPEG 94% Q
                  </span>

                  <a
                    href={getDownloadUrl(projectId, v.id)}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#181926] hover:bg-[#202334] border border-[#2c2f42] text-xs font-semibold text-gray-200 hover:text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
