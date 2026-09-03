import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sansan学園 | 成績管理システム",
  description: "生徒の成績入力・確認を行う成績管理システム",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
