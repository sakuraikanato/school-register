"use client";

import { useState } from "react";
import { GradeTable, type GradeRow } from "@/component/grade-ui";
import { ConfirmationModal } from "@/component/modals";
import { AppShell } from "@/component/sidebar";
import { finalizeStaffSubject, getStaffFinalization, getTeacherGradeEntry } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const finalization = useRpc(() => getStaffFinalization(), []);
  const subjects = finalization.data?.subjects ?? [];
  const selected = subjects[0];
  const entry = useRpc(() => selected ? getTeacherGradeEntry(selected.id) : Promise.reject(new Error("確定対象の科目がありません")), [selected?.id]);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const rows: GradeRow[] = entry.data?.students.map(({ student, grade, gradeLabel }) => ({ id: student.id, number: student.studentNumber, name: student.name, status: student.isAttending ? "在籍" : "休学", attendance: grade?.attendance ?? 0, attitude: grade?.attitude ?? 0, assignment: grade?.assignment ?? 0, score: grade?.score ?? null, gradeLabel })) ?? [];
  const confirm = async () => { if (!selected) return; try { await finalizeStaffSubject(selected.id, {}); setMessage("成績を確定しました。"); } catch (error) { setMessage(error instanceof Error ? error.message : "成績の確定に失敗しました"); } };
  return <AppShell currentPage="courses"><RpcStateMessage loading={finalization.loading || entry.loading} error={finalization.error ?? entry.error} />{selected && entry.data && <><header className="page-header compact"><div><span className="eyebrow">{finalization.data?.year.year}年度・{finalization.data?.term.label}</span><h1>成績確定</h1><p>未入力の成績を確認してから、学期の成績を確定します。</p></div><span className={`status ${selected.canFinalize ? "confirmed-status" : "alert-status"}`}>{selected.canFinalize ? "入力完了" : `要確認 ${selected.missingCount}件`}</span></header><div className="desktop-content"><section className="finalization-callout"><div><span className="eyebrow">確認事項</span><h2>{selected.name}の入力状況</h2><p>{selected.canFinalize ? "在籍中の生徒すべてに成績が入力されています。" : "未入力の成績があります。内容を確認してください。"}</p></div><button className="primary-button" type="button" disabled={!selected.canFinalize} onClick={() => setConfirmationModalOpen(true)}>成績を確定</button></section>{message && <p className="entry-message" role="status">{message}</p>}<section className="table-section"><div className="table-heading"><div><h2>{selected.name}</h2><span>担当：{selected.teacherName}</span></div><span className="status">入力済み {selected.enteredCount}/{selected.studentCount}</span></div><GradeTable rows={rows} subject={selected.name} yearLabel={`${finalization.data?.year.year}年度`} termLabel={finalization.data?.term.label ?? ""} /></section></div><div className="mobile-only" /></>}{confirmationModalOpen && <ConfirmationModal onClose={() => setConfirmationModalOpen(false)} onConfirm={confirm} />}</AppShell>;
}
