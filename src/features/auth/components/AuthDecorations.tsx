/**
 * Elemen dekoratif halaman auth: blob pastel di pojok, sticky note kecil dengan tulisan
 * tangan, dan coretan (doodle) tipis. Semuanya statis & pointer-events-none — murni hiasan,
 * meniru komposisi referensi (blob warna lembut + note tempel + coretan tangan di sekitar
 * konten utama).
 */
export function AuthDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Blob pastel pojok kiri atas */}
      <svg
        className="absolute -left-16 -top-20 h-72 w-72 opacity-70 sm:h-96 sm:w-96"
        viewBox="0 0 200 200"
      >
        <path
          fill="#c7d7fb"
          d="M45.6,-52.6C58.8,-42.1,68.9,-26.7,71.4,-9.9C73.9,7,68.8,25.3,57.6,38.9C46.4,52.6,29.1,61.6,10.4,65.2C-8.3,68.8,-28.4,67,-44.1,56.6C-59.8,46.2,-71.1,27.2,-73.2,7.2C-75.3,-12.8,-68.2,-33.8,-54.4,-45.3C-40.6,-56.8,-20.3,-58.8,-1.6,-57.5C17.1,-56.2,34.1,-51.6,45.6,-52.6Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* Blob pastel pojok kanan bawah */}
      <svg
        className="absolute -bottom-24 -right-16 h-80 w-80 opacity-70 sm:h-[26rem] sm:w-[26rem]"
        viewBox="0 0 200 200"
      >
        <path
          fill="#bdeecb"
          d="M41.9,-49.5C53.7,-40.5,61.9,-25.4,64.4,-9.1C66.9,7.2,63.7,24.6,54.1,37.9C44.4,51.2,28.4,60.4,10.9,63.8C-6.6,67.2,-25.6,64.8,-41.2,55.1C-56.8,45.4,-69,28.4,-71.1,10.2C-73.2,-8,-65.2,-27.4,-51.6,-37.7C-38,-48,-19,-49.2,-0.7,-49C17.6,-48.8,30.1,-58.5,41.9,-49.5Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* Sticky note kanan atas: "Your Notes Your Story" */}
      <div className="absolute right-6 top-6 rotate-[6deg] sm:right-14 sm:top-10">
        <svg width="150" height="90" viewBox="0 0 150 90" className="drop-shadow-sm">
          <rect
            x="4"
            y="4"
            width="142"
            height="82"
            rx="6"
            fill="#fde68a"
            transform="rotate(-3 75 45)"
          />
        </svg>
        <p
          className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center text-[13px] leading-tight text-amber-900"
          style={{ fontFamily: "cursive" }}
        >
          Your Notes
          <br />
          Your Story
        </p>
      </div>

      {/* Sticky note kiri bawah: "Better Notes Bigger Dreams" */}
      <div className="absolute -left-3 bottom-10 -rotate-[8deg] sm:left-10 sm:bottom-16">
        <svg width="140" height="110" viewBox="0 0 140 110" className="drop-shadow-sm">
          <rect
            x="4"
            y="4"
            width="132"
            height="102"
            rx="6"
            fill="#fef3c7"
            transform="rotate(4 70 55)"
          />
        </svg>
        <p
          className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center text-[13px] leading-tight text-amber-900"
          style={{ fontFamily: "cursive" }}
        >
          Better Notes
          <br />
          Bigger Dreams
        </p>
      </div>

      {/* Coretan tangan kecil dekat judul */}
      <svg
        className="absolute left-[300px] top-[150px] hidden h-10 w-10 text-indigo-400 lg:block"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path d="M4 30 L14 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 34 L28 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {/* Bulan/ayunan kecil dekat form */}
      <svg
        className="absolute bottom-24 right-[15%] hidden h-8 w-8 text-indigo-400 lg:block"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M20 13a8 8 0 1 1-9-9 6.5 6.5 0 0 0 9 9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
