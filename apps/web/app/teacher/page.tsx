"use client";

import Link from "next/link";
import { AppShell, MobileTeacherLogout } from "@/component/sidebar";
import { getDashboard } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const state = useRpc(() => getDashboard(), []);
  const data = state.data && state.data.role === "teacher" ? state.data : null;
  return <AppShell currentPage="home" role="teacher"><RpcStateMessage loading={state.loading} error={state.error} /><header className="teacher-home-title"><h1>{data ? `ようこそ　${data.me.name} 先生` : "ようこそ"}</h1></header><div className="teacher-home-content"><h2>担当科目</h2><div className="teacher-subject-list">{data?.subjects.map((subject) => <Link className="teacher-subject-card" href={`/teacher/grade-list?subjectId=${subject.id}`} key={subject.id}><span><strong>{subject.name}</strong><small>{data.year.year}年度/{data.term.label}</small></span><b aria-hidden="true">›</b></Link>)}{data && data.subjects.length === 0 && <p className="rpc-state-message">担当科目はありません。</p>}{!data && !state.loading && <p className="rpc-state-message">担当科目を取得できませんでした。</p>}</div></div><MobileTeacherLogout /></AppShell>;
}
