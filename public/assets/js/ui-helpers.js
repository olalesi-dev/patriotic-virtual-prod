    function openConsent() {
      console.log("OpenConsent Triggered");
      document.getElementById("consentModal").classList.add("active");
    }
    function closeConsent(e) {
      if (e && e.target !== e.currentTarget && e.target.tagName !== "BUTTON")
        return;
      document.getElementById("consentModal").classList.remove("active");
    }
    function toast(m) {
      const t = document.getElementById("toast");
      t.textContent = m;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 3500);
    }
    window.addEventListener("scroll", () => {
      document
        .getElementById("mainNav")
        .classList.toggle("scrolled", window.scrollY > 20);
    });
    // --- INITIALIZATION ---
    window.addEventListener("load", () => {
      // 1. Check Auth
      // (Handled by onAuthStateChanged)

      // 2. Check Payment Status
      checkPaymentStatus();

      // 3. Check for Privacy Policy direct link
      if (window.location.hash === '#privacy' || window.location.hash === '#consent') {
        openConsent();
      }

      // 3. Event Delegation for Patient Links
      document.body.addEventListener("click", (e) => {
        // console.log('Body clicked:', e.target); // Too noisy
        if (e.target.classList.contains("patient-link")) {
          const uid = e.target.getAttribute("data-uid");
          console.log("Patient Link Clicked. UID:", uid);
          if (uid && uid !== "undefined") {
            openPatientChart(uid);
          } else {
            alert("Error: Patient ID is missing on this element.");
            console.error("Missing UID on element:", e.target);
          }
        }

        // Cross-domain SSO Interceptor
        const anchor = e.target.closest("a");
        if (anchor && anchor.href && anchor.href.includes("patriotic-virtual-emr.web.app")) {
          // If logged in, generate a custom token to carry over the session
          if (auth && auth.currentUser) {
            e.preventDefault();
            const originalText = anchor.innerText;
            anchor.innerText = 'Redirecting...';
            anchor.style.pointerEvents = 'none';
            
            auth.currentUser.getIdToken()
              .then(idToken => fetch('/api/v1/auth/bridge-token', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + idToken, 'Content-Type': 'application/json' }
              }))
              .then(res => res.json())
              .then(data => {
                const url = new URL(anchor.href);
                if (data.customToken) {
                  url.searchParams.set('token', data.customToken);
                }
                window.location.href = url.toString();
              })
              .catch(err => {
                console.error('SSO Bridge Token Error:', err);
                window.location.href = anchor.href;
              });
          }
        }
      });
    });

    function checkPaymentStatus() {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get("payment");
      console.log("Checking payment status. Result:", paymentStatus);

      if (paymentStatus === "success") {
        const urlId = params.get("consultationId");
        const sessionId = sessionStorage.getItem("pendingConsultationId");
        const localId = localStorage.getItem("pendingConsultationId");

        console.log(
          "Recovery attempt - URL:",
          urlId,
          "Session:",
          sessionId,
          "Local:",
          localId,
        );

        const savedId = urlId || sessionId || localId;

        if (savedId) {
          console.log("Successfully recovered Consultation ID:", savedId);
          currentConsultId = savedId;
          // Ensure it's re-saved if it came from URL
          localStorage.setItem("pendingConsultationId", savedId);

          // Use the consolidated professional success flow
          handlePaymentSuccess(savedId);
        } else {
          console.warn(
            "Payment success landing but no Consultation ID found in storage or URL.",
          );
          // Fallback: show success anyway so patient isn't stuck
          showBookingSuccess();
        }
      } else if (paymentStatus === "cancelled") {
        toast("Payment was cancelled.");
      }
    }

    // Ensure adminConsults is global
    window.adminConsults = [];
    window.patientConsultations = [];

    renderSvc("popular");
    updateNav();

    // Theme Logic
    window.toggleTheme = function () {
      const isLight = document.body.classList.toggle("light-theme");
      document.documentElement.classList.toggle("light-theme");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      updateThemeIcon(isLight);
    };
    function updateThemeIcon(isLight) {
      const btn = document.getElementById("themeBtn");
      if (btn) {
        btn.innerHTML = isLight ? "🌙" : "☀️";
        btn.title = isLight ? "Switch to Dark Mode" : "Switch to Light Mode";
      }
    }
    // Init Theme
    (function () {
      const saved = localStorage.getItem("theme");
      if (saved === "light") {
        document.body.classList.add("light-theme");
        document.documentElement.classList.add("light-theme");
        // Use setTimeout to ensure button exists if needed, though script is at bottom
        setTimeout(() => updateThemeIcon(true), 0);
      }
    })();

    function renderThemeIcon(isLight) {
      return isLight
        ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.8A8.99 8.99 0 0 1 11.2 3a8.3 8.3 0 0 0-.2 1.8 9 9 0 1 0 10 10c0-.34 0-.67-.06-1Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8"></circle><path d="M12 2.5V5.5M12 18.5V21.5M21.5 12H18.5M5.5 12H2.5M18.72 5.28L16.6 7.4M7.4 16.6L5.28 18.72M18.72 18.72L16.6 16.6M7.4 7.4L5.28 5.28" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>';
    }

    updateThemeIcon = function (isLight) {
      const btn = document.getElementById("themeBtn");
      if (!btn) return;
      btn.innerHTML = renderThemeIcon(isLight);
      btn.title = isLight ? "Switch to Dark Mode" : "Switch to Light Mode";
      btn.setAttribute("aria-label", btn.title);
    };

    function setTheme(mode, persist = true) {
      const isLight = mode === "light";
      document.body.classList.toggle("light-theme", isLight);
      document.documentElement.classList.toggle("light-theme", isLight);
      if (persist) {
        localStorage.setItem("theme", isLight ? "light" : "dark");
      }
      updateThemeIcon(isLight);
    }

    window.toggleTheme = function () {
      const nextMode = document.body.classList.contains("light-theme") ? "dark" : "light";
      setTheme(nextMode);
    };

    (function () {
      const saved = localStorage.getItem("theme");
      setTheme(saved === "dark" ? "dark" : "light", false);
    })();

    (function initLandingHeroVideo() {
      const landing = document.getElementById("landingPage");
      const activeVideo = landing?.querySelector(":scope > .lp-hero .hero-bg-video");
      const legacyVideos = document.querySelectorAll("#landingPageLegacy .hero-bg-video");

      legacyVideos.forEach(function (video) {
        video.pause();
        video.removeAttribute("autoplay");
        video.removeAttribute("loop");
        video.preload = "none";
        video.removeAttribute("src");
        video.querySelectorAll("source").forEach(function (source) {
          source.removeAttribute("src");
        });
        video.load();
      });

      if (!landing || !activeVideo) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      function landingIsVisible() {
        return !landing.classList.contains("hidden") && landing.style.display !== "none";
      }

      window.syncLandingHeroVideo = function () {
        if (reducedMotion.matches || document.hidden || !landingIsVisible()) {
          activeVideo.pause();
          return;
        }
        activeVideo.play().catch(function () {
          // Autoplay can be deferred by the browser; muted playback resumes on the next sync.
        });
      };

      activeVideo.addEventListener("ended", function () {
        activeVideo.currentTime = 0;
        window.syncLandingHeroVideo();
      });

      document.addEventListener("visibilitychange", window.syncLandingHeroVideo);
      reducedMotion.addEventListener?.("change", window.syncLandingHeroVideo);

      const observer = new MutationObserver(window.syncLandingHeroVideo);
      observer.observe(landing, { attributes: true, attributeFilter: ["class", "style"] });

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", window.syncLandingHeroVideo, { once: true });
      } else {
        window.syncLandingHeroVideo();
      }
    })();

    (function initBreakthroughCarouselDrag() {
      function setupCarouselDrag() {
        const carousel = document.querySelector("#weight-breakthrough .lp-breakthrough-carousel");
        if (!carousel || carousel.dataset.dragScrollInit === "true") return;

        carousel.dataset.dragScrollInit = "true";
        let isPointerDown = false;
        let startX = 0;
        let startScrollLeft = 0;
        let didDrag = false;
        let blockClick = false;

        carousel.addEventListener("pointerdown", function (event) {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          isPointerDown = true;
          didDrag = false;
          startX = event.clientX;
          startScrollLeft = carousel.scrollLeft;
          carousel.classList.add("is-dragging");
          carousel.setPointerCapture?.(event.pointerId);
        });

        carousel.addEventListener("pointermove", function (event) {
          if (!isPointerDown) return;
          const deltaX = event.clientX - startX;
          if (Math.abs(deltaX) > 4) {
            didDrag = true;
            carousel.scrollLeft = startScrollLeft - deltaX;
            event.preventDefault();
          }
        });

        function endDrag(event) {
          if (!isPointerDown) return;
          isPointerDown = false;
          carousel.classList.remove("is-dragging");
          carousel.releasePointerCapture?.(event.pointerId);
          if (didDrag) {
            blockClick = true;
            window.setTimeout(function () {
              blockClick = false;
            }, 0);
          }
        }

        carousel.addEventListener("pointerup", endDrag);
        carousel.addEventListener("pointercancel", endDrag);
        carousel.addEventListener("lostpointercapture", function () {
          isPointerDown = false;
          carousel.classList.remove("is-dragging");
        });

        carousel.addEventListener(
          "click",
          function (event) {
            if (!blockClick) return;
            event.preventDefault();
            event.stopPropagation();
            blockClick = false;
          },
          true,
        );
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupCarouselDrag, { once: true });
      } else {
        setupCarouselDrag();
      }
    })();
