import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "installAppDismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // Show install pill by default (iOS + browsers without BIP); BIP browsers keep it too.
    setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
      setDeferred(null);
    } else {
      setShowIOSHelp(true);
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <>
      <div
        className="fixed z-[60] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-2xl"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "linear-gradient(135deg, #ff8a3d, #f97316)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 12px 40px rgba(249,115,22,0.45)",
        }}
      >
        <button
          onClick={handleInstall}
          className="flex items-center gap-2 text-white text-sm font-bold uppercase tracking-wider"
        >
          <Download size={16} />
          Install App
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="ml-1 rounded-full p-1 text-white/90 hover:bg-white/15"
        >
          <X size={14} />
        </button>
      </div>

      {showIOSHelp && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border-strong)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                Install on iPhone / iPad
              </div>
              <button
                onClick={() => setShowIOSHelp(false)}
                aria-label="Close"
                className="icon-ring"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="space-y-3 text-sm" style={{ color: "var(--foreground)" }}>
              <li className="flex gap-3 items-start">
                <span
                  className="rounded-full w-6 h-6 grid place-items-center text-xs font-bold"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  1
                </span>
                <div>
                  Tap the <Share size={14} className="inline align-middle" /> <b>Share</b> button in
                  Safari's toolbar.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span
                  className="rounded-full w-6 h-6 grid place-items-center text-xs font-bold"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  2
                </span>
                <div>
                  Scroll and tap <b>Add to Home Screen</b>.
                </div>
              </li>
              <li className="flex gap-3 items-start">
                <span
                  className="rounded-full w-6 h-6 grid place-items-center text-xs font-bold"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  3
                </span>
                <div>
                  Tap <b>Add</b> — the app icon will appear on your Home Screen.
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
