import Link from "next/link";
import { AppShell, MobileTeacherLogout } from "@/component/sidebar";

export default function Page() {
  const subjects = [
    ["Webデザイン", "/teacher/grade-list?subject=Webデザイン"],
    ["UI/UXデザイン", "/teacher/grade-list?subject=UI/UXデザイン"],
    ["JavaScript基礎", "/teacher/grade-list?subject=JavaScript基礎"],
  ] as const;
  return (
    <AppShell currentPage="home" role="teacher">
      <header className="teacher-home-title"><h1>ようこそ　田中太郎 先生</h1></header>
      <div className="teacher-home-content">
        <h2>担当科目</h2>
        <div className="teacher-subject-list">
          {subjects.map(([title, href]) => <Link className="teacher-subject-card" href={href} key={title}><span><strong>{title}</strong><small>〇年生/前期</small></span><b aria-hidden="true">›</b></Link>)}
        </div>
      </div>
      <MobileTeacherLogout />
    </AppShell>
  );
}
