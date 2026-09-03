"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TeacherGradesScreen, TeacherMobileGradesScreen } from "@/component/teacher-grades-screen";
import { getDashboard, getTeacherGradeEntry } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

function Content() {
  const params = useSearchParams();
  const dashboard = useRpc(() => getDashboard(), []);
  const subjectId = Number(params.get("subjectId") ?? (dashboard.data && dashboard.data.role === "teacher" ? dashboard.data.subjects[0]?.id : 0));
  const entry = useRpc(() => subjectId ? getTeacherGradeEntry(subjectId) : Promise.reject(new Error("担当科目がありません")), [subjectId]);
  return <>{(dashboard.loading || entry.loading) && <RpcStateMessage loading error={null} />}{(dashboard.error || entry.error) && <RpcStateMessage loading={false} error={dashboard.error ?? entry.error} />}{entry.data && <><div className="teacher-grades-desktop"><TeacherGradesScreen data={entry.data} /></div><div className="teacher-grades-mobile"><TeacherMobileGradesScreen data={entry.data} /></div></>}</>;
}

export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><Content /></Suspense>; }
