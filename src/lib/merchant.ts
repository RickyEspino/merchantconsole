// src/lib/merchant.ts
import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type Merchant = {
  id: string;
  slug: string;
  name: string;
  tenant_id: string | null;
};

export type Tenant = {
  id: string;
  slug: string;
};

export function getMerchantSlugFromHeaders(): string | null {
  const h = headers() as unknown as { get(name: string): string | null };
  const slug = h.get("x-merchant-slug");
  return slug && slug.trim().length > 0 ? slug : null;
}

export async function getMerchantBySlug(slug: string): Promise<Merchant | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("merchants")
    .select("id, slug, name, tenant_id")
    .eq("slug", slug)
    .maybeSingle<Merchant>();
  return data ?? null;
}

export async function getTenantSlugById(id: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("slug")
    .eq("id", id)
    .maybeSingle<{ slug: string }>();
  return data?.slug ?? null;
}

/**
 * Resolve the correct base URL for the USER APP (where claims happen) for a given merchant.
 * Priority:
 * 1) If NEXT_PUBLIC_USER_APP_BASE is set, use it (handy for previews).
 * 2) If merchant has tenant_id and we can fetch its slug, use https://{slug}.beachlifeapp.com
 * 3) Fallback to DEFAULT_TENANT_SLUG (env) or 'beach' → https://beach.beachlifeapp.com
 */
export async function resolveUserClaimBaseForMerchant(merchant: Merchant): Promise<string> {
  const forced = process.env.NEXT_PUBLIC_USER_APP_BASE?.replace(/\/$/, "");
  if (forced) return forced;

  const fallbackTenant = (process.env.DEFAULT_TENANT_SLUG ?? "beach").trim();
  let tenantSlug = fallbackTenant;

  if (merchant.tenant_id) {
    const t = await getTenantSlugById(merchant.tenant_id);
    if (t && t.length > 0) tenantSlug = t;
  }

  return `https://${tenantSlug}.beachlifeapp.com`;
}

/** Throws with a clear message if the merchant cannot be resolved. */
export async function requireMerchant(): Promise<Merchant> {
  const slug = getMerchantSlugFromHeaders();
  if (!slug) throw new Error("Merchant subdomain not provided.");
  const m = await getMerchantBySlug(slug);
  if (!m) throw new Error(`Merchant not found for slug: ${slug}`);
  return m;
}
