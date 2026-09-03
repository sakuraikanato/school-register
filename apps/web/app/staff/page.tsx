"use client";

import { StaffOptionCard } from "@/component/cards";
import { CsvImportTrigger } from "@/component/modals";
import { AppShell } from "@/component/sidebar";
import { StaffMobileHome } from "@/component/staff-mobile";
import { getDashboard } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const state = useRpc(() => getDashboard(), []);
  const data = state.data && state.data.role === "staff" ? state.data : null;
  return <AppShell currentPage="home"><RpcStateMessage loading={state.loading} error={state.error} />{data && <><header className="staff-page-title staff-home-title"><h1>ようこそ　{data.me.name} 先生</h1></header><div className="desktop-content staff-home-content"><h2>仕様機能</h2><div className="staff-option-list"><StaffOptionCard href="/staff/students" title="全生徒の成績一覧" /><StaffOptionCard href="/staff/histories" title="過去の成績一覧" /><StaffOptionCard href="/staff/courses" title="科目成績一覧" /><CsvImportTrigger className="staff-option-card"><span>CSV読み込み</span><span className="staff-option-arrow" aria-hidden="true">›</span></CsvImportTrigger></div></div><div className="mobile-only"><StaffMobileHome userName={data.me.name} /></div></>}</AppShell>;
}
