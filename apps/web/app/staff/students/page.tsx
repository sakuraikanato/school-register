import { SideBar } from "@/component/sidebar";

export default function Page() {
  return (
    <div className="bg-[#FEFFF6] h-screen flex">
      <SideBar current_page="students"></SideBar>
    </div>
  )
}