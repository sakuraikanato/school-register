import { StaffGradeMobile, StaffGradeScreen } from "@/component/staff-grade-screen";

export default function Page() {
  return <><div className="staff-grade-desktop"><StaffGradeScreen /></div><div className="mobile-only"><StaffGradeMobile /></div></>;
}
