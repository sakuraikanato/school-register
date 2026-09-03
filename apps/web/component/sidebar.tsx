"use client";

import Link from "next/link";
import { useState } from "react";
import { CsvImportTrigger, LogoutModal } from "@/component/modals";

type PageName = "home" | "entry" | "list" | "students" | "histories" | "courses" | "csv" | "web" | "uiux" | "javascript";
type Role = "staff" | "teacher";

type SideBarProps = {
  currentPage: PageName;
  role?: Role;
};

const navigation = (role: Role) => {
  if (role === "teacher") {
    return [
      { id: "home" as const, label: "ホーム", href: "/teacher", icon: "home" },
      { id: "web" as const, label: "Webデザイン", href: "/teacher/grade-list?subject=Webデザイン", icon: "sheet" },
      { id: "uiux" as const, label: "UI/UXデザイン", href: "/teacher/grade-list?subject=UI/UXデザイン", icon: "sheet" },
      { id: "javascript" as const, label: "JavaScript", href: "/teacher/grade-list?subject=JavaScript", icon: "sheet" },
    ];
  }
  return [
    { id: "home" as const, label: "ホーム", href: role === "staff" ? "/staff" : "/teacher", icon: "home" },
    { id: "students" as const, label: "全生徒の成績一覧", href: "/staff/students", icon: "sheet" },
    { id: "histories" as const, label: "過去の成績一覧", href: "/staff/histories", icon: "sheet" },
    { id: "courses" as const, label: "科目成績一覧", href: "/staff/courses", icon: "sheet" },
    { id: "csv" as const, label: "CSV読み込み", href: "/staff/csv-import", icon: "folder" },
  ];
};

function Icon({ name }: { name: string }) {
  if (name === "home") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg>;
  }
  if (name === "edit") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h11l5 5v11H4V4Zm11 0v5h5M8 14h8M8 17h5" /></svg>;
  }
  if (name === "logout") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H4v16h6M14 8l4 4-4 4M18 12H8" /></svg>;
  }
  if (name === "logout-mobile") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10M8.5 6.5A8 8 0 1 0 15.5 6.5" /></svg>;
  }
  if (name === "folder") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h6l2 2h10v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6" /></svg>;
}

export function SideBar({ currentPage, role = "staff" }: SideBarProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      <aside className="sidebar" aria-label="メインメニュー">
        <div className="sidebar-brand">
          <span className="brand-mark">S</span>
          <div><strong>sansan学園</strong><span>{role === "staff" ? "専任職員" : "講師"}</span></div>
        </div>
        <nav className="sidebar-nav">
          {navigation(role).map((item) => (
            item.id === "csv"
              ? <CsvImportTrigger className={`sidebar-link ${currentPage === item.id ? "is-active" : ""}`} key={item.id}><Icon name={item.icon} /><span>{item.label}</span></CsvImportTrigger>
              : <Link className={`sidebar-link ${currentPage === item.id ? "is-active" : ""}`} href={item.href} key={item.id}><Icon name={item.icon} /><span>{item.label}</span></Link>
          ))}
        </nav>
        <button className="sidebar-link logout-link" type="button" onClick={() => setLogoutOpen(true)}><Icon name="logout" /><span>ログアウト</span></button>
      </aside>
      {logoutOpen && <LogoutModal onClose={() => setLogoutOpen(false)} />}
    </>
  );
}

/** The compact teacher screens keep navigation deliberately limited to viewing and signing out. */
export function MobileTeacherLogout() {
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      <div className="teacher-mobile-logout">
        <button type="button" onClick={() => setLogoutOpen(true)}>
          <Icon name="logout-mobile" />
          <span>ログアウト</span>
        </button>
      </div>
      {logoutOpen && <LogoutModal onClose={() => setLogoutOpen(false)} />}
    </>
  );
}

export function AppShell({ children, currentPage, role = "staff" }: Readonly<{ children: React.ReactNode; currentPage: PageName; role?: Role }>) {
  return (
    <div className={`app-shell ${role === "staff" ? "staff-shell" : "teacher-shell"}`}>
      <SideBar currentPage={currentPage} role={role} />
      <main className="app-main">
        <div className="mobile-brand"><span className="brand-mark">S</span><span>sansan学園 成績管理</span></div>
        {children}
      </main>
    </div>
  );
}
