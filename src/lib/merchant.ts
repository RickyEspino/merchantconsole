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

/**
 * Read the merchant slug injected by middleware from the current request headers.
 * We cast the type to avoid the Promise<ReadonlyHeaders> inference issue.
 */
export function getMerchantSlugFromHeaders(): string | null {
  // Cast to an object that has a .get() method
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

/** Throws with a clear message if the merchant cannot be resolved. */
export async function requireMerchant(): Promise<Merchant> {
  const slug = getMerchantSlugFromHeaders();
  if (!slug) throw new Error("Merchant subdomain not provided.");
  const m = await getMerchantBySlug(slug);
  if (!m) throw new Error(`Merchant not found for slug: ${slug}`);
  return m;
}
