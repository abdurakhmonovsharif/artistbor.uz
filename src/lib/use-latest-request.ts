"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export function useLatestRequest(scope?: unknown) {
  const latestRequestId = useRef(0);
  const latestScope = useRef(scope);

  useLayoutEffect(() => {
    if (Object.is(scope, latestScope.current)) return;
    latestScope.current = scope;
    latestRequestId.current += 1;
  }, [scope]);

  useEffect(
    () => () => {
      latestRequestId.current += 1;
    },
    [],
  );

  return useCallback(() => {
    if (!Object.is(scope, latestScope.current)) {
      return () => false;
    }

    const requestId = ++latestRequestId.current;
    return () => requestId === latestRequestId.current && Object.is(scope, latestScope.current);
  }, [scope]);
}
