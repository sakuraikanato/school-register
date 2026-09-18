"use client";

import { useState } from "react";
import { editableGradeRows, formatMissingEditableGrades, GradeTable, type GradeRow } from "@/component/grade-ui";
import { ConfirmationModal, GradeUnlockModal } from "@/component/modals";
import { AppShell } from "@/component/sidebar";
import { finalizeStaffSubject, getStaffFinalization, getTeacherGradeEntry, unlockStaffSubject } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const finalization = useRpc(() => getStaffFinalization(), []);
  const subjects = finalization.data?.subjects ?? [];
  const selected = subjects[0];
  const entry = useRpc(() => selected ? getTeacherGradeEntry(selected.id) : Promise.reject(new Error("確定対象の科目がありません")), [selected?.id]);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const rows: GradeRow[] = entry.data?.students.map(({ student, grade, gradeLabel }) => ({ id: student.id, number: student.studentNumber, name: student.name, status: student.isAttending ? "在籍" : "休学", attendance: grade?.attendance ?? 0, attitude: grade?.attitude ?? 0, assignment: grade?.assignment ?? 0, score: grade?.score ?? null, gradeLabel })) ?? [];
  const missingMessage = entry.data ? formatMissingEditableGrades(editableGradeRows(entry.data)) : "";
  const isFinalized = !unlocked && Boolean(selected?.isFinalized || confirmed);
  const canFinalize = unlocked ? Boolean(selected && selected.enteredCount === selected.studentCount) : Boolean(selected?.canFinalize);
  const confirm = async () => { if (!selected || isFinalized) return; try { await finalizeStaffSubject(selected.id, {}); setConfirmed(true); setConfirmationModalOpen(false); setMessage("成績を確定しました。"); } catch (error) { setMessage(error instanceof Error ? error.message : "成績の確定に失敗しました"); } };
  const unlock = async () => { if (!selected || !isFinalized) return; try { await unlockStaffSubject(selected.id, {}); setUnlocked(true); setConfirmed(false); setUnlockModalOpen(false); setMessage("成績の確定を解除しました。修正後に再度確定してください。"); } catch (error) { setMessage(error instanceof Error ? error.message : "成績の確定解除に失敗しました"); } };
  return <AppShell currentPage="courses"><RpcStateMessage loading={finalization.loading || entry.loading} error={finalization.error ?? entry.error} />{selected && entry.data && <><header className="page-header compact"><div><span className="eyebrow">{finalization.data?.year.year}年度・{finalization.data?.term.label}</span><h1>成績確定</h1><p>未入力の成績を確認してから、学期の成績を確定します。</p></div><span className={`status ${isFinalized ? "confirmed-status" : canFinalize ? "confirmed-status" : "alert-status"}`}>{isFinalized ? "確定済み" : canFinalize ? "入力完了" : `要確認 ${selected.missingCount}件`}</span></header><div className="desktop-content"><section className="finalization-callout"><div><span className="eyebrow">確認事項</span><h2>{selected.name}の入力状況</h2><p>{isFinalized ? "この学期の成績は確定済みです。確定解除後に修正できます。" : canFinalize ? "在籍中の生徒すべてに成績が入力されています。" : "未入力の成績があります。内容を確認してください。"}</p>{!isFinalized && missingMessage && <p className="entry-message finalization-error" role="alert">{missingMessage}</p>}</div>{isFinalized ? <button className="primary-button" type="button" onClick={() => setUnlockModalOpen(true)}>確定解除</button> : <button className="primary-button" type="button" disabled={!canFinalize} onClick={() => setConfirmationModalOpen(true)}>成績を確定</button>}</section>{message && <p className="entry-message" role="status">{message}</p>}<section className="table-section"><div className="table-heading"><div><h2>{selected.name}</h2><span>担当：{selected.teacherName}</span></div><span className="status">入力済み {selected.enteredCount}/{selected.studentCount}</span></div><GradeTable rows={rows} subject={selected.name} yearLabel={`${finalization.data?.year.year}年度`} termLabel={finalization.data?.term.label ?? ""} /></section></div><div className="mobile-only" /></>}{confirmationModalOpen && finalization.data && <ConfirmationModal year={String(finalization.data.year.year)} term={finalization.data.term.label} onClose={() => setConfirmationModalOpen(false)} onConfirm={confirm} />}{unlockModalOpen && <GradeUnlockModal onClose={() => setUnlockModalOpen(false)} onConfirm={unlock} />}</AppShell>;
}
