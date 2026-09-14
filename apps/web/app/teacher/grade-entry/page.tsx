"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DeveloperGradePeriodControls } from "@/component/developer-grade-period";
import { GradeEditor } from "@/component/grade-ui";
import { AppShell } from "@/component/sidebar";
import { NotFoundView } from "@/component/not-found-view";
import { getDashboard, getTeacherGradeEntry, type ScreenQuery } from "@/utils/client";
import { isDeveloperMode, type DeveloperGradePeriod } from "@/utils/developer-mode";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

const parseYearId = (value: string | null) => {
  const yearId = Number(value);
  return Number.isSafeInteger(yearId) && yearId > 0 ? yearId : undefined;
};

const parseTerm = (value: string | null): DeveloperGradePeriod["term"] | undefined => value === "first" || value === "second" ? value : undefined;

function Content() {
  const params = useSearchParams();
  const dashboard = useRpc(() => getDashboard(), []);
  const subjectId = Number(params.get("subjectId") ?? (dashboard.data && dashboard.data.role === "teacher" ? dashboard.data.subjects[0]?.id : 0));
  const query: ScreenQuery = isDeveloperMode ? { yearId: parseYearId(params.get("yearId")), term: parseTerm(params.get("term")) } : {};
  const entry = useRpc(() => subjectId ? getTeacherGradeEntry(subjectId, query) : Promise.reject(new Error("担当科目がありません")), [subjectId, query.yearId, query.term]);
  const period = entry.data ? { yearId: query.yearId ?? entry.data.year.id, term: query.term ?? (entry.data.term.label === "前期" ? "first" : "second") } : null;
  const data = entry.data;
  if (entry.status === 404) return <NotFoundView />;
  return <AppShell currentPage="courses" role="teacher"><RpcStateMessage loading={dashboard.loading || entry.loading} error={dashboard.error ?? entry.error} />{data && <><header className="page-header compact"><div><span className="eyebrow">担当科目 / {data.subject.name}</span><h1>成績入力</h1><p>保存はできますが、未入力項目がある場合は警告を表示します。</p></div><span className="role-chip">講師</span></header><div className="desktop-content">{isDeveloperMode && <DeveloperGradePeriodControls subjectId={subjectId} value={period!} />}<GradeEditor key={`${subjectId}-${period!.yearId}-${period!.term}`} data={data} subjectId={subjectId} query={query} /></div></>}</AppShell>;
}

export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><Content /></Suspense>; }
