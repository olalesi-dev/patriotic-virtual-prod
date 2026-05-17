    function startSvc(k) {
      selSvc = k;
      window._initialSvcClick = k;
      if (!user) {
        // Save intent so after login/register the consult opens automatically
        window._pendingVisit = true;
        return openModal("register");
      }
      window._pendingVisit = false;
      openConsultation();
      setTimeout(() => {
        document.querySelectorAll("#svcSel .ro").forEach((el) => {
          el.classList.toggle("sel", el.dataset.v === k);
        });
      }, 50);
    }
    function openConsultation() {
      if (!user) return openModal("register");
      intake = {};
      selSvc = selSvc || "membership_elite";
      if (!selSvc) window._initialSvcClick = null;
      if (typeof setConsultModalStep === "function") {
        setConsultModalStep(1);
      } else {
        ["cS1", "cS2", "cS3", "cS4", "cS5"].forEach((id) =>
          document.getElementById(id).classList.add("hidden"),
        );
        document.getElementById("cS1").classList.remove("hidden");
      }
      const clinicalSvcs = window._initialSvcClick ? svcs.filter(s => (s.k === window._initialSvcClick || s.k === "telehealth_standard")) : svcs;
      document.getElementById("svcSel").innerHTML = clinicalSvcs
        .map(
          (s) =>
            `<div class="ro ${selSvc === s.k ? "sel" : ""}" data-v="${s.k}" onclick="pickSvc(this,'${s.k}')"><div class="rd2"></div><span>${s.icon} ${s.name} — $${s.price}</span></div>`,
        )
        .join("");
      document.getElementById("consultModal").classList.add("active");
    }
    function pickSvc(el, k) {
      document
        .querySelectorAll("#svcSel .ro")
        .forEach((o) => o.classList.remove("sel"));
      el.classList.add("sel");
      selSvc = k;
    }
    function cN(s) {
      if (s === 2 && !selSvc) return toast("Select a service.");
      if (s === 2) {
        const qs = iQs[selSvc] || [];
        document.getElementById("iQs").innerHTML = qs
          .map((q) =>
            q.t === "yn"
              ? `<div class="iq"><h3>${q.l}</h3><div class="rg" style="flex-direction:row;gap:10px"><div class="ro" style="flex:1" onclick="sI(this,'${q.k}',true)"><div class="rd2"></div><span>Yes</span></div><div class="ro" style="flex:1" onclick="sI(this,'${q.k}',false)"><div class="rd2"></div><span>No</span></div></div></div>`
              : `<div class="iq"><h3>${q.l}</h3><div class="fg" style="margin:0"><input placeholder="${q.p || ""}" oninput="intake['${q.k}']=this.value"></div></div>`,
          )
          .join("");
      }
      if (s === 3) {
        const sv = svcs.find((x) => x.k === selSvc);
        const responseRows = Object.entries(intake)
          .map(
            ([k, v]) =>
              `<div class="consult-rsum-row"><span class="consult-rsum-key">${k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span><span class="consult-rsum-answer">${typeof v === "boolean" ? (v ? "Yes" : "No") : v}</span></div>`,
          )
          .join("");
        document.getElementById("rSum").innerHTML =
          `<div class="consult-rsum-block"><div class="consult-rsum-label">Service</div><div class="consult-rsum-value">${sv.icon} ${sv.name}</div></div><div class="consult-rsum-block"><div class="consult-rsum-label">Price</div><div class="consult-rsum-value">$${sv.price}</div></div><div class="consult-rsum-block"><div class="consult-rsum-label" style="margin-bottom:8px">Responses</div>${responseRows || '<div class="consult-rsum-empty">No additional responses.</div>'}</div>`;
      }
      if (typeof setConsultModalStep === "function") {
        setConsultModalStep(s);
      } else {
        ["cS1", "cS2", "cS3", "cS4", "cS5"].forEach((id) =>
          document.getElementById(id).classList.add("hidden"),
        );
        document.getElementById("cS" + s).classList.remove("hidden");
      }
    }
    function cB(s) {
      if (typeof setConsultModalStep === "function") {
        setConsultModalStep(s);
      } else {
        ["cS1", "cS2", "cS3", "cS4", "cS5"].forEach((id) =>
          document.getElementById(id).classList.add("hidden"),
        );
        document.getElementById("cS" + s).classList.remove("hidden");
      }
    }
    function sI(el, k, v) {
      el.parentElement
        .querySelectorAll(".ro")
        .forEach((o) => o.classList.remove("sel"));
      el.classList.add("sel");
      intake[k] = v;
    }
    async function subC() {
      try {
        const btn = document.querySelector("#cS3 .btn-primary");
        if (btn) {
          btn.disabled = true;
          btn.innerText = "Processing...";
        }

        const sv = svcs.find((x) => x.k === selSvc);

        // 1. Create Consultation
        console.log("Creating consultation for:", sv.name);
        const tok = await auth.currentUser.getIdToken();
        const consRes = await fetch(`${API}/api/v1/consultations`, {
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
        localStorage.setItem("pendingConsultationId", consultationId); // Fallback for cross-origin redirects
        currentConsultId = consultationId;

        // 2. Create Payment Session
        console.log("Initiating Stripe Checkout...");
        const landingOrigin = typeof getLandingOrigin === "function"
          ? getLandingOrigin()
          : window.location.origin;
        const landingPath = window.location.pathname || "/";
        const checkoutReturnUrl = `${landingOrigin}${landingPath}`;
        const payRes = await fetch(
          `${API}/api/v1/payments/create-checkout-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tok}`,
            },
            body: JSON.stringify({
              priceId: sv.priceId,
              serviceKey: sv.k,
              consultationId: consultationId,
              uid: auth.currentUser
                ? auth.currentUser.uid
                : "unauthenticated_patient",
              returnUrl: checkoutReturnUrl,
              cancelUrl: checkoutReturnUrl,
              mode: sv.cat.includes("membership")
                ? "subscription"
                : "payment",
            }),
          },
        );

        if (!payRes.ok) {
          const err = await payRes.json();
          throw new Error(err.error || "Payment initialization failed");
        }

        const payData = await payRes.json();

        // --- STAGING BYPASS FOR TESTING ---
        // Skips Stripe on staging (-fresh) but still tests the full redirect flow
        if (window.location.host.includes("-fresh")) {
          console.warn("STAGING TEST BYPASS: Skipping Stripe Payment");
          closeConsult();
          await handlePaymentSuccess(consultationId);
          return;
        }
        // --- END STAGING BYPASS ---

        // 3. Redirect to Stripe
        window.location.href = payData.url;
      } catch (e) {
        console.error(e);
        const btn = document.querySelector("#cS3 .btn-primary");
        if (btn) {
          btn.disabled = false;
          btn.innerText = "Submit Visit →";
        }
        toast("Error: " + e.message);
      }
    }
    function closeConsult(e) {
      if (e && e.target !== e.currentTarget) return;
      if (typeof isPaymentVerificationLocked === "function" && isPaymentVerificationLocked()) {
        toast("Complete identity verification before closing this step.");
        return;
      }
      document.getElementById("consultModal").classList.remove("active");
      if (typeof clearPaymentFlowUrlState === "function") {
        clearPaymentFlowUrlState();
      }
      selSvc = null;
    }
