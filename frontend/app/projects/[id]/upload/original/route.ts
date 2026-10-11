import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Original photograph uploaded successfully',
    path: '/storage/sample_original.jpg'
  });
}
