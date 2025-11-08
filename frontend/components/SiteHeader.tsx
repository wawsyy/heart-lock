"use client";

import Image from "next/image";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export const SiteHeader = () => {
  return (
    <header className="flex items-center justify-between gap-4 rounded-3xl bg-white/80 px-6 py-4 shadow-md backdrop-blur">
      <Link href="/" className="flex items-center gap-3 text-[#0f1d40]">
        <Image src="/cipherscore-logo.svg" width={44} height={44} alt="CipherScore" priority />
        <div className="leading-tight">
          <p className="text-sm uppercase tracking-[0.32em] text-slate-500">CipherScore</p>
          <p className="text-base font-semibold text-[#0f1d40]">Encrypted Peer Review</p>
        </div>
      </Link>
      <ConnectButton chainStatus="icon" accountStatus="address" showBalance={false} />
    </header>
  );
};

