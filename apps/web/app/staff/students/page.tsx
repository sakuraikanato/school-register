import { AppShell } from "@/component/sidebar";
import { StaffMobileStudents } from "@/component/staff-mobile";
import Link from "next/link";

const students = [
  ["24001", "斉藤太郎"],
  ["24002", "斉藤太郎"],
  ["24003", "斉藤太郎"],
  ["24004", "斉藤太郎"],
  ["24005", "斉藤太郎"],
  ["24006", "斉藤太郎"],
] as const;

export default function Page() {
  return (
    <AppShell currentPage="students">
      <header className="staff-breadcrumb"><span>ホーム</span><b>›</b><span>全生徒の成績一覧</span></header>
      <div className="desktop-content staff-students-content">
        <label className="staff-search"><span aria-hidden="true" /><input placeholder="(学籍・氏名)" /></label>
        <div className="staff-student-grid">
          {students.map(([number, name]) => <Link href="/staff/grade-sheet" className="staff-student-card" key={number}><span>学籍番号</span><strong>{name}</strong></Link>)}
        </div>
      </div>
      <div className="mobile-only"><StaffMobileStudents students={students.map(([number, name]) => ({ number, name, href: "/staff/grade-sheet" }))} /></div>
    </AppShell>
  );
}
