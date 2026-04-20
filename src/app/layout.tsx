import type { Metadata } from "next";

import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "EV-CSMS",
  description: "EV Charging Station Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-100 text-foreground antialiased transition-colors duration-300 dark:bg-slate-950">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
