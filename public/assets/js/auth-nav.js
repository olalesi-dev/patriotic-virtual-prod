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
    function openModal(t) {
      document.getElementById("authModal").classList.add("active");
      switchAuth(t);
    }
    function closeModal(e) {
      if (e && e.target !== e.currentTarget) return;
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
    }
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
    function finishSignup(message) {
      updateNav();
      toast(message || "Account created. Please check your email to verify your email address.");
      document.getElementById("authModal").classList.remove("active");

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
    async function runSignupVerification(firebaseUser, registration) {
      const workflowPayload = getVouchedWorkflowPayload(registration);

      try {
        const workflow = await authedApiJson("/api/v1/vouched/workflow/start", {
          method: "POST",
          user: firebaseUser,
          body: workflowPayload,
        });
        await recordSignupFlowTrace({
          step: "vouched_workflow",
          status: "success",
          user: firebaseUser,
          payload: workflowPayload,
          response: workflow,
        });

        if (workflow && workflow.nextStep === "visual_id") {
          showVisualVerification(
            firebaseUser,
            registration,
            workflow.warningMessage || "We could not verify your identity with passive checks. Complete secure ID verification to continue.",
          );
          return;
        }

        if (workflow && workflow.status === "review_required") {
          finishSignup(workflow.warningMessage || "Your account was created and identity verification is pending manual review. Please verify your email before logging in.");
          return;
        }

        finishSignup("Your account was created and identity verification is complete. Please verify your email before logging in.");
      } catch (error) {
        await recordSignupFlowTrace({
          step: "vouched_workflow",
          status: "error",
          user: firebaseUser,
          payload: workflowPayload,
          error: error.message || "Vouched step-up workflow failed.",
        });
        console.warn("Passive identity verification failed:", error);
        showVisualVerification(
          firebaseUser,
          registration,
          "We could not complete passive identity verification. Complete secure ID verification to continue.",
        );
      }
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
        // If user clicked a service before being asked to log in, open the visit modal
        if (window._pendingVisit || selSvc) {
          window._pendingVisit = false;
          openConsultation();
        } else {
          showDashboard();
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
      const validation = readRegistrationForm();
      if (validation.error || !validation.data) return toast(validation.error || "Please fill all required fields.");

      try {
        const registration = validation.data;
        const cred = await auth.createUserWithEmailAndPassword(registration.email, registration.password);
        fbUser = cred.user;
        token = await fbUser.getIdToken();

        try {
          const dbResult = await persistPatientRegistration(fbUser, registration, {
            sendVerificationEmail: true,
            auditAction: "ACCOUNT_CREATED",
          });
          await recordSignupFlowTrace({
            step: "db_write",
            status: "success",
            user: fbUser,
            response: dbResult,
          });
        } catch (error) {
          await recordSignupFlowTrace({
            step: "db_write",
            status: "error",
            user: fbUser,
            error: error.message || "Failed to persist patient/user signup records.",
          });
          throw error;
        }

        user = await loadUserProfile(fbUser);
        updateNav();
        await runSignupVerification(fbUser, registration);
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
          const validation = readRegistrationForm({ requireEmail: false, requirePassword: false });
          if (validation.error || !validation.data) return toast(validation.error || "Please complete the required patient details first.");
          registration = validation.data;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        const cred = await auth.signInWithPopup(provider);
        fbUser = cred.user;
        token = await fbUser.getIdToken();

        if (registerMode && registration) {
          registration.email = fbUser.email || registration.email;
          if (!registration.email) throw new Error("Unable to determine patient email address.");
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
          await runSignupVerification(fbUser, registration);
        } else {
          document.getElementById("authModal").classList.remove("active");
          showDashboard();
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
      if (!e.data || e.data.type !== "VOUCHED_DONE" || e.data.context !== "signup") return;

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
