import { useEffect, useState } from "react";

export type Platform = "android" | "ios" | "desktop" | "other";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac|win|linux/.test(ua)) return "desktop";
  return "other";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintPlatform, setHintPlatform] = useState<Platform>("other");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari legacy property
      window.navigator.standalone === true;
    setInstalled(standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (prompt) {
      try {
        prompt.prompt();
        await prompt.userChoice;
      } catch {
        /* noop */
      }
      setPrompt(null);
      return "prompted" as const;
    }
    setHintPlatform(detectPlatform());
    setShowHint(true);
    return "hint" as const;
  };

  return {
    installed,
    canPrompt: !!prompt,
    install,
    showHint,
    setShowHint,
    hintPlatform,
    // legacy for older code paths
    showIosHint: showHint && hintPlatform === "ios",
    setShowIosHint: setShowHint,
  };
}
