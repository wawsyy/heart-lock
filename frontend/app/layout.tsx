import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "CipherScore | Encrypted Peer Review",
  description:
    "Anonymous performance loops powered by FHE. Collect encrypted peer scores, decrypt insights only when authorised.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <Providers>
          <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="bg-radial opacity-80" />
            </div>
            <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 pt-10 md:px-8">
              <SiteHeader />
              <div className="mt-10 flex-1">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
