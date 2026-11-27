import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { themeBootstrapScript } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Better Harness",
  description: "Script-aligned Better Harness organization usage dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript()}
        </Script>
        {children}
      </body>
    </html>
  );
}
