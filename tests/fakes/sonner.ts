const G: any = globalThis;
G.__toasts ??= [];
const log = (kind: string) => (msg: string) => {
  G.__toasts.push({ kind, msg });
};
export const toast: any = Object.assign(log("info"), {
  success: log("success"),
  error: log("error"),
  info: log("info"),
  warning: log("warning"),
  message: log("info"),
  dismiss() {},
  loading: log("loading"),
});
export const Toaster = () => null;
