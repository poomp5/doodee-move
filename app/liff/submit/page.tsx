"use client";

import { useEffect, useRef, useState } from "react";
import liff from "@line/liff";

type Step = "loading" | "login_prompt" | "name_input" | "camera" | "submitting" | "done" | "error";

export default function LiffSubmitPage() {
  const [step, setStep] = useState<Step>("loading");
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // base64
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_APP_ID;
    if (!liffId) {
      setErrorMsg("LIFF_APP_ID ไม่ได้ตั้งค่า");
      setStep("error");
      return;
    }

    liff
      .init({ liffId })
      .then(() => {
        if (liff.isLoggedIn()) {
          return liff.getProfile().then((profile) => {
            setLineUserId(profile.userId);
            setDisplayName(profile.displayName);
            setStep("camera");
          });
        } else {
          setStep("login_prompt");
        }
      })
      .catch((err) => {
        console.error("LIFF init failed", err);
        setErrorMsg("เปิด LIFF ไม่ได้ ลองใหม่อีกครั้ง");
        setStep("error");
      });
  }, []);

  function handleLoginWithLine() {
    liff.login();
  }

  function handleSkipLogin() {
    setStep("name_input");
  }

  function handleNameSubmit() {
    const name = nameInput.trim();
    if (!name) return;
    setDisplayName(name);
    setStep("camera");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setPhoto(base64);
    };
    reader.readAsDataURL(file);

    // ขอ location พร้อมกัน
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("Location denied", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    if (!photo) return;
    if (!location) {
      setErrorMsg("ไม่ได้รับตำแหน่ง กรุณาอนุญาต location แล้วลองใหม่");
      return;
    }

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

  function handleRetry() {
    setStep("camera");
    setPhoto(null);
    setLocation(null);
    setDescription("");
    setErrorMsg("");
  }

  // --- UI ---
  const green = "#2a9c64";

  if (step === "loading") {
    return (
      <div style={styles.center}>
        <div style={{ ...styles.spinner, borderTopColor: green }} />
        <p style={styles.subtext}>กำลังโหลด...</p>
      </div>
    );
  }

  if (step === "login_prompt") {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.iconCircle, background: green }}>🗺️</div>
        <h1 style={styles.title}>สร้างแผนที่ขนส่ง</h1>
        <p style={styles.body}>ช่วยเพิ่มข้อมูลยานพาหนะในพื้นที่ของคุณ<br />เพื่อให้คนอื่นเดินทางได้ง่ายขึ้น</p>
        <button style={{ ...styles.btnPrimary, background: "#06C755" }} onClick={handleLoginWithLine}>
          เข้าสู่ระบบด้วย LINE
        </button>
        <button style={styles.btnSecondary} onClick={handleSkipLogin}>
          ไม่ต้องการ Login
        </button>
      </div>
    );
  }

  if (step === "name_input") {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.iconCircle, background: green }}>👋</div>
        <h1 style={styles.title}>ชื่อของคุณ</h1>
        <p style={styles.body}>ใส่ชื่อเล่นหรือชื่อที่ต้องการให้แสดง</p>
        <input
          style={styles.input}
          placeholder="เช่น น้องดูดี"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
          autoFocus
        />
        <button
          style={{ ...styles.btnPrimary, background: nameInput.trim() ? green : "#ccc" }}
          onClick={handleNameSubmit}
          disabled={!nameInput.trim()}
        >
          ถัดไป
        </button>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.iconCircle, background: green }}>📸</div>
        <h1 style={styles.title}>สวัสดี {displayName}!</h1>
        <p style={styles.body}>ถ่ายรูปยานพาหนะ (รถสองแถว, รถเมล์, รถตู้)<br />ให้เห็นป้ายหมายเลขชัดเจน</p>

        {photo ? (
          <div style={{ margin: "12px 0", textAlign: "center" }}>
            <img
              src={`data:image/jpeg;base64,${photo}`}
              alt="preview"
              style={{ width: "100%", maxWidth: 320, borderRadius: 12, objectFit: "cover" }}
            />
            <button style={styles.btnSecondary} onClick={() => setPhoto(null)}>ถ่ายใหม่</button>
          </div>
        ) : (
          <>
            <button style={{ ...styles.btnPrimary, background: green }} onClick={() => fileRef.current?.click()}>
              📷 เปิดกล้องถ่ายรูป
            </button>
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

        {photo && (
          <>
            <textarea
              style={styles.textarea}
              placeholder="อธิบายเพิ่มเติม เช่น 'รถสองแถวหน้าตลาด ราคา 10 บาท'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            {location ? (
              <p style={{ color: green, fontSize: 13, margin: "4px 0 12px" }}>
                ✅ รับตำแหน่งแล้ว ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
              </p>
            ) : (
              <p style={{ color: "#f59e0b", fontSize: 13, margin: "4px 0 12px" }}>
                ⏳ กำลังรับตำแหน่ง...
              </p>
            )}
            <button
              style={{ ...styles.btnPrimary, background: location ? green : "#ccc" }}
              onClick={handleSubmit}
              disabled={!location}
            >
              ส่งข้อมูล
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div style={styles.center}>
        <div style={{ ...styles.spinner, borderTopColor: green }} />
        <p style={styles.subtext}>กำลังส่งข้อมูล...</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.iconCircle, background: green, fontSize: 40 }}>✅</div>
        <h1 style={styles.title}>ขอบคุณมาก!</h1>
        <p style={styles.body}>ข้อมูลของคุณถูกส่งให้ทีมงานแล้ว<br />จะนำไปสร้างแผนที่ขนส่งให้ทุกคนใช้ได้</p>
        <button style={{ ...styles.btnPrimary, background: green }} onClick={() => liff.closeWindow()}>
          ปิดหน้าต่าง
        </button>
      </div>
    );
  }

  // error
  return (
    <div style={styles.container}>
      <div style={{ ...styles.iconCircle, background: "#ef4444", fontSize: 40 }}>❌</div>
      <h1 style={styles.title}>เกิดข้อผิดพลาด</h1>
      <p style={styles.body}>{errorMsg}</p>
      <button style={{ ...styles.btnPrimary, background: green }} onClick={handleRetry}>
        ลองใหม่
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 20px",
    fontFamily: "'Noto Sans Thai', sans-serif",
    background: "#f8faf9",
    gap: 12,
    textAlign: "center",
  },
  center: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    background: "#f8faf9",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
  },
  body: {
    fontSize: 15,
    color: "#555",
    lineHeight: 1.6,
    margin: 0,
  },
  subtext: {
    fontSize: 14,
    color: "#888",
  },
  btnPrimary: {
    width: "100%",
    maxWidth: 320,
    padding: "14px 0",
    borderRadius: 12,
    border: "none",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    width: "100%",
    maxWidth: 320,
    padding: "12px 0",
    borderRadius: 12,
    border: "1.5px solid #ddd",
    background: "#fff",
    color: "#555",
    fontSize: 15,
    cursor: "pointer",
    marginTop: 4,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1.5px solid #ddd",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    maxWidth: 320,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1.5px solid #ddd",
    fontSize: 14,
    outline: "none",
    resize: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #e5e7eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
