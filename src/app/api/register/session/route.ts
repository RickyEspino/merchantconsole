export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMerchantSlugFromHeaders, getMerchantBySlug } from "@/lib/merchant";

type Body = { amountCents: number; points: number; reason?: string | null };

export async function POST(req: Request) {
  // Resolve merchant from middleware-provided header
  const slug = getMerchantSlugFromHeaders();
  if (!slug) {
    return NextResponse.json(
      { error: "Missing merchant subdomain." },
      { status: 400 }
    );
  }
  const merchant = await getMerchantBySlug(slug);
  if (!merchant) {
    return NextResponse.json(
      { error: `Unknown merchant slug: ${slug}` },
      { status: 404 }
    );
  }

  // Payload validation
  const { amountCents, points, reason }: Body = await req.json();
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid amountCents" }, { status: 400 });
  }
  if (!Number.isFinite(points) || points <= 0) {
    return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  }

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes

  const { data, error } = await admin
    .from("earn_tokens")
    .insert({
      merchant_id: merchant.id,
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

  return NextResponse.json({ code: data.code });
}
