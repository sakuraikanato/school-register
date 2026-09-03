import { GradeEditor, MobileGradeSheet } from "@/component/grade-ui";
import { AppShell } from "@/component/sidebar";

export default function Page() {
  return <AppShell currentPage="courses" role="teacher"><header className="page-header compact"><div><span className="eyebrow">担当科目 / Webデザイン</span><h1>成績入力</h1><p>保存はできますが、未入力項目がある場合は警告を表示します。</p></div><span className="role-chip">講師</span></header><div className="desktop-content"><GradeEditor /></div><div className="mobile-only"><MobileGradeSheet title="Webデザイン 成績表" /></div></AppShell>;
}
