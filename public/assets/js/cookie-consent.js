      function acceptCookies() {
        localStorage.setItem("cookieConsent", "accepted");
        document.getElementById("cookie-banner").style.display = "none";
      }
      function declineCookies() {
        localStorage.setItem("cookieConsent", "declined");
        document.getElementById("cookie-banner").style.display = "none";
      }
      document.addEventListener("DOMContentLoaded", function() {
        if (!localStorage.getItem("cookieConsent")) {
          const showCookieBanner = function() {
            const banner = document.getElementById("cookie-banner");
            if (banner && !localStorage.getItem("cookieConsent")) {
              banner.style.display = "flex";
            }
            window.removeEventListener("scroll", showCookieBanner);
          };

          if (window.matchMedia("(max-width: 767px)").matches) {
            window.addEventListener("scroll", showCookieBanner, {
              once: true,
              passive: true,
            });
            setTimeout(showCookieBanner, 6000);
          } else {
            showCookieBanner();
          }
        }
      });
