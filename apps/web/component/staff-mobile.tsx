"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutModal } from "@/component/modals";

type StaffMobileBreadcrumbProps = Readonly<{
  items: readonly string[];
  activeIndex?: number;
}>;

export function StaffMobileBreadcrumb({ items, activeIndex }: StaffMobileBreadcrumbProps) {
  return (
    <nav className="staff-mobile-breadcrumb" aria-label="パンくずリスト">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className={index === activeIndex ? "is-active" : undefined}>
          {item}
          {index < items.length - 1 && <b aria-hidden="true">›</b>}
        </span>
      ))}
    </nav>
  );
}

export function StaffMobileLogout() {
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      <button className="staff-mobile-logout" type="button" onClick={() => setLogoutOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H4v16h6M14 8l4 4-4 4M18 12H8" /></svg>
        <span>ログアウト</span>
      </button>
      {logoutOpen && <LogoutModal onClose={() => setLogoutOpen(false)} />}
    </>
  );
}

type StaffMobileOptionProps = Readonly<{
  href: string;
  title: string;
}>;

export function StaffMobileOption({ href, title }: StaffMobileOptionProps) {
  return (
    <Link className="staff-mobile-option-card" href={href}>
      <span>{title}</span>
      <span className="staff-mobile-option-arrow" aria-hidden="true">›</span>
    </Link>
  );
}

export function StaffMobileHome() {
  return (
    <section className="staff-mobile-view staff-mobile-home" aria-label="職員ホーム">
      <header>
        <h1>ようこそ　田中太郎 先生</h1>
        <h2>仕様機能</h2>
      </header>
      <div className="staff-mobile-option-list">
        <StaffMobileOption href="/staff/students" title="全生徒の成績一覧" />
        <StaffMobileOption href="/staff/histories" title="過去の成績一覧" />
        <StaffMobileOption href="/staff/courses" title="科目成績一覧" />
      </div>
      <StaffMobileLogout />
    </section>
  );
}

type StaffMobileListProps = Readonly<{
  breadcrumb: readonly string[];
  heading: string;
  options: readonly StaffMobileOptionProps[];
}>;

export function StaffMobileList({ breadcrumb, heading, options }: StaffMobileListProps) {
  return (
    <section className="staff-mobile-view staff-mobile-list-page">
      <StaffMobileBreadcrumb items={breadcrumb} />
      <h1 className="staff-mobile-page-heading">{heading}</h1>
      <div className="staff-mobile-option-list">
        {options.map((option) => <StaffMobileOption key={`${option.href}-${option.title}`} {...option} />)}
      </div>
      <StaffMobileLogout />
    </section>
  );
}

type StaffMobileStudentProps = Readonly<{
  number: string;
  name: string;
  href: string;
}>;

export function StaffMobileStudents({ students }: Readonly<{ students: readonly StaffMobileStudentProps[] }>) {
  return (
    <section className="staff-mobile-view staff-mobile-students-page">
      <StaffMobileBreadcrumb items={["ホーム", "全生徒の成績一覧"]} />
      <h1 className="staff-mobile-page-heading">過去の成績</h1>
      <div className="staff-mobile-student-list">
        {students.map((student) => (
          <Link className="staff-mobile-student-card" href={student.href} key={student.number}>
            <span>学籍番号</span>
            <strong>{student.name}</strong>
          </Link>
        ))}
      </div>
      <StaffMobileLogout />
    </section>
  );
}

export function StaffMobileYears({ years }: Readonly<{ years: readonly string[] }>) {
  return (
    <section className="staff-mobile-view staff-mobile-years-page">
      <StaffMobileBreadcrumb items={["ホーム", "過去の成績一覧"]} />
      <h1 className="staff-mobile-page-heading">過去の成績</h1>
      <div className="staff-mobile-year-grid">
        {years.map((year, index) => <Link className="staff-mobile-year-card" href="/staff/students" key={`${year}-${index}`}>{year}</Link>)}
      </div>
      <StaffMobileLogout />
    </section>
  );
}
