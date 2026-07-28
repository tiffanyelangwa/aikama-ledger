import type { Metadata } from "next";
import "./globals.css";
import { getCurrentProfile, hasAuthSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Aikama Ledger",
  description: "Double-entry accounting for Aikama Investment Ltd",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [profile, hasSession] = await Promise.all([getCurrentProfile(), hasAuthSession()]);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 text-gray-900">
        <Navbar profile={profile} hasSession={hasSession} />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
