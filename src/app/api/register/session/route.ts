// src/app/api/register/session/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = { amountCents: number; points: number; reason?: string | null };

export async function POST(req: Request) {
  const { amountCents, points, reason }: Body = await req.json();

  // Validate env + input
  const merchantId = process.env.MERCHANT_ID || '';
  if (!UUID_RE.test(merchantId)) {
    return NextResponse.json(
      { error: 'MERCHANT_ID is not a valid UUID. Set it in .env.local to a real merchants.id' },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amountCents' }, { status: 400 });
  }
  if (!Number.isFinite(points) || points <= 0) {
    return NextResponse.json({ error: 'Invalid points' }, { status: 400 });
  }

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes

  const { data, error } = await admin
    .from('earn_tokens')
    .insert({
      merchant_id: merchantId,
      amount_cents: Math.round(amountCents),
      points: Math.round(points),
      reason: reason ?? null,
      expires_at: expiresAt,
    })
    .select('code')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ code: data.code });
}
