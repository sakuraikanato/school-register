"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmationModal, CsvImportModal, GradeUnlockModal, WeightModal } from "@/component/modals";
import { StaffMobileLogout } from "@/component/staff-mobile";
import type { TeacherGradeEntryResponse, ScreenQuery } from "@/utils/client";
import { finalizeStaffSubject, saveTeacherGrades, saveTeacherWeight, unlockStaffSubject } from "@/utils/client";
import { editableGradeRows, editableGradeScore, formatMissingEditableGrades, GradePill, hasInvalidEditableGrade, isCompleteEditableGrade, parseGradeInput, type EditableGradeDraft } from "@/component/grade-ui";
import { useUnsavedChanges } from "@/component/unsaved-changes";

export function StaffGradeScreen({ data, subjectId, query = {} }: Readonly<{ data: TeacherGradeEntryResponse; subjectId: number; query?: ScreenQuery }>) {
  const initialWeights = [data.weight?.attendanceWeight ?? 0, data.weight?.attitudeWeight ?? 0, data.weight?.assignmentWeight ?? 0];
  const [isFinalized, setIsFinalized] = useState(data.isFinalized);
  const [weights, setWeights] = useState(initialWeights);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [draftRows, setDraftRows] = useState<EditableGradeDraft[]>(() => editableGradeRows(data));
  const [search, setSearch] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ rows: editableGradeRows(data), weights: initialWeights }));
  const rows = draftRows.filter((row) => `${row.number}${row.name}${row.nameHiragana ?? ""}`.includes(search));
  const missingCount = draftRows.filter((row) => row.status === "在籍" && (row.attendance == null || row.attitude == null || row.assignment == null)).length;
  const isDirty = JSON.stringify({ rows: draftRows, weights }) !== savedSnapshot;
  useUnsavedChanges(isDirty);
  const showMessage = (next: string, error = false) => { setMessage(next); setMessageIsError(error); };
  const saveWeights = async (next: number[]) => { if (isFinalized) { showMessage("この学期の成績は確定済みのため評価基準を変更できません。", true); return; } setWeights(next); try { await saveTeacherWeight(subjectId, query, { attendanceWeight: next[0], attitudeWeight: next[1], assignmentWeight: next[2] }); setSavedSnapshot(JSON.stringify({ rows: draftRows, weights: next })); showMessage("重みを保存しました。"); } catch (error) { showMessage(error instanceof Error ? error.message : "重みの保存に失敗しました", true); } };
  const updateRow = (id: number, field: "attendance" | "attitude" | "assignment", value: string) => setDraftRows((previous) => previous.map((row) => row.id === id ? { ...row, [field]: parseGradeInput(value) } : row));
  const persistGrades = async () => {
    if (isFinalized) {
      showMessage("この学期の成績は確定済みのため編集できません。", true);
      return null;
    }
    const activeRows = draftRows.filter((row) => row.status === "在籍" && row.editable);
    const invalid = activeRows.find(hasInvalidEditableGrade);
    if (invalid) {
      showMessage(`${invalid.name}の成績入力値を確認してください。`, true);
      return null;
    }
    if (weights.reduce((sum, weight) => sum + weight, 0) !== 10) {
      showMessage("重みの合計を10にしてください。", true);
      return null;
    }
    const completeRows = activeRows.filter(isCompleteEditableGrade);
    try {
      await saveTeacherGrades(subjectId, query, activeRows.map((row) => ({ studentId: row.id, attendance: row.attendance, attitude: row.attitude, assignment: row.assignment })));
      const missing = activeRows.length - completeRows.length;
      setSavedSnapshot(JSON.stringify({ rows: draftRows, weights }));
      return { savedCount: activeRows.length, missing };
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "成績の保存に失敗しました", true);
      return null;
    }
  };
  const save = async () => {
    const result = await persistGrades();
    if (!result) return;
    showMessage(result.missing > 0 ? `下書きを保存しました。${result.savedCount}名分のうち${result.missing}名分は未入力です。` : "成績を保存しました。入力値から点数と評価を算出しました。");
  };
  const confirm = async () => {
    const result = await persistGrades();
    if (!result) return;
    if (result.missing > 0) {
      showMessage(`${result.savedCount}名分を保存しました。\n${formatMissingEditableGrades(draftRows)}`, true);
      return;
    }
    try {
      await finalizeStaffSubject(subjectId, query);
      setIsFinalized(true);
      showMessage("成績を確定しました。");
    } catch (error) { showMessage(error instanceof Error ? error.message : "成績の確定に失敗しました", true); }
  };
  const unlock = async () => {
    if (!isFinalized) return;
    try {
      await unlockStaffSubject(subjectId, query);
      setIsFinalized(false);
      setDraftRows((previous) => previous.map((row) => ({ ...row, editable: true })));
      showMessage("成績の確定を解除しました。修正後に再度確定してください。");
    } catch (error) { showMessage(error instanceof Error ? error.message : "成績の確定解除に失敗しました", true); }
  };
  const focusInput = (event: React.MouseEvent<HTMLTableCellElement>) => {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
  };

  return <>
    <main className="staff-grade-page">
      <header className="staff-grade-header">
        <div className="staff-grade-breadcrumb"><Link href="/staff">ホーム</Link><b>›</b><Link href="/staff/courses">担当科目</Link><b>›</b><strong>成績一覧</strong></div>
        <div className="staff-grade-heading-row">
          <h1>科目・{data.subject.name}</h1>
          <span className="staff-grade-term-label">{data.year.year}年度・{data.term.label}</span>
          <button className="staff-grade-csv" type="button" onClick={() => setCsvModalOpen(true)}>CSV読み込み</button>
          <button className="staff-grade-metrics" type="button" disabled={isFinalized} onClick={() => setWeightModalOpen(true)} aria-label="評価基準を変更">{[["出席率", weights[0]], ["授業態度", weights[1]], ["課題", weights[2]]].map(([label, value]) => <div key={String(label)}><strong>{label}</strong><span>{value}</span></div>)}</button>
          <label className="staff-grade-search"><span aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="(学籍・氏名)" aria-label="学籍・氏名で検索" /></label>
        </div>
      </header>
      {isFinalized ? <p className="staff-grade-message" role="status">この学期の成績は確定済みです。確定解除後に修正できます。</p> : null}
      <section className="staff-grade-table-shell">
        <table className="staff-grade-table">
          <thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率(〇%)</th><th>授業態度(1~10)</th><th>課題(1~10)</th><th>点数</th><th>評価</th></tr></thead>
          <tbody>{rows.map((row) => {
            const score = row.status === "在籍" ? editableGradeScore(row, weights) : null;
            const disabled = isFinalized || !row.editable || row.status === "休学";
            return <tr key={row.id} className={disabled ? "grade-readonly-row" : ""}>
              <td>{row.status}</td><td>{row.number}</td><td>{row.name}</td>
              <td onClick={focusInput}><input className="grade-cell-input" type="number" min={0} max={100} value={row.attendance ?? ""} disabled={disabled} onChange={(event) => updateRow(row.id, "attendance", event.target.value)} aria-label={`${row.name}の出席率`} />%</td>
              <td onClick={focusInput}><input className="grade-cell-input" type="number" min={1} max={10} value={row.attitude ?? ""} disabled={disabled} onChange={(event) => updateRow(row.id, "attitude", event.target.value)} aria-label={`${row.name}の授業態度`} /></td>
              <td onClick={focusInput}><input className="grade-cell-input" type="number" min={1} max={10} value={row.assignment ?? ""} disabled={disabled} onChange={(event) => updateRow(row.id, "assignment", event.target.value)} aria-label={`${row.name}の課題`} /></td>
              <td>{score == null ? "—" : `${score}点`}</td><td>{score == null ? "—" : <GradePill score={score} />}</td>
            </tr>;
          })}</tbody>
        </table>
      </section>
      <footer className="staff-grade-actions">
        <button className="staff-green-button" type="button" onClick={() => showMessage(missingCount ? formatMissingEditableGrades(draftRows) : "未入力の成績はありません。", missingCount > 0)} disabled={isFinalized}>未入力チェック</button>
        <div>{isFinalized ? <button className="staff-green-button" type="button" onClick={() => setUnlockModalOpen(true)}>確定解除</button> : <><button className="staff-white-button" type="button" onClick={save}>保存</button><button className="staff-green-button" type="button" onClick={() => setConfirmationModalOpen(true)}>確定</button></>}</div>
      </footer>
      {message && <p className={`staff-grade-message${messageIsError ? " is-error" : ""}`} role={messageIsError ? "alert" : "status"}>{message}</p>}
    </main>
    {weightModalOpen && <WeightModal weights={weights} onConfirm={saveWeights} onClose={() => setWeightModalOpen(false)} />}
    {csvModalOpen && <CsvImportModal onClose={() => setCsvModalOpen(false)} />}
    {confirmationModalOpen && <ConfirmationModal year={String(data.year.year)} term={data.term.label} onClose={() => setConfirmationModalOpen(false)} onConfirm={confirm} />}
    {unlockModalOpen && <GradeUnlockModal onClose={() => setUnlockModalOpen(false)} onConfirm={unlock} />}
  </>;
}

export function StaffGradeMobile({ data }: Readonly<{ data: TeacherGradeEntryResponse }>) {
  return <main className="staff-grade-mobile-page"><header className="staff-grade-mobile-header"><div className="staff-mobile-breadcrumb" aria-label="パンくずリスト"><span><Link href="/staff">ホーム</Link><b aria-hidden="true">›</b></span><span><Link href="/staff/courses">担当科目</Link><b aria-hidden="true">›</b></span><span className="is-active">成績一覧</span></div><h1>科目・{data.subject.name}</h1></header><section className="staff-grade-mobile-table-shell" aria-label={`${data.subject.name}成績一覧`}><div className="staff-grade-mobile-table-scroll"><table className="staff-grade-table staff-grade-mobile-table"><thead><tr><th>ステータス</th><th>学籍</th><th>氏名</th><th>出席率(〇%)</th><th>授業態度(1~10)</th><th>課題(1~10)</th><th>点数</th><th>評価</th></tr></thead><tbody>{data.students.map(({ student, grade, gradeLabel }) => <tr key={student.id}><td>{student.isAttending ? "在籍" : "休学"}</td><td>{student.studentNumber}</td><td>{student.name}</td><td>{grade?.attendance == null ? "—" : `${grade.attendance}%`}</td><td>{grade?.attitude ?? "—"}</td><td>{grade?.assignment ?? "—"}</td><td>{grade?.score ?? "—"}</td><td>{grade?.score == null ? "—" : <GradePill score={grade.score} label={gradeLabel} />}</td></tr>)}</tbody></table></div></section><StaffMobileLogout /></main>;
}
