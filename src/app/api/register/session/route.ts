// src/app/api/register/session/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = { amountCents: number; points: number; reason?: string | null };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  // 1) read merchant from ENV (no client input)
  const merchantId = process.env.MERCHANT_ID || "";
  if (!UUID_RE.test(merchantId)) {
    return NextResponse.json(
      {
        error:
          "MERCHANT_ID is not a valid UUID. Set it to a real merchants.id in .env / Vercel.",
      },
      { status: 400 }
    );
  }

  // 2) parse payload
  const { amountCents, points, reason }: Body = await req.json();

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid amountCents" }, { status: 400 });
  }
  if (!Number.isFinite(points) || points <= 0) {
    return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  }

  // 3) create short-lived earn token
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes

  const { data, error } = await admin
    .from("earn_tokens")
    .insert({
      merchant_id: merchantId,
      amount_cents: Math.round(amountCents),
      points: Math.round(points),
      reason: reason ?? null,
      expires_at: expiresAt,
    })
    .select("code")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  // 4) return token code to redirect UI to /register/[code]
  return NextResponse.json({ code: data.code });
}
