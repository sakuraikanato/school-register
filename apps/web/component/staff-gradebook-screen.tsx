"use client";

const subjects = ["デザインの基礎", "デザインの基礎", "デザインの基礎", "デザインの基礎", "デザインの基礎"];

export function StaffGradebookScreen() {
  return (
    <main className="staff-gradebook-page">
      <header className="staff-gradebook-breadcrumb"><span>ホーム</span><b>›</b><span>学年一覧</span><b>›</b><span>生徒一覧</span><b>›</b><strong>成績一覧(生徒別)</strong></header>
      <section className="staff-gradebook-content">
        <div className="staff-gradebook-profile-row">
          <div className="staff-gradebook-profile">
            <div className="gradebook-id"><strong>学籍番号</strong><span>0000</span></div>
            <div className="gradebook-name"><span>斉藤太郎</span></div>
            <div className="gradebook-details"><span>専攻・Webデザインー</span><span>ステータス・在籍</span></div>
          </div>
          <button className="staff-gradebook-pdf" type="button" onClick={() => window.print()}>PDF出力</button>
        </div>
        <button className="staff-gradebook-term" type="button">年度/前期 <span>⌄</span></button>
        <section className="staff-gradebook-table-shell">
          <table className="staff-gradebook-table">
            <thead><tr><th>授業名</th><th>出席率</th><th>授業態度</th><th>課題</th><th>点数</th><th>評価</th></tr></thead>
            <tbody>{subjects.map((subject, index) => <tr key={`${subject}-${index}`}><td>{subject}</td><td>〇〇%</td><td>〇〇</td><td>〇〇</td><td>〇〇</td><td>秀</td></tr>)}</tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
