"use client";

import { useState } from "react";
import { AppShell } from "@/component/sidebar";
import { getStaffCsvImport } from "@/utils/client";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";

export default function Page() {
  const state = useRpc(() => getStaffCsvImport(), []);
  const [selected, setSelected] = useState("");
  const resources = state.data?.resources ?? [];
  return <AppShell currentPage="csv"><RpcStateMessage loading={state.loading} error={state.error} />{!state.error && state.data && <><header className="page-header"><div><span className="eyebrow">DATA IMPORT</span><h1>CSV読み込み</h1><p>生徒・講師・科目の情報をCSVファイルから一括更新します。</p></div></header><div className="desktop-content"><section className="csv-panel"><div className="step-indicator"><span className="current">1</span><i /><span>2</span><i /><span>3</span><i /><span>4</span><b>種類選択</b></div><h2>取り込むデータを選択</h2><div className="import-options">{resources.map((resource) => <label key={resource.value}><input type="radio" name="source" value={resource.value} checked={selected === resource.value || (!selected && resource === resources[0])} onChange={() => setSelected(resource.value)} /> {resource.label}</label>)}</div><div className="csv-footer"><p>{state.data.constraints.message}</p><button className="primary-button" type="button">次へ</button></div></section></div></>}</AppShell>;
}
