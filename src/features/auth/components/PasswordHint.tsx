import { Check, Circle } from "lucide-react";
import {
  MIN_PASSWORD_LENGTH,
  SPECIAL_CHAR_EXAMPLES,
  checkPassword,
} from "@/lib/noteme/credentialPolicy";

/**
 * Daftar syarat password yang ikut berubah saat user mengetik. Belum mengetik = abu-abu netral;
 * sudah mengetik tapi syarat belum terpenuhi = merah, supaya kekurangannya terlihat SEBELUM
 * menekan tombol (toast tetap muncul saat submit sebagai pengaman).
 */
export function PasswordHint({
  password,
  className = "",
}: {
  password: string;
  className?: string;
}) {
  const issues = checkPassword(password);
  const typed = password.length > 0;
  const items = [
    { ok: !issues.includes("length"), text: `Minimal ${MIN_PASSWORD_LENGTH} karakter` },
    {
      ok: !issues.includes("special"),
      text: `Minimal 1 karakter spesial (${SPECIAL_CHAR_EXAMPLES})`,
    },
  ];

  return (
    <ul aria-live="polite" className={`space-y-1 text-xs ${className}`}>
      {items.map((item) => (
        <li
          key={item.text}
          className={`flex items-center gap-1.5 ${
            item.ok ? "text-primary" : typed ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {item.ok ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
          {item.text}
        </li>
      ))}
    </ul>
  );
}
