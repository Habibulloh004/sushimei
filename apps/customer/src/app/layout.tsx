import type { Metadata } from "next";
import "../index.css";
import "leaflet/dist/leaflet.css";
import "./brand-theme.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "Sushi Mei - Fresh Sushi Delivery & Pickup",
    template: "%s | Sushi Mei",
  },
  description: "Order fresh sushi online from Sushi Mei. Fast delivery and pickup available.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: 'bg-stone-950 dark:bg-white text-white dark:text-stone-950 rounded-2xl shadow-2xl border-0',
              title: 'text-sm font-bold tracking-tight',
            },
          }}
        />
      </body>
    </html>
  );
}
