import { StaffOptionCard } from "@/component/cards";
import { CsvImportTrigger } from "@/component/modals";
import { AppShell } from "@/component/sidebar";
import { StaffMobileHome } from "@/component/staff-mobile";

export default function Page() {
  return (
    <AppShell currentPage="home">
      <header className="staff-page-title staff-home-title"><h1>ようこそ　田中太郎 先生</h1></header>
      <div className="desktop-content staff-home-content">
        <h2>仕様機能</h2>
        <div className="staff-option-list">
          <StaffOptionCard href="/staff/students" title="全生徒の成績一覧" />
          <StaffOptionCard href="/staff/histories" title="過去の成績一覧" />
          <StaffOptionCard href="/staff/courses" title="科目成績一覧" />
          <CsvImportTrigger className="staff-option-card"><span>CSV読み込み</span><span className="staff-option-arrow" aria-hidden="true">›</span></CsvImportTrigger>
        </div>
      </div>
      <div className="mobile-only"><StaffMobileHome /></div>
    </AppShell>
  );
}
