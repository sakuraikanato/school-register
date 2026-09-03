import { TeacherGradesScreen, TeacherMobileGradesScreen } from "@/component/teacher-grades-screen";

export default function Page() {
  return <><div className="teacher-grades-desktop"><TeacherGradesScreen /></div><div className="teacher-grades-mobile"><TeacherMobileGradesScreen /></div></>;
}
