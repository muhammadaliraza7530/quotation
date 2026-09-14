import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getPin, setPin } from "@/lib/store";
import { getRemoteSettings, saveRemoteSettings } from "@/lib/remote-settings";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [pin, setPinState] = useState("");
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const remote = await getRemoteSettings();
        if (remote.pin !== undefined) {
          setPin(remote.pin);
          setHasPin(!!remote.pin);
        } else {
          const localPin = getPin();
          setHasPin(!!localPin);
          await saveRemoteSettings({ pin: localPin });
        }
      } catch (error) {
        console.error("Unable to load settings", error);
        setHasPin(!!getPin());
      }
    };
    void load();
  }, []);

  const savePin = async () => {
    if (pin && pin.length < 4) {
      alert("PIN must be at least 4 digits");
      return;
    }
    try {
      await saveRemoteSettings({ pin: pin || null });
      setPin(pin || null);
      setHasPin(!!pin);
      setPinState("");
      alert(pin ? "PIN saved" : "PIN removed");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save PIN");
    }
  };

  return (
    <AppShell title="Settings" back="/app/dashboard">
      <div className="section-title">Security</div>
      <div
        className="rounded-2xl p-4 border"
        style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}
      >
        <label className="field-label">
          {hasPin ? "Change / Remove PIN" : "Set PIN"} (leave empty to remove)
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            inputMode="numeric"
            className="field"
            value={pin}
            onChange={(e) => setPinState(e.target.value)}
            placeholder="••••"
          />
          <button className="btn-outline" onClick={savePin}>
            <Lock size={14} /> Save
          </button>
        </div>
        <div className="text-[12px] text-muted-foreground mt-2">
          Current: {hasPin ? "PIN set" : "no PIN"}
        </div>
      </div>
    </AppShell>
  );
}
