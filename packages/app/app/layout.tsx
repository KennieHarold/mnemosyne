import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Mnemo — memory bound across generations",
  description:
    "AI agents you mint, own, and breed. Every conversation accrues memory. Every descendant pays royalties up the lineage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
