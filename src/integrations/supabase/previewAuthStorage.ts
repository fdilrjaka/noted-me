// Auth session storage for the Supabase client.
//
// This previously brokered the session to the Lovable editor's preview iframe
// over postMessage (so multiple Lovable preview surfaces could share one
// login). That only ever activated on lovable*.com/app/dev preview hostnames,
// which this standalone deployment never runs on, so it has been removed.
// Plain localStorage is what Supabase's client uses by default; we keep this
// thin wrapper (rather than passing `undefined`/omitting `storage`) so the
// import site in client.ts doesn't need to change and any future
// device/session-storage customization has a single place to live.
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}
