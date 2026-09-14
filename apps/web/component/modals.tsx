"use client";

import { useEffect, useState } from "react";
import { getStaffCsvImport, importStaffCsv, previewStaffCsv, type StaffCsvCommitResponse, type StaffCsvImportResponse, type StaffCsvPreviewResponse } from "@/utils/client";
import { isDeveloperMode } from "@/utils/developer-mode";
import { RpcStateMessage, useRpc } from "@/utils/use-rpc";
import { authClient } from "@/utils/auth";

type ModalProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  label: string;
  onClose: () => void;
}>;

function Modal({ children, className = "", label, onClose }: ModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(event) => event.currentTarget === event.target && onClose()}>
      <section className={`app-modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  );
}

function CloseButton({ onClose }: Readonly<{ onClose: () => void }>) {
  return <button className="modal-close" type="button" onClick={onClose} aria-label="閉じる">×</button>;
}

const weightLabels = ["出席率", "授業態度", "課題"] as const;

export function WeightModal({ onClose, onConfirm, weights }: Readonly<{
  onClose: () => void;
  onConfirm: (weights: number[]) => void;
  weights: number[];
}>) {
  const [draftWeights, setDraftWeights] = useState<(number | null)[]>(weights);
  const total = draftWeights.reduce((sum: number, weight) => sum + (weight ?? 0), 0);
  const valid = total === 10;

  const updateWeight = (index: number, value: string) => {
    if (value === "") {
      setDraftWeights((previous) => previous.map((weight, weightIndex) => weightIndex === index ? null : weight));
      return;
    }
    const nextWeight = Number(value);
    setDraftWeights((previous) => previous.map((weight, weightIndex) => weightIndex === index ? (Number.isFinite(nextWeight) ? nextWeight : null) : weight));
  };

  const confirm = () => {
    if (!valid) return;
    onConfirm(draftWeights.map((weight) => weight ?? 0));
    onClose();
  };

  return (
    <Modal className="weight-modal" label="評価基準を変更" onClose={onClose}>
      <div className="modal-breadcrumb"><span>ホーム</span><b>›</b><span>成績一覧</span><b>›</b><strong>評価基準</strong></div>
      <CloseButton onClose={onClose} />
      <div className="weight-modal-content">
        <h2>評価基準</h2>
        <p>合計が１０になるように入力してください</p>
        <table className="weight-modal-table">
          <thead><tr><th>項目</th><th>重み</th></tr></thead>
          <tbody>{weightLabels.map((label, index) => <tr key={label}><th scope="row">{label}</th><td><input type="number" inputMode="numeric" min="0" max="10" value={draftWeights[index] ?? ""} onChange={(event) => updateWeight(index, event.target.value)} aria-label={`${label}の重み`} /></td></tr>)}</tbody>
          <tfoot><tr><th scope="row">合計</th><td className={valid ? "valid" : "invalid"}>{total}/10</td></tr></tfoot>
        </table>
        <button className="modal-outline-button weight-confirm-button" type="button" onClick={confirm} disabled={!valid}>決定</button>
      </div>
    </Modal>
  );
}

export function LogoutModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [signingOut, setSigningOut] = useState(false);
  const logout = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      window.location.replace("/");
    }
  };

  return (
    <Modal className="logout-modal" label="ログアウト確認" onClose={onClose}>
      <h2>ログアウトしますか？</h2>
      <div className="logout-modal-actions">
        <button className="modal-outline-button" type="button" onClick={logout} disabled={signingOut}>{signingOut ? "処理中…" : "はい"}</button>
        <button className="modal-outline-button" type="button" onClick={onClose}>いいえ</button>
      </div>
    </Modal>
  );
}

export function CsvImportModal({ onClose }: Readonly<{ onClose: () => void }>) {
  type CsvResource = StaffCsvImportResponse["resources"][number]["value"];
  type CsvStep = "type" | "file" | "confirm" | "result";
  const steps = ["種類選択", "ファイル選択", "確認", "結果"] as const;
  const [source, setSource] = useState<CsvResource | "">("");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<StaffCsvPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<StaffCsvCommitResponse | null>(null);
  const [localError, setLocalError] = useState("");
  const [resultError, setResultError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<CsvStep>("type");
  const [yearSelection, setYearSelection] = useState<number | "new">("new");
  const [newYear, setNewYear] = useState(() => String(new Date().getFullYear()));
  const state = useRpc(() => getStaffCsvImport(), []);
  const resources = state.data?.resources ?? [];
  const years = state.data?.years ?? [];
  const selectedResource = source || resources[0]?.value;
  const currentStep = steps.indexOf(step === "type" ? "種類選択" : step === "file" ? "ファイル選択" : step === "confirm" ? "確認" : "結果");

  const selectedYearValue = () => {
    if (!isDeveloperMode) return state.data?.currentYear?.year ?? null;
    const year = yearSelection === "new" ? Number(newYear) : years.find((item) => item.id === yearSelection)?.year;
    if (typeof year !== "number" || !Number.isSafeInteger(year) || year < 1 || year > 9999) return null;
    return year;
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError("");
    setResultError("");
    setPreview(null);
    setCommitResult(null);
    setFileName(file.name);
    setCsvText(await file.text());
  };

  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => readFile(event.target.files?.[0]);
  const dropFile = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    await readFile(event.dataTransfer.files?.[0]);
  };

  const moveToFile = () => {
    if (!selectedResource) return setLocalError("取り込む種類を選択してください。");
    if (selectedYearValue() === null) return setLocalError("取り込む年度を1〜9999の整数で指定してください。");
    setLocalError("");
    setStep("file");
  };

  const previewFile = async () => {
    if (!selectedResource) return setLocalError("取り込む種類を選択してください。");
    if (!csvText) return setLocalError("CSVファイルを選択してください。");
    setSubmitting(true);
    setLocalError("");
    setResultError("");
    try {
      setPreview(await previewStaffCsv(selectedResource, csvText));
      setStep("confirm");
    } catch (error) {
      setResultError(error instanceof Error ? error.message : "CSVを読み込めませんでした。");
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmImport = async () => {
    if (!selectedResource || !csvText) {
      setResultError("CSVファイルを選択してください。");
      setStep("result");
      return;
    }
    const year = selectedYearValue();
    if (year === null) {
      setResultError("取り込む年度を1〜9999の整数で指定してください。");
      setStep("result");
      return;
    }
    setSubmitting(true);
    setResultError("");
    try {
      setCommitResult(await importStaffCsv(selectedResource, csvText, year));
      setStep("result");
    } catch (error) {
      setResultError(error instanceof Error ? error.message : "CSVを取り込めませんでした。");
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  };

  const resourceLabel = resources.find((resource) => resource.value === selectedResource)?.label ?? selectedResource;
  const selectedYear = selectedYearValue();
  const selectedYearLabel = selectedYear === null ? "未選択" : `${selectedYear}年度`;
  const createsYear = selectedYear !== null && !years.some((year) => year.year === selectedYear);
  const previewForResult = preview;
  const headerErrors = previewForResult?.errors.header ?? [];
  const rowErrors = previewForResult?.errors.rows ?? [];

  return (
    <Modal className="csv-import-modal" label="CSV取り込み" onClose={onClose}>
      <div className="modal-breadcrumb"><span>ホーム</span><b>›</b><strong>CSV取り込み</strong></div>
      <CloseButton onClose={onClose} />
      <ol className="csv-modal-steps" aria-label="CSV取り込み手順">
        {steps.map((label, index) => <li className={index < currentStep ? "done" : index === currentStep ? "current" : ""} key={label}><span>{index + 1}</span><strong>{label}</strong></li>)}
      </ol>
      <RpcStateMessage loading={state.loading} error={state.error} />
      {localError && <p className="form-error csv-modal-error" role="alert">{localError}</p>}
      {step === "type" && <fieldset className="csv-modal-options csv-step-panel">
        <legend>取り込む種類を選択してください</legend>
        {resources.map((option) => <label key={option.value}><input type="radio" name="csv-source" value={option.value} checked={selectedResource === option.value} onChange={() => { setSource(option.value); setPreview(null); setLocalError(""); }} />{option.label}</label>)}
        {isDeveloperMode && <><label className="csv-year-picker">年度<select aria-label="取り込む年度" value={String(yearSelection)} onChange={(event) => setYearSelection(event.target.value === "new" ? "new" : Number(event.target.value))}><option value="new">新しい年度を入力</option>{years.map((year) => <option value={year.id} key={year.id}>{year.year}年度（既存）</option>)}</select></label>
        {yearSelection === "new" && <input className="csv-new-year-input" type="number" min="1" max="9999" step="1" inputMode="numeric" value={newYear} onChange={(event) => { setNewYear(event.target.value); setLocalError(""); }} placeholder="例：2027" aria-label="新しく作成する年度" />}
        <p className="csv-year-hint">未登録の年度を指定した場合は、取り込み時に年度を作成します。</p></>}
        <div className="csv-modal-actions"><button className="modal-outline-button" type="button" onClick={moveToFile} disabled={state.loading || resources.length === 0}>次へ</button></div>
      </fieldset>}
      {step === "file" && <fieldset className="csv-modal-options csv-step-panel">
        <legend>CSVファイルを選択してください</legend>
        <label className="csv-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
          <span>ここにCSVファイルをドロップ</span>
          <span>またはファイルを選択</span>
          <input type="file" accept=".csv,text/csv" onChange={selectFile} />
        </label>
        {fileName && <p className="csv-file-name" aria-live="polite">選択中: {fileName}</p>}
        <div className="csv-modal-actions"><button className="modal-outline-button" type="button" onClick={() => setStep("type")}>戻る</button><button className="modal-outline-button" type="button" onClick={previewFile} disabled={submitting || !csvText}>{submitting ? "確認中…" : "次へ"}</button></div>
      </fieldset>}
      {step === "confirm" && preview && <section className="csv-step-panel csv-confirm-panel" aria-live="polite">
        <h2>取り込み内容を確認</h2>
        <dl><div><dt>年度</dt><dd>{selectedYearLabel}{createsYear ? "（新規作成）" : ""}</dd></div><div><dt>種類</dt><dd>{resourceLabel}</dd></div><div><dt>ファイル</dt><dd>{fileName}</dd></div><div><dt>対象行</dt><dd>{preview.validRows}行</dd></div></dl>
        <div className="csv-modal-actions"><button className="modal-outline-button" type="button" onClick={() => setStep("file")} disabled={submitting}>戻る</button><button className="modal-outline-button" type="button" onClick={confirmImport} disabled={submitting}>{submitting ? "取り込み中…" : "読み込みを確定"}</button></div>
      </section>}
      {step === "result" && (previewForResult || commitResult || resultError) && <section className="csv-step-panel csv-result-panel" aria-live="polite">
        <h2>{resultError ? "読み込みエラー" : commitResult ? "取り込み結果" : previewForResult?.canImport ? "取り込み結果" : "取り込みできませんでした"}</h2>
        {resultError ? <p className="csv-result-error">{resultError}</p> : commitResult ? <><p className="csv-result-success">{resourceLabel}のCSVをデータベースへ保存しました。</p><dl><div><dt>年度</dt><dd>{commitResult.year.year}年度</dd></div><div><dt>ファイル</dt><dd>{fileName}</dd></div><div><dt>追加</dt><dd>{commitResult.created}件</dd></div><div><dt>更新</dt><dd>{commitResult.updated}件</dd></div><div><dt>処理行</dt><dd>{commitResult.rows}行</dd></div></dl></> : previewForResult?.canImport ? <><p className="csv-result-success">CSVの確認が完了しました。</p><dl><div><dt>年度</dt><dd>{selectedYearLabel}</dd></div><div><dt>ファイル</dt><dd>{fileName}</dd></div><div><dt>対象行</dt><dd>{previewForResult.validRows}行</dd></div></dl></> : <><p className="csv-result-error">CSVの内容にエラーがあります。以下を確認してください。</p>{headerErrors.length > 0 && <ul className="csv-preview-errors">{headerErrors.map((error) => <li key={error.field}>{error.message}</li>)}</ul>}{rowErrors.length > 0 && <ul className="csv-preview-errors">{rowErrors.map((error) => <li key={error.rowNumber}>行{error.rowNumber}: {error.message}</li>)}</ul>}</>}
        <div className="csv-modal-actions"><button className="modal-outline-button" type="button" onClick={onClose}>閉じる</button></div>
      </section>}
    </Modal>
  );
}

export function CsvImportTrigger({ children, className }: Readonly<{ children: React.ReactNode; className: string }>) {
  const [modalOpen, setModalOpen] = useState(false);

  return <>{<button className={className} type="button" onClick={() => setModalOpen(true)}>{children}</button>}{modalOpen && <CsvImportModal onClose={() => setModalOpen(false)} />}</>;
}

export function ConfirmationModal({ onClose, onConfirm, year = "", term = "前期" }: Readonly<{ onClose: () => void; onConfirm: () => void | Promise<void>; year?: string; term?: string }>) {
  const [submitting, setSubmitting] = useState(false);
  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal className="confirmation-modal" label="成績確認" onClose={onClose}>
      <div className="modal-breadcrumb"><span>ホーム</span><b>›</b><span>成績一覧</span><b>›</b><strong>成績確認</strong></div>
      <div className="confirmation-modal-content">
        <section className="confirmation-result"><h2>確認結果</h2><p>{year}年度{term}の成績を確定しますか？</p><p>＊確定後は変更できません。</p></section>
      </div>
      <div className="confirmation-footer"><p>＊注意<br />確定した場合変更が出来ません<br />確定前に必ず未入力のチェックをしてください</p><button className="modal-outline-button" type="button" onClick={confirm} disabled={submitting}>{submitting ? "処理中…" : "確定"}</button></div>
    </Modal>
  );
}

export function GradeUnlockModal({ onClose, onConfirm }: Readonly<{ onClose: () => void; onConfirm: () => void | Promise<void> }>) {
  const [submitting, setSubmitting] = useState(false);
  const confirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal className="grade-unlock-modal" label="成績確定解除確認" onClose={onClose}>
      <div className="grade-unlock-content">
        <h2>成績の確定を解除しますか？</h2>
        <p>解除後は成績を修正し、再度確定できます。</p>
      </div>
      <div className="grade-unlock-actions">
        <button className="modal-outline-button" type="button" onClick={confirm} disabled={submitting}>{submitting ? "処理中…" : "解除する"}</button>
        <button className="modal-outline-button" type="button" onClick={onClose} disabled={submitting}>キャンセル</button>
      </div>
    </Modal>
  );
}
