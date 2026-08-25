import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsightSync Dashboard",
  description: "Custom analytics dashboard for InsightSync semantic data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
