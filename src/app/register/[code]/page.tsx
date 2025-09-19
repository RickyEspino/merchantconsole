// replace PUBLIC_BASE with the *user* app base
const USER_APP_BASE =
  (process.env.NEXT_PUBLIC_USER_APP_BASE?.replace(/\/$/, "") as string | undefined)
  // fallback if not set
  || "https://beach.beachlifeapp.com"; // or your primary tenant

// ...
const claimUrl = new URL(`/claim?code=${encodeURIComponent(token.code)}`, USER_APP_BASE).toString();
