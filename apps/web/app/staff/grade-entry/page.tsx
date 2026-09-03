import { MobileGradeSheet } from "@/component/grade-ui";
import { StaffGradeScreen } from "@/component/staff-grade-screen";

export default function Page() {
  return <><div className="staff-grade-desktop"><StaffGradeScreen /></div><div className="mobile-only"><MobileGradeSheet title="Webデザイン 成績表" /></div></>;
}
