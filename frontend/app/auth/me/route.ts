import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    id: 1,
    username: 'director_cinematics',
    email: 'director@mastermind.studio'
  });
}
