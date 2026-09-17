"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DeveloperGradePeriodControls } from "@/component/developer-grade-period";
import { StaffGradeMobile, StaffGradeScreen } from "@/component/staff-grade-screen";
import { RoleGate } from "@/component/sidebar";
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
  const subjectId = Number(params.get("subjectId") ?? (dashboard.data && dashboard.data.role === "staff" ? dashboard.data.subjects[0]?.id : 0));
  const query: ScreenQuery = isDeveloperMode ? { yearId: parseYearId(params.get("yearId")), term: parseTerm(params.get("term")) } : {};
  const entry = useRpc(() => subjectId ? getTeacherGradeEntry(subjectId, query) : Promise.reject(new Error("科目がありません")), [subjectId, query.yearId, query.term]);
  if (dashboard.data?.role === "teacher") return <NotFoundView />;
  const period = entry.data ? { yearId: query.yearId ?? entry.data.year.id, term: query.term ?? (entry.data.term.label === "前期" ? "first" : "second") } : null;
  return <>{(dashboard.loading || entry.loading) && <RpcStateMessage loading error={null} />}{(dashboard.error || entry.error) && <RpcStateMessage loading={false} error={dashboard.error ?? entry.error} />}{entry.data && <><div className={`staff-grade-desktop${isDeveloperMode ? " developer-grade-mode" : ""}`}>{isDeveloperMode && <DeveloperGradePeriodControls subjectId={subjectId} value={period!} />}<StaffGradeScreen key={`${subjectId}-${period!.yearId}-${period!.term}`} data={entry.data} subjectId={subjectId} query={query} /></div><div className="mobile-only"><StaffGradeMobile data={entry.data} /></div></>}</>;
}
export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><RoleGate role="staff"><Content /></RoleGate></Suspense>; }
