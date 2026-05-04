    async function showDashboard() {
      toast("Redirecting to your EMR portal...");
      document.getElementById("landingPage").style.display = "none";
      const EMR_BASE = 'https://patriotic-virtual-emr.web.app';
      const isAdmin = user && ['admin', 'provider', 'doctor'].includes(user.role);
      const endpoint = isAdmin ? '/admin' : '/patient';
      
      try {
        let tokenParam = '';
        if (auth && auth.currentUser) {
          try {
            const idTok = await auth.currentUser.getIdToken();
            const bridgeRes = await fetch(`${API}/api/v1/auth/bridge-token`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${idTok}`, 'Content-Type': 'application/json' }
            });
            if (bridgeRes.ok) {
              const data = await bridgeRes.json();
              if (data.customToken) {
                tokenParam = `?token=${encodeURIComponent(data.customToken)}`;
              }
            }
          } catch (bridgeErr) {
            console.warn('Bridge token failed:', bridgeErr.message);
          }
        }
        window.location.href = `${EMR_BASE}${endpoint}${tokenParam}`;
      } catch (err) {
        console.error("Dashboard redirect error:", err);
        window.location.href = EMR_BASE;
      }
    }

    function switchDashTab(tab) {
      document
        .querySelectorAll(".dash-tab")
        .forEach((t) => t.classList.remove("active"));
      const activeTab = document.getElementById("tabHead-" + tab);
      if (activeTab) activeTab.classList.add("active");

      ["visits", "schedule", "billing"].forEach((id) => {
        const el = document.getElementById("tab-dash-" + id);
        if (el) el.classList.add("hidden");
      });
      const contentEl = document.getElementById("tab-dash-" + tab);
      if (contentEl) contentEl.classList.remove("hidden");

      if (tab === "schedule" && window.patientCalendar) {
        setTimeout(() => patientCalendar.updateSize(), 50);
      }
      if (tab === "billing") {
        fetchBillingInfo();
      }
    }

    async function fetchBillingInfo() {
      if (!user || !token) return;
      const statusEl = document.getElementById("subStatus");
      const titleEl = document.getElementById("planTitle");
      const priceEl = document.getElementById("planPrice");
      const listEl = document.getElementById("paymentList");
      const reactivateBtn = document.getElementById("reactivateBtn");
      const upgradeBtn = document.getElementById("upgradeBtn");

      try {
        // Fetch current subscription status from user data or dedicated endpoint
        // For now, checks user metadata
        if (user.subscription) {
          titleEl.textContent =
            user.subscription.planName || "Active Membership";
          priceEl.textContent = `$${user.subscription.amount / 100} / month`;
          statusEl.textContent = user.subscription.status || "Active";
          statusEl.className =
            "status-pill " +
            (user.subscription.status === "active"
              ? "active"
              : user.subscription.status === "past_due"
                ? "issue"
                : "cancelled");

          if (
            user.subscription.status === "canceled" ||
            user.subscription.status === "past_due"
          ) {
            reactivateBtn.classList.remove("hidden");
          } else {
            reactivateBtn.classList.add("hidden");
          }
          upgradeBtn.textContent = "Change Plan";
        }

        // Fetch Payments
        const payRes = await fetch(`${API}/api/v1/billing/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (payRes.ok) {
          const payments = await payRes.json();
          // Filter payments for this specific user
          const myPayments = payments.filter(
            (p) =>
              p.patientId === user.uid ||
              p.userId === user.uid ||
              p.uid === user.uid,
          );

          if (myPayments.length > 0) {
            listEl.innerHTML = myPayments
              .map(
                (p) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-soft);background:var(--bg-panel)">
                <div>
                  <div style="font-weight:700;color:var(--txt-main);font-size:14px">${p.description || "Medical Service"}</div>
                  <div style="font-size:12px;color:var(--txt-sub)">${new Date(p.date || p.createdAt).toLocaleDateString()}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:800;color:var(--txt-main)">$${(p.amount / 100).toFixed(2)}</div>
                  <div style="font-size:11px;color:var(--emerald);font-weight:800;letter-spacing:0.5px">PAID</div>
                </div>
              </div>
            `,
              )
              .join("");
          } else {
            listEl.innerHTML =
              '<div style="padding:40px;text-align:center;color:var(--g400);font-size:14px;background:var(--bg-tertiary)">No transaction history available.</div>';
          }
        }
      } catch (e) {
        console.error("Billing fetch error:", e);
      }
    }

    function upgradePlan() {
      toast("Redirecting to secure plan selection...");
      openConsultation(); // Use visit modal for now which has service selection
    }

    async function manageBilling() {
      toast("Opening secure billing portal...");
      try {
        const res = await fetch(
          `${API}/api/v1/payments/create-portal-session`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else toast("Portal temporarily unavailable. Use Stripe dashboard.");
      } catch (e) {
        toast("Secure billing portal failed to load.");
      }
    }

    function reactivateSubscription() {
      toast("Reactivating your subscription...");
      upgradePlan();
    }

    async function openResults() {
      document.getElementById("resultsModal").classList.add("active");
      const content = document.getElementById("resultsContent");
      content.innerHTML =
        '<div style="padding:40px;text-align:center;color:var(--g400)">Fetching your clinical reports...</div>';

      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/doctor/patients/${user.uid}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();

        if (!data.labs || data.labs.length === 0) {
          content.innerHTML =
            '<div style="padding:40px;text-align:center;color:var(--g400)">No lab results available yet.</div>';
          return;
        }

        content.innerHTML = `
          <div style="display:grid;gap:15px">
            ${data.labs
            .map(
              (l) => `
              <div style="padding:15px;border:1px solid var(--g100);border-radius:12px;background:var(--bg-tertiary);display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div style="font-weight:700;color:var(--txt-main);font-size:15px">${l.panels.join(", ")}</div>
                  <div style="font-size:12px;color:var(--txt-sub)">Status: <span style="font-weight:700;color:${l.status === "reviewed" ? "#00D9A3" : "#FFB800"}">${l.status.replace(/_/g, " ")}</span> • ${new Date(l.createdAt._seconds ? l.createdAt._seconds * 1000 : l.createdAt).toLocaleDateString()}</div>
                </div>
                <div style="display:flex;gap:8px">
                  ${l.requisitionUrl ? `<a href="${l.requisitionUrl}" target="_blank" class="btn btn-ghost" style="font-size:11px;padding:5px 10px;text-decoration:none">Requisition</a>` : ""}
                  ${l.resultUrl ? `<a href="${l.resultUrl}" target="_blank" class="btn btn-primary" style="font-size:11px;padding:5px 10px;text-decoration:none">View Result</a>` : ""}
                </div>
              </div>
            `,
            )
            .join("")}
          </div>
        `;
      } catch (err) {
        console.error(err);
        content.innerHTML =
          '<div style="padding:40px;text-align:center;color:var(--red)">Failed to load results. Please try again.</div>';
      }
    }

    let patientCalendar;
    function initPatientCalendar() {
      const calendarEl = document.getElementById("patientCalendar");
      if (!calendarEl) return;
      if (patientCalendar) {
        patientCalendar.render();
        return;
      }
      patientCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        },
        height: "100%",
        events: async function (info, successCallback, failureCallback) {
          try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch(`${API}/api/v1/doctor/appointments`, {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            // Filter only for current user
            const myApts = data.filter((apt) => apt.patientId === user.uid);
            const events = myApts.map((apt) => ({
              id: apt.id,
              title: apt.serviceName || "Telehealth Visit",
              start: apt.startTime,
              end: new Date(
                new Date(apt.startTime).getTime() +
                apt.durationMinutes * 60000,
              ).toISOString(),
              backgroundColor: "var(--blue)",
              borderColor: "var(--blue)",
              extendedProps: {
                patientName: apt.patientName || "Unknown",
                patientEmail: apt.patientEmail || "",
                serviceName: apt.serviceName || "Consultation",
                status: apt.consultationStatus || apt.status,
                consultationId: apt.consultationId,
              },
            }));
            successCallback(events);
          } catch (e) {
            failureCallback(e);
          }
        },
        eventClick: function (info) {
          const p = info.event.extendedProps;
          if (!p) return;
          const time = info.event.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const date = info.event.start.toLocaleDateString();

          window.currentAptConsultId = p.consultationId;

          const content = `
                <div style="margin-bottom:12px">
                    <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Your Name</div>
                    <div style="font-size:16px;font-weight:700;color:white">${p.patientName}</div>
                </div>
                <div style="margin-bottom:12px">
                    <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Service</div>
                    <div style="font-size:15px;color:rgba(255,255,255,0.9)">${p.serviceName}</div>
                </div>
                <div style="display:flex;gap:20px;margin-bottom:12px">
                    <div>
                        <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Time</div>
                        <div style="font-size:14px;color:rgba(255,255,255,0.9)">${date} • ${time}</div>
                    </div>
                    <div>
                        <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Status</div>
                        <div style="font-size:14px;text-transform:capitalize;font-weight:600;color:${p.status === "reviewed" ? "#00D9A3" : p.status === "completed" ? "var(--blue)" : "var(--amber)"}">${p.status}</div>
                    </div>
                </div>
             `;
          document.getElementById("apptDetailsContent").innerHTML = content;
          document.getElementById("apptModal").classList.add("active");
        },
      });
      patientCalendar.render();
    }

    async function fetchConsultations() {
      if (!token) return;
      try {
        const res = await fetch(`${API}/api/v1/consultations/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = document.getElementById("cList");
          if (data.consultations && data.consultations.length > 0) {
            window.patientConsultations = data.consultations;
            list.innerHTML = data.consultations
              .map(
                (c) =>
                  `<div style="padding:16px;border-bottom:1px solid var(--border-soft);display:flex;justify-content:space-between;align-items:center">
                  <div>
                      <div style="font-weight:600;color:var(--txt-main)">${c.serviceKey.replace(/_/g, " ")}</div>
                      <div style="font-size:12px;color:var(--txt-sub)">${new Date(c.createdAt._seconds * 1000).toLocaleDateString()}</div>
                  </div>
                  <div style="font-size:13px;font-weight:600;color:${c.status === "pending" ? "var(--amber)" : c.status === "approved" ? "var(--emerald)" : "var(--g500)"}">
                      ${c.status.toUpperCase()}
                  </div>
              </div>`,
              )
              .join("");
          } else {
            list.innerHTML =
              '<div style="padding:40px;text-align:center;color:var(--g400);font-size:14px">No visits yet. Start your first consultation.</div>';
          }
        }
      } catch (e) {
        console.error("Failed to fetch visits", e);
      }
    }

