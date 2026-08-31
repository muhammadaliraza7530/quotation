import { supabase } from "../supabase/client";

type OAuthProvider = "google" | "apple" | "microsoft" | "lovable";
type OAuthTokens = { access_token: string; refresh_token: string };
type SignInOptions = { redirect_uri?: string; extraParams?: Record<string, string> };
type SignInWithOAuthResult =
  | { tokens: OAuthTokens; error: null; redirected?: false }
  | { tokens?: undefined; error: Error; redirected?: false }
  | { tokens?: undefined; error: null; redirected: true };

const OAUTH_BROKER_URL = "/~oauth/initiate";
const SUPPORTED_OAUTH_ORIGINS = ["https://oauth.lovable.app", "https://lovable.dev"];
const EXPECTED_MESSAGE_TYPE = "authorization_response";
const POPUP_CHECK_INTERVAL_MS = 500;

function generateState() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }

  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function startWebMessageListener(supportedOrigins: string[]) {
  let resolvePromise: (value: unknown) => void;
  const messagePromise = new Promise<unknown>((resolve) => {
    resolvePromise = resolve;
  });

  function handleMessage(event: MessageEvent) {
    if (!supportedOrigins.some((origin) => origin === event.origin)) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    const msg = data as Record<string, unknown>;
    if (msg.type !== EXPECTED_MESSAGE_TYPE) return;
    resolvePromise(msg.response);
  }

  window.addEventListener("message", handleMessage);

  return {
    messagePromise,
    cleanup: () => window.removeEventListener("message", handleMessage),
  };
}

function processOAuthResponse(data: unknown, expectedState: string) {
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  if (obj.state !== expectedState) {
    return { error: new Error("State is invalid") };
  }

  if (obj.error) {
    if (obj.error === "legacy_flow") {
      return {
        error: new Error(
          "This flow is not supported in Preview mode. Please open the app in a new tab to sign in.",
        ),
      };
    }

    return {
      error: new Error(
        typeof obj.error_description === "string" ? obj.error_description : "Sign in failed",
      ),
    };
  }

  if (typeof obj.access_token !== "string" || typeof obj.refresh_token !== "string") {
    return { error: new Error("No tokens received") };
  }

  return {
    tokens: { access_token: obj.access_token, refresh_token: obj.refresh_token },
    error: null,
  };
}

function isDevice() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

function getPopupDimensions() {
  const width = window.outerWidth * 0.5;
  const height = window.outerHeight * 0.5;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  return { width, height, left, top };
}

function openPopup(url: string) {
  if (isDevice()) {
    return window.open(url, "_blank");
  }

  const { width, height, left, top } = getPopupDimensions();
  return window.open(url, "oauth", `width=${width},height=${height},left=${left},top=${top}`);
}

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: OAuthProvider,
      opts: SignInOptions = {},
    ): Promise<SignInWithOAuthResult> => {
      const state = generateState();
      const redirect_uri = opts.redirect_uri ?? window.location.origin;
      const params = new URLSearchParams({
        provider,
        redirect_uri,
        state,
        response_mode: "web_message",
        ...opts.extraParams,
      });
      const url = `${OAUTH_BROKER_URL}?${params.toString()}`;

      const { messagePromise, cleanup } = startWebMessageListener(SUPPORTED_OAUTH_ORIGINS);
      const popup = openPopup(url);

      if (!popup) {
        cleanup();
        window.location.href = url;
        return { error: null, redirected: true };
      }

      const popupClosedPromise = new Promise<never>((_, reject) => {
        const interval = window.setInterval(() => {
          if (popup.closed) {
            window.clearInterval(interval);
            reject(new Error("Sign in was cancelled"));
          }
        }, POPUP_CHECK_INTERVAL_MS);
      });

      try {
        const data = await Promise.race([messagePromise, popupClosedPromise]);
        const result = processOAuthResponse(data, state);
        if (result.error) return { error: result.error };
        await supabase.auth.setSession(result.tokens);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error : new Error(String(error)) };
      } finally {
        cleanup();
        popup.close();
      }
    },
  },
};
