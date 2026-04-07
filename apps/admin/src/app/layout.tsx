import type { Metadata } from "next";
import Script from "next/script";
import "../index.css";
import "./admin-forms.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sushi Mei Admin",
  description: "Admin dashboard for Sushi Mei restaurant management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
