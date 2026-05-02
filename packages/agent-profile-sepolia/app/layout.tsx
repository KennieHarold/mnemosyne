import type { Metadata } from "next";
import "./globals.css";
import StyledComponentsRegistry from "../lib/registry";
import Chrome from "./_components/Chrome";

export const metadata: Metadata = {
  title: "MNEMO · ENS lookup",
  description: "Resolve mnemo.eth subnames and read their text records.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <Chrome>{children}</Chrome>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
