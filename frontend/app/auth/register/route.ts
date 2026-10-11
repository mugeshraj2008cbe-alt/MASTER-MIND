import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = body.username || 'cinematographer_pro';
  const email = body.email || 'director@mastermind.studio';
  return NextResponse.json({
    access_token: 'demo-token-' + Date.now(),
    token_type: 'bearer',
    user: { id: 1, username, email }
  }, { status: 201 });
}
