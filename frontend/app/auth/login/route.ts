import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({
    access_token: 'demo-token-' + Date.now(),
    token_type: 'bearer',
    user: { id: 1, username: 'director_cinematics', email: 'director@mastermind.studio' }
  });
}
