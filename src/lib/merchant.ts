import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type Merchant = {
  id: string;
  slug: string;
  name: string;
  tenant_id: string | null;
};

export function getMerchantSlugFromHeaders(): string | null {
  const h = headers();
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

/** Throws 404-ish error text for server components. */
export async function requireMerchant(): Promise<Merchant> {
  const slug = getMerchantSlugFromHeaders();
  if (!slug) throw new Error("Merchant subdomain not provided.");
  const m = await getMerchantBySlug(slug);
  if (!m) throw new Error(`Merchant not found for slug: ${slug}`);
  return m;
}
