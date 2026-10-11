import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    id: 1,
    name: 'Vogue Cinematic Grading #1',
    status: 'done',
    original_url: '/storage/sample_original.jpg',
    reference_url: '/storage/sample_reference.jpg',
    subject_mask_url: '/storage/mask_subject_1_bcea33.png',
    analysis: {
      brightness: '0.551',
      contrast: '0.444',
      saturation: '0.620',
      dominant_hue: '32',
      color_temp: 'Warm Golden',
      tint: 'Magenta Shift',
      palette: ['#7d402e', '#d56c36', '#2b150f', '#f275b3', '#e4a56d'],
      style_notes: 'Sunset Golden Hour — Rich warm highlights, amber midtones, cinematic warmth'
    },
    variants: [
      {
        id: 1,
        variant_type: 'natural',
        label: 'Natural Cinematic',
        url: '/storage/project_1_natural_859ef30c.jpg'
      },
      {
        id: 2,
        variant_type: 'moody',
        label: 'Moody Cinematic',
        url: '/storage/project_1_moody_f7972a30.jpg'
      },
      {
        id: 3,
        variant_type: 'reference',
        label: 'Reference Match',
        url: '/storage/project_1_reference_9fcdb5b3.jpg'
      }
    ]
  });
}
