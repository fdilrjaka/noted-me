import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ConflictDialog, ServiceWorkerRegistrar } from "@/components/noteme/SyncEngine";
import { SplashIntro } from "@/components/noteme/SplashIntro";
import { useBackgroundHue } from "@/hooks/use-background-hue"; // <-- Import Hook

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="mt-3 text-lg font-semibold">Halaman tidak ditemukan</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="press inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground active:scale-95"
          >
            Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Catatanmu tetap aman di perangkat ini. Coba muat ulang.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="press rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground active:scale-95"
          >
            Coba lagi
          </button>
          <a
            href="/"
            className="press rounded-full border border-border px-5 py-2.5 text-sm font-medium active:scale-95"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: "NoteMe — Catatan Mata Kuliah" },
      {
        name: "description",
        content:
          "NoteMe: catatan kuliah offline-first dengan halaman per pertemuan, pencarian, dan sinkronisasi otomatis.",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "NoteMe" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#14121f" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  
  // Panggil hook di sini agar warna latar global selalu aktif di semua route/halaman
  useBackgroundHue();

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistrar />
      <RouteTransition />
      <ConflictDialog />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}

function RouteTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const stackRef = useRef<string[]>([]);
  const [direction, setDirection] = useState<"push" | "pop" | null>(null);

  useEffect(() => {
    const stack = stackRef.current;
    const last = stack[stack.length - 1];
    if (last === pathname) return;
    if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
      stack.pop();
      setDirection("pop");
    } else {
      stack.push(pathname);
      if (stack.length > 30) stack.splice(0, stack.length - 30);
      setDirection(stack.length > 1 ? "push" : null);
    }
  }, [pathname]);

  return (
    <div key={pathname} className={direction ? `route-${direction}` : undefined}>
      <Outlet />
    </div>
  );
}
