export function getQueryText(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() ?? "";
}

export function getQueryOffset(params: URLSearchParams): number {
  const rawOffset = Number(params.get("offset") ?? "0");
  if (!Number.isFinite(rawOffset) || rawOffset < 0) {
    return 0;
  }

  return Math.floor(rawOffset);
}

export function buildListSearchParams(
  currentParams: URLSearchParams,
  updates: Record<string, string | number | null | undefined>
): URLSearchParams {
  const nextParams = new URLSearchParams(currentParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      nextParams.delete(key);
      return;
    }

    nextParams.set(key, String(value));
  });

  return nextParams;
}

