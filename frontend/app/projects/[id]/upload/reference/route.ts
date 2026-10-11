import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Reference photograph uploaded successfully',
    path: '/storage/sample_reference.jpg'
  });
}
