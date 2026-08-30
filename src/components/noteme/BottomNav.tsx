import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Trash2, User } from "lucide-react";
import { resetNavDragProgress, setNavDragProgress } from "@/lib/noteme/navDrag";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/auth", label: "Profile", icon: User },
] as const;

// Gesture tuning — kept in one place so the feel can be adjusted without
// hunting through the handlers below.
const DRAG_START_PX = 6; // movement before a tap becomes a drag
const SWITCH_DISTANCE_FRACTION = 0.35; // 30–40% of a tab's width, per spec
const SWITCH_VELOCITY_PX_MS = 0.55; // fast flick overrides distance
const RUBBER_BAND_DAMP = 0.32;
const VELOCITY_WINDOW_MS = 120;

function rubberBand(value: number, min: number, max: number, damp: number) {
  if (value < min) return min - (min - value) * damp;
  if (value > max) return max + (value - max) * damp;
  return value;
}

// Gentle overshoot easing for the JS-driven settle animation (spring feel
// without pulling in a physics/animation dependency).
function easeOutBack(t: number) {
  const c1 = 1.15;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

type DragState = {
  pointerId: number;
  startX: number;
  startIndex: number;
  dragging: boolean;
  samples: { x: number; t: number }[];
};

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const tabWidthRef = useRef(0);
  const suppressClickRef = useRef(false);

  const activeIndex = useMemo(() => {
    if (pathname === "/") return 0;
    const idx = tabs.findIndex((t) => t.to !== "/" && pathname.startsWith(t.to));
    return idx === -1 ? 0 : idx;
  }, [pathname]);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const w = track.getBoundingClientRect().width / tabs.length;
    tabWidthRef.current = w;
    return w;
  }, []);

  const placePill = useCallback(
    (index: number, offsetPx: number, animate: boolean) => {
      const pill = pillRef.current;
      if (!pill) return;
      const w = tabWidthRef.current || measure();
      pill.style.width = `${w}px`;
      pill.classList.toggle("nav-pill-settling", animate);
      pill.classList.toggle("nav-pill", !animate);
      pill.style.transform = `translate3d(${index * w + offsetPx}px, 0, 0)`;
    },
    [measure],
  );

  // Keep the pill (and any in-flight rAF settle loop) aligned whenever the
  // active tab changes from outside a drag (tap, back/forward, resize).
  useEffect(() => {
    measure();
    if (!dragRef.current) placePill(activeIndex, 0, true);
    const onResize = () => {
      measure();
      if (!dragRef.current) placePill(activeIndex, 0, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, measure, placePill]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resetNavDragProgress(true);
    };
  }, []);

  const settleTo = useCallback(
    (fromOffsetTabs: number, targetIndex: number, navigateAfter: boolean) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const w = tabWidthRef.current || measure();
      const duration = 420;
      const start = performance.now();
      const from = fromOffsetTabs;

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = easeOutBack(t);
        const current = from + (0 - from) * eased;
        placePill(targetIndex, current * w, false);
        setNavDragProgress(current);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          placePill(targetIndex, 0, false);
          resetNavDragProgress();
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);

      if (navigateAfter) {
        const target = tabs[targetIndex];
        if (target) void navigate({ to: target.to });
      }
    },
    [measure, navigate, placePill],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startIndex: activeIndex,
        dragging: false,
        samples: [{ x: e.clientX, t: performance.now() }],
      };

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        const dx = ev.clientX - drag.startX;

        if (!drag.dragging) {
          if (Math.abs(dx) < DRAG_START_PX) return;
          drag.dragging = true;
        }

        ev.preventDefault();
        drag.samples.push({ x: ev.clientX, t: performance.now() });
        while (
          drag.samples.length > 2 &&
          performance.now() - (drag.samples[0]?.t ?? 0) > VELOCITY_WINDOW_MS
        ) {
          drag.samples.shift();
        }

        const w = tabWidthRef.current || measure();
        const rawProgress = dx / w; // in "tabs" units
        const rawTarget = drag.startIndex + rawProgress;
        const clampedTarget = rubberBand(rawTarget, 0, tabs.length - 1, RUBBER_BAND_DAMP);
        const offsetTabs = clampedTarget - drag.startIndex;

        placePill(drag.startIndex, offsetTabs * w, false);
        setNavDragProgress(offsetTabs);
      };

      const onUp = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        dragRef.current = null;

        if (!drag.dragging) return; // plain tap — let the button's onClick handle it

        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);

        const dx = ev.clientX - drag.startX;
        const w = tabWidthRef.current || measure();
        const first = drag.samples[0];
        const last = drag.samples[drag.samples.length - 1] ?? first;
        const dt = last && first ? Math.max(1, last.t - first.t) : 1;
        const velocity = last && first ? (last.x - first.x) / dt : 0;

        const rawProgress = dx / w;
        const distanceFraction = Math.abs(rawProgress);
        const direction = rawProgress >= 0 ? 1 : -1;
        const flick =
          Math.abs(velocity) >= SWITCH_VELOCITY_PX_MS && Math.sign(velocity) === direction;

        let targetIndex = drag.startIndex;
        if (distanceFraction >= SWITCH_DISTANCE_FRACTION || flick) {
          targetIndex = Math.max(0, Math.min(tabs.length - 1, drag.startIndex + direction));
        }

        const rawTarget = drag.startIndex + rawProgress;
        const clampedTarget = rubberBand(rawTarget, 0, tabs.length - 1, RUBBER_BAND_DAMP);
        const currentOffsetTabs = clampedTarget - targetIndex;

        settleTo(currentOffsetTabs, targetIndex, targetIndex !== drag.startIndex);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [activeIndex, measure, placePill, settleTo],
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[calc(env(safe-area-inset-bottom)+0.85rem)] md:hidden">
      <nav
        className="glass-navigation pointer-events-auto relative select-none rounded-full p-2"
        aria-label="Navigasi utama"
      >
        <div
          ref={trackRef}
          className="relative flex items-stretch"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
        >
          <div
            ref={pillRef}
            aria-hidden="true"
            className="glass-floating nav-pill pointer-events-none absolute inset-y-0 left-0 rounded-full"
          />
          {tabs.map(({ to, label, icon: Icon }, i) => {
            const active = i === activeIndex;
            return (
              <button
                key={to}
                type="button"
                data-tab-index={i}
                aria-current={active ? "page" : undefined}
                onClick={(e) => {
                  if (suppressClickRef.current) {
                    e.preventDefault();
                    return;
                  }
                  if (!active) void navigate({ to });
                }}
                className={`relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-full px-5 py-1.5 text-[11px] transition-colors duration-300 ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon
                  className={`size-5 transition-colors duration-300 ${active ? "text-primary" : ""}`}
                />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
