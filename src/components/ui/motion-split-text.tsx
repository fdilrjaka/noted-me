"use client";

import { Fragment, useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import "./motion-split-text.css";

/**
 * Teks yang muncul kata per kata (spring, delay bertahap).
 * Pakai "\n" di dalam `text` untuk paksa pindah baris.
 */
export function SplitText({
  text = "Level up your animations with the all-in membership",
  className,
}: {
  text?: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    const show = () => setReady(true);
    if (!fonts?.ready) {
      show();
      return;
    }
    fonts.ready.then(show);
  }, []);

  const lines = text.split("\n").map((line) => line.split(" ").filter(Boolean));
  const plain = text.replace(/\n/g, " ");
  let index = 0;

  return (
    <div style={{ visibility: ready ? "visible" : "hidden" }}>
      <h1 className={cn("split-text-h1", className)} aria-label={plain}>
        {lines.map((words, li) => (
          <Fragment key={li}>
            {words.map((word, wi) => {
              const i = index++;
              return (
                <span key={`${word}-${i}`} aria-hidden="true">
                  <motion.span
                    className="split-word"
                    initial={{ opacity: 0, y: 10 }}
                    animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ type: "spring", duration: 2, bounce: 0, delay: i * 0.05 }}
                  >
                    {word}
                  </motion.span>
                  {wi < words.length - 1 ? " " : null}
                </span>
              );
            })}
            {li < lines.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </h1>
    </div>
  );
}

export default SplitText;
