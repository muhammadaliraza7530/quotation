import { useEffect, useState } from "react";
import { X } from "lucide-react";
import confetti from "canvas-confetti";

const STORAGE_KEY = "brandup_welcome_seen_v2";

export function BrandUpWelcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      ["/login", "/signup", "/forgot-password", "/reset-password"].includes(
        window.location.pathname,
      )
    )
      return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const colors = ["#f97316", "#ea580c", "#fbbf24", "#ffffff", "#fde68a", "#000000"];

    // Big central explosion — like a real firework popping.
    const bigBurst = (origin: { x: number; y: number }) => {
      confetti({
        particleCount: 180,
        spread: 360,
        startVelocity: 55,
        ticks: 260,
        origin,
        colors,
        scalar: 1.1,
        shapes: ["circle", "square"],
      });
      confetti({
        particleCount: 90,
        spread: 140,
        startVelocity: 75,
        ticks: 300,
        origin,
        colors,
        scalar: 1.3,
      });
    };

    bigBurst({ x: 0.5, y: 0.45 });
    setTimeout(() => bigBurst({ x: 0.2, y: 0.35 }), 220);
    setTimeout(() => bigBurst({ x: 0.8, y: 0.35 }), 380);
    setTimeout(() => bigBurst({ x: 0.5, y: 0.55 }), 560);

    // Continuous side streams as it settles.
    const end = Date.now() + 3200;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 80,
        startVelocity: 60,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 80,
        startVelocity: 60,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [open]);

  const close = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(20,10,4,0.92) 0%, rgba(0,0,0,0.96) 70%)",
        backdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="brandup-title"
    >
      <div
        className="relative w-full max-w-md rounded-[26px] px-6 pt-7 pb-6"
        style={{
          background: "linear-gradient(180deg, #1a0f07 0%, #0d0805 100%)",
          border: "1.5px solid #f97316",
          boxShadow:
            "0 0 0 1px rgba(249,115,22,0.35), 0 30px 80px -20px rgba(249,115,22,0.55), 0 0 120px -20px rgba(249,115,22,0.6)",
          animation: "brandupPop 420ms cubic-bezier(0.22, 1.4, 0.36, 1) both",
        }}
      >
        <button
          aria-label="Close"
          onClick={close}
          className="absolute top-3.5 right-3.5 h-9 w-9 rounded-full grid place-items-center transition-colors"
          style={{
            border: "1px solid rgba(249,115,22,0.55)",
            color: "#fff",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className="h-28 w-28 rounded-[24px] grid place-items-center overflow-hidden"
            style={{
              background: "#fff",
              boxShadow:
                "0 10px 30px -10px rgba(249,115,22,0.85), 0 0 0 4px rgba(255,255,255,0.08), 0 0 60px -10px rgba(249,115,22,0.6)",
              animation: "brandupLogoFloat 3s ease-in-out infinite",
            }}
          >
            <img
              src="/brandup-logo.jpg"
              alt="Brand Up logo"
              className="h-full w-full object-contain p-1.5"
              draggable={false}
            />
          </div>

          <h2
            id="brandup-title"
            className="mt-5 text-[19px] font-extrabold tracking-tight text-white"
          >
            Designed &amp; Developed by
          </h2>
          <div
            className="mt-1 text-[38px] leading-[1.05] font-extrabold"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              background: "linear-gradient(180deg, #ffb46b 0%, #f97316 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.01em",
            }}
          >
            Brand Up
          </div>
          <div
            className="mt-2 h-[2px] w-16 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, #f97316, transparent)" }}
          />

          <p
            className="mt-5 text-[13.5px] leading-[1.6]"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            A{" "}
            <span className="font-bold" style={{ color: "#fff" }}>
              professional software
            </span>{" "}
            crafted by Brand Up to help you create polished quotations, invoices &amp; business
            documents in under a minute — built for speed, designed to impress.
          </p>

          <button
            onClick={close}
            className="mt-6 w-full rounded-full py-3.5 text-[13px] font-extrabold tracking-[0.18em] uppercase text-white transition-transform active:scale-[0.98]"
            style={{
              background: "linear-gradient(180deg, #fb923c 0%, #ea580c 100%)",
              boxShadow:
                "0 12px 30px -10px rgba(249,115,22,0.85), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            Upgrade with Brand Up
          </button>

          <button
            onClick={close}
            className="mt-3 w-full rounded-full py-3.5 text-[12.5px] font-extrabold tracking-[0.18em] uppercase transition-colors"
            style={{
              border: "1.5px solid #f97316",
              color: "#fdba74",
              background: "transparent",
            }}
          >
            Explore Preview
          </button>

          <div
            className="mt-5 text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "rgba(253,186,116,0.55)" }}
          >
            © Brand Up Studio
          </div>
        </div>
      </div>

      <style>{`
        @keyframes brandupPop {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          60% { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes brandupLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
