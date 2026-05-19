    /* === MAIN APP === */
    function renderSvc(f = "all") {
      const g = document.getElementById("svcGrid");
      if (!g) return;
      const list = f === "all" ? svcs : svcs.filter((s) => s.cat.includes(f));
      const dict = i18n[currentLang] || i18n.en;
      g.innerHTML = list
        .map(
          (s) => {
            const name = dict[`svc-${s.k}-name`] || s.name;
            const desc = dict[`svc-${s.k}-desc`] || s.desc;
            return `<div class="svc" data-c="${s.c}" onclick="startSvc('${s.k}')"><div class="svc-ic ${s.ic}">${s.icon}</div><h3>${name}</h3><p>${desc}</p><div class="svc-bot"><div class="svc-pr">$${s.price} <span>${s.priceSuffix || "/ visit"}</span></div></div></div>`;
          }
        )
        .join("");
    }
    function filterSvc(c, el) {
      const tabsWrap = el ? el.closest(".services-tabs") : null;
      if (tabsWrap) {
        tabsWrap
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("active"));
      } else {
        document
          .querySelectorAll("#heroServiceTabs .tab")
          .forEach((t) => t.classList.remove("active"));
      }
      if (el) el.classList.add("active");
      renderSvc(c);
    }
    function routeRegisterAttemptToPaidCheckout(message) {
      const pendingPaidSignup = typeof getPendingPaidSignupState === "function"
        ? getPendingPaidSignupState()
        : {};

      if ((typeof auth !== "undefined" && auth.currentUser) || pendingPaidSignup.sessionId) {
        return false;
      }

      const authModal = document.getElementById("authModal");
      if (authModal) authModal.classList.remove("active");

      if (typeof openConsultation === "function") {
        window._pendingVisit = false;
        window._initialSvcClick = null;
        openConsultation({ allowAnonymousCheckout: true });
      } else {
        const servicesSection = document.getElementById("services") || document.getElementById("svcGrid");
        if (servicesSection) servicesSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      toast(message || "Select a service to continue to checkout before creating an account.");
      return true;
    }
    function openModal(t) {
      if (t === "register" && routeRegisterAttemptToPaidCheckout()) {
        return;
      }
      document.getElementById("authModal").classList.add("active");
      switchAuth(t);
    }
    function closeModal(e) {
      if (e && e.target !== e.currentTarget) return;
      if (isPaymentVerificationLocked("auth")) {
        toast("Complete identity verification before closing this step.");
        return;
      }
      document.getElementById("authModal").classList.remove("active");
    }
    function setAuthModalModeClass(t) {
      const modal = document.querySelector("#authModal .modal");
      if (!modal) return;
      modal.classList.toggle("auth-register-modal", t === "register");
      modal.classList.toggle("auth-verify-modal", t === "verify");
    }
    function switchAuth(t) {
      setAuthModalModeClass(t);
      document
        .getElementById("loginForm")
        .classList.toggle("hidden", t !== "login");
      document
        .getElementById("registerForm")
        .classList.toggle("hidden", t !== "register");
      if (document.getElementById("verifyForm")) {
        document.getElementById("verifyForm").classList.toggle("hidden", t !== "verify");
        if (t !== "verify") {
          const iframe = document.getElementById("vouchedFrame");
          if (iframe) iframe.src = "";
        }
      }
      if (typeof applyPaidSignupModeToAuthForm === "function") {
        applyPaidSignupModeToAuthForm(t);
      }
    }
    function replaceLandingUrl(mutate) {
      const url = new URL(window.location.href);
      mutate(url.searchParams);
      const query = url.searchParams.toString();
      const nextUrl = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
      window.history.replaceState(window.history.state || {}, document.title, nextUrl);
    }
    function syncConsultModalUrl(open, step) {
      replaceLandingUrl((params) => {
        params.delete("payment");
        params.delete("session_id");
        params.delete("consultationId");

        if (open) {
          params.set("modal", "consult");
          params.set("consultStep", String(step || 1));
          return;
        }

        if (params.get("modal") === "consult") {
          params.delete("modal");
        }
        params.delete("consultStep");
        params.delete("consultService");
      });
    }
    function clearPaymentFlowUrlState() {
      syncConsultModalUrl(false);
    }
    function setConsultModalStep(step) {
      ["cSHair", "cSMetabolicHold", "cS1", "cS2", "cS3", "cS4", "cS5"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("hidden", id !== `cS${step}`);
      });

      const modal = document.querySelector("#consultModal .modal.cm");
      if (modal) modal.classList.toggle("cm-verify", step === 4);
    }
    function getStoredPaymentSuccessConsultationId() {
      try {
        return sessionStorage.getItem("pendingPaymentSuccessConsultationId") ||
          localStorage.getItem("pendingPaymentSuccessConsultationId") ||
          null;
      } catch {
        return null;
      }
    }
    function getPendingPaymentSuccessConsultationId() {
      try {
        return getStoredPaymentSuccessConsultationId() ||
          sessionStorage.getItem("pendingConsultationId") ||
          localStorage.getItem("pendingConsultationId") ||
          null;
      } catch {
        return null;
      }
    }
    function isConsultPaymentVerificationStepActive() {
      const consultModal = document.getElementById("consultModal");
      const verificationStep = document.getElementById("cS4");
      return Boolean(
        consultModal &&
        consultModal.classList.contains("active") &&
        verificationStep &&
        !verificationStep.classList.contains("hidden"),
      );
    }
    function isAuthPaymentVerificationPromptActive() {
      const authModal = document.getElementById("authModal");
      return Boolean(
        authModal &&
        authModal.classList.contains("active") &&
        getStoredPaymentSuccessConsultationId(),
      );
    }
    function isPaymentVerificationLocked(context) {
      const pending = window.pendingPaymentVerification;
      const hasPaymentVerificationState = Boolean(
        window.paymentVerificationRequired ||
        (pending && !pending.resolved) ||
        getStoredPaymentSuccessConsultationId(),
      );

      if (!hasPaymentVerificationState) return false;
      if (context === "consult") return isConsultPaymentVerificationStepActive();
      if (context === "auth") return isAuthPaymentVerificationPromptActive();

      return Boolean(
        isConsultPaymentVerificationStepActive() ||
        isAuthPaymentVerificationPromptActive() ||
        window.paymentVerificationRequired ||
        (pending && !pending.resolved),
      );
    }
    function setPaymentVerificationMessage(message) {
      const noticeEl = document.getElementById("paymentVouchedNotice");
      if (noticeEl) {
        noticeEl.textContent = message || "Complete secure ID verification to continue.";
      }
    }
    function setPaymentVerificationError(message) {
      const errorEl = document.getElementById("paymentVouchedError");
      if (!errorEl) return;
      errorEl.textContent = message || "";
      errorEl.classList.toggle("hidden", !message);
    }
    function openPaidConsultationVerificationShell(consultationId, notice) {
      if (consultationId && typeof currentConsultId !== "undefined") {
        currentConsultId = consultationId;
      }

      window.paymentVerificationRequired = Boolean(
        consultationId ||
        getStoredPaymentSuccessConsultationId() ||
        window.pendingPaymentVerification,
      );
      const consultModal = document.getElementById("consultModal");
      if (consultModal) consultModal.classList.add("active");
      setConsultModalStep(4);
      syncConsultModalUrl(true, 4);
      setPaymentVerificationError("");
      setPaymentVerificationMessage(notice || "Checking whether passive identity verification can complete this appointment...");

      const loading = document.getElementById("paymentVouchedLoading");
      if (loading) {
        loading.style.display = "flex";
        loading.textContent = "Checking whether passive identity verification can complete this appointment...";
      }

      const iframe = document.getElementById("paymentVouchedFrame");
      if (iframe) {
        iframe.style.display = "none";
        iframe.src = "";
      }
    }
    function showPaidConsultationVerificationComplete(outcome, message) {
      const consultationId = window.pendingPaymentVerification
        ? window.pendingPaymentVerification.consultationId
        : getPendingPaymentSuccessConsultationId();

      window.paymentVerificationRequired = false;
      if (window.pendingPaymentVerification) {
        window.pendingPaymentVerification.resolved = true;
      }
      if (typeof window.clearPendingPaymentSuccess === "function") {
        window.clearPendingPaymentSuccess(consultationId);
      }

      const successCopy = document.getElementById("paymentVerificationSuccessCopy");
      if (successCopy) {
        successCopy.textContent = message || (
          outcome === "review_required"
            ? "Identity verification was submitted and is pending manual review. Our team will continue processing your appointment."
            : "Identity verification is complete. A board-certified provider will review your case against our clinical protocols within 24 hours."
        );
      }

      setPaymentVerificationError("");
      setConsultModalStep(5);
      syncConsultModalUrl(true, 5);
    }
    window.clearPaymentFlowUrlState = clearPaymentFlowUrlState;
    window.getPendingPaymentSuccessConsultationId = getPendingPaymentSuccessConsultationId;
    window.openPaidConsultationVerificationShell = openPaidConsultationVerificationShell;
    window.showPaidConsultationVerificationComplete = showPaidConsultationVerificationComplete;
    function normalizeUsPhone(value) {
      const digits = String(value || "").replace(/\D/g, "");
      if (digits.length === 10) return digits;
      if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
      return null;
    }
    function normalizeUsZip(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits.length >= 5 ? digits.slice(0, 5) : null;
    }
    function isAdult(dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (Number.isNaN(birthDate.getTime())) return false;

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDelta = today.getMonth() - birthDate.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
      }

      return age >= 18;
    }
    function readRegistrationForm(options = {}) {
      const requireEmail = options.requireEmail !== false;
      const requirePassword = options.requirePassword !== false;
      const firstName = document.getElementById("regFirst").value.trim();
      const lastName = document.getElementById("regLast").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value;
      const confirmPassword = document.getElementById("regConfirmPassword")
        ? document.getElementById("regConfirmPassword").value
        : password;
      const state = document.getElementById("regState").value;
      const dob = document.getElementById("regDob").value;
      const sex = document.getElementById("regSex").value;
      const phone = normalizeUsPhone(document.getElementById("regPhone").value);
      const address1 = document.getElementById("regAddress1")
        ? document.getElementById("regAddress1").value.trim()
        : "";
      const city = document.getElementById("regCity")
        ? document.getElementById("regCity").value.trim()
        : "";
      const zipCode = normalizeUsZip(document.getElementById("regZipCode")
        ? document.getElementById("regZipCode").value
        : "");

      if (!firstName || !lastName) return { error: "First name and last name are required.", data: null };
      if (!dob || !isAdult(dob)) return { error: "You must be at least 18 years old to create an account.", data: null };
      if (!sex) return { error: "Sex is required.", data: null };
      if (!address1 || !city || !state) return { error: "Address, city, and state are required.", data: null };
      if (!zipCode) return { error: "ZIP code must be a valid 5-digit US ZIP.", data: null };
      if (!phone) return { error: "Phone number must be a valid 10-digit US phone number.", data: null };
      if (requireEmail && !email) return { error: "Email is required.", data: null };
      if (!ACTIVE_STATES.includes(state)) return { error: "We're currently only available in Florida.", data: null };
      if (requirePassword) {
        if (password.length < 8) return { error: "Password must be at least 8 characters.", data: null };
        if (password !== confirmPassword) return { error: "Passwords do not match.", data: null };
      }

      return {
        error: null,
        data: {
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`.trim(),
          email,
          password,
          dob,
          sex,
          address1,
          city,
          state,
          zipCode,
          phone,
        },
      };
    }
    function getPendingPaidSignupState() {
      try {
        const raw = sessionStorage.getItem("pendingPaidSignup") || localStorage.getItem("pendingPaidSignup");
        const parsed = raw ? JSON.parse(raw) : {};
        const state = parsed && typeof parsed === "object" ? parsed : {};
        return {
          ...state,
          sessionId: state.sessionId ||
            sessionStorage.getItem("pendingPaidSignupSessionId") ||
            localStorage.getItem("pendingPaidSignupSessionId") ||
            "",
          intakeCheckoutId: state.intakeCheckoutId ||
            sessionStorage.getItem("pendingPaidSignupCheckoutId") ||
            localStorage.getItem("pendingPaidSignupCheckoutId") ||
            "",
        };
      } catch {
        return {
          sessionId: sessionStorage.getItem("pendingPaidSignupSessionId") ||
            localStorage.getItem("pendingPaidSignupSessionId") ||
            "",
          intakeCheckoutId: sessionStorage.getItem("pendingPaidSignupCheckoutId") ||
            localStorage.getItem("pendingPaidSignupCheckoutId") ||
            "",
        };
      }
    }
    function setPendingPaidSignupState(patch) {
      const next = {
        ...getPendingPaidSignupState(),
        ...(patch || {}),
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem("pendingPaidSignup", JSON.stringify(next));
      localStorage.setItem("pendingPaidSignup", JSON.stringify(next));
      if (next.sessionId) {
        sessionStorage.setItem("pendingPaidSignupSessionId", next.sessionId);
        localStorage.setItem("pendingPaidSignupSessionId", next.sessionId);
      }
      if (next.intakeCheckoutId) {
        sessionStorage.setItem("pendingPaidSignupCheckoutId", next.intakeCheckoutId);
        localStorage.setItem("pendingPaidSignupCheckoutId", next.intakeCheckoutId);
      }
      return next;
    }
    function clearPendingPaidSignupState() {
      [
        "pendingPaidSignup",
        "pendingPaidSignupSessionId",
        "pendingPaidSignupCheckoutId",
        "pendingPaidSignupStartedAt",
        "pendingPaidSignupReturnExpected",
      ].forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      const emailInput = document.getElementById("regEmail");
      if (emailInput) emailInput.readOnly = false;
    }
    function applyPaidSignupModeToAuthForm(mode) {
      const pending = getPendingPaidSignupState();
      const hasPaidSignup = Boolean(pending.sessionId && (pending.signupToken || pending.loginRequired));
      const emailInput = document.getElementById("regEmail");
      const loginEmailInput = document.getElementById("loginEmail");
      const registerHeading = document.querySelector("#registerForm h2");
      const registerCopy = document.querySelector("#registerForm .ms");

      if (registerHeading && !registerHeading.dataset.defaultText) {
        registerHeading.dataset.defaultText = registerHeading.textContent || "";
      }
      if (registerCopy && !registerCopy.dataset.defaultText) {
        registerCopy.dataset.defaultText = registerCopy.textContent || "";
      }

      if (hasPaidSignup && pending.email && loginEmailInput && mode === "login" && !loginEmailInput.value) {
        loginEmailInput.value = pending.email;
      }

      if (mode !== "register") return;

      if (hasPaidSignup && pending.signupToken) {
        if (registerHeading) registerHeading.textContent = "Create your account";
        if (registerCopy) registerCopy.textContent = pending.serviceName
          ? `Payment confirmed for ${pending.serviceName}. Finish your account to continue.`
          : "Payment confirmed. Finish your account to continue.";
        if (emailInput && pending.email) {
          emailInput.value = pending.email;
          emailInput.readOnly = true;
        }
        return;
      }

      if (registerHeading && registerHeading.dataset.defaultText) {
        registerHeading.textContent = registerHeading.dataset.defaultText;
      }
      if (registerCopy && registerCopy.dataset.defaultText) {
        registerCopy.textContent = registerCopy.dataset.defaultText;
      }
      if (emailInput) emailInput.readOnly = false;
    }
    function fillPaidSignupRegistrationForm(profile) {
      const values = {
        regFirst: profile.firstName || "",
        regLast: profile.lastName || "",
        regEmail: profile.email || "",
        regState: profile.state || "",
        regSex: profile.sex || profile.sexAtBirth || profile.gender || "",
        regDob: profile.dob || profile.dateOfBirth || "",
        regPhone: profile.phone || profile.phoneNumber || "",
        regAddress1: profile.address1 || profile.address || "",
        regCity: profile.city || "",
        regZipCode: profile.zipCode || profile.zip || profile.postalCode || "",
      };

      Object.entries(values).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input && value && !input.value) input.value = value;
      });
    }
    function hasCompletePaidSignupRegistrationDetails(registration) {
      return Boolean(
        registration.firstName &&
        registration.lastName &&
        registration.email &&
        registration.dob &&
        registration.sex &&
        registration.address1 &&
        registration.city &&
        registration.state &&
        normalizeUsZip(registration.zipCode || registration.zip) &&
        normalizeUsPhone(registration.phone || registration.phoneNumber),
      );
    }
    async function publicApiJson(path, options = {}) {
      const response = await fetch(`${API}${path}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { error: text };
        }
      }

      if (!response.ok) {
        const err = new Error((body && (body.error || body.message)) || `Request failed with status ${response.status}.`);
        err.code = body && body.code;
        throw err;
      }

      return body;
    }
    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function normalizeEmailForAuth(value) {
      return String(value || "").trim().toLowerCase();
    }
    async function verifyGoogleProviderMayOpen(options = {}) {
      const pending = getPendingPaidSignupState();

      if (pending.signupToken) {
        return {
          allowed: true,
          paidSignupAllowed: true,
          expectedEmail: normalizeEmailForAuth(pending.email),
        };
      }

      const loginEmailInput = document.getElementById("loginEmail");
      const expectedEmail = normalizeEmailForAuth(pending.email || (loginEmailInput && loginEmailInput.value));

      if (pending.loginRequired && !expectedEmail) {
        toast("Enter the email used at checkout before continuing with Google.");
        return { allowed: false };
      }

      if (!expectedEmail) {
        toast("Enter your existing account email before continuing with Google. New patients should select a service first.");
        return { allowed: false };
      }

      if (expectedEmail) {
        const methods = await auth.fetchSignInMethodsForEmail(expectedEmail);
        if (methods.includes("google.com")) {
          return {
            allowed: true,
            paidSignupAllowed: false,
            expectedEmail,
          };
        }

        if (pending.loginRequired || methods.length > 0) {
          toast("Use the existing login method for this email to attach your paid intake.");
          return { allowed: false };
        }
      }

      if (options.registerMode) {
        toast("Payment is still being confirmed. Please wait before creating your account.");
        return { allowed: false };
      }

      routeRegisterAttemptToPaidCheckout("New patients must select a service and complete checkout before creating an account.");
      return { allowed: false };
    }
    async function rollbackUnexpectedGoogleSignup(credential) {
      try {
        if (credential && credential.additionalUserInfo && credential.additionalUserInfo.isNewUser && credential.user) {
          await credential.user.delete();
        }
      } catch (deleteError) {
        console.warn("Unable to delete unexpected Google signup:", deleteError.message);
      }

      try {
        await auth.signOut();
      } catch (signOutError) {
        console.warn("Unable to sign out unexpected Google signup:", signOutError.message);
      }
    }
    async function preparePaidSignupFromCheckout(sessionId, intakeCheckoutId) {
      if (!sessionId) {
        toast("Payment received, but the Stripe session was missing. Please contact support.");
        return false;
      }

      setPendingPaidSignupState({ sessionId, intakeCheckoutId });
      toast("Payment received. Confirming checkout before account setup...");

      let lastStatus = null;
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const query = new URLSearchParams({ session_id: sessionId });
        if (intakeCheckoutId) query.set("intakeCheckoutId", intakeCheckoutId);
        const status = await publicApiJson(`/api/v1/public/intake-checkout/status?${query.toString()}`);
        lastStatus = status;
        setPendingPaidSignupState({
          sessionId,
          intakeCheckoutId: status.intakeCheckoutId || intakeCheckoutId,
          signupToken: status.signupToken || null,
          signupTokenExpiresAt: status.signupTokenExpiresAt || null,
          email: status.email || "",
          serviceKey: status.serviceKey || "",
          serviceName: status.serviceName || "",
          loginRequired: !!status.loginRequired,
        });

        if (status.signupAllowed && status.signupToken) {
          openModal("register");
          applyPaidSignupModeToAuthForm("register");
          toast(status.message || "Payment confirmed. Create your account to continue.");
          return true;
        }

        if (status.loginRequired) {
          openModal("login");
          applyPaidSignupModeToAuthForm("login");
          toast(status.message || "Payment confirmed. Log in to continue.");
          return true;
        }

        if (["failed", "expired", "manual_review", "account_created"].includes(status.status)) {
          toast(status.message || "This checkout cannot continue automatically.");
          return false;
        }

        await wait(attempt < 5 ? 1500 : 3000);
      }

      toast((lastStatus && lastStatus.message) || "Payment is still being confirmed. Keep this page open and try again shortly.");
      return false;
    }
    async function completePaidSignupRequest(registration, firebaseUser) {
      const pending = getPendingPaidSignupState();
      if (!pending.sessionId) {
        throw new Error("Missing paid checkout session. Please return from Stripe checkout again.");
      }

      const headers = {};
      if (firebaseUser) {
        headers.Authorization = `Bearer ${await firebaseUser.getIdToken()}`;
      }

      return publicApiJson("/api/v1/public/complete-paid-signup", {
        method: "POST",
        headers,
        body: {
          sessionId: pending.sessionId,
          intakeCheckoutId: pending.intakeCheckoutId || null,
          signupToken: pending.signupToken || null,
          registration,
        },
      });
    }
    async function finishPaidSignupAccount(result, firebaseUser) {
      let activeUser = firebaseUser || auth.currentUser || null;
      if (result.customToken) {
        const cred = await auth.signInWithCustomToken(result.customToken);
        activeUser = cred.user;
        try {
          if (activeUser && !activeUser.emailVerified) {
            await activeUser.sendEmailVerification();
          }
        } catch (emailErr) {
          console.warn("Paid signup verification email skipped:", emailErr.message);
        }
      }

      if (!activeUser) {
        throw new Error("Account was created but sign-in could not be restored.");
      }

      fbUser = activeUser;
      token = await activeUser.getIdToken();
      user = await loadUserProfile(activeUser);
      updateNav();
      document.getElementById("authModal").classList.remove("active");

      const consultationId = result.consultationId || null;
      if (consultationId) {
        currentConsultId = consultationId;
        sessionStorage.setItem("pendingConsultationId", consultationId);
        localStorage.setItem("pendingConsultationId", consultationId);
        if (typeof window.clearPendingPaymentSuccess === "function") {
          window.clearPendingPaymentSuccess(consultationId);
        }
        if (typeof setPendingPaymentSuccess === "function") {
          setPendingPaymentSuccess(consultationId, result.stripeSessionId || null);
        } else {
          sessionStorage.setItem("pendingPaymentSuccessConsultationId", consultationId);
          localStorage.setItem("pendingPaymentSuccessConsultationId", consultationId);
          if (result.stripeSessionId) {
            sessionStorage.setItem("pendingPaymentSuccessSessionId", result.stripeSessionId);
            localStorage.setItem("pendingPaymentSuccessSessionId", result.stripeSessionId);
          }
        }
      }

      clearPendingPaidSignupState();

      if (consultationId && typeof window.runPaidConsultationVerification === "function") {
        await window.runPaidConsultationVerification(activeUser, {
          consultationId,
          profile: user,
          serviceKey: result.serviceKey || null,
        });
        toast("Account created. Complete identity verification to continue.");
        return true;
      }

      toast("Account created. Please check your email to verify your email address.");
      return true;
    }
    async function completePaidSignupWithRegistration(registration) {
      const result = await completePaidSignupRequest(registration, null);
      return finishPaidSignupAccount(result, null);
    }
    async function completePaidSignupForAuthenticatedUser(firebaseUser, registration) {
      const result = await completePaidSignupRequest(registration, firebaseUser);
      return finishPaidSignupAccount(result, firebaseUser);
    }
    async function resumePaidSignupAfterAuth(registration) {
      const pending = getPendingPaidSignupState();
      const firebaseUser = auth.currentUser || fbUser;
      if (!pending.sessionId || !firebaseUser) return false;

      let registrationData = registration || null;
      if (!registrationData) {
        const profile = await loadUserProfile(firebaseUser);
        registrationData = {
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          displayName: profile.displayName || profile.name || firebaseUser.displayName || "",
          email: firebaseUser.email || profile.email || pending.email || "",
          dob: profile.dob || profile.dateOfBirth || "",
          sex: profile.sex || profile.sexAtBirth || profile.gender || "",
          address1: profile.address1 || profile.address || "",
          city: profile.city || "",
          state: profile.state || "",
          zipCode: profile.zipCode || profile.zip || "",
          phone: profile.phone || profile.phoneNumber || "",
        };
      }

      if (!registration && !hasCompletePaidSignupRegistrationDetails(registrationData)) {
        fillPaidSignupRegistrationForm(registrationData);
        openModal("register");
        applyPaidSignupModeToAuthForm("register");
        toast("Complete your account details to attach this paid intake.");
        return true;
      }

      await completePaidSignupForAuthenticatedUser(firebaseUser, registrationData);
      return true;
    }
    window.preparePaidSignupFromCheckout = preparePaidSignupFromCheckout;
    window.resumePaidSignupAfterAuth = resumePaidSignupAfterAuth;
    window.setPendingPaidSignupState = setPendingPaidSignupState;
    window.clearPendingPaidSignupState = clearPendingPaidSignupState;
    function getFallbackUserProfile(firebaseUser) {
      const displayName = firebaseUser.displayName || "";
      const names = displayName.trim() ? displayName.trim().split(/\s+/) : [];
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        firstName: names[0] || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Patient"),
        lastName: names.slice(1).join(" "),
        displayName,
        role: "patient",
      };
    }
    async function loadUserProfile(firebaseUser) {
      const fallback = getFallbackUserProfile(firebaseUser);
      if (!db) return fallback;

      try {
        const patientDoc = await db.collection("patients").doc(firebaseUser.uid).get();
        if (patientDoc.exists) {
          return { ...fallback, ...patientDoc.data(), uid: firebaseUser.uid, email: firebaseUser.email || patientDoc.data().email || "" };
        }

        const userDoc = await db.collection("users").doc(firebaseUser.uid).get();
        if (userDoc.exists) {
          return { ...fallback, ...userDoc.data(), uid: firebaseUser.uid, email: firebaseUser.email || userDoc.data().email || "" };
        }
      } catch (profileErr) {
        console.warn("Profile lookup failed:", profileErr.message);
      }

      return fallback;
    }
    async function recordSignupFlowTrace({ step, status, user: traceUser, payload, response, error }) {
      if (!db) return;
      try {
        await db.collection("audit_logs").add({
          action: "SIGNUP_FLOW_TRACE",
          source: "landing_modal",
          step,
          status,
          userId: traceUser ? traceUser.uid : null,
          userEmail: traceUser ? traceUser.email : null,
          payload: payload || null,
          response: response || null,
          error: error || null,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          userAgent: navigator.userAgent,
        });
      } catch (traceErr) {
        console.warn("Failed to record signup flow trace:", traceErr.message);
      }
    }
    async function persistPatientRegistration(firebaseUser, registration, options = {}) {
      const email = (options.emailOverride || firebaseUser.email || registration.email || "").trim();
      if (!email) throw new Error("Unable to determine patient email address.");

      await firebaseUser.updateProfile({ displayName: registration.displayName });

      const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
      const patientRecord = {
        uid: firebaseUser.uid,
        email,
        name: registration.displayName,
        displayName: registration.displayName,
        firstName: registration.firstName,
        lastName: registration.lastName,
        dob: registration.dob || null,
        dateOfBirth: registration.dob || null,
        sex: registration.sex || null,
        sexAtBirth: registration.sex || null,
        gender: registration.sex || null,
        address: registration.address1 || null,
        address1: registration.address1 || null,
        city: registration.city || null,
        state: registration.state || null,
        zip: registration.zipCode,
        zipCode: registration.zipCode,
        phone: registration.phone,
        phoneNumber: registration.phone,
        role: "patient",
        status: "active",
        isIdentityVerified: false,
        identityVerification: {
          provider: "vouched",
          status: "not_started",
          verified: false,
          jobId: null,
          internalId: null,
          verifiedAt: null,
          lastUpdatedAt: serverTimestamp(),
          failureReason: null,
          warningCode: null,
          warningMessage: null,
        },
        emailVerified: firebaseUser.emailVerified,
        updatedAt: serverTimestamp(),
      };

      if (!options.mergePatientRecord) {
        patientRecord.createdAt = serverTimestamp();
      }

      await Promise.all([
        db.collection("patients").doc(firebaseUser.uid).set(patientRecord, { merge: !!options.mergePatientRecord }),
        db.collection("users").doc(firebaseUser.uid).set(patientRecord, { merge: true }),
      ]);

      if (options.sendVerificationEmail && !firebaseUser.emailVerified) {
        await firebaseUser.sendEmailVerification();
      }

      if (options.auditAction) {
        try {
          await db.collection("audit_logs").add({
            userId: firebaseUser.uid,
            userEmail: email,
            action: options.auditAction,
            details: { role: "patient" },
            timestamp: serverTimestamp(),
          });
        } catch (auditErr) {
          console.warn("Signup audit event skipped:", auditErr.message);
        }
      }

      return {
        uid: firebaseUser.uid,
        email,
        patientDocumentPath: `patients/${firebaseUser.uid}`,
        userDocumentPath: `users/${firebaseUser.uid}`,
        mergedPatientRecord: !!options.mergePatientRecord,
        verificationEmailRequested: !!options.sendVerificationEmail && !firebaseUser.emailVerified,
        persistedAt: new Date().toISOString(),
      };
    }
    async function authedApiJson(path, options = {}) {
      const currentUser = options.user || auth.currentUser || fbUser;
      if (!currentUser) throw new Error("Please sign in again before continuing.");

      const idToken = await currentUser.getIdToken();
      const response = await fetch(`${API}${path}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { error: text };
        }
      }

      if (!response.ok) {
        throw new Error((body && (body.error || body.message)) || `Request failed with status ${response.status}.`);
      }

      return body;
    }
    function getVouchedWorkflowPayload(registration) {
      return {
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        dob: registration.dob,
        address: {
          streetAddress: registration.address1,
          city: registration.city,
          state: registration.state,
          postalCode: registration.zipCode,
          country: "US",
        },
      };
    }
    function getProfileVouchedWorkflowPayload(profile, intakeData = {}) {
      const source = profile || {};
      const intakeSource = intakeData || {};
      const firstName = source.firstName || intakeSource.firstName || "";
      const lastName = source.lastName || intakeSource.lastName || "";
      const email = source.email || (auth.currentUser && auth.currentUser.email) || "";
      const phone = source.phone || source.phoneNumber || intakeSource.phone || "";
      const dob = source.dob || source.dateOfBirth || source.birthDate || intakeSource.dob || intakeSource.dateOfBirth || "";
      const address1 = source.address1 || source.address || intakeSource.address1 || intakeSource.address || "";
      const city = source.city || intakeSource.city || "";
      const state = source.state || intakeSource.state || "";
      const zipCode = source.zipCode || source.zip || source.postalCode || intakeSource.zipCode || intakeSource.zip || intakeSource.postalCode || "";

      return {
        firstName,
        lastName,
        email,
        phone,
        dob,
        address: {
          streetAddress: address1,
          city,
          state,
          postalCode: zipCode,
          country: "US",
        },
      };
    }
    function finishSignup(message) {
      updateNav();
      toast(message || "Account created. Please check your email to verify your email address.");
      document.getElementById("authModal").classList.remove("active");

      if (window._pendingHairLossConsult && typeof window.resumeHairConsultationAfterAuth === "function") {
        window.resumeHairConsultationAfterAuth();
        return;
      }

      if (window._pendingVisit || selSvc) {
        window._pendingVisit = false;
        openConsultation();
      }
    }
    function showVisualVerification(firebaseUser, registration, notice) {
      const internalId = `patient:${firebaseUser.uid}:${Date.now()}`;
      window.pendingSignupVerification = { uid: firebaseUser.uid, registration, internalId };

      document.getElementById("loginForm").classList.add("hidden");
      document.getElementById("registerForm").classList.add("hidden");
      switchAuth("verify");

      const noticeEl = document.getElementById("vouchedNotice");
      if (noticeEl) {
        noticeEl.textContent = notice || "Complete secure ID verification to continue.";
      }

      const iframe = document.getElementById("vouchedFrame");
      const params = new URLSearchParams({
        context: "signup",
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        birthDate: registration.dob,
        uid: firebaseUser.uid,
        internalId,
        appId: getVouchedPublicKey(),
        callbackURL: getVouchedWebhookUrl(),
      });
      iframe.src = `/vouched.html?${params.toString()}`;
    }
    function showPaidConsultationVerification(firebaseUser, payload, consultationId, notice, options = {}) {
      const internalId = `payment:${firebaseUser.uid}:${consultationId || Date.now()}`;
      window.pendingPaymentVerification = {
        uid: firebaseUser.uid,
        consultationId,
        internalId,
        serviceKey: options.serviceKey || null,
        resolved: false,
      };

      openPaidConsultationVerificationShell(
        consultationId,
        notice || "Your payment is confirmed. Complete secure ID verification so our clinical team can continue processing your appointment.",
      );

      const loading = document.getElementById("paymentVouchedLoading");
      if (loading) loading.style.display = "none";

      const iframe = document.getElementById("paymentVouchedFrame");
      const params = new URLSearchParams({
        context: "payment_success",
        firstName: payload.firstName || "",
        lastName: payload.lastName || "",
        email: payload.email || "",
        phone: payload.phone || "",
        birthDate: payload.dob || "",
        uid: firebaseUser.uid,
        internalId,
        appId: getVouchedPublicKey(),
        callbackURL: getVouchedWebhookUrl(),
      });
      if (iframe) {
        iframe.style.display = "block";
        iframe.src = `/vouched.html?${params.toString()}`;
      }
    }
    async function runPaidConsultationVerification(firebaseUser, options = {}) {
      const profile = options.profile || user || getFallbackUserProfile(firebaseUser);
      const workflowPayload = getProfileVouchedWorkflowPayload(profile, options.intakeData || {});
      const consultationId = options.consultationId || currentConsultId || null;

      showPaidConsultationVerification(
        firebaseUser,
        workflowPayload,
        consultationId,
        "Your payment is confirmed. Complete secure ID verification so our clinical team can continue processing your appointment.",
        { serviceKey: options.serviceKey || null },
      );

      if (!getVouchedPublicKey()) {
        setPaymentVerificationError("Identity verification is not configured. Please contact support so we can finish your appointment review.");
      }

      return true;
    }
    window.runPaidConsultationVerification = runPaidConsultationVerification;
    async function runSignupVerification(firebaseUser, registration) {
      finishSignup("Account created. Continue to checkout; identity verification starts after payment.");
    }
    async function handleLogin() {
      const e = document.getElementById("loginEmail").value;
      const p = document.getElementById("loginPassword").value;
      if (!e || !p) return toast("Please fill in all fields.");

      try {
        console.log("Attempting login with:", e);
        const cred = await auth.signInWithEmailAndPassword(e, p);
        console.log("Firebase Login Success. User:", cred.user);

        fbUser = cred.user; // Global assignment
        token = await fbUser.getIdToken();
        user = await loadUserProfile(fbUser);

        document.getElementById("authModal").classList.remove("active");
        updateNav();
        toast("Welcome back, " + (user.firstName || user.email) + "!");

        if (typeof window.resumePendingPaymentSuccess === "function" && await window.resumePendingPaymentSuccess()) {
          return;
        }

        if (typeof window.resumePaidSignupAfterAuth === "function" && await window.resumePaidSignupAfterAuth()) {
          return;
        }

        if (window._pendingHairLossConsult && typeof window.resumeHairConsultationAfterAuth === "function") {
          await window.resumeHairConsultationAfterAuth();
          return;
        }

        // If user clicked a service before being asked to log in, open the visit modal
        if (window._pendingVisit || selSvc) {
          window._pendingVisit = false;
          openConsultation();
        } else {
          toast("You are signed in.");
        }
      } catch (err) {
        console.error("Login Error Object:", err);
        let msg = "Login failed.";
        if (err.code === "auth/user-not-found")
          msg = "No account found with that email.";
        else if (err.code === "auth/wrong-password")
          msg = "Incorrect password.";
        else if (err.code === "auth/invalid-email")
          msg = "Invalid email address.";
        else if (err.code === "auth/too-many-requests")
          msg = "Too many attempts. Try again later.";
        else if (err.code === "auth/invalid-credential")
          msg = "Invalid email or password.";
        else msg = err.message;

        toast(msg);
      }
    }
    async function handleRegister() {
      const pendingPaidSignup = getPendingPaidSignupState();
      if (!pendingPaidSignup.sessionId) {
        routeRegisterAttemptToPaidCheckout();
        return;
      }
      if (pendingPaidSignup.loginRequired && !pendingPaidSignup.signupToken && !auth.currentUser) {
        openModal("login");
        return toast("This payment email already has an account. Log in to continue.");
      }
      if (!pendingPaidSignup.signupToken && !pendingPaidSignup.loginRequired) {
        return toast("Payment is still being confirmed. Please wait before creating your account.");
      }

      const validation = readRegistrationForm({
        requirePassword: !(pendingPaidSignup.sessionId && auth.currentUser),
      });
      if (validation.error || !validation.data) return toast(validation.error || "Please fill all required fields.");

      try {
        const registration = validation.data;
        if (auth.currentUser) {
          await completePaidSignupForAuthenticatedUser(auth.currentUser, registration);
          return;
        }

        await completePaidSignupWithRegistration(registration);
      } catch (err) {
        const msg =
          err.code === "auth/email-already-in-use"
            ? "An account with that email already exists. Try logging in."
            : err.code === "auth/weak-password"
              ? "Password is too weak. Use at least 8 characters."
              : err.code === "auth/invalid-email"
                ? "Invalid email address."
                : err.message || "Registration failed.";
        toast(msg);
      }
    }
    async function handleGoogleLogin() {
      try {
        const registerMode = !document.getElementById("registerForm").classList.contains("hidden");
        let registration = null;
        if (registerMode) {
          const paidSignupState = getPendingPaidSignupState();
          if (!paidSignupState.sessionId) {
            routeRegisterAttemptToPaidCheckout();
            return;
          }
          if (!paidSignupState.signupToken) {
            return toast("Payment is still being confirmed. Please wait before creating your account.");
          }
          const validation = readRegistrationForm({ requireEmail: false, requirePassword: false });
          if (validation.error || !validation.data) return toast(validation.error || "Please complete the required patient details first.");
          registration = validation.data;
        }

        const googleGate = await verifyGoogleProviderMayOpen({ registerMode });
        if (!googleGate.allowed) return;

        const provider = new firebase.auth.GoogleAuthProvider();
        if (googleGate.expectedEmail) {
          provider.setCustomParameters({ login_hint: googleGate.expectedEmail });
        }
        const cred = await auth.signInWithPopup(provider);
        fbUser = cred.user;
        token = await fbUser.getIdToken();

        if (googleGate.expectedEmail && normalizeEmailForAuth(fbUser.email) !== googleGate.expectedEmail) {
          await rollbackUnexpectedGoogleSignup(cred);
          fbUser = null;
          token = null;
          return toast("Use the Google account that matches the email for this checkout or existing account.");
        }

        if (!googleGate.paidSignupAllowed && cred.additionalUserInfo && cred.additionalUserInfo.isNewUser) {
          await rollbackUnexpectedGoogleSignup(cred);
          fbUser = null;
          token = null;
          routeRegisterAttemptToPaidCheckout("New patients must select a service and complete checkout before creating an account.");
          return;
        }

        if (registerMode && registration) {
          registration.email = fbUser.email || registration.email;
          if (!registration.email) throw new Error("Unable to determine patient email address.");
          if (getPendingPaidSignupState().sessionId) {
            await completePaidSignupForAuthenticatedUser(fbUser, registration);
            return;
          }
          const dbResult = await persistPatientRegistration(fbUser, registration, {
            emailOverride: fbUser.email,
            mergePatientRecord: true,
            auditAction: "ACCOUNT_PROFILE_COMPLETED",
          });
          await recordSignupFlowTrace({
            step: "db_write",
            status: "success",
            user: fbUser,
            response: dbResult,
          });
        }

        user = await loadUserProfile(fbUser);
        updateNav();
        if (registerMode && registration) {
          finishSignup("Account ready. Continue to checkout; identity verification starts after payment.");
        } else {
          document.getElementById("authModal").classList.remove("active");
          if (typeof window.resumePendingPaymentSuccess === "function" && await window.resumePendingPaymentSuccess()) {
            return;
          }
          if (typeof window.resumePaidSignupAfterAuth === "function" && await window.resumePaidSignupAfterAuth()) {
            return;
          }
          if (window._pendingHairLossConsult && typeof window.resumeHairConsultationAfterAuth === "function") {
            await window.resumeHairConsultationAfterAuth();
            return;
          }
          toast("Welcome, " + (user.firstName || fbUser.email) + "!");
        }
      } catch (err) {
        if (err.code !== "auth/popup-closed-by-user")
          toast(err.message || "Google sign-in failed.");
      }
    }
    async function handleForgotPassword() {
      const e = document.getElementById("loginEmail").value;
      if (!e)
        return toast("Enter your email above, then click Forgot password.");
      try {
        await auth.sendPasswordResetEmail(e);
        toast("Password reset email sent! Check your inbox.");
      } catch (err) {
        const msg =
          err.code === "auth/user-not-found"
            ? "No account found with that email."
            : err.code === "auth/invalid-email"
              ? "Invalid email address."
              : err.message;
        toast(msg);
      }
    }
    function logout() {
      auth
        .signOut()
        .then(() => {
          token = null;
          user = null;
          fbUser = null;
          updateNav();
          showLanding();
          toast("Logged out.");
        })
        .catch(() => {
          token = null;
          user = null;
          fbUser = null;
          updateNav();
          showLanding();
          toast("Logged out.");
        });
    }
    /* Firebase Auth State Listener — auto-restores sessions */
    auth.onAuthStateChanged(async (u) => {
      if (u) {
        fbUser = u;
        token = await u.getIdToken();
        user = await loadUserProfile(u);
        updateNav();
      } else {
        token = null;
        user = null;
        fbUser = null;
        updateNav();
      }
    });
    window.addEventListener("message", async (e) => {
      if (!e.data || e.data.type !== "VOUCHED_DONE") return;

      if (e.data.context === "payment_success") {
        const pending = window.pendingPaymentVerification;
        const jobId = typeof e.data.jobId === "string" ? e.data.jobId.trim() : "";
        if (!pending || !jobId) {
          toast("Identity verification completed without a valid Vouched job id.");
          return;
        }

        try {
          const result = await authedApiJson("/api/v1/vouched/jobs/complete", {
            method: "POST",
            body: {
              jobId,
              internalId: pending.internalId,
            },
          });

          if (result.verified || result.status === "review_required") {
            const consultationId = pending.consultationId || currentConsultId || null;
            const isMetabolicWellness = pending.serviceKey === "metabolic_wellness";
            if (typeof window.clearPendingPaymentSuccess === "function") {
              window.clearPendingPaymentSuccess(consultationId);
            }
            if (pending.serviceKey === "hair_loss" && typeof window.clearHairConsultationFlow === "function") {
              window.clearHairConsultationFlow();
            }
            showPaidConsultationVerificationComplete(
              result.verified ? "verified" : "review_required",
              isMetabolicWellness
                ? "Your visit has been booked. Someone from our team will contact you within 24 hours."
                : result.verified
                  ? "Identity verification is complete. A board-certified provider will review your case against our clinical protocols within 24 hours."
                  : (result.warningMessage || "Identity verification was submitted and is pending manual review. Our team will continue processing your appointment."),
            );
            window.pendingPaymentVerification = null;
            toast(isMetabolicWellness
              ? "Payment confirmed. Your visit has been booked."
              : result.verified
                ? "Payment confirmed and identity verification is complete."
                : (result.warningMessage || "Payment confirmed. Identity verification is pending manual review."));
            return;
          }

          const failureMessage = result.failureReason || "Identity verification failed. Please try again or contact support.";
          setPaymentVerificationError(failureMessage);
          toast(failureMessage);
        } catch (error) {
          const message = error.message || "Identity verification could not be finalized.";
          setPaymentVerificationError(message);
          toast(message);
        }
        return;
      }

      if (e.data.context !== "signup") return;

      const pending = window.pendingSignupVerification;
      const jobId = typeof e.data.jobId === "string" ? e.data.jobId.trim() : "";
      if (!pending || !jobId) {
        toast("Identity verification completed without a valid Vouched job id.");
        return;
      }

      try {
        const result = await authedApiJson("/api/v1/vouched/jobs/complete", {
          method: "POST",
          body: {
            jobId,
            internalId: pending.internalId,
          },
        });

        if (result.verified) {
          window.pendingSignupVerification = null;
          finishSignup("Your account was created and identity verification is complete. Please verify your email before logging in.");
          return;
        }

        if (result.status === "review_required") {
          window.pendingSignupVerification = null;
          finishSignup(result.warningMessage || "Your account was created and identity verification is pending manual review. Please verify your email before logging in.");
          return;
        }

        toast(result.failureReason || "Identity verification failed. Please try again or contact support.");
      } catch (error) {
        toast(error.message || "Identity verification could not be finalized.");
      }
    });
    function toggleNavVisibility(id, hidden) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("hidden", hidden);
    }

    function toggleMobileNav(trigger) {
      const panel = document.getElementById("mobileNavPanel");
      const btn = trigger || document.querySelector("#mainNav .lp-mobile-toggle");
      if (!panel || !btn) return;
      const isOpen = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
    }

    function closeMobileNav() {
      const panel = document.getElementById("mobileNavPanel");
      const btn = document.querySelector("#mainNav .lp-mobile-toggle");
      if (panel) panel.classList.remove("open");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1279) closeMobileNav();
    });

    function updateNav() {
      const li = !!user;
      ["loginBtn", "signupBtn", "mobileLoginBtn", "mobileSignupBtn"].forEach((id) =>
        toggleNavVisibility(id, li),
      );
      ["dashBtn", "logoutBtn", "mobileDashBtn", "mobileLogoutBtn"].forEach((id) =>
        toggleNavVisibility(id, !li),
      );
    }

    const landingSubpageRoutes = {
      radiology: "radiology",
      "diagnostic-radiology": "diagnostic-radiology",
      clinicians: "diagnostic-radiology",
      reviews: "reviews",
      testimonials: "reviews",
      partners: "partners",
      "pvt-snac-technology": "pvt-snac-technology",
      "snac-technology": "pvt-snac-technology",
      snac: "pvt-snac-technology",
      "pvt-wegovy": "pvt-wegovy",
      wegovy: "pvt-wegovy",
      "wegovy-pen": "pvt-wegovy",
    };
    const landingHomeAnchors = new Set(["", "services", "how-it-works"]);

    function getLandingRouteFromLocation() {
      const pathSlug = decodeURIComponent(
        window.location.pathname.replace(/^\/+|\/+$/g, "").split("/").pop() || "",
      );
      if (landingSubpageRoutes[pathSlug]) return pathSlug;

      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (landingSubpageRoutes[hash]) return hash;

      return "";
    }

    function getLandingRouteUrl(normalizedRoute) {
      return normalizedRoute === "home" ? "/" : `/${normalizedRoute}`;
    }

    function setLandingRoute(route, options = {}) {
      const page = document.getElementById("landingPage");
      if (!page) return;

      const normalizedRoute = landingSubpageRoutes[route] || "home";
      page.dataset.lpRoute = normalizedRoute;
      document.body.classList.toggle("lp-subroute", normalizedRoute !== "home");
      if (window.updateMainNavScrollState) {
        window.updateMainNavScrollState();
      }

      page.querySelectorAll(".lp-subpage").forEach((section) => {
        section.setAttribute("aria-hidden", String(section.id !== normalizedRoute));
      });

      page.querySelectorAll(".lp-home-section").forEach((section) => {
        section.setAttribute("aria-hidden", String(normalizedRoute !== "home"));
      });

      if ((options.updateUrl || options.updateHash) && window.history && window.history.pushState) {
        window.history.pushState(null, "", getLandingRouteUrl(normalizedRoute));
      } else if (options.replaceUrl && window.history && window.history.replaceState) {
        window.history.replaceState(null, "", getLandingRouteUrl(normalizedRoute));
      }

      if (options.scroll !== false) {
        const targetId = normalizedRoute === "home" ? options.anchor : normalizedRoute;
        window.requestAnimationFrame(() => {
          const target = targetId ? document.getElementById(targetId) : null;
          if (target) {
            target.scrollIntoView({ block: "start", behavior: options.smooth ? "smooth" : "auto" });
          } else {
            window.scrollTo({ top: 0, behavior: options.smooth ? "smooth" : "auto" });
          }
        });
      }
    }

    function goLandingSubpage(route) {
      setLandingRoute(route, { updateUrl: true, smooth: true });
    }
    window.goLandingSubpage = goLandingSubpage;

    function syncLandingRouteFromHash() {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const routeFromLocation = getLandingRouteFromLocation();
      if (routeFromLocation) {
        setLandingRoute(routeFromLocation, { replaceUrl: !!landingSubpageRoutes[hash] });
        return;
      }

      if (landingHomeAnchors.has(hash)) {
        setLandingRoute("home", { anchor: hash, scroll: !!hash });
        return;
      }

      setLandingRoute("home", { scroll: false });
    }

    window.addEventListener("hashchange", syncLandingRouteFromHash);
    window.addEventListener("popstate", syncLandingRouteFromHash);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", syncLandingRouteFromHash, { once: true });
    } else {
      syncLandingRouteFromHash();
    }

    function showLanding(options = {}) {
      closeMobileNav();
      document.getElementById("landingPage").classList.remove("hidden");
      document.getElementById("landingPage").style.display = "block";
      document.getElementById("dashboardPage").style.display = "none";
      document.getElementById("adminDashboard").classList.add("hidden");
      const routeFromLocation = options.preserveRoute ? getLandingRouteFromLocation() : "";
      if (routeFromLocation) {
        setLandingRoute(routeFromLocation, { scroll: false });
        return;
      }
      setLandingRoute("home", { updateHash: true });
    }
