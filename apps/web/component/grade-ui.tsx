"use client";

import { useMemo, useState } from "react";

export type GradeRow = {
  id: number;
  number: string;
  name: string;
  status: "在籍" | "休学";
  attendance: number;
  attitude: number;
  assignment: number;
};

export const sampleGrades: GradeRow[] = [
  { id: 1, number: "24001", name: "斎藤 太郎", status: "在籍", attendance: 94, attitude: 9, assignment: 9 },
  { id: 2, number: "24002", name: "佐藤 花", status: "在籍", attendance: 88, attitude: 8, assignment: 9 },
  { id: 3, number: "24003", name: "鈴木 健", status: "在籍", attendance: 76, attitude: 7, assignment: 8 },
  { id: 4, number: "24004", name: "高橋 美咲", status: "在籍", attendance: 92, attitude: 8, assignment: 7 },
  { id: 5, number: "24005", name: "伊藤 陸", status: "休学", attendance: 0, attitude: 0, assignment: 0 },
  { id: 6, number: "24006", name: "渡辺 陽菜", status: "在籍", attendance: 82, attitude: 7, assignment: 8 },
];

export const calculateScore = (row: Pick<GradeRow, "attendance" | "attitude" | "assignment">, weights = [3, 3, 4]) =>
  Math.min(100, Math.max(0, Math.round((row.attendance * weights[0] + row.attitude * 10 * weights[1] + row.assignment * 10 * weights[2]) / 10)));

export const gradeLabel = (score: number) => {
  if (score >= 90) return "秀";
  if (score >= 80) return "優";
  if (score >= 70) return "良";
  if (score >= 60) return "可";
  return "不可";
};

export function GradePill({ score }: { score: number }) {
  const label = gradeLabel(score);
  return <span className={`grade-pill grade-${label}`}>{label}<b>{score}</b></span>;
}

export function GradeTable({ rows = sampleGrades, subject = "Webデザイン" }: Readonly<{ rows?: GradeRow[]; subject?: string }>) {
  return (
    <div className="grade-table-wrap">
      <table className="grade-table">
        <thead><tr><th>ステータス</th><th>学籍番号</th><th>氏名</th><th>出席率</th><th>授業態度</th><th>課題</th><th>点数</th><th>評価</th></tr></thead>
        <tbody>{rows.map((row) => {
          const score = calculateScore(row);
          return <tr key={row.id}><td><span className={`status ${row.status === "在籍" ? "attending" : "on-leave"}`}>{row.status}</span></td><td>{row.number}</td><td className="student-name">{row.name}</td><td>{row.attendance}%</td><td>{row.attitude}</td><td>{row.assignment}</td><td>{score}点</td><td><GradePill score={score} /></td></tr>;
        })}</tbody>
      </table>
      <p className="table-caption">{subject}・2026年度 前期の成績</p>
    </div>
  );
}

export function MobileGradeSheet({ title = "成績表", studentName = "斎藤 太郎" }: Readonly<{ title?: string; studentName?: string }>) {
  const subjects = [["Webデザイン", 94, 9, 9, 91], ["UI/UXデザイン", 88, 8, 9, 86], ["JavaScript基礎", 76, 7, 8, 78], ["HTML/CSSコーディング", 92, 8, 7, 83]] as const;
  return (
    <section className="mobile-grade-sheet" aria-label="スマホ用成績表">
      <div className="sheet-topline"><span>{title}</span><span>2026年度 前期</span></div>
      <div className="sheet-person"><div><small>学籍番号</small><strong>24001</strong></div><div><small>氏名</small><strong>{studentName}</strong></div></div>
      <div className="sheet-overview"><div><small>平均点</small><strong>85<span>点</span></strong></div><div><small>修得科目</small><strong>4<span>科目</span></strong></div><div><small>出席率</small><strong>92<span>%</span></strong></div></div>
      <div className="sheet-table-wrap"><table className="sheet-table"><thead><tr><th>科目</th><th>出席率</th><th>授業態度</th><th>課題</th><th>点数</th><th>評価</th></tr></thead><tbody>{subjects.map(([subject, attendance, attitude, assignment, score]) => <tr key={subject}><td>{subject}</td><td>{attendance}%</td><td>{attitude}</td><td>{assignment}</td><td>{score}</td><td><GradePill score={score} /></td></tr>)}</tbody></table></div>
    </section>
  );
}

function NumericInput({ value, onChange, min, max, label }: Readonly<{ value: number; onChange: (value: number) => void; min: number; max: number; label: string }>) {
  return <input aria-label={label} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

export function GradeEditor({ staff = false }: { staff?: boolean }) {
  const [weights, setWeights] = useState([3, 3, 4]);
  const [rows, setRows] = useState(sampleGrades);
  const [message, setMessage] = useState("");
  const weightTotal = weights.reduce((total, value) => total + value, 0);
  const completeRows = rows.filter((row) => row.status === "在籍" && row.attendance > 0 && row.attitude > 0 && row.assignment > 0).length;
  const average = useMemo(() => Math.round(rows.filter((row) => row.status === "在籍").reduce((total, row) => total + calculateScore(row, weights), 0) / 5), [rows, weights]);
  const updateWeight = (index: number, value: number) => setWeights((previous) => previous.map((weight, itemIndex) => itemIndex === index ? value : weight));
  const updateRow = (id: number, field: "attendance" | "attitude" | "assignment", value: number) => setRows((previous) => previous.map((row) => row.id === id ? { ...row, [field]: value } : row));
  const save = () => {
    if (weightTotal !== 10) return setMessage("重みの合計を10にしてください。");
    if (staff && completeRows !== 5) return setMessage("未入力の成績があるため、確定できません。");
    setMessage(staff ? "成績を確定しました。" : "下書きを保存しました。未入力の項目は後で入力できます。");
  };

  return <>
    <section className="weight-panel"><div><span className="eyebrow">評価基準</span><h2>重みを設定</h2><p>3項目の合計が10になるように設定してください。</p></div><div className="weight-inputs">{[["出席率", 0], ["授業態度", 1], ["課題", 2]].map(([label, index]) => <label key={String(label)}>{label}<NumericInput label={`${label}の重み`} value={weights[Number(index)]} min={1} max={10} onChange={(value) => updateWeight(Number(index), value)} /></label>)}<strong className={weightTotal === 10 ? "weight-total valid" : "weight-total"}>合計 <b>{weightTotal}</b> / 10</strong></div></section>
    <section className="spreadsheet-panel"><div className="spreadsheet-heading"><div><span className="eyebrow">2026年度・前期</span><h2>Webデザイン</h2></div><div className="entry-summary"><span>入力済み</span><strong>{completeRows}<small>/ 5名</small></strong><span>平均 {average}点</span></div></div><div className="editor-table-wrap"><table className="editor-table"><thead><tr><th>学籍番号</th><th>氏名</th><th>出席率 (0〜100)</th><th>授業態度 (1〜10)</th><th>課題 (1〜10)</th><th>点数</th><th>評価</th></tr></thead><tbody>{rows.map((row) => {
      const score = calculateScore(row, weights);
      const disabled = row.status === "休学";
      return <tr key={row.id} className={disabled ? "inactive-row" : ""}><td>{row.number}</td><td><strong>{row.name}</strong><small>{row.status}</small></td><td><NumericInput label={`${row.name}の出席率`} value={row.attendance} min={0} max={100} onChange={(value) => updateRow(row.id, "attendance", value)} /></td><td><NumericInput label={`${row.name}の授業態度`} value={row.attitude} min={1} max={10} onChange={(value) => updateRow(row.id, "attitude", value)} /></td><td><NumericInput label={`${row.name}の課題`} value={row.assignment} min={1} max={10} onChange={(value) => updateRow(row.id, "assignment", value)} /></td><td>{disabled ? "—" : `${score}点`}</td><td>{disabled ? "—" : <GradePill score={score} />}</td></tr>;
    })}</tbody></table></div><div className="entry-footer"><p className={message ? "entry-message" : "entry-message hidden"} role="status">{message || "保存前に入力内容を確認してください。"}</p><button className="primary-button" type="button" onClick={save}>{staff ? "成績を確定" : "保存する"}</button></div></section>
  </>;
}
