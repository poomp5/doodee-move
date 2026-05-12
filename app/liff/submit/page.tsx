"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map,
  LogIn,
  UserRound,
  Camera,
  MapPin,
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  Navigation,
} from "lucide-react";

type Step = "loading" | "login_prompt" | "name_input" | "ready" | "submitting" | "done" | "error";

const GREEN = "#2a9c64";

export default function LiffSubmitPage() {
  const [step, setStep] = useState<Step>("loading");
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_APP_ID;
    if (!liffId) {
      setStep("login_prompt");
      return;
    }

    import("@line/liff").then(({ default: liff }) => {
      liff
        .init({ liffId })
        .then(() => {
          if (liff.isLoggedIn()) {
            return liff.getProfile().then((profile) => {
              setLineUserId(profile.userId);
              setDisplayName(profile.displayName);
              setStep("ready");
            });
          } else {
            setStep("login_prompt");
          }
        })
        .catch(() => {
          setStep("login_prompt");
        });
    });
  }, []);

  function handleLoginWithLine() {
    import("@line/liff").then(({ default: liff }) => liff.login());
  }

  function handleSkipLogin() {
    setStep("name_input");
  }

  function handleNameSubmit() {
    const name = nameInput.trim();
    if (!name) return;
    setDisplayName(name);
    setStep("ready");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1280;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.75).split(",")[1]);
    };
    img.src = objectUrl;
  }

  async function handleRequestLocation() {
    setLocationError("");
    const isInLiffClient = await import("@line/liff")
      .then(({ default: liff }) => liff.isInClient())
      .catch(() => false);

    if (isInLiffClient) {
      const { default: liff } = await import("@line/liff");
      liff.openWindow({ url: `${window.location.href}&openedExternally=1`, external: true });
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("เบราว์เซอร์นี้ไม่รองรับ Location");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Location error", err);
        setLocationError(err.code === 1 ? "กรุณาอนุญาต Location แล้วกดใหม่อีกครั้ง" : "รับตำแหน่งไม่ได้ ลองใหม่อีกครั้ง");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSubmit() {
    if (!photo || !location) return;
    setStep("submitting");
    try {
      const res = await fetch("/api/liff/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: lineUserId ?? "anonymous",
          displayName: displayName || "ไม่ระบุชื่อ",
          imageBase64: photo,
          latitude: location.lat,
          longitude: location.lng,
          description: description.trim() || "ส่งจาก LIFF",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("ส่งข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง");
      setStep("error");
    }
  }

  async function handleClose() {
    try {
      const { default: liff } = await import("@line/liff");
      if (liff.isInClient()) { liff.closeWindow(); return; }
    } catch {}
    window.close();
  }

  if (step === "loading") {
    return (
      <Center>
        <Loader2 size={36} color={GREEN} style={{ animation: "spin 0.8s linear infinite" }} />
        <Sub>กำลังโหลด...</Sub>
      </Center>
    );
  }

  if (step === "login_prompt") {
    return (
      <Container>
        <IconCircle color={GREEN}><Map size={28} color="#fff" /></IconCircle>
        <Title>สร้างแผนที่ขนส่ง</Title>
        <Body>ช่วยเพิ่มข้อมูลยานพาหนะในพื้นที่ของคุณ<br />เพื่อให้คนอื่นเดินทางได้ง่ายขึ้น</Body>
        <Btn color="#06C755" onClick={handleLoginWithLine}>
          <LogIn size={16} />เข้าสู่ระบบด้วย LINE
        </Btn>
        <BtnOutline onClick={handleSkipLogin}>ไม่ต้องการ Login</BtnOutline>
      </Container>
    );
  }

  if (step === "name_input") {
    return (
      <Container>
        <IconCircle color={GREEN}><UserRound size={28} color="#fff" /></IconCircle>
        <Title>ชื่อของคุณ</Title>
        <Body>ใส่ชื่อเล่นหรือชื่อที่ต้องการให้แสดง</Body>
        <input
          style={S.input}
          placeholder="เช่น น้องดูดี"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
          autoFocus
        />
        <Btn color={nameInput.trim() ? GREEN : "#ccc"} onClick={handleNameSubmit} disabled={!nameInput.trim()}>
          <Send size={16} />ถัดไป
        </Btn>
      </Container>
    );
  }

  if (step === "ready") {
    const canSubmit = !!photo && !!location;
    return (
      <Container>
        <Title>สวัสดี {displayName || "เพื่อน"}</Title>
        <Body>ถ่ายรูปยานพาหนะ แล้วส่งตำแหน่ง</Body>

        <Section>
          <Label icon={<Camera size={13} />}>รูปยานพาหนะ</Label>
          {photo ? (
            <>
              <img
                src={`data:image/jpeg;base64,${photo}`}
                alt="preview"
                style={{ width: "100%", maxWidth: 320, borderRadius: 12, objectFit: "cover" }}
              />
              <BtnOutline onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}>
                <RefreshCw size={14} />ถ่ายใหม่
              </BtnOutline>
            </>
          ) : (
            <>
              <Btn color={GREEN} onClick={() => fileRef.current?.click()}>
                <Camera size={16} />เปิดกล้อง
              </Btn>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoChange} />
            </>
          )}
        </Section>

        <Section>
          <Label icon={<MapPin size={13} />}>ตำแหน่ง</Label>
          {location ? (
            <StatusGood>
              <CheckCircle size={14} />
              รับตำแหน่งแล้ว ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </StatusGood>
          ) : (
            <>
              <Btn color="#3b82f6" onClick={handleRequestLocation}>
                <Navigation size={16} />อนุญาตตำแหน่ง
              </Btn>
              {locationError && (
                <StatusBad><AlertCircle size={13} />{locationError}</StatusBad>
              )}
            </>
          )}
        </Section>

        <Section>
          <Label icon={<FileText size={13} />}>รายละเอียด (ไม่บังคับ)</Label>
          <textarea
            style={S.textarea}
            placeholder="เช่น รถสองแถวหน้าตลาด ราคา 10 บาท"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </Section>

        <Btn color={canSubmit ? GREEN : "#ccc"} onClick={handleSubmit} disabled={!canSubmit}>
          <Send size={16} />ส่งข้อมูล
        </Btn>
      </Container>
    );
  }

  if (step === "submitting") {
    return (
      <Center>
        <Loader2 size={36} color={GREEN} style={{ animation: "spin 0.8s linear infinite" }} />
        <Sub>กำลังส่งข้อมูล...</Sub>
      </Center>
    );
  }

  if (step === "done") {
    return (
      <Container>
        <IconCircle color={GREEN}><CheckCircle size={28} color="#fff" /></IconCircle>
        <Title>ขอบคุณมาก!</Title>
        <Body>ข้อมูลถูกส่งให้ทีมงานแล้ว<br />จะนำไปสร้างแผนที่ขนส่งให้ทุกคนใช้ได้</Body>
        <Btn color={GREEN} onClick={handleClose}>
          <X size={16} />ปิดหน้าต่าง
        </Btn>
      </Container>
    );
  }

  return (
    <Container>
      <IconCircle color="#ef4444"><AlertCircle size={28} color="#fff" /></IconCircle>
      <Title>เกิดข้อผิดพลาด</Title>
      <Body>{errorMsg}</Body>
      <Btn color={GREEN} onClick={() => { setStep("ready"); setErrorMsg(""); }}>
        <RefreshCw size={16} />ลองใหม่
      </Btn>
    </Container>
  );
}

// --- components ---

function Container({ children }: { children: React.ReactNode }) {
  return <div style={S.container}>{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={S.center}>{children}</div>;
}
function IconCircle({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ ...S.iconCircle, background: color }}>{children}</div>;
}
function Title({ children }: { children: React.ReactNode }) {
  return <h1 style={S.title}>{children}</h1>;
}
function Body({ children }: { children: React.ReactNode }) {
  return <p style={S.body}>{children}</p>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p style={S.sub}>{children}</p>;
}
function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p style={S.label}>
      {icon && <span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 4 }}>{icon}</span>}
      {children}
    </p>
  );
}
function Section({ children }: { children: React.ReactNode }) {
  return <div style={S.section}>{children}</div>;
}
function StatusGood({ children }: { children: React.ReactNode }) {
  return <p style={{ color: GREEN, fontSize: 13, margin: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>{children}</p>;
}
function StatusBad({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#ef4444", fontSize: 13, margin: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>{children}</p>;
}
function Btn({ children, color, onClick, disabled }: { children: React.ReactNode; color: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      style={{ ...S.btn, background: color, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function BtnOutline({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button style={{ ...S.btnOutline, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={onClick}>
      {children}
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", padding: "40px 20px 24px",
    fontFamily: "'Noto Sans Thai', sans-serif",
    background: "#f8faf9", gap: 12, textAlign: "center",
  },
  center: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, background: "#f8faf9",
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 },
  body: { fontSize: 15, color: "#555", lineHeight: 1.6, margin: 0 },
  sub: { fontSize: 14, color: "#888", margin: 0 },
  label: { fontSize: 13, color: "#888", margin: "0 0 6px", textAlign: "left", width: "100%", maxWidth: 320 },
  section: { width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  btn: {
    width: "100%", maxWidth: 320, padding: "14px 0",
    borderRadius: 12, border: "none", color: "#fff",
    fontSize: 16, fontWeight: 600,
  },
  btnOutline: {
    width: "100%", maxWidth: 320, padding: "12px 0",
    borderRadius: 12, border: "1.5px solid #ddd",
    background: "#fff", color: "#555", fontSize: 15, cursor: "pointer",
  },
  input: {
    width: "100%", maxWidth: 320, padding: "12px 14px",
    borderRadius: 10, border: "1.5px solid #ddd",
    fontSize: 16, outline: "none", boxSizing: "border-box",
  },
  textarea: {
    width: "100%", maxWidth: 320, padding: "12px 14px",
    borderRadius: 10, border: "1.5px solid #ddd",
    fontSize: 14, outline: "none", resize: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  },
};
