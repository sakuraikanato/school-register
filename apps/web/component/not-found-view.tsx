"use client";

import Link from "next/link";

export function NotFoundView() {
  return <main className="not-found-page"><h1>404</h1><p>お探しのページは見つかりません。</p><Link href="/">ログインページへ戻る</Link></main>;
}
