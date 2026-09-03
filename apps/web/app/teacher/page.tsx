"use client";

import Link from "next/link";
import { AppShell, MobileTeacherLogout } from "@/component/sidebar";
import { getDashboard } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const state = useRpc(() => getDashboard(), []);
  const data = state.data && state.data.role === "teacher" ? state.data : null;
  return <AppShell currentPage="home" role="teacher"><RpcStateMessage loading={state.loading} error={state.error} />{data && <><header className="teacher-home-title"><h1>ようこそ　{data.me.name} 先生</h1></header><div className="teacher-home-content"><h2>担当科目</h2><div className="teacher-subject-list">{data.subjects.map((subject) => <Link className="teacher-subject-card" href={`/teacher/grade-list?subjectId=${subject.id}`} key={subject.id}><span><strong>{subject.name}</strong><small>{data.year.year}年度/{data.term.label}</small></span><b aria-hidden="true">›</b></Link>)}</div></div><MobileTeacherLogout /></>}</AppShell>;
}
