"use client";

import { useEffect, useState } from "react";

/** Contagem regressiva para "Reenviar código" (padrão 60s). */
export function useResendCountdown(totalSeconds = 60) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);
  return {
    seconds,
    label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    start: () => setSeconds(totalSeconds),
  };
}
