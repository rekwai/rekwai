import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/common/theme-provider";
import { ClientInitializer } from "@/components/common/client-initializer";

export const metadata: Metadata = {
  title: "Rekwai - Requirements Management System",
  description:
    "AI-powered requirements management system for intelligent data extraction, processing, and answer generation",
  icons: {
    icon: [
      {
        url: "/rekwai-logo-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/rekwai-logo.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientInitializer>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            enableColorScheme
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </ClientInitializer>
      </body>
    </html>
  );
}
