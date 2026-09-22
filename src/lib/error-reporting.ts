// Client-side error reporting for the root error boundary.
//
// Previously this forwarded errors to Lovable's editor telemetry
// (window.__lovableEvents / window.__lovableReportRuntimeError), which only
// exists inside the Lovable preview iframe. That integration has been
// removed since this app no longer runs inside Lovable. Error boundary
// behavior itself is unchanged — errors are still caught, logged, and shown
// a friendly fallback UI (see routes/__root.tsx); only the "send telemetry
// to Lovable" step is gone.
//
// Hook a real error-reporting service (Sentry, etc.) here if/when desired.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  // Loaders and server fns commonly throw a raw Response; String(it) is the
  // opaque "[object Response]", so pull out the status and URL instead.
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[error-boundary]", message, {
    route: window.location.pathname,
    ...context,
    ...(stack !== undefined && { stack }),
  });
}
