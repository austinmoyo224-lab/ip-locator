import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IP Locator", template: "%s · IP Locator" },
  description: "Scan text for IP addresses, see where each one is and filter by country or city.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#111719", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
