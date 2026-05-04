    /* --- SCHEDULING & CALENDAR SYSTEM (Phase 7) --- */
    let calendar;
    let selectedDate = null;
    let selectedTime = null;

    function initProviderCalendar() {
      const calendarEl = document.getElementById("providerCalendar");
      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "timeGridWeek",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,dayGridMonth",
        },
        height: "100%",
        slotMinTime: "08:00:00",
        slotMaxTime: "18:00:00",
        allDaySlot: false,
        selectable: true,
        selectMirror: true,
        events: async function (info, successCallback, failureCallback) {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch(
            `${API}/api/v1/doctor/appointments?start=${info.startStr}&end=${info.endStr}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await res.json();
          const events = data.map((apt) => {
            if (apt.isBlock)
              return {
                id: apt.id,
                start: apt.start,
                end: apt.end,
                display: "background",
                backgroundColor: "#cbd5e1",
                title: "UNAVAILABLE",
              };

            return {
              id: apt.id,
              title: apt.patientName || "Patient Visit",
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
            };
          });
          successCallback(events);
        },
        eventClick: function (info) {
          if (info.event.display === "background") {
            // If background, allow unblocking on click? No, FC doesn't trigger eventClick for background events easily.
            // We'll use dateClick for everything empty.
            return;
          }
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
                    <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Patient</div>
                    <div style="font-size:16px;font-weight:700;color:var(--txt-main)">${p.patientName
            }</div>
                    <div style="font-size:13px;color:var(--txt-sub)">${p.patientEmail
            }</div>
                </div>
                <div style="margin-bottom:12px">
                    <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Service</div>
                    <div style="font-size:15px;color:var(--txt-main)">${p.serviceName
            }</div>
                </div>
                <div style="display:flex;gap:20px;margin-bottom:12px">
                    <div>
                        <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Time</div>
                        <div style="font-size:14px;color:var(--txt-main)">${date} • ${time}</div>
                    </div>
                    <div>
                        <div style="font-size:12px;color:var(--txt-sub);font-weight:600;text-transform:uppercase;margin-bottom:4px">Status</div>
                        <div style="font-size:14px;text-transform:capitalize;font-weight:600;color:${p.status === "reviewed" ? "green" : p.status === "completed" ? "blue" : "orange"}">${p.status}</div>
                    </div>
                </div>
              `;
          document.getElementById("apptDetailsContent").innerHTML = content;
          document.getElementById("apptModal").classList.add("active");
        },
        dateClick: async function (info) {
          if (confirm("Toggle availability for this slot?")) {
            try {
              const token = await auth.currentUser.getIdToken();
              await fetch(`${API}/api/v1/doctor/availability/toggle`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ startTime: info.dateStr }),
              });
              calendar.refetchEvents();
              toast("Availability updated");
            } catch (e) {
              toast("Error toggling availability");
            }
          }
        },
      });
      calendar.render();

      // Also load "Today's Agenda"
      loadTodaysAgenda();
    }

    async function loadTodaysAgenda() {
      const ag = document.getElementById("todaysAgenda");
      // Mock data for now, replace with API call
      ag.innerHTML = `<div style="padding:20px;text-align:center;color:var(--txt-sub)">No appointments today.</div>`;
    }

    // --- PATIENT BOOKING WIZARD ---
    let selectedDoctorId = null;
    let selectedDoctorName = null;
    let doctorsData = [];

    async function openBookingModal(consultId) {
      console.log("openBookingModal triggered with ID:", consultId);
      if (!consultId) consultId = currentConsultId;
      console.log("ID after currentConsultId check:", consultId);

      if (!consultId) {
        const params = new URLSearchParams(window.location.search);
        consultId = params.get("consultationId");
        console.log("ID from URL params:", consultId);
      }
      if (!consultId) {
        consultId = sessionStorage.getItem("pendingConsultationId");
        console.log("ID from sessionStorage:", consultId);
      }
      if (!consultId) {
        consultId = localStorage.getItem("pendingConsultationId");
        console.log("ID from localStorage:", consultId);
      }

      if (!consultId) {
        console.error(
          "CRITICAL: No consultation ID available for booking modal.",
        );
        return toast("Error: Unable to find consultation details.");
      }

      console.log("Opening booking modal for consultation:", consultId);
      document.getElementById("bookingModal").classList.add("active");
      document.getElementById("bookingConsultId").value = consultId;

      // Reset state
      selectedDoctorId = null;
      selectedDate = null;
      selectedTime = null;
      document.getElementById("step-doctor").classList.remove("hidden");
      document.getElementById("bookingDetails").classList.add("hidden");
      document.getElementById("btnBackToDoctors").classList.add("hidden");
      document.getElementById("btnConfirmBook").disabled = true;

      loadDoctors();
    }

    async function loadDoctors() {
      const grid = document.getElementById("doctorGrid");
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt-sub)">Loading doctors...</div>';

      try {
        const res = await fetch(`${API}/api/v1/doctors`);
        doctorsData = await res.json();

        if (doctorsData.length === 0) {
          grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt-sub)">No providers available at the moment.</div>';
          return;
        }

        grid.innerHTML = doctorsData
          .map(
            (doc) => `
            <div class="doctor-card" onclick="selectDoctor('${doc.id}')" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-soft); border-radius:12px; padding:16px; cursor:pointer; transition:all 0.2s">
                <div style="display:flex; align-items:center; gap:16px">
                    <img src="${doc.photoUrl}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid var(--blue)">
                    <div>
                        <div style="font-weight:700; color:white; font-size:16px">${doc.name}</div>
                        <div style="font-size:13px; color:var(--txt-sub)">${doc.specialty}</div>
                    </div>
                </div>
            </div>
        `,
          )
          .join("");
      } catch (e) {
        grid.innerHTML =
          '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red)">Failed to load providers.</div>';
      }
    }

    function selectDoctor(id) {
      selectedDoctorId = id;
      const doc = doctorsData.find((d) => d.id === id);
      selectedDoctorName = doc.name;

      document.getElementById("step-doctor").classList.add("hidden");
      document.getElementById("bookingDetails").classList.remove("hidden");
      document.getElementById("btnBackToDoctors").classList.remove("hidden");

      document.getElementById("selectedDoctorInfo").innerHTML = `
        <img src="${doc.photoUrl}" style="width:50px; height:50px; border-radius:50%; object-fit:cover">
        <div>
            <div style="font-weight:700; color:white">${doc.name}</div>
            <div style="font-size:12px; color:var(--txt-sub)">${doc.specialty}</div>
        </div>
      `;

      renderBookingDates();
    }

    function backToDoctorSelection() {
      document.getElementById("step-doctor").classList.remove("hidden");
      document.getElementById("bookingDetails").classList.add("hidden");
      document.getElementById("btnBackToDoctors").classList.add("hidden");
      selectedDoctorId = null;
    }

    function renderBookingDates() {
      const grid = document.getElementById("bookingDateGrid");
      grid.innerHTML = "";
      const today = new Date();

      for (let i = 1; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        const div = document.createElement("div");
        div.className = `date-cell ${isWeekend ? "disabled" : ""}`;
        div.style.cssText = `background:rgba(255,255,255,0.03); border:1px solid var(--border-soft); border-radius:8px; padding:12px; text-align:center; cursor:${isWeekend ? "not-allowed" : "pointer"}`;
        div.innerHTML = `
                <div style="font-size:10px;text-transform:uppercase;color:var(--txt-sub);margin-bottom:4px">${d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div style="font-size:16px;font-weight:700;color:white">${d.getDate()}</div>
            `;
        if (!isWeekend) {
          div.onclick = () => selectBookingDate(div, d);
        }
        grid.appendChild(div);
      }
    }

    async function selectBookingDate(el, dateObj) {
      document.querySelectorAll(".date-cell").forEach((c) => {
        c.classList.remove("selected");
        c.style.borderColor = "var(--g200)";
        c.style.background = "rgba(255,255,255,0.03)";
      });
      el.classList.add("selected");
      el.style.borderColor = "var(--blue)";
      el.style.background = "rgba(91, 127, 255, 0.1)";

      selectedDate = dateObj;
      await fetchDoctorAvailability(dateObj);
    }

    async function fetchDoctorAvailability(date) {
      const grid = document.getElementById("bookingTimeGrid");
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;color:var(--txt-sub);padding:20px">Checking availability...</div>';

      try {
        // Fetch blocks for this doctor
        const res = await fetch(
          `${API}/api/v1/doctor/availability?doctorId=${selectedDoctorId}`,
        );
        const blocks = await res.json();

        // Fetch existing appointments (to avoid double booking)
        const token = await auth.currentUser.getIdToken();
        const aptRes = await fetch(`${API}/api/v1/doctor/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allApts = await aptRes.json();
        const doctorApts = allApts.filter(
          (a) => a.providerId === selectedDoctorId && !a.isBlock,
        );

        // Generate standard slots: 9 AM to 5 PM
        const slots = [];
        const dayStr = date.toISOString().split("T")[0];

        for (let h = 9; h < 17; h++) {
          for (let m of ["00", "30"]) {
            const timeStr = `${h.toString().padStart(2, "0")}:${m}`;
            const slotStart = new Date(`${dayStr}T${timeStr}:00`);

            // Check if blocked
            const isBlocked = blocks.find(
              (b) => new Date(b.startTime).getTime() === slotStart.getTime(),
            );
            // Check if booked
            const isBooked = doctorApts.find(
              (a) => new Date(a.startTime).getTime() === slotStart.getTime(),
            );

            if (!isBlocked && !isBooked) {
              slots.push(timeStr);
            }
          }
        }

        if (slots.length === 0) {
          grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;color:var(--red);padding:20px;font-size:13px">No slots available for this date.</div>';
          return;
        }

        grid.innerHTML = slots
          .map(
            (t) => `
            <div class="time-slot" onclick="selectBookingTime(this, '${t}')" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-soft); border-radius:8px; padding:10px; text-align:center; cursor:pointer; color:white; font-size:14px">${formatTime(t)}</div>
        `,
          )
          .join("");
      } catch (e) {
        grid.innerHTML =
          '<div style="grid-column:1/-1;text-align:center;color:var(--red);padding:20px">Error loading slots.</div>';
      }
    }

    function selectBookingTime(el, timeStr) {
      document.querySelectorAll(".time-slot").forEach((t) => {
        t.style.borderColor = "var(--g200)";
        t.style.background = "rgba(255,255,255,0.03)";
      });
      el.style.borderColor = "var(--blue)";
      el.style.background = "rgba(91, 127, 255, 0.1)";

      selectedTime = timeStr;
      document.getElementById("btnConfirmBook").disabled = false;
    }

    function formatTime(timeStr) {
      const [h, m] = timeStr.split(":");
      const hr = parseInt(h);
      const ampm = hr >= 12 ? "PM" : "AM";
      const h12 = hr % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }

    async function confirmBooking() {
      if (!selectedDate || !selectedTime || !selectedDoctorId)
        return toast("Please complete all selection steps.");

      const btn = document.getElementById("btnConfirmBook");
      const originalText = btn.innerText;
      btn.disabled = true;
      btn.innerText = "Booking...";

      try {
        const [h, m] = selectedTime.split(":");
        const startTime = new Date(selectedDate);
        startTime.setHours(parseInt(h), parseInt(m), 0, 0);

        const consultId = document.getElementById('bookingConsultId').value;
        const token = await auth.currentUser.getIdToken();

        // Update Firestore status to PENDING_SCHEDULING
        if (consultId) {
          await db.collection('appointments').doc(consultId).update({
            status: 'PENDING_SCHEDULING',
            scheduledStartTime: startTime.toISOString(),
            preferredProviderId: selectedDoctorId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        const res = await fetch(`${API}/api/v1/appointments/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            consultationId: consultId,
            startTime: startTime.toISOString(),
            doctorId: selectedDoctorId,
            localDate: selectedDate.getFullYear() + '-' + String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + String(selectedDate.getDate()).padStart(2, '0'),
            localTime: selectedTime,
            status: 'PENDING_SCHEDULING'
          })
        });

        if (!res.ok) throw new Error(await res.text());

        document.getElementById('bookingModal').classList.remove('active');
        showBookingSuccess(startTime);
        toast(`Request sent! One of our providers will confirm your visit soon.`);

      } catch (e) {
        console.error('Booking error:', e);
        toast('Booking Failed: ' + e.message);
        btn.disabled = false; btn.innerText = originalText;
      }
    }

    // Global tracker for payment flow
    let currentConsultId = null;

    function showBookingSuccess(dateObj) {
      let modal = document.getElementById('successModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'successModal';
        modal.className = 'mo active';
        modal.style.cssText = "position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:20px; animation: fadeIn 0.3s ease both;";
        modal.innerHTML = `
          <div class="modal" style="max-width:480px; width:100%; text-align:center; padding:48px; border-radius:32px; background:var(--bg-panel); box-shadow:var(--sh-xl); animation: zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;">
            <div style="width:80px; height:80px; background:var(--emerald-soft); color:var(--emerald); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; margin:0 auto 32px">✓</div>
            <h3 style="font-family:'Fraunces', serif; font-size:28px; color:var(--txt-main); margin-bottom:16px; letter-spacing:-0.02em">Request Received</h3>
            <p style="color:var(--txt-sub); font-size:16px; line-height:1.6; margin-bottom:32px">
              Thank you for choosing Patriotic Telehealth! One of our Providers will review your request and get back to you within 24 hours to finalize your visit.
            </p>
            <button class="btn btn-primary" onclick="document.getElementById('successModal').classList.remove('active')" style="width:100%; border-radius:16px; height:56px; font-size:16px; cursor:pointer">Got it, thank you!</button>
          </div>
        `;
        document.body.appendChild(modal);
      } else {
        modal.classList.add('active');
      }
    }

