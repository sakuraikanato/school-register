"use client";

import Link from "next/link";
import { GradeHistorySelect, type GradeHistoryOption } from "@/component/grade-ui";
import type { StaffGradeSheetResponse } from "@/utils/client";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function StaffGradebookScreen({ data, historyOptions = [], historyValue = "", onHistoryChange }: Readonly<{ data: StaffGradeSheetResponse; historyOptions?: readonly GradeHistoryOption[]; historyValue?: string; onHistoryChange?: (value: string) => void }>) {
  const term = data.terms.find((item) => item.value === data.term.value) ?? data.terms[0];
  const subjects = term?.subjects ?? [];
  const yearQuery = `?yearId=${data.year.id}`;

  const printPdf = () => {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    document.title = "";
    window.addEventListener("afterprint", restoreTitle);
    window.print();
  };

  const downloadCsv = () => {
    const rows = [
      ["年度", `${data.year.year}年度`],
      ["学期", data.term.label],
      ["学籍番号", data.student.studentNumber],
      ["氏名", data.student.name],
      ["コース", data.student.courseName],
      ["ステータス", data.student.isAttending ? "在籍" : "休学"],
      [],
      ["授業名", "出席率", "授業態度", "課題", "点数", "評価"],
      ...subjects.map((subject) => [subject.subjectName, `${subject.attendance}%`, subject.attitude, subject.assignment, subject.score, subject.gradeLabel]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = data.print.fileName.replace(/\.pdf$/i, ".csv");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return <main className="staff-gradebook-page"><header className="staff-gradebook-breadcrumb"><Link href="/staff">ホーム</Link><b>›</b><Link href={`/staff/histories${yearQuery}`}>学年一覧</Link><b>›</b><Link href={`/staff/students${yearQuery}`}>生徒一覧</Link><b>›</b><strong>成績一覧(生徒別)</strong></header><section className="staff-gradebook-content"><div className="staff-gradebook-profile-row"><div className="staff-gradebook-profile"><div className="gradebook-id"><strong>学籍番号</strong><span>{data.student.studentNumber}</span></div><div className="gradebook-name"><span>{data.student.name}</span></div><div className="gradebook-details"><span>専攻・{data.student.courseName}</span><span>ステータス・{data.student.isAttending ? "在籍" : "休学"}</span></div></div><div className="staff-gradebook-export-actions"><button className="staff-gradebook-pdf" type="button" onClick={printPdf}>PDF出力</button><button className="staff-gradebook-csv" type="button" onClick={downloadCsv}>CSV出力</button></div></div>{onHistoryChange && historyOptions.length > 0 ? <GradeHistorySelect className="staff-gradebook-history-select" options={historyOptions} value={historyValue} onChange={onHistoryChange} /> : null}<p className="staff-gradebook-term-label">{data.year.year}年度・{data.term.label}</p><section className="staff-gradebook-table-shell"><table className="staff-gradebook-table"><thead><tr><th>授業名</th><th>出席率</th><th>授業態度</th><th>課題</th><th>点数</th><th>評価</th></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.subjectId}><td>{subject.subjectName}</td><td>{subject.attendance}%</td><td>{subject.attitude}</td><td>{subject.assignment}</td><td>{subject.score}</td><td>{subject.gradeLabel}</td></tr>)}</tbody></table></section></section></main>;
}
