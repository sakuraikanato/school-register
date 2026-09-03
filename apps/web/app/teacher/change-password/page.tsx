"use client";

import { FormEvent, useState } from "react";

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.9A10.8 10.8 0 0 1 12 6.8c6 0 9.5 5.2 9.5 5.2a17 17 0 0 1-3.1 3.2M6.3 6.9C3.8 8.5 2.5 12 2.5 12s3.5 5.2 9.5 5.2c.9 0 1.7-.1 2.5-.4" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
  );
}

export default function TeacherPasswordChangePage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const changePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmation") || "");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return setMessage("8文字以上で、英大文字・英小文字・数字を含めてください。");
    if (password !== confirmation) return setMessage("確認用パスワードが一致しません。");
    setMessage("パスワードを変更しました。ログイン画面へ戻ります。");
  };

  return (
    <main className="password-page teacher-password-page">
      <section className="password-change-form-area">
        <form className="password-change-card" onSubmit={changePassword}>
          <div className="password-change-intro"><h1>パスワードの変更</h1><p>初回ログインのため、パスワードを変更してください。</p></div>
          <div className="password-change-fields">
            <label>新しいパスワード<span className="password-change-input"><input name="password" type={showPassword ? "text" : "password"} placeholder="新しいパスワードを入力" /><button type="button" aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"} onClick={() => setShowPassword((value) => !value)}><PasswordVisibilityIcon visible={showPassword} /></button></span></label>
            <label>新しいパスワード（確認）<span className="password-change-input"><input name="confirmation" type={showConfirmation ? "text" : "password"} placeholder="新しいパスワードを再入力" /><button type="button" aria-label={showConfirmation ? "確認用パスワードを隠す" : "確認用パスワードを表示"} onClick={() => setShowConfirmation((value) => !value)}><PasswordVisibilityIcon visible={showConfirmation} /></button></span></label>
          </div>
          {message && <p className="form-error password-message" role="status">{message}</p>}
          <button className="password-change-submit" type="submit">変更</button>
        </form>
      </section>
      <section className="password-change-info" aria-label="パスワードの条件">
        <h2>成績管理サイト</h2>
        <div className="password-change-rules"><h3>パスワードの条件</h3><ul><li><span aria-hidden="true">✓</span>8文字以上</li><li><span aria-hidden="true">✓</span>英数字を含む</li><li><span aria-hidden="true">✓</span>大文字を含む</li><li><span aria-hidden="true">✓</span>小文字を含む</li></ul></div>
      </section>
    </main>
  );
}
