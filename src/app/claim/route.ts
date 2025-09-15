// src/app/claim/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type TokenRow = {
  code: string;
  points: number;
  expires_at: string;
  claimed_at: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const admin = createAdminClient();

  // 1) fetch token
  const { data: token, error: tErr } = await admin
    .from('earn_tokens')
    .select('code, points, expires_at, claimed_at')
    .eq('code', code)
    .maybeSingle<TokenRow>();

  if (tErr || !token) return html('Invalid link', 'This code is not valid.');
  if (token.claimed_at) return html('Already claimed', 'This code has already been used.');
  if (new Date(token.expires_at).getTime() < Date.now()) return html('Expired', 'This code has expired.');

  // 2) locate demo wallet (replace with authed user later)
  const demoUserId = process.env.DEMO_USER_ID!;
  const { data: wallet, error: wErr } = await admin
    .from('wallets')
    .select('id')
    .eq('user_id', demoUserId)
    .maybeSingle();

  if (wErr || !wallet) return html('No wallet', 'Demo wallet not found.');

  // 3) credit points (unified balance; no tenant attribution here)
  const { error: insErr } = await admin.from('points_ledger').insert({
    wallet_id: wallet.id,
    tenant_id: null, // optional: set a tenant_id if you want attribution
    event_type: 'issue',
    delta: token.points,
    reason: 'QR earn',
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // 4) mark token as claimed
  await admin
    .from('earn_tokens')
    .update({ claimed_at: new Date().toISOString(), claimed_by: demoUserId })
    .eq('code', code);

  // 5) confetti success
  return html('Points added!', `You earned ${token.points} points 🎉`, token.points);
}

function html(title: string, message: string, points?: number) {
  const confetti = points
    ? `
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
<script>
  confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } }), 600);
  setTimeout(() => { window.close(); location.href='/' }, 3500);
</script>`
    : `<script>setTimeout(()=>{window.close();location.href='/'},2500)</script>`;

  return new NextResponse(
    `
<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  :root{color-scheme:light}
  body{font-family:ui-sans-serif,system-ui;margin:0;height:100vh;display:grid;place-items:center;background:#fff}
  .card{max-width:520px;padding:24px;border-radius:16px;box-shadow:0 6px 30px rgba(0,0,0,.08);text-align:center}
  h1{margin:0 0 8px 0;font-size:28px}
  p{margin:0 0 8px 0;color:#475569}
  .big{font-size:40px;font-weight:700;margin:8px 0}
</style>
<div class="card">
  <h1>${title}</h1>
  ${points ? `<div class="big">+${points} pts</div>` : ''}
  <p>${message}</p>
  <p style="font-size:12px;color:#94a3b8">This window will close automatically.</p>
</div>
${confetti}`.trim(),
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}
