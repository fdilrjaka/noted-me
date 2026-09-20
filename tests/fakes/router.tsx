const G: any = globalThis;
G.__navs ??= [];
export const useNavigate = () => (opts: any) => {
  G.__navs.push(opts);
  return Promise.resolve();
};
export const Link = (p: any) =>
  (globalThis as any).React.createElement("a", { href: p.to }, p.children);
