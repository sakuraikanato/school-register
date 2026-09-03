"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GradeEditor } from "@/component/grade-ui";
import { AppShell } from "@/component/sidebar";
import { getDashboard, getTeacherGradeEntry } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

function Content() {
  const params = useSearchParams();
  const dashboard = useRpc(() => getDashboard(), []);
  const subjectId = Number(params.get("subjectId") ?? (dashboard.data && dashboard.data.role === "teacher" ? dashboard.data.subjects[0]?.id : 0));
  const entry = useRpc(() => subjectId ? getTeacherGradeEntry(subjectId) : Promise.reject(new Error("担当科目がありません")), [subjectId]);
  const data = entry.data;
  return <AppShell currentPage="courses" role="teacher"><RpcStateMessage loading={dashboard.loading || entry.loading} error={dashboard.error ?? entry.error} />{data && <><header className="page-header compact"><div><span className="eyebrow">担当科目 / {data.subject.name}</span><h1>成績入力</h1><p>保存はできますが、未入力項目がある場合は警告を表示します。</p></div><span className="role-chip">講師</span></header><div className="desktop-content"><GradeEditor data={data} subjectId={subjectId} /></div></>}</AppShell>;
}

export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><Content /></Suspense>; }
