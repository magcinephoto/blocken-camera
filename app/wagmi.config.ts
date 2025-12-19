import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

export function getWagmiConfig() {
  return createConfig({
    chains: [isDev ? baseSepolia : base],
    connectors: [
      farcasterMiniApp(), // Farcasterコネクターを最優先
      coinbaseWallet({
        appName: process.env.NEXT_PUBLIC_PROJECT_NAME || "Blocken Camera",
        preference: "all",
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
