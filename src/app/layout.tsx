import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth-context";
import { AuthRouter } from "@/components/auth";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ledger · Your business, in balance",
  description: "A connected financial workspace for Cambodian businesses.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense
          fallback={
            <div className="initial-loading">Loading your workspace…</div>
          }
        >
          <AuthProvider>
            <AuthRouter />
          </AuthProvider>
        </Suspense>
        {children}
      </body>
    </html>
  );
}
