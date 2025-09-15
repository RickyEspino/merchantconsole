// src/app/api/token-status/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('earn_tokens')
    .select('claimed_at, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ status: 'missing' });

  if (data.claimed_at) return NextResponse.json({ status: 'claimed' });
  if (new Date(data.expires_at).getTime() < Date.now()) return NextResponse.json({ status: 'expired' });

  return NextResponse.json({ status: 'open' });
}
