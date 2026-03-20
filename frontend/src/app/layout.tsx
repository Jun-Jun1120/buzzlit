import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buzzlit - お店のSNS動画をAIで自動生成",
  description: "スマホで撮るだけ。AIがプロ品質のSNSショート動画を自動で作ります。飲食店・美容室・整体院に最適。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
