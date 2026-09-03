import { MobileGradeSheet } from "@/component/grade-ui";
import { StaffGradebookScreen } from "@/component/staff-gradebook-screen";

export default function StaffGradebookPage() {
  return <><div className="staff-gradebook-desktop"><StaffGradebookScreen /></div><div className="mobile-only"><MobileGradeSheet title="斎藤 太郎 成績表" /></div></>;
}
