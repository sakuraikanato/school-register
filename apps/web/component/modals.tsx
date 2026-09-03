"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ModalProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  label: string;
  onClose: () => void;
}>;

function Modal({ children, className = "", label, onClose }: ModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(event) => event.currentTarget === event.target && onClose()}>
      <section className={`app-modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  );
}

function CloseButton({ onClose }: Readonly<{ onClose: () => void }>) {
  return <button className="modal-close" type="button" onClick={onClose} aria-label="閉じる">×</button>;
}

const weightLabels = ["出席率", "授業態度", "課題"] as const;

export function WeightModal({ onClose, onConfirm, weights }: Readonly<{
  onClose: () => void;
  onConfirm: (weights: number[]) => void;
  weights: number[];
}>) {
  const [draftWeights, setDraftWeights] = useState(weights);
  const total = draftWeights.reduce((sum, weight) => sum + weight, 0);
  const valid = total === 10;

  const updateWeight = (index: number, value: string) => {
    const nextWeight = Number(value);
    setDraftWeights((previous) => previous.map((weight, weightIndex) => weightIndex === index ? (Number.isFinite(nextWeight) ? nextWeight : 0) : weight));
  };

  const confirm = () => {
    if (!valid) return;
    onConfirm(draftWeights);
    onClose();
  };

  return (
    <Modal className="weight-modal" label="評価基準を変更" onClose={onClose}>
      <div className="modal-breadcrumb"><span>ホーム</span><b>›</b><span>成績一覧</span><b>›</b><strong>評価基準</strong></div>
      <CloseButton onClose={onClose} />
      <div className="weight-modal-content">
        <h2>評価基準</h2>
        <p>合計が１０になるように入力してください</p>
        <table className="weight-modal-table">
          <thead><tr><th>項目</th><th>重み</th></tr></thead>
          <tbody>{weightLabels.map((label, index) => <tr key={label}><th scope="row">{label}</th><td><input type="number" inputMode="numeric" min="0" max="10" value={draftWeights[index]} onChange={(event) => updateWeight(index, event.target.value)} aria-label={`${label}の重み`} /></td></tr>)}</tbody>
          <tfoot><tr><th scope="row">合計</th><td className={valid ? "valid" : "invalid"}>{total}/10</td></tr></tfoot>
        </table>
        <button className="modal-outline-button weight-confirm-button" type="button" onClick={confirm} disabled={!valid}>決定</button>
      </div>
    </Modal>
  );
}

export function LogoutModal({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <Modal className="logout-modal" label="ログアウト確認" onClose={onClose}>
      <h2>ログアウトしますか？</h2>
      <div className="logout-modal-actions">
        <Link className="modal-outline-button" href="/">はい</Link>
        <button className="modal-outline-button" type="button" onClick={onClose}>いいえ</button>
      </div>
    </Modal>
  );
}

export function CsvImportModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [source, setSource] = useState("生徒");

  return (
    <Modal className="csv-import-modal" label="CSV取り込み" onClose={onClose}>
      <div className="modal-breadcrumb"><span>ホーム</span><b>›</b><strong>CSV取り込み</strong></div>
      <CloseButton onClose={onClose} />
      <ol className="csv-modal-steps" aria-label="CSV取り込み手順">
        {["種類選択", "ファイル選択", "確認", "結果"].map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}
      </ol>
      <fieldset className="csv-modal-options">
        <legend>取り込む種類を選択してください</legend>
        {["生徒", "講師", "専任職員", "科目"].map((option) => <label key={option}><input type="radio" name="csv-source" value={option} checked={source === option} onChange={() => setSource(option)} />{option}</label>)}
      </fieldset>
    </Modal>
  );
}

export function CsvImportTrigger({ children, className }: Readonly<{ children: React.ReactNode; className: string }>) {
  const [modalOpen, setModalOpen] = useState(false);

  return <>{<button className={className} type="button" onClick={() => setModalOpen(true)}>{children}</button>}{modalOpen && <CsvImportModal onClose={() => setModalOpen(false)} />}</>;
}

export function ConfirmationModal({ onClose, onConfirm }: Readonly<{ onClose: () => void; onConfirm: () => void }>) {
  const [year, setYear] = useState("2026");
  const [term, setTerm] = useState("前期");

  const confirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal className="confirmation-modal" label="成績確認" onClose={onClose}>
      <div className="modal-breadcrumb"><span>ホーム</span><b>›</b><span>成績一覧</span><b>›</b><strong>成績確認</strong></div>
      <div className="confirmation-modal-content">
        <div className="confirmation-selects">
          <label>年度<select value={year} onChange={(event) => setYear(event.target.value)} aria-label="年度"><option>2026</option></select></label>
          <label>学期<select value={term} onChange={(event) => setTerm(event.target.value)} aria-label="学期"><option>前期</option><option>後期</option></select></label>
        </div>
        <section className="confirmation-result"><h2>確認結果</h2><p>＊未入力はありません</p></section>
      </div>
      <div className="confirmation-footer"><p>＊注意<br />確定した場合変更が出来ません<br />確定前に必ず未入力のチェックをしてください</p><button className="modal-outline-button" type="button" onClick={confirm}>確定</button></div>
    </Modal>
  );
}
