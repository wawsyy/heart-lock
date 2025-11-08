"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  walletConnectWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, WagmiProvider } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";

type Props = {
  children: ReactNode;
};

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000";
const hardhatRpcUrl = process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? "http://localhost:8545";
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

const chains: readonly [typeof hardhat, typeof sepolia] = [hardhat, sepolia];

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [rainbowWallet, walletConnectWallet, metaMaskWallet],
    },
  ],
  {
    projectId,
    appName: "CipherScore",
  }
);

const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: {
    [hardhat.id]: http(hardhatRpcUrl),
    [sepolia.id]: http(sepoliaRpcUrl ?? "https://rpc.sepolia.org"),
  },
  ssr: true,
});

export function Providers({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#0f1d40", accentColorForeground: "#f2f7ff" })}
          modalSize="compact"
        >
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
