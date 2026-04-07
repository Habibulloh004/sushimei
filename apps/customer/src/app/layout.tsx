import type { Metadata } from "next";
import Script from "next/script";
import "../index.css";
import "leaflet/dist/leaflet.css";
import "./brand-theme.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sushi Mei - Order Online",
  description: "Order fresh sushi online from Sushi Mei. Fast delivery and pickup available.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
