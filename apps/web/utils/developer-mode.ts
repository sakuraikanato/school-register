import type { ScreenQuery } from "@/utils/client";

/** Only enables local test controls when explicitly set to the string "true". */
export const isDeveloperMode = process.env.NEXT_PUBLIC_DEVELOPER_MODE === "true";

export type DeveloperGradePeriod = {
  yearId: number;
  term: NonNullable<ScreenQuery["term"]>;
};
