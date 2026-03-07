import { useEffect, useRef, useState } from "react";
import { getAdminToken } from "@/lib/admin-client";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

const blobCache = new Map<string, string>();

export function useMediaUrl(waMediaId: string | undefined): {
  url: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const [url, setUrl] = useState<string | null>(
    waMediaId ? (blobCache.get(waMediaId) ?? null) : null,
  );
  const [isLoading, setIsLoading] = useState(!url && !!waMediaId);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!waMediaId) {
      setUrl(null);
      setIsLoading(false);
      return;
    }

    // Already cached
    const cached = blobCache.get(waMediaId);
    if (cached) {
      setUrl(cached);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetch(`${API_BASE}/media/${waMediaId}`, {
      headers: { "X-Admin-Token": getAdminToken() ?? "" },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        const blobUrl = URL.createObjectURL(blob);
        blobCache.set(waMediaId, blobUrl);
        setUrl(blobUrl);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError((err as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [waMediaId]);

  return { url, isLoading, error };
}
