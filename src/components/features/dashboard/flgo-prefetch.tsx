"use client";

// Silent background prefetch — renders nothing, fires once on dashboard mount.
// Populates the FLGO store so both tabs are instant when the user navigates to FLGO.
import { useEffect } from "react";
import { useFlgoStore } from "@/store/flgo-store";

export default function FlgoPrefetch() {
  const hasFetched = useFlgoStore((s) => s.hasFetched);
  const isLoading  = useFlgoStore((s) => s.isLoading);
  const setLoading = useFlgoStore((s) => s.setLoading);
  const setRecords = useFlgoStore((s) => s.setRecords);
  const setError   = useFlgoStore((s) => s.setError);

  useEffect(() => {
    if (hasFetched || isLoading) return;

    setLoading(true);

    fetch("/api/ragic/flgo/records")
      .then((r) => r.json())
      .then((data) => {
        if (data.records) {
          setRecords(data.records);
        } else {
          setError(data.error ?? "Failed to prefetch FLGO records.");
        }
      })
      .catch(() => setError("Failed to prefetch FLGO records."))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
