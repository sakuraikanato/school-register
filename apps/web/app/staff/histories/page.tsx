import { AppShell } from "@/component/sidebar";
import { StaffMobileYears } from "@/component/staff-mobile";
import Link from "next/link";

const years = ["何年度", "何年度", "何年度", "何年度"];

export default function Page() {
  return (
    <AppShell currentPage="histories">
      <header className="staff-breadcrumb"><span>ホーム</span><b>›</b><span>過去の成績一覧</span></header>
      <div className="desktop-content staff-years-content">
        <h1>過去の成績</h1>
        <div className="staff-year-grid">
          {years.map((year, index) => <Link href="/staff/students" className="staff-year-card" key={`${year}-${index}`}>{year}</Link>)}
        </div>
      </div>
      <div className="mobile-only"><StaffMobileYears years={years} /></div>
    </AppShell>
  );
}
