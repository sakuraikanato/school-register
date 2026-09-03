"use client";

import { useState } from "react";
import { GradeTable, MobileGradeSheet } from "@/component/grade-ui";
import { ConfirmationModal } from "@/component/modals";
import { AppShell } from "@/component/sidebar";

export default function Page() {
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  return <><AppShell currentPage="courses"><header className="page-header compact"><div><span className="eyebrow">2026年度・前期</span><h1>成績確定</h1><p>未入力の成績を確認してから、学期の成績を確定します。</p></div><span className="status alert-status">要確認 1件</span></header><div className="desktop-content"><section className="finalization-callout"><div><span className="eyebrow">確認事項</span><h2>Webデザインの入力が完了しています</h2><p>在籍中の5名すべてに成績が入力されています。確定後の変更は専任職員のみ可能です。</p></div><button className="primary-button" type="button" onClick={() => setConfirmationModalOpen(true)}>成績を確定</button></section>{message && <p className="entry-message" role="status">{message}</p>}<section className="table-section"><div className="table-heading"><div><h2>Webデザイン</h2><span>担当：田中 太郎</span></div><span className="status confirmed-status">入力完了</span></div><GradeTable /></section></div><div className="mobile-only"><MobileGradeSheet title="成績表" /></div></AppShell>{confirmationModalOpen && <ConfirmationModal onClose={() => setConfirmationModalOpen(false)} onConfirm={() => setMessage("成績を確定しました。")} />}</>;
}
