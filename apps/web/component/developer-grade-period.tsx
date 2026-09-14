"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getYears } from "@/utils/client";
import { isDeveloperMode, type DeveloperGradePeriod } from "@/utils/developer-mode";
import { useRpc } from "@/utils/use-rpc";

export function DeveloperGradePeriodControls({
  subjectId,
  value,
}: Readonly<{
  subjectId: number;
  value: DeveloperGradePeriod;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const years = useRpc(() => getYears(), []);
  if (!isDeveloperMode) return null;

  const changePeriod = (next: DeveloperGradePeriod) => {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("subjectId", String(subjectId));
    nextParams.set("yearId", String(next.yearId));
    nextParams.set("term", next.term);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <fieldset className="developer-grade-period-controls">
      <legend>開発者モード（テスト用）</legend>
      <label>
        年度
        <select
          aria-label="テスト対象の年度"
          value={String(value.yearId)}
          onChange={(event) => changePeriod({ ...value, yearId: Number(event.target.value) })}
          disabled={years.loading || years.data?.items.length === 0}
        >
          {years.data?.items.map((year) => <option value={year.id} key={year.id}>{year.year}年度</option>)}
        </select>
      </label>
      <label>
        学期
        <select
          aria-label="テスト対象の学期"
          value={value.term}
          onChange={(event) => changePeriod({ ...value, term: event.target.value as DeveloperGradePeriod["term"] })}
        >
          <option value="first">前期</option>
          <option value="second">後期</option>
        </select>
      </label>
    </fieldset>
  );
}
