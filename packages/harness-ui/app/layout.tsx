import type { Metadata } from "next";
import type { ReactNode } from "react";

import { APPEARANCE_BOOTSTRAP } from "@/lib/appearance";

import "./globals.css";

export const metadata: Metadata = {
  title: "Better Harness",
  description: "Script-aligned Better Harness organization usage dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
