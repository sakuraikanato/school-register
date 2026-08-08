"use client"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface ListProps {
  children: React.ReactNode,
}

interface CardPage {
  href: string,
  children: React.ReactNode
}

export function CardList({ children }: ListProps) {
  return (
    <div className="h-130 w-200 flex flex-col justify-between">
      {children}
    </div>
  )
}

export function Card({ children, href }: CardPage) {
  const router = useRouter();
  return (
    <div
      className="h-22 w-full px-10 bg-white rounded-2xl flex justify-between items-center border border-black"
      onClick={() => router.push(href)}>
      <div className="text-2xl text-black">{children}</div>
      <Image className="h-6 w-5" src="/rightArrow.png" alt="" width={12} height={25}></Image>
    </div>
  )
}