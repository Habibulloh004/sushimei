import type { Metadata } from "next";
import "../index.css";
import "./brand-theme.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sushimei Staff Portal",
  description: "Sotuvchi, oshpaz va kuryer uchun ish stantsiyasi",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0c0a09",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
