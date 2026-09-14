"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/component/sidebar";
import { StaffMobileStudents } from "@/component/staff-mobile";
import { getStaffStudents } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const [search, setSearch] = useState("");
  const state = useRpc(() => getStaffStudents({ search }), [search]);
  const students = state.data?.students ?? [];
  const mobileStudents = students.map((student) => ({ number: student.studentNumber, name: student.name, href: `/staff/grade-sheet?studentId=${student.id}` }));
  return (
  <AppShell currentPage="students">
    <RpcStateMessage loading={state.loading} error={state.error} />
    {!state.error && 
    <>
    <header className="staff-breadcrumb">
      <Link href="/staff">ホーム</Link>
      <b>›</b>
      <span>全生徒の成績一覧</span>
      </header>
      <div className="desktop-content staff-students-content">
        <label className="staff-search"><span aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="（学籍番号・名前）" aria-label="学籍番号・名前で検索" />
        </label>
        <div className="staff-student-grid">
          {
          students.map((student) => <Link href={`/staff/grade-sheet?studentId=${student.id}`} className="staff-student-card" key={student.id}>
          <span>{student.studentNumber}</span>
          <strong>{student.name}</strong></Link>)
          }
        </div></div><div className="mobile-only"><StaffMobileStudents students={mobileStudents} /></div></>}</AppShell>;
  )
}
