"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/component/sidebar";
import { StaffMobileStudents } from "@/component/staff-mobile";
import { getStaffStudents } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

const parseYearId = (value: string | null) => {
  const yearId = Number(value);
  return Number.isSafeInteger(yearId) && yearId > 0 ? yearId : undefined;
};

function Content() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const yearId = parseYearId(params.get("yearId"));
  const state = useRpc(() => getStaffStudents({ search, yearId }), [search, yearId]);
  const students = state.data?.students ?? [];
  const selectedYearId = state.data?.year.id ?? yearId;
  const yearSuffix = selectedYearId ? `&yearId=${selectedYearId}` : "";
  const studentPath = (student: { id: number; studentNumber: string }) => `/staff/grade-sheet?studentId=${student.id}&studentNumber=${encodeURIComponent(student.studentNumber)}${yearSuffix}`;
  const mobileStudents = students.map((student) => ({ number: student.studentNumber, name: student.name, href: studentPath(student) }));
  return <AppShell currentPage="students"><RpcStateMessage loading={state.loading} error={state.error} />{!state.error && <><header className="staff-breadcrumb"><Link href="/staff">ホーム</Link><b>›</b><span>全生徒の成績一覧</span></header><div className="desktop-content staff-students-content"><label className="staff-search"><span aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="（学籍番号・名前）" aria-label="学籍番号・名前で検索" /></label><div className="staff-student-grid">{students.map((student) => <Link href={studentPath(student)} className="staff-student-card" key={student.id}><span>{student.studentNumber}</span><strong>{student.name}</strong></Link>)}</div></div><div className="mobile-only"><StaffMobileStudents students={mobileStudents} /></div></>}</AppShell>;
}

export default function Page() { return <Suspense fallback={<p className="rpc-state-message">読み込み中...</p>}><Content /></Suspense>; }
