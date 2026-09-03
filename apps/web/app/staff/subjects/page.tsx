import { StaffOptionCard } from "@/component/cards";
import { AppShell } from "@/component/sidebar";
import { StaffMobileList } from "@/component/staff-mobile";

export default function Page() {
  return (
    <AppShell currentPage="courses">
      <header className="staff-breadcrumb"><span>ホーム</span><b>›</b><span>科目一覧</span><b>›</b><span>Webデザイン</span></header>
      <div className="desktop-content staff-subjects-content">
        <h1>Webデザイン</h1>
        <div className="staff-option-list">
          <StaffOptionCard href="/staff/grades" title="デザイン基礎" />
          <StaffOptionCard href="/staff/grades" title="UI/UXデザイン" />
          <StaffOptionCard href="/staff/grades" title="Webデザイン" />
          <StaffOptionCard href="/staff/grades" title="HTML/CSSコーディング" />
          <StaffOptionCard href="/staff/grades" title="ポートフォリオ制作" />
        </div>
      </div>
      <div className="mobile-only"><StaffMobileList breadcrumb={["ホーム", "科目一覧", "Webデザイン"]} heading="Webデザイン" options={[{ href: "/staff/grades", title: "デザイン基礎" }, { href: "/staff/grades", title: "UI/UXデザイン" }, { href: "/staff/grades", title: "Webデザイン" }, { href: "/staff/grades", title: "HTML/CSSコーディング" }, { href: "/staff/grades", title: "ポートフォリオ制作" }]} /></div>
    </AppShell>
  );
}
