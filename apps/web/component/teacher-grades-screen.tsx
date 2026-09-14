"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WeightModal } from "@/component/modals";
import type { TeacherGradeEntryResponse, ScreenQuery } from "@/utils/client";
import { saveTeacherGrades, saveTeacherWeight } from "@/utils/client";
import { editableGradeRows, editableGradeScore, GradePill, hasInvalidEditableGrade, isCompleteEditableGrade, parseGradeInput, type EditableGradeDraft } from "@/component/grade-ui";
import { useUnsavedChanges } from "@/component/unsaved-changes";

export function TeacherMobileGradesScreen({ data }: Readonly<{ data: TeacherGradeEntryResponse }>) {
  return <main className="teacher-mobile-grades-page"><nav className="teacher-mobile-grades-breadcrumb" aria-label="パンくず"><Link href="/teacher">ホーム</Link><b>›</b><Link href="/teacher">担当科目</Link><b>›</b><strong>成績一覧</strong></nav><h1>科目・{data.subject.name}</h1><section className="teacher-mobile-grades-table-shell" aria-label={`${data.subject.name}の成績一覧`}><table className="teacher-mobile-grades-table"><thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率<br />(〇〇%)</th><th>授業態度<br />(1~10)</th><th>課題<br />(1~10)</th><th>点数</th><th>評価</th></tr></thead><tbody>{data.students.map(({ student, grade, gradeLabel }) => <tr key={student.id}><td>{student.isAttending ? "在籍" : "休学"}</td><td>{student.studentNumber}</td><td>{student.name}</td><td>{grade ? `${grade.attendance}%` : "—"}</td><td>{grade?.attitude ?? "—"}</td><td>{grade?.assignment ?? "—"}</td><td>{grade?.score == null ? "—" : `${grade.score}点`}</td><td>{grade ? <GradePill score={grade.score} label={gradeLabel} /> : "—"}</td></tr>)}</tbody></table></section></main>;
}

export function TeacherGradesScreen({ data, query = {} }: Readonly<{ data: TeacherGradeEntryResponse; query?: ScreenQuery }>) {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [weights, setWeights] = useState([data.weight?.attendanceWeight ?? 0, data.weight?.attitudeWeight ?? 0, data.weight?.assignmentWeight ?? 0]);
  const isFinalized = data.isFinalized;
  const [draftRows, setDraftRows] = useState<EditableGradeDraft[]>(() => editableGradeRows(data));
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ rows: editableGradeRows(data), weights: [data.weight?.attendanceWeight ?? 0, data.weight?.attitudeWeight ?? 0, data.weight?.assignmentWeight ?? 0] }));
  const rows = useMemo(() => draftRows.filter((row) => `${row.number}${row.name}`.includes(search)), [draftRows, search]);
  const missingCount = draftRows.filter((row) => row.status === "在籍" && (row.attendance == null || row.attitude == null || row.assignment == null)).length;
  const isDirty = JSON.stringify({ rows: draftRows, weights }) !== savedSnapshot;
  useUnsavedChanges(isDirty);
  const saveWeights = async (next: number[]) => { if (isFinalized) { setMessage("この学期の成績は確定済みのため評価基準を変更できません。"); return; } setWeights(next); try { const saved = JSON.parse(savedSnapshot) as { rows: EditableGradeDraft[]; weights: number[] }; await saveTeacherWeight(data.subject.id, query, { attendanceWeight: next[0], attitudeWeight: next[1], assignmentWeight: next[2] }); setSavedSnapshot(JSON.stringify({ rows: saved.rows, weights: next })); setMessage("重みを保存しました。"); } catch (error) { setMessage(error instanceof Error ? error.message : "重みの保存に失敗しました"); } };
  const updateRow = (id: number, field: "attendance" | "attitude" | "assignment", value: string) => setDraftRows((previous) => previous.map((row) => row.id === id ? { ...row, [field]: parseGradeInput(value) } : row));
  const save = async () => {
    if (isFinalized) return setMessage("この学期の成績は確定済みのため編集できません。");
    const activeRows = draftRows.filter((row) => row.status === "在籍" && row.editable);
    const invalid = activeRows.find(hasInvalidEditableGrade);
    if (invalid) return setMessage(`${invalid.name}の成績入力値を確認してください。`);
    if (weights.reduce((sum, weight) => sum + weight, 0) !== 10) return setMessage("重みの合計を10にしてください。");
    const completeRows = activeRows.filter(isCompleteEditableGrade);
    if (completeRows.length === 0) return setMessage("保存できる入力済みの成績がありません。");
    try {
      await saveTeacherGrades(data.subject.id, query, completeRows.map((row) => ({ studentId: row.id, attendance: row.attendance as number, attitude: row.attitude as number, assignment: row.assignment as number })));
      const missing = activeRows.length - completeRows.length;
      if (missing === 0) setSavedSnapshot(JSON.stringify({ rows: draftRows, weights }));
      setMessage(missing > 0 ? `${completeRows.length}名分を保存しました。未入力の${missing}名分は確定できません。` : "保存しました。入力値から点数と評価を算出しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存に失敗しました"); }
  };
  const focusInput = (event: React.MouseEvent<HTMLTableCellElement>) => {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
  };
  return <main className="teacher-grades-page"><header className="teacher-grades-header"><nav className="teacher-grades-breadcrumb" aria-label="パンくず"><Link href="/teacher">ホーム</Link><b>›</b><Link href="/teacher">担当科目</Link><b>›</b><strong>成績一覧</strong></nav><h1>科目・{data.subject.name}</h1><button className="teacher-grade-metrics" type="button" disabled={isFinalized} onClick={() => setWeightModalOpen(true)} aria-label="評価基準を変更">{[["出席率", weights[0]], ["授業態度", weights[1]], ["課題", weights[2]]].map(([label, value]) => <div key={String(label)}><strong>{label}</strong><span>{value}</span></div>)}</button><label className="teacher-grade-search"><span aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="（学籍・氏名）" aria-label="学籍・氏名で検索" /></label></header>{isFinalized && <p className="teacher-grades-message" role="status">この学期の成績は確定済みです。次の学期または年度で入力できます。</p>}<section className="teacher-grades-table-shell"><table className="teacher-grades-table"><thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率(〇〇%)</th><th>授業態度(1~10)</th><th>課題(1~10)</th><th>点数</th><th>評価</th></tr></thead><tbody>{rows.map((row) => { const score = row.status === "在籍" ? editableGradeScore(row, weights) : null; const disabled = isFinalized || !row.editable || row.status === "休学"; return <tr key={row.id} className={disabled ? "grade-readonly-row" : ""}><td>{row.status}</td><td>{row.number}</td><td>{row.name}</td><td onClick={focusInput}><input className="grade-cell-input" type="number" min={0} max={100} value={row.attendance ?? ""} disabled={disabled} onChange={(event) => updateRow(row.id, "attendance", event.target.value)} aria-label={`${row.name}の出席率`} />%</td><td onClick={focusInput}><input className="grade-cell-input" type="number" min={1} max={10} value={row.attitude ?? ""} disabled={disabled} onChange={(event) => updateRow(row.id, "attitude", event.target.value)} aria-label={`${row.name}の授業態度`} /></td><td onClick={focusInput}><input className="grade-cell-input" type="number" min={1} max={10} value={row.assignment ?? ""} disabled={disabled} onChange={(event) => updateRow(row.id, "assignment", event.target.value)} aria-label={`${row.name}の課題`} /></td><td>{score == null ? "—" : `${score}点`}</td><td>{score == null ? "—" : <GradePill score={score} />}</td></tr>; })}</tbody></table></section><div className="teacher-grades-actions"><button className="teacher-incomplete-button" type="button" onClick={() => setMessage(missingCount ? `未入力の成績が${missingCount}件あります。` : "未入力の成績はありません。")} disabled={isFinalized}>未入力チェック</button><button className="teacher-save-button" type="button" onClick={save} disabled={isFinalized}>保存</button></div>{message && <p className="teacher-grades-message" role="status">{message}</p>}{weightModalOpen && <WeightModal weights={weights} onConfirm={saveWeights} onClose={() => setWeightModalOpen(false)} />}</main>;
}
