import type { Metadata } from "next";
import type { ReactNode } from "react";

import { dashboardThemeBootScript } from "@/lib/dashboard-theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Better Harness",
  description: "Script-aligned Better Harness organization usage dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: dashboardThemeBootScript() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
