"use client";

import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { apiFetchJson } from "@/lib/api-client";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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
  const checkoutMutation = useMutation({
    mutationFn: async ({
      token,
      serviceKey,
      intake,
      priceId,
      uid,
      returnUrl,
      cancelUrl,
    }: {
      token: string;
      serviceKey: string;
      intake: Record<string, any>;
      priceId: string;
      uid: string;
      returnUrl: string;
      cancelUrl: string;
    }) => {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const consultation = await apiFetchJson<{ id: string }>("/api/v1/consultations", {
        method: "POST",
        headers,
        body: {
          serviceKey,
          intake,
          stripeProductId: priceId,
        },
      });

      const payment = await apiFetchJson<{ url?: string }>("/api/v1/payments/create-checkout-session", {
        method: "POST",
        headers,
        body: {
          priceId,
          serviceKey,
          consultationId: consultation.id,
          uid,
          returnUrl,
          cancelUrl,
        },
      });

      return {
        consultationId: consultation.id,
        url: payment.url,
      };
    },
  });

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
    if (s === 3) {
      if (intake['florida_confirmation'] !== 'Yes') {
        showToast("Services are currently available to patients located in Florida only.");
        return;
      }
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
      const payData = await checkoutMutation.mutateAsync({
        token: tok,
        serviceKey: sv.k,
        intake,
        priceId: sv.priceId,
        uid: auth.currentUser.uid,
        returnUrl: window.location.origin + "/?payment=success",
        cancelUrl: window.location.origin + "/?payment=cancelled",
      });
      sessionStorage.setItem("pendingConsultationId", payData.consultationId);
      localStorage.setItem("pendingConsultationId", payData.consultationId);
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
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setAuthModalOpen(false);
      onLoginSuccess();
    } catch (e: any) {
      showToast(e.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in patients
      const patientRef = doc(db, 'patients', user.uid);
      await setDoc(patientRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        role: 'patient',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setAuthModalOpen(false);
      onLoginSuccess();
      if (authMode === "register") {
        setConsultModalOpen(true);
      }
    } catch (e: any) {
      showToast(e.message || "Google auth failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!regEmail || !regPassword || !regFirst || !regLast) {
      showToast("Please fill in first name, last name, email and password.");
      return;
    }
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: `${regFirst} ${regLast}`.trim()
      });

      await setDoc(doc(db, 'patients', user.uid), {
        uid: user.uid,
        email: regEmail,
        name: `${regFirst} ${regLast}`.trim(),
        firstName: regFirst,
        lastName: regLast,
        dob: regDob || null,
        sex: regSex || null,
        state: regState || null,
        phone: regPhone || null,
        role: 'patient',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast("Account created! Welcome.");
      setAuthModalOpen(false);
      // Automatically open the consultation modal after successful registration
      setConsultModalOpen(true);
      setConsultStep(1);
    } catch (e: any) {
      showToast(e.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
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

              <div className="fr">
                <div className="fg">
                  <label>First Name</label>
                  <input
                    placeholder="First"
                    value={regFirst}
                    onChange={(e) => setRegFirst(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Last Name</label>
                  <input
                    placeholder="Last"
                    value={regLast}
                    onChange={(e) => setRegLast(e.target.value)}
                  />
                </div>
              </div>

              <div className="fg">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="fg">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <div className="fr">
                <div className="fg">
                  <label>State</label>
                  <select value={regState} onChange={(e) => setRegState(e.target.value)}>
                    <option value="">Select state</option>
                    <option value="Florida">Florida</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Biological Sex *</label>
                  <select value={regSex} onChange={(e) => setRegSex(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="fr">
                <div className="fg">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Phone Number *</label>
                  <input
                    placeholder="(555) 555-5555"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary btn-large"
                style={{ width: "100%", marginBottom: "14px", marginTop: "8px" }}
                onClick={handleRegister}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  margin: "12px 0 20px",
                }}
              >
                <div style={{ flex: 1, height: "1px", background: "var(--g200)" }}></div>
                <span style={{ fontSize: "12px", color: "var(--g400)", fontWeight: 500 }}>
                  OR
                </span>
                <div style={{ flex: 1, height: "1px", background: "var(--g200)" }}></div>
              </div>

              <button
                className="btn btn-outline"
                style={{ 
                  width: "100%", 
                  marginBottom: "20px",
                  borderColor: "var(--g200)",
                  background: "transparent",
                  color: "#fff",
                  fontSize: "15px"
                }}
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ width: "18px", height: "18px" }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
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
            <div className="iq" style={{ marginTop: "16px", padding: "16px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px" }}>
              <h3 style={{ color: "var(--navy)", marginBottom: "4px" }}>Florida Residency Confirmation <span style={{color: "red"}}>*</span></h3>
              <p style={{ fontSize: "12px", marginBottom: "12px", color: "var(--g500)" }}>Are you physically located in the state of Florida at this time?</p>
              <select 
                value={intake['florida_confirmation'] || ''} 
                onChange={(e) => setIntake({ ...intake, florida_confirmation: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--g200)" }}
              >
                <option value="">Select an option</option>
                <option value="Yes">Yes, I am located in Florida</option>
                <option value="No">No, I am not in Florida</option>
              </select>
            </div>
            <div className="ia" style={{ marginTop: "24px" }}>
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
