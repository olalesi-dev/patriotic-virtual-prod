"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { svcs, iQs } from "./landingModalsData";

interface LandingModalsProps {
  consultModalOpen: boolean;
  setConsultModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  authModalOpen: boolean;
  setAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  authMode: "login" | "register";
  setAuthMode: React.Dispatch<React.SetStateAction<"login" | "register">>;
  initialService: string | null;
  initialConsultStep?: number;
  onLoginSuccess: () => void;
  showToast: (m: string) => void;
}

export const LandingModals: React.FC<LandingModalsProps> = ({
  consultModalOpen,
  setConsultModalOpen,
  authModalOpen,
  setAuthModalOpen,
  authMode,
  setAuthMode,
  initialService,
  initialConsultStep = 1,
  onLoginSuccess,
  showToast,
}) => {
  const [consultStep, setConsultStep] = useState(initialConsultStep);
  const [selSvc, setSelSvc] = useState<string | null>(initialService);
  const [intake, setIntake] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regState, setRegState] = useState("");
  const [regSex, setRegSex] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regPhone, setRegPhone] = useState("");

  React.useEffect(() => {
    if (consultModalOpen && initialConsultStep > 1) {
      setConsultStep(initialConsultStep);
    }
  }, [consultModalOpen, initialConsultStep]);

  const handleConsultClose = () => {
    setConsultModalOpen(false);
    setTimeout(() => {
      setConsultStep(1);
      setIntake({});
      setSelSvc(null);
    }, 300);
  };

  const handleAuthClose = () => {
    setAuthModalOpen(false);
  };

  const cN = (s: number) => {
    if (s === 2 && !selSvc) {
      showToast("Select a service.");
      return;
    }
    setConsultStep(s);
  };

  const cB = (s: number) => {
    setConsultStep(s);
  };

  const subC = async () => {
    try {
      if (!auth.currentUser) {
        showToast("Please log in first to continue.");
        handleConsultClose();
        setAuthModalOpen(true);
        return;
      }
      setIsSubmitting(true);
      const sv = svcs.find((x) => x.k === selSvc);
      if (!sv) throw new Error("Service not found");

      const tok = await auth.currentUser.getIdToken();
      // Use window.location.origin as base instead of empty API
      const consRes = await fetch(`/api/v1/consultations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({
          serviceKey: sv.k,
          intake: intake,
          stripeProductId: sv.priceId,
        }),
      });

      if (!consRes.ok) throw new Error("Failed to create consultation");
      const consData = await consRes.json();
      const consultationId = consData.id;
      sessionStorage.setItem("pendingConsultationId", consultationId);
      localStorage.setItem("pendingConsultationId", consultationId);

      const payRes = await fetch(`/api/v1/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({
          priceId: sv.priceId,
          serviceKey: sv.k,
          consultationId: consultationId,
          uid: auth.currentUser.uid,
          returnUrl: window.location.origin + "/?payment=success",
          cancelUrl: window.location.origin + "/?payment=cancelled",
        }),
      });

      const payData = await payRes.json();
      if (payData.url) {
        window.location.href = payData.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error(error);
      setIsSubmitting(false);
      showToast(error.message || "Failed to process request.");
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      showToast("Please enter email and password.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setAuthModalOpen(false);
      onLoginSuccess();
    } catch (e: any) {
      showToast(e.message || "Login failed");
    }
  };

  const currentIQs = selSvc ? iQs[selSvc as keyof typeof iQs] || [] : [];
  const selectedServiceData = svcs.find((x) => x.k === selSvc);

  return (
    <>
      {/* AUTH MODAL */}
      <div
        className={`mo ${authModalOpen ? "active" : ""}`}
        onClick={handleAuthClose}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          {authMode === "login" ? (
            <div id="loginForm">
              <h2>Welcome back</h2>
              <p className="ms">Log in to Patriotic Virtual Telehealth.</p>
              <div className="fg">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="fg">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-large"
                style={{ width: "100%", marginTop: "8px" }}
                onClick={handleLogin}
              >
                Log In
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  margin: "16px 0",
                }}
              >
                <div style={{ flex: 1, height: "1px", background: "var(--g200)" }}></div>
                <span style={{ fontSize: "12px", color: "var(--g400)", fontWeight: 500 }}>
                  OR
                </span>
                <div style={{ flex: 1, height: "1px", background: "var(--g200)" }}></div>
              </div>
              <p className="ff" style={{ marginTop: "8px" }}>
                New here? <a onClick={() => setAuthMode("register")}>Create account</a>
              </p>
            </div>
          ) : (
            <div id="registerForm">
              <h2 style={{ marginBottom: "4px" }}>Get started</h2>
              <p className="ms" style={{ marginBottom: "16px" }}>Currently available in Florida.</p>

              {/* ... Reduced simplified registration form for exact parity ... */}
              <div className="fg" style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px" }}>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  style={{ padding: "10px 12px" }}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="fg" style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px" }}>Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  style={{ padding: "10px 12px" }}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary btn-large"
                style={{ width: "100%", marginBottom: "14px" }}
                onClick={() => {
                  showToast("Please use the main sign-up page for the full registration.");
                  window.location.href = "/signup";
                }}
              >
                Create Account
              </button>
              <p className="ff">
                Have an account? <a onClick={() => setAuthMode("login")}>Log in</a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CONSULT MODAL */}
      <div
        className={`mo ${consultModalOpen ? "active" : ""}`}
        onClick={handleConsultClose}
      >
        <div className="modal cm" onClick={(e) => e.stopPropagation()}>
          <div id="cS1" className={consultStep === 1 ? "" : "hidden"}>
            <h2>Start a Visit</h2>
            <p className="ms">
              Choose your service. 100% confidential. Protocol-based care.
            </p>
            <div className="ip">
              <div className="ipb act"></div>
              <div className="ipb"></div>
              <div className="ipb"></div>
            </div>
            <div className="iq">
              <h3>What brings you in?</h3>
              <p>Select the service that fits your needs.</p>
              <div className="rg" id="svcSel">
                {svcs.map((s) => (
                  <div
                    key={s.k}
                    className={`ro ${selSvc === s.k ? "sel" : ""}`}
                    onClick={() => setSelSvc(s.k)}
                  >
                    <div className="rd2"></div>
                    <span>
                      {s.icon} {s.name} — ${s.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ia">
              <button className="btn btn-ghost" onClick={handleConsultClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => cN(2)}>
                Continue →
              </button>
            </div>
          </div>

          <div id="cS2" className={consultStep === 2 ? "" : "hidden"}>
            <h2>Safety Screening</h2>
            <p className="ms">
              These questions follow our clinical safety protocols.
            </p>
            <div className="ip">
              <div className="ipb done"></div>
              <div className="ipb act"></div>
              <div className="ipb"></div>
            </div>
            <div id="iQs">
              {currentIQs.map((q: any) =>
                q.t === "yn" ? (
                  <div className="iq" key={q.k}>
                    <h3>{q.l}</h3>
                    <div className="rg" style={{ flexDirection: "row", gap: "10px" }}>
                      <div
                        className={`ro ${intake[q.k] === true ? "sel" : ""}`}
                        style={{ flex: 1 }}
                        onClick={() => setIntake({ ...intake, [q.k]: true })}
                      >
                        <div className="rd2"></div>
                        <span>Yes</span>
                      </div>
                      <div
                        className={`ro ${intake[q.k] === false ? "sel" : ""}`}
                        style={{ flex: 1 }}
                        onClick={() => setIntake({ ...intake, [q.k]: false })}
                      >
                        <div className="rd2"></div>
                        <span>No</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="iq" key={q.k}>
                    <h3>{q.l}</h3>
                    <div className="fg" style={{ margin: 0 }}>
                      <input
                        placeholder={q.p || ""}
                        value={intake[q.k] || ""}
                        onChange={(e) =>
                          setIntake({ ...intake, [q.k]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
            <div className="ia">
              <button className="btn btn-ghost" onClick={() => cB(1)}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={() => cN(3)}>
                Continue →
              </button>
            </div>
          </div>

          <div id="cS3" className={consultStep === 3 ? "" : "hidden"}>
            <h2>Review & Submit</h2>
            <p className="ms">Confirm before sending to a provider.</p>
            <div className="ip">
              <div className="ipb done"></div>
              <div className="ipb done"></div>
              <div className="ipb act"></div>
            </div>
            <div
              id="rSum"
              style={{
                background: "var(--g50)",
                borderRadius: "var(--r-sm)",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              {selectedServiceData && (
                <>
                  <div className="consult-rsum-block">
                    <div className="consult-rsum-label">Service</div>
                    <div className="consult-rsum-value">
                      {selectedServiceData.icon} {selectedServiceData.name}
                    </div>
                  </div>
                  <div className="consult-rsum-block">
                    <div className="consult-rsum-label">Price</div>
                    <div className="consult-rsum-value">
                      ${selectedServiceData.price}
                    </div>
                  </div>
                  <div className="consult-rsum-block">
                    <div
                      className="consult-rsum-label"
                      style={{ marginBottom: "8px" }}
                    >
                      Responses
                    </div>
                    {Object.entries(intake).length > 0 ? (
                      Object.entries(intake).map(([k, v]) => (
                        <div className="consult-rsum-row" key={k}>
                          <span className="consult-rsum-key">
                            {k
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (s) => s.toUpperCase())}
                          </span>
                          <span className="consult-rsum-answer">
                            {typeof v === "boolean" ? (v ? "Yes" : "No") : v}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="consult-rsum-empty">
                        No additional responses.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--g500)",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              By submitting you confirm the information is accurate. A
              board-certified provider will review against our treatment
              protocols within 24 hours.
            </p>
            <div className="ia">
              <button className="btn btn-ghost" onClick={() => cB(2)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={subC}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Submit Visit →"}
              </button>
            </div>
          </div>
          
          <div id="cS4" className={consultStep === 4 ? "" : "hidden"} style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "var(--emerald-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 20px"
              }}>
            ✓
          </div>
          <h2 style={{ marginBottom: "8px" }}>Visit Submitted!</h2>
          <p className="ms" style={{ maxWidth: "340px", margin: "0 auto 28px" }}>
            A board-certified provider will be in contact with the patient in 24 hours to schedule their appointment. An email confirmation has also been sent to your registered address.
          </p>
          <button className="btn btn-primary" onClick={() => {
                handleConsultClose();
                window.location.href = "/dashboard";
              }}>
            Go to Dashboard
          </button>
        </div>

        </div>
      </div>
    </>
  );
};
