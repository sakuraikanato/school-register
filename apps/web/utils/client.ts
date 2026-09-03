import type { AppType } from "api/src";
import { hc, type InferResponseType } from 'hono/client'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// AppType is exported from the chained Hono application, so screen routes,
// request bodies, path params, and response shapes stay synchronized here.
export const client = hc<AppType>(apiBaseUrl, {
  init: { credentials: 'include' },
});

export type DashboardResponse = InferResponseType<typeof client.api.screens.dashboard.$get>;
export type GradeEntryResponse = InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["$get"]>;
