    // Auth Listener Update
    auth.onAuthStateChanged(async (u) => {
      if (u) {
        fbUser = u;
        try {
          token = await u.getIdToken();
        } catch (e) { }
        if (typeof loadUserProfile === "function") {
          try {
            user = await loadUserProfile(u);
          } catch (profileErr) {
            user = user || {
              uid: u.uid,
              email: u.email || "",
              firstName: u.displayName ? u.displayName.split(" ")[0] : (u.email || "Patient").split("@")[0],
              role: "patient",
            };
          }
        }

        updateNav();

        // --- ROLE-BASED PORTAL VISIBILITY ---
        try {
          const doc = await db.collection("patients").doc(u.uid).get();
          const userData = doc.exists ? doc.data() : null;
          if (userData) {
            user = {
              ...(user || {}),
              ...userData,
              uid: u.uid,
              email: u.email || userData.email || "",
            };
          }
          const role =
            userData && userData.role
              ? userData.role.toLowerCase()
              : "patient";
          const isStaff =
            role === "admin" || role === "doctor" || role === "provider";

          console.log(
            "[Auth] User:",
            u.uid,
            "Role:",
            role,
            "isStaff:",
            isStaff,
          );

          const nav = document.querySelector(".nav-links");
          const actions = document.querySelector(".nav-actions");
          const mobilePanel = document.getElementById("mobileNavPanel");
          const mobileActions = mobilePanel
            ? mobilePanel.querySelector(".lp-mobile-panel-actions")
            : null;
          const dict = i18n[currentLang] || i18n.en;
          const emrHref = getEmrLoginUrl();

          if (isStaff) {
            // 1. Provider Portal (Internal Admin)
            if (!document.getElementById("adminLink") && nav) {
              const adminLink = document.createElement("a");
              adminLink.id = "adminLink";
              adminLink.href = "javascript:void(0)";
              adminLink.className = "lp-nav-link";
              adminLink.setAttribute("data-i18n", "nav-provider-portal");
              adminLink.textContent =
                dict["nav-provider-portal"] || "Provider Portal";
              adminLink.setAttribute("onclick", "openProviderPortal()");
              nav.insertBefore(adminLink, nav.firstChild);
            }

            // 2. EMR Portal (External Next.js App)
            if (!document.getElementById("emrLink") && actions) {
              const emrLink = document.createElement("a");
              emrLink.id = "emrLink";
              emrLink.href = emrHref;
              emrLink.target = "_blank";
              emrLink.rel = "noreferrer";
              emrLink.className = "lp-nav-btn lp-nav-btn--ghost";
              emrLink.setAttribute("data-i18n", "nav-emr-portal");
              emrLink.textContent = dict["nav-emr-portal"] || "EMR Portal ↗";
              actions.insertBefore(
                emrLink,
                document.getElementById("loginBtn"),
              );
            }

            if (
              mobilePanel &&
              mobileActions &&
              !document.getElementById("mobileAdminLink")
            ) {
              const mobileAdminLink = document.createElement("a");
              mobileAdminLink.id = "mobileAdminLink";
              mobileAdminLink.href = "#";
              mobileAdminLink.className = "lp-nav-link";
              mobileAdminLink.setAttribute("data-i18n", "nav-provider-portal");
              mobileAdminLink.textContent =
                dict["nav-provider-portal"] || "Provider Portal";
              mobileAdminLink.setAttribute(
                "onclick",
                "closeMobileNav(); openProviderPortal(); return false;",
              );
              mobilePanel.insertBefore(mobileAdminLink, mobileActions);
            }

            if (
              mobilePanel &&
              mobileActions &&
              !document.getElementById("mobileEmrLink")
            ) {
              const mobileEmrLink = document.createElement("a");
              mobileEmrLink.id = "mobileEmrLink";
              mobileEmrLink.href = emrHref;
              mobileEmrLink.target = "_blank";
              mobileEmrLink.rel = "noreferrer";
              mobileEmrLink.className = "lp-nav-link";
              mobileEmrLink.setAttribute("data-i18n", "nav-emr-portal");
              mobileEmrLink.textContent =
                dict["nav-emr-portal"] || "EMR Portal ↗";
              mobileEmrLink.setAttribute("onclick", "closeMobileNav()");
              mobilePanel.insertBefore(mobileEmrLink, mobileActions);
            }
          } else {
            // REMOVE PORTS if patient
            const al = document.getElementById("adminLink");
            if (al) al.remove();
            const el = document.getElementById("emrLink");
            if (el) el.remove();
            const mal = document.getElementById("mobileAdminLink");
            if (mal) mal.remove();
            const mel = document.getElementById("mobileEmrLink");
            if (mel) mel.remove();
          }
        } catch (e) {
          console.error("Role check failed:", e);
        }
      } else {
        updateNav();

        const al = document.getElementById("adminLink");
        if (al) al.remove();
        const el = document.getElementById("emrLink");
        if (el) el.remove();
        const mal = document.getElementById("mobileAdminLink");
        if (mal) mal.remove();
        const mel = document.getElementById("mobileEmrLink");
        if (mel) mel.remove();

        document.getElementById("adminDashboard").classList.add("hidden");
        showLanding({ preserveRoute: true });
      }
    });
