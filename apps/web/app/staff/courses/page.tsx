import { StaffOptionCard } from "@/component/cards";
import { AppShell } from "@/component/sidebar";
import { StaffMobileList } from "@/component/staff-mobile";

export default function Page() {
  return (
    <AppShell currentPage="courses">
      <div className="desktop-content staff-courses-content">
        <h1>コース一覧</h1>
        <div className="staff-option-list">
          <StaffOptionCard href="/staff/subjects" title="Webデザイン" />
          <StaffOptionCard href="/staff/subjects" title="システムエンジニア" />
        </div>
      </div>
      <div className="mobile-only"><StaffMobileList breadcrumb={["ホーム", "科目一覧"]} heading="コース一覧" options={[{ href: "/staff/subjects", title: "Webデザイン" }, { href: "/staff/subjects", title: "システムエンジニア" }]} /></div>
    </AppShell>
  );
}
