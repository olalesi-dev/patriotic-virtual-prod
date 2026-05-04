    (function () {
      function initLandingScrollReveal() {
        const page = document.getElementById("landingPage");
        if (!page || page.dataset.scrollRevealInit === "true") return;
        page.dataset.scrollRevealInit = "true";

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }

        const revealNodes = [];

        function addReveal(node, effect, delayMs) {
          if (!node || node.classList.contains("lp-scroll-reveal")) return;
          node.classList.add("lp-scroll-reveal");
          node.dataset.reveal = effect;
          node.style.setProperty("--lp-reveal-delay", delayMs + "ms");
          revealNodes.push(node);
        }

        function addRevealGroup(selector, effect, staggerMs) {
          page.querySelectorAll(selector).forEach(function (node, index) {
            addReveal(node, effect, index * staggerMs);
          });
        }

        const providersGrid = page.querySelector(".lp-providers-grid");
        if (providersGrid) {
          const providerSection = providersGrid.closest("section");
          if (providerSection) {
            addReveal(providerSection.querySelector(".lp-section-header"), "up", 0);
          }
        }

        addReveal(page.querySelector(".lp-section-header--split"), "up", 0);
        addRevealGroup(".lp-protocol-column:first-child > *", "left", 90);
        addReveal(page.querySelector(".lp-protocol-image"), "scale", 120);
        addRevealGroup(".lp-protocol-column:last-child > *", "right", 90);

        addReveal(page.querySelector(".lp-innovation-logo"), "left", 0);
        addReveal(page.querySelector(".lp-innovation-copy"), "right", 120);

        addReveal(page.querySelector("#how-it-works .lp-section-header"), "up", 0);
        addRevealGroup("#how-it-works .lp-steps-grid > *", "up", 80);

        addReveal(page.querySelector("#radiology .lp-radiology-intro"), "left", 0);
        addRevealGroup("#radiology .lp-radiology-grid > *", "up", 90);

        addReveal(page.querySelector("#diagnostic-radiology .lp-section-header"), "up", 0);
        addRevealGroup("#diagnostic-radiology .lp-facility-grid > *", "up", 90);

        addRevealGroup(".lp-providers-grid > *", "soft", 90);

        addReveal(page.querySelector("#reviews .lp-section-header"), "up", 0);
        addRevealGroup("#reviews .lp-testimonials-grid > *", "soft", 90);

        addReveal(page.querySelector(".lp-cta-box"), "scale", 0);
        addReveal(page.querySelector(".lp-footer-brand"), "left", 0);
        addRevealGroup(".lp-footer-column", "up", 90);

        if (!revealNodes.length) return;

        function isInView(node) {
          const rect = node.getBoundingClientRect();
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          return rect.top < viewportHeight * 0.9 && rect.bottom > viewportHeight * 0.08;
        }

        revealNodes.forEach(function (node) {
          if (isInView(node)) {
            node.classList.add("lp-in-view");
          }
        });

        if (!("IntersectionObserver" in window)) {
          revealNodes.forEach(function (node) {
            node.classList.add("lp-in-view");
          });
          return;
        }

        const observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting || entry.intersectionRatio > 0.18) {
                entry.target.classList.add("lp-in-view");
                observer.unobserve(entry.target);
              }
            });
          },
          {
            rootMargin: "0px 0px -12% 0px",
            threshold: [0.12, 0.24, 0.36],
          }
        );

        window.requestAnimationFrame(function () {
          page.classList.add("lp-motion-ready");
          revealNodes.forEach(function (node) {
            if (!node.classList.contains("lp-in-view")) {
              observer.observe(node);
            }
          });
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initLandingScrollReveal, { once: true });
      } else {
        initLandingScrollReveal();
      }
    })();
  