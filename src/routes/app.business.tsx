import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getBusiness, setBusiness, type Business } from "@/lib/store";
import { getRemoteSettings, saveRemoteSettings } from "@/lib/remote-settings";
import { Info, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/business")({
  head: () => ({ meta: [{ title: "Business & Bank Info" }] }),
  component: BusinessPage,
});

function BusinessPage() {
  const nav = useNavigate();
  const [b, setB] = useState<Business | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoErr, setLogoErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const remote = await getRemoteSettings();
        const business = remote.business ?? getBusiness();
        setBusiness(business);
        setB(business);
        if (!remote.business) await saveRemoteSettings({ business });
      } catch (error) {
        console.error("Unable to load business settings", error);
        setB(getBusiness());
      }
    };
    void load();
  }, []);
  if (!b) return null;

  const on = <K extends keyof Business>(k: K, v: Business[K]) => setB({ ...b, [k]: v });

  const onPickLogo = async (file: File | null | undefined) => {
    if (!file || !b) return;
    setLogoErr(null);
    if (!/^image\//.test(file.type)) {
      setLogoErr("Please choose an image file (PNG or JPG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setLogoErr("Image too large. Max 8MB.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("read failed"));
        r.readAsDataURL(file);
      });
      // Downscale to max 512px on longest side, JPEG to keep localStorage small.
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const MAX = 512;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      // white background for transparency-free JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const isPng = file.type === "image/png";
      const out = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.9);
      setB({ ...b, logo: out });
    } catch (e) {
      setLogoErr("Couldn't process this image. Try another one.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = () => b && setB({ ...b, logo: "" });

  const save = async () => {
    try {
      await saveRemoteSettings({ business: b });
      setBusiness(b);
      nav({ to: "/app/dashboard" });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save business settings");
    }
  };

  return (
    <AppShell title="Business & Bank Info" back="/app/dashboard" right={<Info size={20} />}>
      <div className="section-title" style={{ marginTop: 0 }}>
        Business Logo
      </div>
      <div className="flex items-center gap-4 mb-1">
        <div
          className="grid place-items-center shrink-0 overflow-hidden"
          style={{
            width: 84,
            height: 84,
            borderRadius: 14,
            background: b.logo ? "#ffffff" : "rgba(249,115,22,0.15)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {b.logo ? (
            <img
              src={b.logo}
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span className="font-extrabold" style={{ color: "var(--primary)", fontSize: 30 }}>
              {(b.name || "A").trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            Shown on every quotation PDF, invoice, and delivery note. PNG or JPG, ideally square.
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="btn-outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} /> {uploading ? "Processing…" : b.logo ? "Replace" : "Upload Logo"}
            </button>
            {b.logo && (
              <button
                type="button"
                className="btn-outline"
                onClick={removeLogo}
                style={{ color: "#ef4444" }}
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPickLogo(e.target.files?.[0])}
          />
        </div>
      </div>
      {logoErr && (
        <div className="text-[12px] mb-2" style={{ color: "#ef4444" }}>
          {logoErr}
        </div>
      )}

      <label className="field-label">Business Name</label>
      <input
        className="field mb-4"
        value={b.name}
        onChange={(e) => on("name", e.target.value)}
        placeholder="Business name"
      />

      <label className="field-label">Business Category</label>
      <input
        className="field"
        value={b.category}
        onChange={(e) => on("category", e.target.value)}
        placeholder="Business Supplies/Equipment"
      />

      <label className="field-label mt-4">Address</label>
      <input
        className="field"
        value={b.address}
        onChange={(e) => on("address", e.target.value)}
        placeholder="Office address"
      />

      <label className="field-label mt-4">Phone</label>
      <input
        className="field"
        value={b.phone}
        onChange={(e) => on("phone", e.target.value)}
        placeholder="03XX XXXXXXX"
      />

      <label className="field-label mt-4">Email</label>
      <input
        className="field"
        value={b.email}
        onChange={(e) => on("email", e.target.value)}
        placeholder="you@business.com"
      />

      <div className="section-title">Tax Details</div>
      <label className="field-label">GSTIN/VAT/Business Label</label>
      <input
        className="field"
        value={b.taxLabel}
        onChange={(e) => on("taxLabel", e.target.value)}
        placeholder="GSTIN / VAT / Label"
      />
      <label className="field-label mt-3">GSTIN/VAT/Business Number</label>
      <input
        className="field"
        value={b.taxNumber}
        onChange={(e) => on("taxNumber", e.target.value)}
        placeholder="Number"
      />

      <div className="section-title">Payment Instructions - Bank Details</div>
      <label className="field-label">Bank Info</label>
      <textarea
        className="field min-h-[180px] resize-y font-mono text-[13px]"
        value={b.bankInfo}
        onChange={(e) => on("bankInfo", e.target.value)}
        placeholder={"Bank Name : \nAccount Title : \nIBAN : \nAcc No : "}
      />

      <button className="btn-primary mt-6" onClick={save}>
        Update
      </button>
    </AppShell>
  );
}
