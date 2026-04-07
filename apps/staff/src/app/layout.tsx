import type { Metadata } from "next";
import "../index.css";
import "./brand-theme.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sushimei Kitchen - Staff Interface",
  description: "Kitchen management system for Sushimei staff",
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
