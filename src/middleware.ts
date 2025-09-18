import { NextResponse, type NextRequest } from "next/server";

/**
 * Base apex for production. You can override for previews via env.
 * Examples:
 * - merchantconsole.beachlifeapp.com  (prod)
 * - <preview>.vercel.app              (preview; slug will be the left-most label)
 */
const BASE_APEX =
  process.env.CONSOLE_BASE_APEX?.toLowerCase() ||
  "merchantconsole.beachlifeapp.com";

/** Get merchant slug from the Host header. */
function getSlugFromHost(host?: string | null): string | null {
  if (!host) return null;
  const h = host.toLowerCase();

  // Local dev helpers (subdomain-friendly):
  // - {slug}.lvh.me:3000            → resolves to 127.0.0.1
  // - {slug}.127.0.0.1.nip.io:3000  → resolves to 127.0.0.1
  if (h.endsWith(".lvh.me") || h.includes(".nip.io")) {
    return h.split(".")[0]; // left-most label
  }

  // Production apex:
  if (h === BASE_APEX) return null; // no slug on bare domain
  if (h.endsWith("." + BASE_APEX)) {
    // take the left-most label as the slug
    return h.slice(0, -(BASE_APEX.length + 1));
  }

  // Vercel preview domains like something.vercel.app
  // We allow the left-most label to act as a slug for testing if you want.
  if (h.endsWith(".vercel.app")) {
    return h.split(".")[0];
  }

  return null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const slug = getSlugFromHost(host);

  // Always pass the merchant slug onward (even if null)
  const headers = new Headers(req.headers);
  if (slug) headers.set("x-merchant-slug", slug);
  else headers.delete("x-merchant-slug");

  return NextResponse.next({ request: { headers } });
}

// Don’t run on static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
