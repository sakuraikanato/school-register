"use client"

import Image from "next/image"
import { SideBar } from "@/component/sidebar"
import { Card, CardList } from "@/component/cards"
import { categories } from "@/utils/category_data"

interface teacher {
  id: number,
  name: string,
  nameHiragana: string,
  email: string,
  age: number,
  gender: "男" | "女" | "その他",
  isPasswordChanged: boolean,
  role: "teacher" | "staff",
  year_id: number,
}

const teacher: teacher = {
  id: 1,
  name: "田中太郎",
  nameHiragana: "たなかたろう",
  email: "example@example.com",
  age: 30,
  gender: "男",
  isPasswordChanged: true,
  role: "staff",
  year_id: 1
}

export default function Page() {

  return (
    <div className="bg-[#FEFFF6] h-screen flex">
      <SideBar current_page="home"></SideBar>
      <div className="h-full w-full flex flex-col justify-between p-14 pt-18">
        <div className="text-black font-bold text-[24px]">ようこそ {teacher.name} 先生</div>
        <div className="text-black text-2xl">使用機能</div>
        <CardList>
          {categories.slice(1).map((category) => (
            <Card key={category.id} href={category.url}>{category.text}</Card>
          ))}
        </CardList>
      </div>
    </div>
  )
}