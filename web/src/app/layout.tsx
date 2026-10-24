import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueCost Home",
  description: "Understand repair uncertainty and the cost of owning a home before making an offer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
