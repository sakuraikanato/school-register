"use client";

import { useMemo, useState } from "react";
import type { TeacherGradeEntryResponse, StaffGradeSheetResponse, ScreenQuery } from "@/utils/client";
import { saveTeacherGrades, saveTeacherWeight } from "@/utils/client";
import { useUnsavedChanges } from "@/component/unsaved-changes";

export type GradeRow = { id: number; number: string; name: string; status: "在籍" | "休学"; attendance: number; attitude: number; assignment: number; score?: number | null; gradeLabel?: string | null };
export const calculateScore = (row: Pick<GradeRow, "attendance" | "attitude" | "assignment">, weights: readonly number[]) => Math.min(100, Math.max(0, Math.round((row.attendance * weights[0] + row.attitude * 10 * weights[1] + row.assignment * 10 * weights[2]) / 10)));
export const gradeLabel = (score: number) => score >= 90 ? "秀" : score >= 80 ? "優" : score >= 70 ? "良" : score >= 60 ? "可" : "不可";
export function GradePill({ score, label }: Readonly<{ score: number; label?: string | null }>) { const value = label ?? gradeLabel(score); return <span className={`grade-pill grade-${value}`}>{value}<b>{score}</b></span>; }

export type EditableGradeDraft = {
  id: number;
  number: string;
  name: string;
  nameHiragana?: string;
  status: "在籍" | "休学";
  editable: boolean;
  attendance: number | null;
  attitude: number | null;
  assignment: number | null;
};

const editableGradeFieldLabels = [
	["attendance", "出席率"],
	["attitude", "授業態度"],
	["assignment", "課題"],
] as const;

export const missingEditableGradeFields = (row: Pick<EditableGradeDraft, "attendance" | "attitude" | "assignment">) =>
	editableGradeFieldLabels.filter(([field]) => row[field] == null).map(([, label]) => label);

export const formatMissingEditableGrades = (rows: readonly EditableGradeDraft[]) => {
	const details = rows
		.filter((row) => row.status === "在籍" && row.editable)
		.map((row) => {
			const fields = missingEditableGradeFields(row);
			return fields.length > 0 ? `${row.name}：${fields.join("、")}` : null;
		})
		.filter((detail): detail is string => detail !== null);

	return details.length > 0 ? `未入力のため確定できません。\n・${details[0]}` : "";
};

type GradeEditorRow = EditableGradeDraft;

export const editableGradeRows = (data: TeacherGradeEntryResponse): EditableGradeDraft[] => data.students.map(({ student, grade, editable }) => ({
  id: student.id,
  number: student.studentNumber,
  name: student.name,
  nameHiragana: student.nameHiragana,
  status: student.isAttending ? "在籍" : "休学",
  editable,
  attendance: grade?.attendance ?? null,
  attitude: grade?.attitude ?? null,
  assignment: grade?.assignment ?? null,
}));

export const editableGradeScore = (row: Pick<EditableGradeDraft, "attendance" | "attitude" | "assignment">, weights: readonly number[]) => {
  if (row.attendance == null || row.attitude == null || row.assignment == null || weights.length !== 3 || weights.reduce((sum, weight) => sum + weight, 0) !== 10) return null;
  return calculateScore(row as GradeRow, weights);
};

export const parseGradeInput = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const isCompleteEditableGrade = (row: Pick<EditableGradeDraft, "attendance" | "attitude" | "assignment">) =>
	row.attendance != null && row.attitude != null && row.assignment != null;

export const hasInvalidEditableGrade = (row: Pick<EditableGradeDraft, "attendance" | "attitude" | "assignment">) =>
	(row.attendance != null && (row.attendance < 0 || row.attendance > 100)) ||
	(row.attitude != null && (row.attitude < 1 || row.attitude > 10)) ||
	(row.assignment != null && (row.assignment < 1 || row.assignment > 10));

export function GradeTable({ rows, subject, yearLabel, termLabel }: Readonly<{ rows: readonly GradeRow[]; subject: string; yearLabel: string; termLabel: string }>) {
  return <div className="grade-table-wrap"><table className="grade-table"><thead><tr><th>ステータス</th><th>学籍番号</th><th>氏名</th><th>出席率</th><th>授業態度</th><th>課題</th><th>点数</th><th>評価</th></tr></thead><tbody>{rows.map((row) => { const score = row.score; return <tr key={row.id}><td><span className={`status ${row.status === "在籍" ? "attending" : "on-leave"}`}>{row.status}</span></td><td>{row.number}</td><td className="student-name">{row.name}</td><td>{row.attendance}%</td><td>{row.attitude}</td><td>{row.assignment}</td><td>{score == null ? "—" : `${score}点`}</td><td>{score == null ? "—" : <GradePill score={score} label={row.gradeLabel} />}</td></tr>; })}</tbody></table><p className="table-caption">{subject}・{yearLabel} {termLabel}の成績</p></div>;
}

type MobileSubject = { subjectName: string; attendance: number | null; attitude: number | null; assignment: number | null; score: number | null; gradeLabel?: string | null };
export type GradeHistoryOption = Readonly<{ value: string; label: string }>;

export function GradeHistorySelect({ options, value, onChange, className }: Readonly<{ options: readonly GradeHistoryOption[]; value: string; onChange: (value: string) => void; className: string }>) {
  return <label className={className}><select aria-label="履歴を変更" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
}

export function MobileGradeSheet({ title, student, subjects, yearLabel, termLabel, historyOptions = [], historyValue = "", onHistoryChange }: Readonly<{ title: string; student: StaffGradeSheetResponse["student"]; subjects: readonly MobileSubject[]; yearLabel: string; termLabel: string; historyOptions?: readonly GradeHistoryOption[]; historyValue?: string; onHistoryChange?: (value: string) => void }>) {
  const scoredSubjects = subjects.filter((row) => row.score !== null);
  return <section className="mobile-grade-sheet" aria-label="スマホ用成績表"><div className="sheet-topline"><span>{title}</span>{onHistoryChange && historyOptions.length > 0 ? <GradeHistorySelect className="sheet-history-select" options={historyOptions} value={historyValue} onChange={onHistoryChange} /> : <span>{yearLabel} {termLabel}</span>}</div><div className="sheet-person"><div><small>学籍番号</small><strong>{student.studentNumber}</strong></div><div><small>氏名</small><strong>{student.name}</strong></div></div><div className="sheet-overview"><div><small>平均点</small><strong>{scoredSubjects.length ? Math.round(scoredSubjects.reduce((sum, row) => sum + (row.score ?? 0), 0) / scoredSubjects.length) : "—"}<span>点</span></strong></div><div><small>修得科目</small><strong>{scoredSubjects.length}<span>科目</span></strong></div></div><div className="sheet-table-wrap"><table className="sheet-table"><thead><tr><th>科目</th><th>出席率</th><th>授業態度</th><th>課題</th><th>点数</th><th>評価</th></tr></thead><tbody>{subjects.map((row) => <tr key={row.subjectName}><td>{row.subjectName}</td><td>{row.attendance == null ? "—" : `${row.attendance}%`}</td><td>{row.attitude ?? "—"}</td><td>{row.assignment ?? "—"}</td><td>{row.score ?? "—"}</td><td>{row.score == null ? "—" : <GradePill score={row.score} label={row.gradeLabel} />}</td></tr>)}</tbody></table></div></section>;
}

function NumericInput({ value, onChange, min, max, label, disabled = false }: Readonly<{ value: number | null; onChange: (value: number | null) => void; min: number; max: number; label: string; disabled?: boolean }>) { return <input aria-label={label} type="number" min={min} max={max} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(parseGradeInput(event.target.value))} />; }

export function GradeEditor({ data, subjectId, query = {}, staff = false }: Readonly<{ data: TeacherGradeEntryResponse; subjectId: number; query?: ScreenQuery; staff?: boolean }>) {
  const initialRows = () => data.students.map(({ student, grade, editable }) => ({ id: student.id, number: student.studentNumber, name: student.name, status: student.isAttending ? "在籍" as const : "休学" as const, editable, attendance: grade?.attendance ?? null, attitude: grade?.attitude ?? null, assignment: grade?.assignment ?? null }));
  const isFinalized = data.isFinalized;
  const [weights, setWeights] = useState([data.weight?.attendanceWeight ?? 0, data.weight?.attitudeWeight ?? 0, data.weight?.assignmentWeight ?? 0]);
  const [rows, setRows] = useState<GradeEditorRow[]>(initialRows);
  const [message, setMessage] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ rows: initialRows(), weights: [data.weight?.attendanceWeight ?? 0, data.weight?.attitudeWeight ?? 0, data.weight?.assignmentWeight ?? 0] }));
  const weightTotal = weights.reduce((total, value) => total + value, 0);
  const isDirty = JSON.stringify({ rows, weights }) !== savedSnapshot;
  useUnsavedChanges(isDirty);
  const completeRows = rows.filter((row) => row.status === "在籍" && isCompleteEditableGrade(row)).length;
  const average = useMemo(() => { const active = rows.filter((row) => row.status === "在籍" && isCompleteEditableGrade(row)); return active.length && weightTotal === 10 ? Math.round(active.reduce((sum, row) => sum + calculateScore(row as GradeRow, weights), 0) / active.length) : 0; }, [rows, weights, weightTotal]);
  const updateRow = (id: number, field: "attendance" | "attitude" | "assignment", value: number | null) => setRows((previous) => previous.map((row) => row.id === id ? { ...row, [field]: value } : row));
  const save = async () => {
    if (isFinalized) return setMessage("この学期の成績は確定済みのため編集できません。");
    if (weightTotal !== 10) return setMessage("重みの合計を10にしてください。");
    const activeRows = rows.filter((row) => row.status === "在籍" && row.editable);
    const invalid = activeRows.find(hasInvalidEditableGrade);
    if (invalid) return setMessage(`${invalid.name}の成績入力値を確認してください。`);
    const complete = activeRows.filter(isCompleteEditableGrade);
    try {
      await saveTeacherGrades(subjectId, query, activeRows.map((row) => ({ studentId: row.id, attendance: row.attendance, attitude: row.attitude, assignment: row.assignment })));
      const missing = activeRows.length - complete.length;
      setMessage(missing > 0 ? `下書きを保存しました。${activeRows.length}名分のうち${missing}名分は未入力です。` : staff ? "成績を保存しました。確定は成績確定画面から行ってください。" : "成績を保存しました。");
      setSavedSnapshot(JSON.stringify({ rows, weights }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存に失敗しました"); }
  };
  const saveWeights = async (next: number[]) => { if (isFinalized) { setMessage("この学期の成績は確定済みのため編集できません。"); return; } setWeights(next); try { await saveTeacherWeight(subjectId, query, { attendanceWeight: next[0], attitudeWeight: next[1], assignmentWeight: next[2] }); setSavedSnapshot(JSON.stringify({ rows, weights: next })); setMessage("重みを保存しました。"); } catch (error) { setMessage(error instanceof Error ? error.message : "重みの保存に失敗しました"); } };
  const focusInput = (event: React.MouseEvent<HTMLTableCellElement>) => {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
  };
  return <><section className="weight-panel"><div><span className="eyebrow">評価基準</span><h2>重みを設定</h2><p>3項目の合計が10になるように設定してください。</p></div><div className="weight-inputs">{[["出席率", 0], ["授業態度", 1], ["課題", 2]].map(([label, index]) => <label key={String(label)}>{label}<NumericInput label={`${label}の重み`} value={weights[Number(index)]} min={1} max={10} disabled={isFinalized} onChange={(value) => saveWeights(weights.map((weight, itemIndex) => itemIndex === Number(index) ? value ?? 0 : weight))} /></label>)}<strong className={weightTotal === 10 ? "weight-total valid" : "weight-total"}>合計 <b>{weightTotal}</b> / 10</strong></div></section><section className="spreadsheet-panel"><div className="spreadsheet-heading"><div><span className="eyebrow">{data.year.year}年度・{data.term.label}</span><h2>{data.subject.name}</h2></div><div className="entry-summary"><span>入力済み</span><strong>{completeRows}<small>/ {data.progress.total}名</small></strong><span>平均 {average}点</span></div></div><div className="editor-table-wrap"><table className="editor-table"><thead><tr><th>学籍番号</th><th>氏名</th><th>出席率 (0〜100)</th><th>授業態度 (1〜10)</th><th>課題 (1〜10)</th><th>点数</th><th>評価</th></tr></thead><tbody>{rows.map((row) => { const score = weightTotal === 10 && isCompleteEditableGrade(row) ? calculateScore(row as GradeRow, weights) : null; const disabled = !row.editable || row.status === "休学"; return <tr key={row.id} className={disabled ? "inactive-row" : ""}><td>{row.number}</td><td><strong>{row.name}</strong><small>{row.status}</small></td><td onClick={focusInput}><NumericInput label={`${row.name}の出席率`} value={row.attendance} min={0} max={100} disabled={disabled} onChange={(value) => updateRow(row.id, "attendance", value)} /></td><td onClick={focusInput}><NumericInput label={`${row.name}の授業態度`} value={row.attitude} min={1} max={10} disabled={disabled} onChange={(value) => updateRow(row.id, "attitude", value)} /></td><td onClick={focusInput}><NumericInput label={`${row.name}の課題`} value={row.assignment} min={1} max={10} disabled={disabled} onChange={(value) => updateRow(row.id, "assignment", value)} /></td><td>{disabled || score == null ? "—" : `${score}点`}</td><td>{disabled || score == null ? "—" : <GradePill score={score} />}</td></tr>; })}</tbody></table></div><div className="entry-footer"><p className={message ? "entry-message" : "entry-message hidden"} role="status">{message || "保存前に入力内容を確認してください。"}</p><button className="primary-button" type="button" disabled={isFinalized} onClick={save}>保存する</button></div></section></>;
}
