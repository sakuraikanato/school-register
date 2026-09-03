"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MobileGradeSheet } from "@/component/grade-ui";
import { StaffGradebookScreen } from "@/component/staff-gradebook-screen";
import { getStaffGradeSheet } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

function Content() {
  const params = useSearchParams();
  const studentId = Number(params.get("studentId") ?? 0);
  const state = useRpc(() => studentId ? getStaffGradeSheet(studentId) : Promise.reject(new Error("生徒を選択してください")), [studentId]);
  const data = state.data;
  const term = data?.terms.find((item) => item.value === "first") ?? data?.terms[0];
  return <><RpcStateMessage loading={state.loading} error={state.error} />{data && term && <><div className="staff-gradebook-desktop"><StaffGradebookScreen data={data} /></div><div className="mobile-only"><MobileGradeSheet title={`${data.student.name} 成績表`} student={data.student} subjects={term.subjects} yearLabel={`${data.year.year}年度`} termLabel={term.label} /></div></>}</>;
}
export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><Content /></Suspense>; }
