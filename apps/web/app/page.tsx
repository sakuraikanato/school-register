"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/utils/auth";
import { getDashboard } from "@/utils/client";

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3.5 16s4.6-7 12.5-7 12.5 7 12.5 7-4.6 7-12.5 7S3.5 16 3.5 16Z" />
      <circle cx="16" cy="16" r="3.25" />
    </svg>
  ) : (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3.5 16s4.6-7 12.5-7 12.5 7 12.5 7-4.6 7-12.5 7S3.5 16 3.5 16Z" />
      <circle cx="16" cy="16" r="3.25" />
      <path d="m5 5 22 22" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<"staff" | "teacher">("staff");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get("email") || !form.get("password")) return setError("メールアドレスとパスワードを入力してください。");
    setError("");
    const result = await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")) });
    if (result.error) return setError(result.error.message ?? "ログインに失敗しました。");
    try {
      const dashboard = await getDashboard();
      router.push(dashboard.role === "teacher" ? "/teacher" : "/staff");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "ログイン後の情報取得に失敗しました。");
    }
  };
  return <main className="login-page"><section className="login-intro"><h1>成績管理サイト</h1></section><section className="login-area"><form className="login-card" onSubmit={signIn}><div className="login-heading"><span className="brand-mark">S</span><div><strong>sansan学園</strong><small>成績管理システム</small></div></div><h2>ログイン</h2><p className="login-description">アカウント情報を入力してください。</p><label>ID（メールアドレス）<input name="email" type="email" autoComplete="email" placeholder="ID" /></label><label>パスワード<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="パスワードを入力" /><button className="login-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}><PasswordVisibilityIcon visible={showPassword} /></button></div></label><fieldset><legend>ログインするアカウント</legend><label className="role-option"><input type="radio" checked={role === "staff"} onChange={() => setRole("staff")} name="role" />専任職員</label><label className="role-option"><input type="radio" checked={role === "teacher"} onChange={() => setRole("teacher")} name="role" />講師</label></fieldset>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-button" type="submit">ログイン</button><a className="forgot-link" href="/password/change">パスワードを忘れた場合</a></form></section></main>;
}
