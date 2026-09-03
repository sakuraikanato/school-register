"use client";

import { useState } from "react";
import { ConfirmationModal, CsvImportModal, WeightModal } from "@/component/modals";
import { StaffMobileLogout } from "@/component/staff-mobile";

const rows = Array.from({ length: 7 }, (_, index) => ({ id: index + 1 }));

export function StaffGradeScreen() {
  const [weights, setWeights] = useState([3, 3, 4]);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <>
      <main className="staff-grade-page">
        <header className="staff-grade-header">
          <div className="staff-grade-breadcrumb"><span>ホーム</span><b>›</b><span>担当科目</span><b>›</b><strong>成績一覧</strong></div>
          <div className="staff-grade-heading-row">
            <h1>科目・Webデザイン</h1>
            <button className="staff-grade-csv" type="button" onClick={() => setCsvModalOpen(true)}>CSV読み込み</button>
            <button className="staff-grade-metrics" type="button" onClick={() => setWeightModalOpen(true)} aria-label="評価基準を変更">
              <div><strong>出席率</strong><span>{weights[0]}</span></div>
              <div><strong>授業態度</strong><span>{weights[1]}</span></div>
              <div><strong>課題</strong><span>{weights[2]}</span></div>
            </button>
            <label className="staff-grade-search"><span aria-hidden="true" /><input placeholder="(学籍・氏名)" /></label>
          </div>
        </header>
        <section className="staff-grade-table-shell">
          <table className="staff-grade-table">
            <thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率(〇%)</th><th>授業態度(1~10)</th><th>課題(1~10)</th><th>点数</th><th>評価</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}><td>在籍</td><td>0000</td><td>斉藤太郎</td><td>〇〇%</td><td>〇〇</td><td>〇〇</td><td>〇〇点</td><td>秀</td></tr>)}</tbody>
          </table>
        </section>
        <footer className="staff-grade-actions">
          <button className="staff-green-button" type="button">未入力チェック</button>
          <div><button className="staff-white-button" type="button">保存</button><button className="staff-green-button" type="button" onClick={() => setConfirmationModalOpen(true)}>確定</button></div>
        </footer>
        {message && <p className="staff-grade-message" role="status">{message}</p>}
      </main>
      {weightModalOpen && <WeightModal weights={weights} onConfirm={setWeights} onClose={() => setWeightModalOpen(false)} />}
      {csvModalOpen && <CsvImportModal onClose={() => setCsvModalOpen(false)} />}
      {confirmationModalOpen && <ConfirmationModal onClose={() => setConfirmationModalOpen(false)} onConfirm={() => setMessage("成績を確定しました。")} />}
    </>
  );
}

/** Mobile staff view keeps the desktop grade-list columns, but removes edit controls. */
export function StaffGradeMobile() {
  return (
    <main className="staff-grade-mobile-page">
      <header className="staff-grade-mobile-header">
        <div className="staff-mobile-breadcrumb" aria-label="パンくずリスト">
          <span>ホーム<b aria-hidden="true">›</b></span>
          <span>担当科目<b aria-hidden="true">›</b></span>
          <span className="is-active">成績一覧</span>
        </div>
        <h1>科目・Webデザイン</h1>
      </header>
      <section className="staff-grade-mobile-table-shell" aria-label="Webデザイン成績一覧">
        <div className="staff-grade-mobile-table-scroll">
          <table className="staff-grade-table staff-grade-mobile-table">
            <thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率(〇%)</th><th>授業態度(1~10)</th><th>課題(1~10)</th><th>点数</th><th>評価</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}><td>在籍</td><td>0000</td><td>斉藤太郎</td><td>〇〇%</td><td>〇〇</td><td>〇〇</td><td>〇〇点</td><td>秀</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <StaffMobileLogout />
    </main>
  );
}
