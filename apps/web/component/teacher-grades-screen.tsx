"use client";

import { useState } from "react";
import { WeightModal } from "@/component/modals";

const rows = Array.from({ length: 7 }, (_, index) => ({ id: index, status: "在籍", number: "0000", name: "斉藤太郎" }));

/**
 * Phone users can inspect the same eight-column grade list, but cannot change
 * weights, search, save, or run an input check from this presentation.
 */
export function TeacherMobileGradesScreen() {
  return (
    <main className="teacher-mobile-grades-page">
      <nav className="teacher-mobile-grades-breadcrumb" aria-label="パンくず">
        <a href="/teacher">ホーム</a><b>›</b><span>担当科目</span><b>›</b><strong>成績一覧</strong>
      </nav>
      <h1>科目・Webデザイン</h1>
      <section className="teacher-mobile-grades-table-shell" aria-label="Webデザインの成績一覧">
        <table className="teacher-mobile-grades-table">
          <thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率<br />(〇〇%)</th><th>授業態度<br />(1~10)</th><th>課題<br />(1~10)</th><th>点数</th><th>評価</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.status}</td><td>{row.number}</td><td>{row.name}</td><td>〇〇%</td><td>〇〇</td><td>〇〇</td><td>〇〇点</td><td>秀</td></tr>)}</tbody>
        </table>
      </section>
    </main>
  );
}

export function TeacherGradesScreen() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [weights, setWeights] = useState([0, 0, 0]);
  const [weightModalOpen, setWeightModalOpen] = useState(false);

  return (
    <main className="teacher-grades-page">
      <header className="teacher-grades-header">
        <nav className="teacher-grades-breadcrumb" aria-label="パンくず"><span>ホーム</span><b>›</b><span>担当科目</span><b>›</b><strong>成績一覧</strong></nav>
        <h1>科目・Webデザイン</h1>
        <button className="teacher-grade-metrics" type="button" onClick={() => setWeightModalOpen(true)} aria-label="評価基準を変更"><div><strong>出席率</strong><span>{weights[0]}</span></div><div><strong>授業態度</strong><span>{weights[1]}</span></div><div><strong>課題</strong><span>{weights[2]}</span></div></button>
        <label className="teacher-grade-search"><span aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="（学籍・氏名）" aria-label="学籍・氏名で検索" /></label>
      </header>
      <section className="teacher-grades-table-shell">
        <table className="teacher-grades-table">
          <thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率(〇〇%)</th><th>授業態度(1~10)</th><th>課題(1~10)</th><th>点数</th><th>評価</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.status}</td><td>{row.number}</td><td>{row.name}</td><td>〇〇%</td><td>〇〇</td><td>〇〇</td><td>〇〇点</td><td>秀</td></tr>)}</tbody>
        </table>
      </section>
      <div className="teacher-grades-actions">
        <button className="teacher-incomplete-button" type="button" onClick={() => setMessage("未入力の成績を確認しました。")}>未入力チェック</button>
        <button className="teacher-save-button" type="button" onClick={() => setMessage("保存しました。")}>保存</button>
      </div>
      {message && <p className="teacher-grades-message" role="status">{message}</p>}
      {weightModalOpen && <WeightModal weights={weights} onConfirm={setWeights} onClose={() => setWeightModalOpen(false)} />}
    </main>
  );
}
