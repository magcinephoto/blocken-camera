const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjI4OTE3MiwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDcwMDlhM0Y3MjA5YjRFMTIwY2U2YTQ0NzRBQTlFYTcwOUFiQjJmOTYifQ",
    payload: "eyJkb21haW4iOiJuZXctbWluaS1hcHAtcXVpY2tzdGFydC1rYXBwYS1pbmRvbC52ZXJjZWwuYXBwIn0",
    signature: "Z5vebu4Cp0xYovHgyngQd4wzUTFvp8qXs8p3hQ3CSxdIeByNE3dnA/u0Rxq5WufUQHvFTrsUog8QHntQVssTqRw="
  },
  miniapp: {
    version: "1",
    name: "Cubey", 
    subtitle: "Your AI Ad Companion", 
    description: "Ads",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["marketing", "ads", "quickstart", "waitlist"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

