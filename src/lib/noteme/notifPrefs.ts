import { useSyncExternalStore } from "react";

export type NotifPrefs = {
  todoReminders: boolean;
  scheduleReminders: boolean;
};

const KEY = "noteme.notifprefs.v1";
const DEFAULTS: NotifPrefs = { todoReminders: true, scheduleReminders: true };

let prefs: NotifPrefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) prefs = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    prefs = DEFAULTS;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // localStorage penuh/diblokir — abaikan, preferensi cuma kembali ke default.
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function getNotifPrefs(): NotifPrefs {
  load();
  return prefs;
}

export function setNotifPref<K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) {
  load();
  prefs = { ...prefs, [key]: value };
  persist();
  notify();
}

export function useNotifPrefs(): NotifPrefs {
  load();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => prefs,
    () => DEFAULTS,
  );
}
