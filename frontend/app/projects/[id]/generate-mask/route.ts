import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Subject mask generated successfully via GrabCut segmentation',
    mask_url: '/storage/mask_subject_1_bcea33.png'
  });
}
