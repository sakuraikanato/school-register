"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StaffOptionCard } from "@/component/cards";
import { AppShell } from "@/component/sidebar";
import { StaffMobileList } from "@/component/staff-mobile";
import { getDashboard } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

function Content() {
  const params = useSearchParams();
  const courseId = Number(params.get("courseId") ?? 0);
  const state = useRpc(() => getDashboard(), []);
  const data = state.data && state.data.role === "staff" ? state.data : null;
  const course = data?.courses.find((item) => item.id === courseId) ?? data?.courses[0];
  const subjects = data?.subjects.filter((item) => !course || item.courseId === course.id) ?? [];
  const options = subjects.map((subject) => ({ href: `/staff/grades?subjectId=${subject.id}`, title: subject.name }));
  return <AppShell currentPage="courses"><RpcStateMessage loading={state.loading} error={state.error} />{data && course && <><header className="staff-breadcrumb"><span>ホーム</span><b>›</b><span>科目一覧</span><b>›</b><span>{course.name}</span></header><div className="desktop-content staff-subjects-content"><h1>{course.name}</h1><div className="staff-option-list">{options.map((option) => <StaffOptionCard key={option.href} {...option} />)}</div></div><div className="mobile-only"><StaffMobileList breadcrumb={["ホーム", "科目一覧", course.name]} heading={course.name} options={options} /></div></>}</AppShell>;
}
export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><Content /></Suspense>; }
