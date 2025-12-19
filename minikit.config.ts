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
    payload: "eyJkb21haW4iOiJibG9ja2VuLWNhbWVyYS52ZXJjZWwuYXBwIn0",
    signature: "YGUES/3dfQ6HJiwm7n4H8bD9jgg6ued/6f6EKSX+tJJMS4HZq6s4ZOEBNdV3Z1M1XPMCi/YEGEvJ6HHIc0V9GBw="
  },
  miniapp: {
    version: "1",
    name: "Blocken Camera",
    subtitle: "Blocken Camera",
    description: "Blocken Camera",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#FFFFFF",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "art-creativity",
    tags: ["camera", "ascii", "art", "photo", "nft"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "",
    ogTitle: "Blocken Camera",
    ogDescription: "Blocken Camera",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

