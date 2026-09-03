"use client";

import Link from "next/link";
import { AppShell } from "@/component/sidebar";
import { StaffMobileYears } from "@/component/staff-mobile";
import { getStaffHistory } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const state = useRpc(() => getStaffHistory(), []);
  const years = state.data?.years ?? [];
  const labels = years.map((year) => `${year.year}年度`);
  return <AppShell currentPage="histories"><RpcStateMessage loading={state.loading} error={state.error} />{!state.error && <><header className="staff-breadcrumb"><span>ホーム</span><b>›</b><span>過去の成績一覧</span></header><div className="desktop-content staff-years-content"><h1>過去の成績</h1><div className="staff-year-grid">{years.map((year) => <Link href={`/staff/students?yearId=${year.id}`} className="staff-year-card" key={year.id}>{year.year}年度</Link>)}</div></div><div className="mobile-only"><StaffMobileYears years={labels} /></div></>}</AppShell>;
}
