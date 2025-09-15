// src/app/register/[code]/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { createAdminClient } from "../../../lib/supabase/admin";
import QRCode from "qrcode";
import Image from "next/image";

type Token = {
  code: string;
  points: number;
  expires_at: string;
  claimed_at: string | null;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Scan to earn points" };
}

async function getToken(code: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("earn_tokens")
    .select("code, points, expires_at, claimed_at")
    .eq("code", code)
    .maybeSingle<Token>();
  return data ?? null;
}

// Hard default to the real console domain; allow override via env for previews
const PUBLIC_BASE =
  (process.env.NEXT_PUBLIC_PUBLIC_URL?.replace(/\/$/, "") as string | undefined) ||
  "https://merchantconsole.beachlifeapp.com";

export default async function QRPage({ params }: { params: { code: string } }) {
  const token = await getToken(params.code);
  if (!token) return <main className="p-6">Token not found.</main>;

  const claimUrl = new URL(
    `/claim?code=${encodeURIComponent(token.code)}`,
    PUBLIC_BASE
  ).toString();

  // Generate QR as a data URL
  const qrDataUrl = await QRCode.toDataURL(claimUrl);

  // Countdown initial value
  const endMs = new Date(token.expires_at).getTime();
  const initialLeftMs = Math.max(0, endMs - Date.now());
  const merchantName = process.env.MERCHANT_NAME || "Member";

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{merchantName}</h1>
      <p className="text-slate-600">
        Have the customer scan to claim <b>{token.points}</b> points.
      </p>

      <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
        {/* Use next/image for better LCP; data URLs are supported */}
        <Image
          src={qrDataUrl}
          alt="Claim QR"
          width={224}
          height={224}
          className="mx-auto w-56 h-56"
          priority
        />
        <div
          id="countdown"
          className="mt-3 text-sm text-slate-600"
          data-left-ms={initialLeftMs}
          data-code={token.code}
          suppressHydrationWarning
        >
          2:00
        </div>
      </div>

      {/* Client-side countdown + polling */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function () {
  const el = document.getElementById('countdown');
  if (!el) return;
  const left0 = Number(el.getAttribute('data-left-ms') || '0');
  const code = el.getAttribute('data-code') || '';
  const endTs = Date.now() + Math.max(0, left0);

  function fmt(ms){const s=Math.max(0,Math.floor(ms/1000));const m=Math.floor(s/60);const ss=String(s%60).padStart(2,'0');return m+':'+ss;}
  async function poll(){
    try{
      const r=await fetch('/api/token-status?code='+encodeURIComponent(code),{cache:'no-store'});
      const j=await r.json();
      if(j.status==='claimed'){ window.location.href='/register?last=1'; return; }
    }catch(e){}
    setTimeout(poll,1200);
  }
  function tick(){
    const left=endTs-Date.now();
    el.textContent=fmt(left);
    if(left<=0){ window.location.href='/register'; return; }
    requestAnimationFrame(tick);
  }
  poll(); tick();
})();`,
        }}
      />
    </main>
  );
}
