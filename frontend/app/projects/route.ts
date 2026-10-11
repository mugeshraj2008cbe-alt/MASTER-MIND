import { NextResponse } from 'next/server';

const defaultProjects = [
  { id: 1, name: 'Vogue Cinematic Grading #1', status: 'done' }
];

export async function GET() {
  return NextResponse.json(defaultProjects);
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const name = form?.get('name')?.toString() || 'New Studio Project';
  const newProj = { id: Date.now(), name, status: 'pending' };
  return NextResponse.json(newProj, { status: 201 });
}
