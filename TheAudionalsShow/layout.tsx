import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jim.BTC Audionals & On-Chain Melody Show",
  description: "Exploring Music on Bitcoin and Stacks with Jim.BTC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-textPrimary`}>
        {children}
      </body>
    </html>
  );
}

