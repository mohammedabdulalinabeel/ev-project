import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "EV-CSMS",
  description: "EV Charging Station Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}