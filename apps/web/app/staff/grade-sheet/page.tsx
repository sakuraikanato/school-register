"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileGradeSheet } from "@/component/grade-ui";
import { StaffGradebookScreen } from "@/component/staff-gradebook-screen";
import { RoleGate } from "@/component/sidebar";
import { getStaffGradeSheet } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

const parseYearId = (value: string | null) => {
  const yearId = Number(value);
  return Number.isSafeInteger(yearId) && yearId > 0 ? yearId : undefined;
};

const parseTerm = (value: string | null): "first" | "second" | undefined => value === "first" || value === "second" ? value : undefined;

function Content() {
  const params = useSearchParams();
  const router = useRouter();
  const studentId = Number(params.get("studentId") ?? 0);
  const yearId = parseYearId(params.get("yearId"));
  const termQuery = parseTerm(params.get("term"));
  const studentNumber = params.get("studentNumber")?.trim() || undefined;
  const state = useRpc(() => studentId ? getStaffGradeSheet(studentId, { yearId, term: termQuery, studentNumber }) : Promise.reject(new Error("生徒を選択してください")), [studentId, yearId, termQuery, studentNumber]);
  const data = state.data;
  const term = data?.terms.find((item) => item.value === data.term.value) ?? data?.terms[0];
  const historyOptions = data?.history.flatMap((item) => data.terms.map((itemTerm) => ({
    value: `${item.yearId}:${itemTerm.value}`,
    label: `${item.year}・${itemTerm.label}`,
  }))) ?? [];
  const historyValue = data ? `${data.year.id}:${data.term.value}` : "";
  const changeHistory = (value: string) => {
    if (!data) return;
    const [nextYearId, nextTerm] = value.split(":");
    if (!nextYearId || (nextTerm !== "first" && nextTerm !== "second")) return;
    const nextStudentNumber = studentNumber ?? data.student.studentNumber;
    router.replace(`/staff/grade-sheet?studentId=${studentId}&studentNumber=${encodeURIComponent(nextStudentNumber)}&yearId=${nextYearId}&term=${nextTerm}`);
  };
  return <><RpcStateMessage loading={state.loading} error={state.error} />{data && term && <><div className="staff-gradebook-desktop"><StaffGradebookScreen data={data} historyOptions={historyOptions} historyValue={historyValue} onHistoryChange={changeHistory} /></div><div className="mobile-only"><MobileGradeSheet title={`${data.student.name} 成績表`} student={data.student} subjects={term.subjects} yearLabel={`${data.year.year}年度`} termLabel={term.label} historyOptions={historyOptions} historyValue={historyValue} onHistoryChange={changeHistory} /></div></>}</>;
}
export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><RoleGate role="staff"><Content /></RoleGate></Suspense>; }
