"use client"
import Image from "next/image"
import type { category } from "@/utils/category_data"
import { categories } from "@/utils/category_data"
import { useRouter } from "next/navigation"

const logout = {
  svgPath: "/logout.png",
  text: "ログアウト",
  fontSize: 24
}

interface Props {
  current_page: "home" | "students" | "histories" | "courses" | "csv"
}

export function SideBar({ current_page }: Props) {
  const router = useRouter()

  return (
    <div className="bg-white h-full w-1/3 max-w-90 rounded-r-2xl border border-black">
      <div className="h-[calc(100%-120px)] w-full pt-20">
        <div className="h-90 w-50 mx-auto flex flex-col justify-between">
          {categories.map((category) => (
            <div key={category.id} className="w-full flex items-center group" onClick={() => router.push(category.url)}>
              <Image src={category.svgPath} alt="icon" width={35} height={35}></Image>
              <div style={{fontSize: category.fontSize, color: current_page == category.id ? "#001088" : "#000" }} className="w-ful group-hover:text-[#001088] group-hover:underline font-medium ml-2">{category.text}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-30 w-full flex flex-col justify-center border-t border-black">
        <div className="w-fit mx-auto flex">
          <Image src={logout.svgPath} alt="" width={35} height={35} className="h-8.75"></Image>
          <div style={{fontSize: logout.fontSize}} className="text-black">{logout.text}</div>
        </div>
      </div>
    </div>
  )
}