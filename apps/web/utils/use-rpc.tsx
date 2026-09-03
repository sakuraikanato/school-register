"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RpcError } from "@/utils/client";

export type RpcState<T> = Readonly<{
  data: T | null;
  error: string | null;
  loading: boolean;
}>;

export function useRpc<T>(request: () => Promise<T>, dependencies: readonly unknown[]): RpcState<T> {
  const [state, setState] = useState<RpcState<T>>({ data: null, error: null, loading: true });
  const router = useRouter();

  useEffect(() => {
    let active = true;
    request()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (error instanceof RpcError && error.status === 401 && window.location.pathname !== "/") {
          router.replace("/");
          return;
        }
        if (active) setState({ data: null, error: error instanceof Error ? error.message : "データを取得できませんでした", loading: false });
      });
    return () => {
      active = false;
    };
    // The caller supplies the request's changing inputs in dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, ...dependencies]);

  return state;
}

export function RpcStateMessage({ loading, error }: Pick<RpcState<unknown>, "loading" | "error">) {
  if (loading) return <p className="rpc-state-message" role="status">読み込み中...</p>;
  if (error) return <p className="rpc-state-message rpc-state-error" role="alert">{error}</p>;
  return null;
}
