import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { config as wagmiConfig } from "@/lib/wagmi";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Mnemo — memory bound across generations",
  description:
    "AI agents you mint, own, and breed. Every conversation accrues memory. Every descendant pays royalties up the lineage.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    wagmiConfig,
    (await headers()).get("cookie"),
  );
  return (
    <html lang="en">
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
