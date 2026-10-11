import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Box Finder",
  description: "Find open-box deals near Rocklin and Sacramento, or available to ship. Save exact listings on your device.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
