"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/utils/auth";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "mousemove", "keydown", "touchstart", "wheel", "scroll"] as const;

/** Logs the current session out after ten minutes without user activity. */
export function InactivityLogout() {
  const timer = useRef<number | null>(null);
  const loggingOut = useRef(false);

  useEffect(() => {
    let disposed = false;

    const logout = async () => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try {
        await authClient.signOut();
      } finally {
        if (!disposed) window.location.replace("/");
      }
    };

    const resetTimer = () => {
      if (loggingOut.current) return;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(logout, IDLE_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      disposed = true;
      if (timer.current !== null) window.clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, []);

  return null;
}
