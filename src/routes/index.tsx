import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HueSlider } from "@/components/HueSlider";
import { useBackgroundHue } from "@/hooks/use-background-hue";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Catatan Kaca — Tulis dengan latar yang kamu pilih" },
      {
        name: "description",
        content:
          "Catatan minimalis dengan kartu kaca dan latar gradient yang bisa kamu atur sendiri lewat satu slider warna.",
      },
      { property: "og:title", content: "Catatan Kaca — latar gradient pilihanmu" },
      {
        property: "og:description",
        content:
          "Tulis catatan di kartu kaca, atur warna latar gradient dengan satu slider hue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const NOTE_KEY = "note-content";

function Index() {
  const { hue, setHue } = useBackgroundHue();
  const [text, setText] = useState("");

  useEffect(() => {
    setText(window.localStorage.getItem(NOTE_KEY) ?? "");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(NOTE_KEY, text);
  }, [text]);

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <section className="glass-card w-full max-w-2xl overflow-hidden rounded-[var(--radius)]">
        <div className="glass-toolbar flex flex-wrap items-center justify-between gap-4 px-5 py-3">
          <h1 className="text-sm font-medium tracking-tight text-card-foreground">
            Catatan
          </h1>
          <HueSlider hue={hue} onChange={setHue} />
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Mulai menulis…"
          className="min-h-[60vh] w-full resize-none bg-transparent px-6 py-6 text-base leading-relaxed text-card-foreground outline-none placeholder:text-muted-foreground"
        />
      </section>
    </main>
  );
}
