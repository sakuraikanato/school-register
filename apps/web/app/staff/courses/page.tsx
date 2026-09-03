"use client";

import { StaffOptionCard } from "@/component/cards";
import { AppShell } from "@/component/sidebar";
import { StaffMobileList } from "@/component/staff-mobile";
import { getDashboard } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const state = useRpc(() => getDashboard(), []);
  const courses = state.data && state.data.role === "staff" ? state.data.courses : [];
  const options = courses.map((course) => ({ href: `/staff/subjects?courseId=${course.id}`, title: course.name }));
  return <AppShell currentPage="courses"><RpcStateMessage loading={state.loading} error={state.error} />{!state.loading && !state.error && <><div className="desktop-content staff-courses-content"><h1>コース一覧</h1><div className="staff-option-list">{options.map((option) => <StaffOptionCard key={option.href} {...option} />)}</div></div><div className="mobile-only"><StaffMobileList breadcrumb={["ホーム", "科目一覧"]} heading="コース一覧" options={options} /></div></>}</AppShell>;
}
