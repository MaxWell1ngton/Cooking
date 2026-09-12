import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { RecipesProvider } from "@/lib/recipes-context";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cookbook",
  description: "A personal, offline-friendly cookbook for your own recipes.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cookbook",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b45309",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ServiceWorkerRegister />
        <AuthProvider>
          <AuthGate>
            <RecipesProvider>
              <AppShell>{children}</AppShell>
            </RecipesProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
