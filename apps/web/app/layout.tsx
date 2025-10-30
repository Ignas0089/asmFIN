import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "asmFIN",
  description: "Personal finance dashboard"
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
