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
    function switchAuth(t) {
      document
        .getElementById("loginForm")
        .classList.toggle("hidden", t !== "login");
      document
        .getElementById("registerForm")
        .classList.toggle("hidden", t !== "register");
      if (document.getElementById("verifyForm")) {
        document.getElementById("verifyForm").classList.add("hidden");
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

        try {
          const r = await fetch(`${API}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) {
            user = await r.json();
          } else {
            // Fallback
            user = {
              firstName: fbUser.displayName || fbUser.email.split("@")[0],
              email: fbUser.email,
              role: "patient",
              uid: fbUser.uid,
            };
          }
        } catch (apiErr) {
          console.error("API fetch error, using fallback:", apiErr);
          user = {
            firstName: fbUser.displayName || fbUser.email.split("@")[0],
            email: fbUser.email,
            role: "patient",
            uid: fbUser.uid,
          };
        }

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
      const fn = document.getElementById("regFirst").value,
        ln = document.getElementById("regLast").value,
        e = document.getElementById("regEmail").value,
        p = document.getElementById("regPassword").value,
        st = document.getElementById("regState").value,
        dob = document.getElementById("regDob").value,
        phoneRaw = document.getElementById("regPhone").value,
        sex = document.getElementById("regSex").value;

      const phone = phoneRaw.replace(/\D/g, "");

      if (!fn || !ln || !e || !p || !phoneRaw || !sex || !dob)
        return toast("Please fill all required fields.");
      if (phone.length < 10)
        return toast("Please enter a valid 10-digit phone number.");
      if (p.length < 6)
        return toast("Password must be at least 6 characters.");
      if (!ACTIVE_STATES.includes(st)) {
        return toast("We're currently only available in Florida.");
      }
      try {
        const cred = await auth.createUserWithEmailAndPassword(e, p);
        fbUser = cred.user;
        await fbUser.updateProfile({ displayName: fn + " " + ln });
        token = await fbUser.getIdToken();
        try {
          const r = await fetch(`${API}/api/v1/auth/firebase-register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              firstName: fn,
              lastName: ln,
              state: st,
              dateOfBirth: dob,
              gender: sex,
              role: "patient",
              firebaseUid: fbUser.uid,
              email: e,
            }),
          });
          if (r.ok) {
            user = await r.json();
          } else {
            user = {
              firstName: fn,
              lastName: ln,
              email: e,
              state: st,
              role: "patient",
              uid: fbUser.uid,
            };
          }
        } catch (apiErr) {
          user = {
            firstName: fn,
            lastName: ln,
            email: e,
            state: st,
            role: "patient",
            uid: fbUser.uid,
          };
        }
        // document.getElementById("authModal").classList.remove("active");
        if (db && fbUser) {
          try {
            await db.collection('users').doc(fbUser.uid).set({
              uid: fbUser.uid,
              email: e,
              displayName: fn + ' ' + ln,
              firstName: fn,
              lastName: ln,
              state: st,
              dateOfBirth: dob,
              gender: sex,
              phone: phone,
              role: 'patient',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          } catch (writeErr) {
            console.log('User profile write skipped:', writeErr.message);
          }
        }
        updateNav();
        toast("Account created! Please verify your identity.");
        
        document.getElementById("loginForm").classList.add("hidden");
        document.getElementById("registerForm").classList.add("hidden");
        document.getElementById("verifyForm").classList.remove("hidden");
        
        const iframe = document.getElementById("vouchedFrame");
        iframe.src = `/vouched.html?firstName=${encodeURIComponent(fn)}&lastName=${encodeURIComponent(ln)}&email=${encodeURIComponent(e)}&phone=${encodeURIComponent(phone)}`;
      } catch (err) {
        const msg =
          err.code === "auth/email-already-in-use"
            ? "An account with that email already exists. Try logging in."
            : err.code === "auth/weak-password"
              ? "Password is too weak. Use at least 6 characters."
              : err.code === "auth/invalid-email"
                ? "Invalid email address."
                : err.message || "Registration failed.";
        toast(msg);
      }
    }
    async function handleGoogleLogin() {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const cred = await auth.signInWithPopup(provider);
        fbUser = cred.user;
        token = await fbUser.getIdToken();
        const names = fbUser.displayName
          ? fbUser.displayName.split(" ")
          : ["User"];
        try {
          const r = await fetch(`${API}/api/v1/auth/firebase-register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              firstName: names[0],
              lastName: names.slice(1).join(" ") || "",
              email: fbUser.email,
              firebaseUid: fbUser.uid,
              role: "patient",
            }),
          });
          if (r.ok) {
            user = await r.json();
          } else {
            user = {
              firstName: names[0],
              lastName: names.slice(1).join(" ") || "",
              email: fbUser.email,
              role: "patient",
              uid: fbUser.uid,
            };
          }
        } catch (apiErr) {
          user = {
            firstName: names[0],
            email: fbUser.email,
            role: "patient",
            uid: fbUser.uid,
          };
        }
        document.getElementById("authModal").classList.remove("active");
        updateNav();
        showDashboard();
        toast("Welcome, " + (user.firstName || fbUser.email) + "!");
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
        try {
          const r = await fetch(`${API}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) {
            user = await r.json();
          } else {
            user = {
              firstName: u.displayName
                ? u.displayName.split(" ")[0]
                : u.email.split("@")[0],
              email: u.email,
              role: "patient",
              uid: u.uid,
            };
          }
        } catch (e) {
          user = {
            firstName: u.displayName
              ? u.displayName.split(" ")[0]
              : u.email.split("@")[0],
            email: u.email,
            role: "patient",
            uid: u.uid,
          };
        }
        updateNav();
      } else {
        token = null;
        user = null;
        fbUser = null;
        updateNav();
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
