import Link from "next/link";

export function ActionCard({ href, title, description, badge }: Readonly<{ href: string; title: string; description: string; badge?: string }>) {
  return <Link className="action-card" href={href}><div>{badge && <span className="card-badge">{badge}</span>}<h3>{title}</h3><p>{description}</p></div><span className="arrow" aria-hidden="true">›</span></Link>;
}

export function StaffOptionCard({ href, title }: Readonly<{ href: string; title: string }>) {
  return <Link className="staff-option-card" href={href}><span>{title}</span><span className="staff-option-arrow" aria-hidden="true">›</span></Link>;
}

export function StatCard({ label, value, note }: Readonly<{ label: string; value: string; note: string }>) {
  return <section className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></section>;
}
