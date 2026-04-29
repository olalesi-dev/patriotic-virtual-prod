"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export const CookieBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShow(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        background: "#1f2937",
        color: "white",
        padding: "16px",
        zIndex: 100000,
        boxShadow: "0 -4px 10px rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        fontSize: "14px",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: "250px", maxWidth: "800px", textAlign: "left", lineHeight: 1.5 }}>
        <strong>HIPAA Privacy & Cookie Consent:</strong> We use essential cookies to provide our telehealth services. By clicking &quot;Accept All&quot;, you also consent to our use of non-essential cookies for analytics and marketing, in accordance with our{" "}
        <Link href="/privacy-policy" style={{ color: "#60a5fa", textDecoration: "underline", fontWeight: 600 }}>
          Privacy Policy
        </Link>
        . No HIPAA-protected data is shared with third-party tracking pixels.
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={acceptCookies}
          style={{
            background: "var(--primary, #2563eb)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Accept All
        </button>
        <button
          onClick={declineCookies}
          style={{
            background: "transparent",
            color: "#d1d5db",
            border: "1px solid #4b5563",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Essential Only
        </button>
      </div>
    </div>
  );
};
