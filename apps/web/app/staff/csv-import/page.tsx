import { MobileGradeSheet } from "@/component/grade-ui";
import { AppShell } from "@/component/sidebar";

export default function Page() {
  return <AppShell currentPage="csv"><header className="page-header"><div><span className="eyebrow">DATA IMPORT</span><h1>CSV読み込み</h1><p>生徒・講師・科目の情報をCSVファイルから一括更新します。</p></div></header><div className="desktop-content"><section className="csv-panel"><div className="step-indicator"><span className="current">1</span><i /><span>2</span><i /><span>3</span><i /><span>4</span><b>種類選択</b></div><h2>取り込むデータを選択</h2><div className="import-options"><label><input type="radio" name="source" defaultChecked /> 生徒</label><label><input type="radio" name="source" /> 講師</label><label><input type="radio" name="source" /> 専任職員</label><label><input type="radio" name="source" /> 科目</label></div><div className="csv-footer"><p>不正なCSVはすべての取り込みを中止します。<br />次の画面でファイル内容を確認できます。</p><button className="primary-button">次へ</button></div></section></div><div className="mobile-only"><MobileGradeSheet title="成績表" /></div></AppShell>;
}
