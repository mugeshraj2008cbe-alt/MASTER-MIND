import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const maskType = body.mask_type || 'entire';
  return NextResponse.json({
    message: 'Adjustments applied successfully',
    variant: {
      id: 99,
      variant_type: 'custom',
      label: `Studio Fine-Tune (${maskType.charAt(0).toUpperCase() + maskType.slice(1)} Mask)`,
      url: '/storage/adjusted_1_3c76f3b3.jpg'
    }
  });
}
