"use client";

import { useEffect, useRef, useState } from "react";

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
      // ไม่มี LIFF ID → ข้าม LINE login ไปเลย
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
          // เปิดนอก LINE app → ข้าม login ไปเลย ไม่ error
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
      // resize ให้ไม่เกิน 1280px และ compress เป็น jpeg 0.75
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
      const base64 = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
      setPhoto(base64);
    };
    img.src = objectUrl;
  }

  function handleRequestLocation() {
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("Location error", err);
        setLocationError("ไม่สามารถรับตำแหน่งได้ กรุณาอนุญาต Location ในการตั้งค่าเบราว์เซอร์");
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
      if (liff.isInClient()) {
        liff.closeWindow();
        return;
      }
    } catch {}
    window.close();
  }

  // --- UI ---

  if (step === "loading") {
    return (
      <Center>
        <Spinner />
        <Sub>กำลังโหลด...</Sub>
      </Center>
    );
  }

  if (step === "login_prompt") {
    return (
      <Container>
        <Icon>🗺️</Icon>
        <Title>สร้างแผนที่ขนส่ง</Title>
        <Body>ช่วยเพิ่มข้อมูลยานพาหนะในพื้นที่ของคุณ<br />เพื่อให้คนอื่นเดินทางได้ง่ายขึ้น</Body>
        <Btn color="#06C755" onClick={handleLoginWithLine}>เข้าสู่ระบบด้วย LINE</Btn>
        <BtnOutline onClick={handleSkipLogin}>ไม่ต้องการ Login</BtnOutline>
      </Container>
    );
  }

  if (step === "name_input") {
    return (
      <Container>
        <Icon>👋</Icon>
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
          ถัดไป
        </Btn>
      </Container>
    );
  }

  if (step === "ready") {
    const canSubmit = !!photo && !!location;
    return (
      <Container>
        <Title>สวัสดี {displayName || "เพื่อน"}! 👋</Title>
        <Body>ถ่ายรูปยานพาหนะ แล้วส่งตำแหน่ง</Body>

        {/* Photo section */}
        <Section>
          <Label>📸 รูปยานพาหนะ</Label>
          {photo ? (
            <>
              <img
                src={`data:image/jpeg;base64,${photo}`}
                alt="preview"
                style={{ width: "100%", maxWidth: 320, borderRadius: 12, objectFit: "cover" }}
              />
              <BtnOutline onClick={() => { setPhoto(null); fileRef.current && (fileRef.current.value = ""); }}>
                ถ่ายใหม่
              </BtnOutline>
            </>
          ) : (
            <>
              <Btn color={GREEN} onClick={() => fileRef.current?.click()}>📷 เปิดกล้อง</Btn>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </>
          )}
        </Section>

        {/* Location section */}
        <Section>
          <Label>📍 ตำแหน่ง</Label>
          {location ? (
            <StatusGood>✅ รับตำแหน่งแล้ว ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</StatusGood>
          ) : (
            <>
              <Btn color="#3b82f6" onClick={handleRequestLocation}>อนุญาตตำแหน่ง</Btn>
              {locationError && <StatusBad>{locationError}</StatusBad>}
            </>
          )}
        </Section>

        {/* Description */}
        <Section>
          <Label>📝 รายละเอียด (ไม่บังคับ)</Label>
          <textarea
            style={S.textarea}
            placeholder="เช่น รถสองแถวหน้าตลาด ราคา 10 บาท"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </Section>

        <Btn color={canSubmit ? GREEN : "#ccc"} onClick={handleSubmit} disabled={!canSubmit}>
          ส่งข้อมูล
        </Btn>
      </Container>
    );
  }

  if (step === "submitting") {
    return (
      <Center>
        <Spinner />
        <Sub>กำลังส่งข้อมูล...</Sub>
      </Center>
    );
  }

  if (step === "done") {
    return (
      <Container>
        <Icon style={{ background: GREEN }}>✅</Icon>
        <Title>ขอบคุณมาก!</Title>
        <Body>ข้อมูลถูกส่งให้ทีมงานแล้ว<br />จะนำไปสร้างแผนที่ขนส่งให้ทุกคนใช้ได้</Body>
        <Btn color={GREEN} onClick={handleClose}>ปิดหน้าต่าง</Btn>
      </Container>
    );
  }

  // error
  return (
    <Container>
      <Icon style={{ background: "#ef4444" }}>❌</Icon>
      <Title>เกิดข้อผิดพลาด</Title>
      <Body>{errorMsg}</Body>
      <Btn color={GREEN} onClick={() => { setStep("ready"); setErrorMsg(""); }}>ลองใหม่</Btn>
    </Container>
  );
}

// --- tiny components ---

function Container({ children }: { children: React.ReactNode }) {
  return <div style={S.container}>{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={S.center}>{children}</div>;
}
function Icon({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...S.icon, ...style }}>{children}</div>;
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
function Label({ children }: { children: React.ReactNode }) {
  return <p style={S.label}>{children}</p>;
}
function Section({ children }: { children: React.ReactNode }) {
  return <div style={S.section}>{children}</div>;
}
function StatusGood({ children }: { children: React.ReactNode }) {
  return <p style={{ color: GREEN, fontSize: 13, margin: "4px 0" }}>{children}</p>;
}
function StatusBad({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#ef4444", fontSize: 13, margin: "4px 0" }}>{children}</p>;
}
function Btn({ children, color, onClick, disabled }: { children: React.ReactNode; color: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button style={{ ...S.btn, background: color, cursor: disabled ? "not-allowed" : "pointer" }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function BtnOutline({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button style={S.btnOutline} onClick={onClick}>{children}</button>;
}
function Spinner() {
  return <div style={S.spinner} />;
}

const S: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", padding: "24px 20px",
    fontFamily: "'Noto Sans Thai', sans-serif",
    background: "#f8faf9", gap: 12, textAlign: "center",
    paddingTop: 40,
  },
  center: {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, background: "#f8faf9",
  },
  icon: {
    width: 72, height: 72, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 32, background: GREEN, marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 },
  body: { fontSize: 15, color: "#555", lineHeight: 1.6, margin: 0 },
  sub: { fontSize: 14, color: "#888" },
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
  spinner: {
    width: 40, height: 40,
    border: "4px solid #e5e7eb",
    borderTop: `4px solid ${GREEN}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
