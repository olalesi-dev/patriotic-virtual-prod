    function switchAdminTab(tab) {
      document.getElementById("view-admin-consults").style.display = "none";
      document.getElementById("view-admin-messages").style.display = "none";
      const userView = document.getElementById("view-admin-users");
      if (userView) userView.style.display = "none";
      const scheduleView = document.getElementById("view-admin-schedule");
      if (scheduleView) scheduleView.style.display = "none";
      const pacsView = document.getElementById("view-admin-pacs");
      if (pacsView) pacsView.style.display = "none";

      if (tab === "consults") {
        document.getElementById("view-admin-consults").style.display =
          "block";
      } else if (tab === "messages") {
        document.getElementById("view-admin-messages").style.display = "flex";
        loadAdminThreads();
      } else if (tab === "users") {
        if (userView) userView.style.display = "block";
        loadAdminUsers();
      } else if (tab === "schedule") {
        if (!scheduleView) return;
        scheduleView.style.display = "block";
        setTimeout(() => {
          if (calendar) calendar.updateSize();
          else initProviderCalendar();
        }, 100);
      }

      document
        .getElementById("tab-admin-consults")
        .classList.toggle("active", tab === "consults");
      document
        .getElementById("tab-admin-messages")
        .classList.toggle("active", tab === "messages");
      const tabUsers = document.getElementById("tab-admin-users");
      if (tabUsers) tabUsers.classList.toggle("active", tab === "users");
      const tabSched = document.getElementById("tab-admin-schedule");
      if (tabSched) tabSched.classList.toggle("active", tab === "schedule");
    }

    function buildPacsUrl(studyUid) {
      const pacsOrigin = getPacsOrigin();
      if (!studyUid) {
        return `${pacsOrigin}/`;
      }
      return `${pacsOrigin}/viewer?StudyInstanceUID=${encodeURIComponent(studyUid)}`;
    }

    window.openPACS = function (url) {
      console.log("Opening PACS with URL:", url);
      // Hide all other views
      const views = [
        "view-admin-consults",
        "view-admin-messages",
        "view-admin-users",
        "view-admin-schedule",
      ];
      views.forEach((v) => {
        const el = document.getElementById(v);
        if (el) el.style.display = "none";
      });

      // Show PACS view
      const pacsView = document.getElementById("view-admin-pacs");
      if (pacsView) {
        console.log("Showing view-admin-pacs");
        pacsView.style.display = "block";
        const frame = document.getElementById("pacsFrame");
        if (frame) {
          console.log("Setting pacsFrame.src");
          frame.src = url;
          // Security check: If we can detect it failed to load (hard in many cases), we could alert.
        } else {
          console.error("pacsFrame not found");
        }
      } else {
        console.error("view-admin-pacs not found");
      }

      // Deactivate all tabs
      document
        .querySelectorAll(".admin-tab")
        .forEach((t) => t.classList.remove("active"));
    };

    function showAdminSchedule() {
      // Helper specifically for schedule tab
      switchAdminTab("schedule");
      // Set default dates
      const today = new Date().toISOString().split("T")[0];
      const startInput = document.getElementById("availStartDate");
      const endInput = document.getElementById("availEndDate");
      if (startInput && !startInput.value) startInput.value = today;
      if (endInput && !endInput.value) endInput.value = today;
    }

    async function addAvailabilityRange() {
      const startDate = document.getElementById("availStartDate").value;
      const startTime = document.getElementById("availStartTime").value;
      const endDate = document.getElementById("availEndDate").value;
      const endTime = document.getElementById("availEndTime").value;

      if (!startDate || !startTime || !endDate || !endTime) {
        return toast("Please select all dates and times");
      }

      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${endDate}T${endTime}:00`;

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(
          `${API}/api/v1/doctor/availability/add-range`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ startDateTime, endDateTime }),
          },
        );

        if (!res.ok) throw new Error(await res.text());

        toast("Availability range added");
        if (calendar) calendar.refetchEvents();
      } catch (e) {
        console.error(e);
        toast("Error adding availability: " + e.message);
      }
    }

    async function loadAdminThreads() {
      if (!auth.currentUser) return;
      const list = document.getElementById("msgThreadList");
      list.innerHTML =
        '<div style="padding:20px;text-align:center">Loading...</div>';

      try {
        // Updated to match security rule: must filter by participants
        db.collection("conversations")
          .where("participants", "array-contains", auth.currentUser.uid)
          .orderBy("lastMessage.createdAt", "desc")
          .onSnapshot(
            (snap) => {
              if (snap.empty) {
                list.innerHTML =
                  '<div style="padding:20px;text-align:center;color:var(--txt-sub)">No messages yet.</div>';
                return;
              }
              const threads = [];
              snap.forEach((doc) =>
                threads.push({ id: doc.id, ...doc.data() }),
              );
              renderThreadList(threads);
            },
            (error) => {
              console.error("Snapshot error:", error);
              // If index is missing, the error message often contains a link
              let msg = "Error loading threads.";
              if (error.message.includes("index")) {
                msg = "Missing Index. Check console for link.";
                // Attempt to extract link if possible, or just log it
              }
              list.innerHTML = `<div style="color:red;padding:20px;font-size:13px">${msg}<br><br><span style="color:var(--g400)">${error.message}</span></div>`;
            },
          );
      } catch (e) {
        console.error(e);
        list.innerHTML =
          '<div style="color:red;padding:20px">Error loading threads.</div>';
      }
    }

    /* === USER MANAGEMENT LOGIC === */
    function toggleAddUserForm() {
      const f = document.getElementById("addUserForm");
      f.style.display = f.style.display === "none" ? "flex" : "none";
    }

    async function createNewUser() {
      const firstName = document.getElementById("newUserFirstName").value;
      const lastName = document.getElementById("newUserLastName").value;
      const email = document.getElementById("newUserEmail").value;
      const password = document.getElementById("newUserPassword").value;
      const role = document.getElementById("newUserRole").value;

      if (!firstName || !email || !password)
        return toast("Please fill all required fields");
      if (password.length < 6)
        return toast("Password must be at least 6 characters");

      try {
        toast("Creating user account...");
        const token = await auth.currentUser.getIdToken();
        const displayName = firstName + (lastName ? " " + lastName : "");

        const res = await fetch(`${API}/api/v1/admin/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ displayName, email, password, role }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        toast("Account provisioned successfully!");
        document.getElementById("addUserForm").style.display = "none";
        loadAdminUsers();

        // Clear inputs
        ["FirstName", "LastName", "Email", "Password"].forEach(
          (id) => (document.getElementById("newUser" + id).value = ""),
        );
      } catch (e) {
        console.error(e);
        toast("Error creating user: " + e.message);
      }
    }

    async function loadAdminUsers() {
      const tbody = document.getElementById("adminUserTableBody");
      if (tbody)
        tbody.innerHTML =
          '<tr><td colspan="4" style="padding:20px;text-align:center">Loading Users...</td></tr>';

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error);
        if (!data.users || data.users.length === 0) {
          if (tbody)
            tbody.innerHTML =
              '<tr><td colspan="4" style="padding:20px;text-align:center">No users found.</td></tr>';
          return;
        }

        if (tbody) {
          tbody.innerHTML = data.users
            .map((u) => {
              const roleColor =
                u.role === "admin"
                  ? "var(--red)"
                  : u.role === "provider" || u.role === "doctor"
                    ? "var(--blue)"
                    : "var(--g500)";
              const statusStr = u.disabled
                ? '<span style="color:var(--red)">Suspended</span>'
                : '<span style="color:var(--emerald)">Active</span>';

              return `
              <tr style="border-bottom:1px solid var(--border-soft)">
                  <td style="padding:15px">
                    <div style="font-weight:700;color:var(--txt-main);font-size:14px">${u.displayName}</div>
                    <div style="font-size:12px;color:var(--txt-sub);margin-top:2px">${statusStr}</div>
                  </td>
                  <td style="padding:15px;color:var(--txt-sub)">
                    ${u.email}
                  </td>
                  <td style="padding:15px">
                      <span style="font-size:11px;font-weight:800;text-transform:uppercase;padding:4px 8px;border-radius:4px;background:var(--bg-tertiary);color:${roleColor}">
                          ${u.role}
                      </span>
                  </td>
                  <td style="padding:15px">
                      <div style="display:flex;gap:8px;align-items:center">
                        <select onchange="updateUserRole('${u.uid}', 'role', this.value)" style="padding:6px;border-radius:4px;border:1px solid var(--border-soft);font-size:12px;max-width:120px">
                            <option value="patient" ${u.role === "patient" ? "selected" : ""}>Patient</option>
                            <option value="provider" ${u.role === "provider" || u.role === "doctor" ? "selected" : ""}>Provider</option>
                            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
                        </select>
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:11px" onclick="updateUserRole('${u.uid}', 'disabled', ${!u.disabled})">
                          ${u.disabled ? "Enable" : "Disable"}
                        </button>
                        <button class="btn btn-primary" style="padding:4px 8px;font-size:11px;background:var(--red);border-color:var(--red)" onclick="deleteAdminUser('${u.uid}')">🗑️</button>
                      </div>
                  </td>
              </tr>
            `;
            })
            .join("");
        }
      } catch (e) {
        console.error(e);
        if (tbody)
          tbody.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:red">Permission Denied or Error loading users.</td></tr>`;
      }
    }

    async function updateUserRole(uid, field, value) {
      if (
        field === "role" &&
        !confirm(
          "Are you sure you want to change this user's access privileges?",
        )
      )
        return;
      if (
        field === "disabled" &&
        !confirm(
          "Are you sure you want to " +
          (value ? "disable" : "enable") +
          " this account?",
        )
      )
        return;

      try {
        toast("Updating user...");
        const token = await auth.currentUser.getIdToken();
        const bodyPayload = {};
        bodyPayload[field] = value;

        const res = await fetch(`${API}/api/v1/admin/users/${uid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        toast("User updated successfully!");
        loadAdminUsers();
      } catch (e) {
        console.error("Update failed:", e);
        toast("Error: " + e.message);
      }
    }

    async function deleteAdminUser(uid) {
      if (
        !confirm(
          "WARNING: PERMANENTLY DELETE user? This action cannot be undone!",
        )
      )
        return;
      try {
        toast("Deleting user...");
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/admin/users/${uid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        toast("User deleted forever.");
        loadAdminUsers();
      } catch (e) {
        console.error("Delete failed:", e);
        toast("Error: " + e.message);
      }
    }

    function renderThreadList(threads) {
      const list = document.getElementById("msgThreadList");
      list.innerHTML = threads
        .map((t) => {
          const pName = t.patientName || "Patient"; // Ideally stored on conversation doc
          const last = t.lastMessage
            ? t.lastMessage.text || "Attachment"
            : "No messages";
          const date =
            t.lastMessage && t.lastMessage.createdAt
              ? new Date(
                t.lastMessage.createdAt.toDate(),
              ).toLocaleDateString()
              : "";
          const unread =
            t.unreadCounts && t.unreadCounts[auth.currentUser.uid] > 0; // Check provider unread

          return `
                <div class="msg-thread ${unread ? "unread" : ""} ${currentConversationId === t.id ? "active" : ""}" 
                     onclick="openAdminChat('${t.id}', '${pName}')"
                     style="padding:15px;border-bottom:1px solid var(--g200);cursor:pointer;background:${currentConversationId === t.id ? "#f0f9ff" : "white"}">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <div style="font-weight:${unread ? "800" : "600"};color:var(--txt-main)">${pName}</div>
                        <div style="font-size:11px;color:var(--txt-sub)">${date}</div>
                    </div>
                    <div style="font-size:13px;color:${unread ? "black" : "var(--g500)"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${unread ? "🔵 " : ""}${last}
                    </div>
                </div>
            `;
        })
        .join("");
    }

    async function openAdminChat(convId, pName) {
      if (msgUnsubscribe) msgUnsubscribe(); // Unsub previous
      currentConversationId = convId;

      document.getElementById("chatHeader").innerHTML = `
            <div style="font-weight:700;color:var(--txt-main)">${pName}</div>
            <div style="font-size:12px;color:var(--txt-sub)">Secure Thread</div>
        `;
      document.getElementById("chatInputArea").style.display = "flex";
      renderThreadList([]); // Re-render to update active highlight (quick hack, ideally separated)

      // Reset Unread Count for Provider
      db.collection("conversations")
        .doc(convId)
        .set(
          {
            unreadCounts: { [auth.currentUser.uid]: 0 },
          },
          { merge: true },
        );

      // Listen for Messages
      msgUnsubscribe = db
        .collection("conversations")
        .doc(convId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot((snap) => {
          const msgs = [];
          snap.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() }));
          renderMessages(msgs);
        });
    }

    function renderMessages(msgs) {
      const div = document.getElementById("chatMessages");
      if (msgs.length === 0) {
        div.innerHTML =
          '<div style="text-align:center;color:var(--g400);margin-top:20px">Start the conversation...</div>';
        return;
      }

      div.innerHTML = msgs
        .map((m) => {
          const isMe = m.senderId === auth.currentUser.uid;
          const time = m.createdAt
            ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "...";

          return `
                <div style="align-self:${isMe ? "flex-end" : "flex-start"};max-width:70%;margin-bottom:10px">
                    <div style="background:${isMe ? "var(--blue)" : "white"};color:${isMe ? "white" : "var(--navy)"};padding:10px 14px;border-radius:12px;border:${isMe ? "none" : "1px solid var(--g200)"};box-shadow:var(--sh-sm)">
                        ${m.text}
                        ${m.attachments ? m.attachments.map((a) => `<div style="margin-top:5px;padding:5px;background:rgba(0,0,0,0.1);border-radius:4px"><a href="${a.url}" target="_blank" style="color:inherit;text-decoration:none">📎 ${a.name}</a></div>`).join("") : ""}
                    </div>
                    <div style="font-size:10px;color:var(--g400);margin-top:2px;text-align:${isMe ? "right" : "left"}">${time}</div>
                </div>
            `;
        })
        .join("");
      div.scrollTop = div.scrollHeight;
    }

    async function sendAdminMessage() {
      const input = document.getElementById("chatInput");
      const text = input.value.trim();
      if (!text && !currentAttachment) return;

      const convId = currentConversationId;
      const senderId = auth.currentUser.uid;

      input.value = ""; // Optimistic clear

      try {
        await db
          .collection("conversations")
          .doc(convId)
          .collection("messages")
          .add({
            text,
            senderId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // attachments: currentAttachment ? [currentAttachment] : [] // TODO: Implement handleChatAttach
          });

        // Update Parent Last Message & Unread for Patient
        // Note: We need the PatientID to key the unread count map.
        // In a real app, we'd read the doc first or store patientId in a known variable.
        // For now, assume single patient per thread logic or update all 'non-sender' counts.
        // Simplified: Update 'lastMessage'
        await db
          .collection("conversations")
          .doc(convId)
          .update({
            lastMessage: {
              text,
              senderId,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            // unreadCounts logic needs Cloud Function or known patient ID
          });
      } catch (e) {
        console.error("Send failed", e);
        toast("Failed to send message");
      }
    }

    // --- OLD ADMIN CONSULT LOGIC ---

    async function loadAdminConsults() {
      console.log("Loading Admin Consults...", API); // DEBUG
      if (!auth.currentUser) {
        console.log("No auth user");
        return;
      }
      document.getElementById("adminTableBody").innerHTML =
        '<tr><td colspan="5" style="padding:20px;text-align:center">Loading...</td></tr>';
      try {
        const token = await auth.currentUser.getIdToken();
        console.log(
          "Token obtained, fetching:",
          `${API}/api/v1/admin/consultations`,
        );
        const res = await fetch(`${API}/api/v1/admin/consultations`, {
          headers: { Authorization: `Bearer ${token}` },
          mode: "cors", // Explicitly request CORS
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Status ${res.status}: ${txt}`);
        }
        const data = await res.json();
        adminConsults = data.consultations;
        renderAdminTable(data.consultations);
      } catch (e) {
        console.error("Fetch Error:", e);
        document.getElementById("adminTableBody").innerHTML =
          `<tr><td colspan="5" style="padding:20px;text-align:center;color:red">Error: ${e.message} <br> (Check Console for details)</td></tr>`;
      }
    }

    function renderAdminTable(consults) {
      const tbody = document.getElementById("adminTableBody");
      if (!consults || consults.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="padding:20px;text-align:center">No consultations found.</td></tr>';
        return;
      }
      tbody.innerHTML = consults
        .map((c) => {
          const date = c.createdAt
            ? new Date(c.createdAt._seconds * 1000).toLocaleDateString()
            : "N/A";
          const patient = c.patientName || "Unknown";
          const svc = c.serviceKey || "General";
          const statusColor =
            c.status === "reviewed"
              ? "green"
              : c.status === "completed"
                ? "blue"
                : "orange";

          const viewerLink = buildPacsUrl(c.studyUid);

          return `
          <tr style="border-bottom:1px solid var(--border-soft)">
            <td style="padding:12px">${date}</td>
            <td style="padding:12px">
                <span class="patient-link" data-uid="${c.uid}" style="font-weight:700;color:white;text-decoration:underline;cursor:pointer">${patient}</span>
                <br><span style="font-size:12px;color:var(--txt-sub)">${c.patientEmail || ""}</span>
            </td>
            <td style="padding:12px">${svc}</td>
            <td style="padding:12px"><span style="color:${statusColor};font-weight:600;text-transform:capitalize">${c.status
            }</span></td>
            <td style="padding:12px;display:flex;gap:8px">
              <button class="btn btn-outline" style="padding:6px 12px;font-size:12px" onclick="viewIntake('${c.id}')">View Intake</button>
              <a href="javascript:void(0)" onclick="openPACS('${viewerLink}')" class="btn btn-primary" style="padding:6px 12px;font-size:12px;text-decoration:none">View PACS</a>
              <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px" onclick="markReviewed('${c.id}')">Start Review</button>
            </td>
          </tr>
        `;
        })
        .join("");
    }

    async function markReviewed(id) {
      if (!confirm('Mark this consultation as "In Review"?')) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/admin/consultations/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "reviewed" }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast("Status updated");
        loadAdminConsults();
      } catch (e) {
        toast("Error updating status");
      }
    }

    function viewIntake(id) {
      const allConsults = [
        ...(window.adminConsults || []),
        ...(window.patientConsultations || []),
      ];
      const consult = allConsults.find((c) => c.id === id);
      if (!consult || !consult.intake)
        return toast("No intake data available");

      const intakeHtml = Object.entries(consult.intake)
        .map(([k, v]) => {
          const label = k
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase());
          const val = typeof v === "boolean" ? (v ? "Yes" : "No") : v;
          return `<div style="margin-bottom:8px"><div style="font-size:12px;color:var(--txt-sub)">${label}</div><div style="font-weight:500;color:white">${val}</div></div>`;
        })
        .join("");

      document.getElementById("intakeContent").innerHTML =
        intakeHtml || "<p>No intake data provided.</p>";
      document.getElementById("intakeModal").classList.add("active");
    }

    function closeIntake(e) {
      if (e && e.target !== e.currentTarget) return;
      document.getElementById("intakeModal").classList.remove("active");
      document.querySelector("#intakeModal .modal").classList.remove("wide");
    }

    // --- PATIENT CHART (EMR PHASE 1) ---
    window.openPatientChart = async function (uid) {
      if (!uid || uid === "undefined")
        return toast("No patient record found.");
      window.activePatientId = uid; // Set global for refresh actions

      // Use the existing intake modal shell but clear it first
      const container = document.getElementById("intakeContent");
      const modalTitle = document.querySelector("#intakeModal h3");
      container.innerHTML =
        '<div style="padding:40px;text-align:center">Loading Chart...</div>';
      modalTitle.innerText = "Patient Chart";
      document.querySelector("#intakeModal .modal").classList.add("wide");
      document.getElementById("intakeModal").classList.add("active");

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/doctor/patients/${uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Status ${res.status}: ${txt}`);
        }

        const { profile, history, notes, labs } = await res.json();
        renderChartUI(container, profile, history, notes, labs);
      } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="color:red;padding:20px;text-align:center">Error loading chart:<br><b>${e.message}</b></div>`;
      }
    };

    function renderChartUI(container, p, history, notes = [], labs = []) {
      // Safe accessors
      const name =
        `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
        p.name ||
        "Unknown";
      const dob = p.dob || "N/A";
      const state = p.state || "N/A";
      const email = p.email || "N/A";

      container.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;height:100%;overflow:hidden;background:#000000">
                <!-- LEFT SIDEBAR: DEMOGRAPHICS -->
                <div style="border-right:1px solid rgba(255,255,255,0.1);background:#0A0F1C;padding:40px;display:flex;flex-direction:column;gap:32px;overflow-y:auto">
                <div style="border-right:1px solid rgba(255,255,255,0.1);background:#0A0F1C;padding:40px;display:flex;flex-direction:column;gap:32px;overflow-y:auto">
                    
                    <!-- Profile Header -->
                    <div style="text-align:center">
                        <div style="width:100px;height:100px;background:#1F2937;border:2px solid rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:42px;margin:0 auto 20px;color:var(--blue);font-weight:700;box-shadow:var(--sh-md)">
                        <div style="width:100px;height:100px;background:#1F2937;border:2px solid rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:42px;margin:0 auto 20px;color:var(--blue);font-weight:700;box-shadow:var(--sh-md)">
                            ${name.charAt(0)}
                        </div>
                        <h2 style="margin:0;font-size:26px;color:#FFFFFF;font-weight:800;letter-spacing:-0.5px">${name}</h2>
                        <div style="color:rgba(255,255,255,0.6);font-size:15px;margin-top:6px;font-weight:500">${email}</div>
                         <div style="margin-top:16px;display:flex;gap:10px;justify-content:center">
                            <button class="btn btn-outline" style="font-size:13px;padding:8px 16px;border-radius:20px;height:36px;color:white;border-color:rgba(255,255,255,0.2)">Message</button>
                            <button class="btn btn-outline" style="font-size:13px;padding:8px 16px;border-radius:20px;height:36px;color:white;border-color:rgba(255,255,255,0.2)">Calls</button>
                        </div>
                    </div>

                    <!-- Details Card -->
                    <div style="background:#1F2937;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;box-shadow:var(--sh-sm)">
                    <div style="background:#1F2937;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;box-shadow:var(--sh-sm)">
                        <h4 style="margin:0 0 20px 0;font-size:14px;text-transform:uppercase;color:rgba(255,255,255,0.5);letter-spacing:1px;font-weight:700">Patient Details</h4>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px 16px">
                            
                            <div>
                                <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;margin-bottom:4px">Date of Birth</div>
                                <div style="font-size:16px;color:#FFFFFF;font-weight:600">${dob}</div>
                            </div>

                            <div>
                                <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;margin-bottom:4px">State</div>
                                <div style="font-size:16px;color:#FFFFFF;font-weight:600">${state}</div>
                            </div>

                            <div>
                                <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;margin-bottom:4px">Status</div>
                                <div style="font-size:16px;color:var(--emerald);font-weight:700">Active</div>
                            </div>

                             <div>
                                <div style="font-size:12px;color:rgba(255,255,255,0.6);font-weight:600;margin-bottom:4px">Visits</div>
                                <div style="font-size:16px;color:#FFFFFF;font-weight:600">${history.length
        }</div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Notes / Alerts -->
                     <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:20px">
                        <div style="font-size:14px;font-weight:700;color:#60A5FA;margin-bottom:8px;display:flex;align-items:center;gap:8px">ℹ️ Patient Note</div>
                        <div style="font-size:14px;color:#E5E7EB;line-height:1.6">Patient prefers video calls for follow-ups. No known allergies.</div>
                     </div>
                </div>

                <!-- RIGHT CONTENT -->
                <div style="flex:1;overflow-y:auto;padding:20px;background:#000000">
                <div style="flex:1;overflow-y:auto;padding:20px;background:#000000">
                    
                    <!-- TABS -->
                    <div class="chart-tabs" style="margin:-20px -20px 20px -20px">
                    <div class="chart-tabs" style="margin:-20px -20px 20px -20px">
                        <div class="chart-tab active" onclick="switchTab('tab-notes', this)">Clinical Notes</div>
                        <div class="chart-tab" onclick="switchTab('tab-labs', this)">Labs & Results</div>
                        <div class="chart-tab" onclick="switchTab('tab-vitals', this)">Vitals</div>
                        <div class="chart-tab" onclick="switchTab('tab-history', this)">History</div>
                    </div>

                    <!-- TAB: NOTES -->
                    <div id="tab-notes" class="chart-content active" style="padding:0;background:transparent">
                    <div id="tab-notes" class="chart-content active" style="padding:0;background:transparent">
                        <button class="btn btn-primary" style="width:100%;margin-bottom:20px" onclick="toggleSoapForm()">+ Add SOAP Note</button>
                        
                        <!-- SOAP FORM (Hidden by default) -->
                        <div id="soapForm" style="display:none;background:#111827;padding:15px;border-radius:8px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1)">
                             <h4 style="margin-top:0;color:#FFFFFF">New SOAP Note</h4>
                             <textarea id="soapS" placeholder="Subjective" style="width:100%;padding:8px;margin-bottom:8px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;min-height:60px"></textarea>
                             <textarea id="soapO" placeholder="Objective" style="width:100%;padding:8px;margin-bottom:8px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;min-height:60px"></textarea>
                             <textarea id="soapA" placeholder="Assessment" style="width:100%;padding:8px;margin-bottom:8px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;min-height:60px"></textarea>
                             
                             <div style="margin-bottom:12px;padding:10px;background:#0A0F1C;border:1px solid rgba(255,255,255,0.1);border-radius:4px">
                                <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#FFFFFF">Official Diagnosis (ICD-10)</label>
                                <input id="soapDiagnosis" type="text" placeholder="e.g. E29.1 Hypogonadism" style="width:100%;padding:6px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-size:13px">
                            </div>

                            <div style="margin-bottom:12px;padding:10px;background:#0A0F1C;border:1px solid rgba(255,255,255,0.1);border-radius:4px">
                                <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#FFFFFF">Prescription Order</label>
                                <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:8px">
                                    <input id="rxName" type="text" placeholder="Medication Name" style="padding:6px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-size:13px">
                                    <input id="rxDosage" type="text" placeholder="Dosage" style="padding:6px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-size:13px">
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                                    <input id="rxFreq" type="text" placeholder="Frequency" style="padding:6px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-size:13px">
                                    <input id="rxQty" type="text" placeholder="Qty" style="padding:6px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;font-size:13px">
                                </div>
                            </div>
                             
                             <textarea id="soapP" placeholder="Plan" style="width:100%;padding:8px;margin-bottom:15px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px;min-height:60px"></textarea>
                             <div style="display:flex;gap:10px;justify-content:flex-end">
                                 <button class="btn btn-ghost" onclick="toggleSoapForm()" style="color:white">Cancel</button>
                                 <button class="btn btn-primary" onclick="saveSoapNote('${p.uid}')">Save Note</button>
                             </div>
                        </div>

                        <div style="display:grid;gap:10px;margin-bottom:30px">
                             ${notes.length === 0
          ? '<div style="color:rgba(255,255,255,0.5);font-style:italic">No notes recorded.</div>'
          : notes
            .map((n) => {
              const d = n.createdAt
                ? new Date(
                  n.createdAt._seconds * 1000,
                ).toLocaleDateString()
                : "Just now";
              return `
                                     <div style="border:1px solid rgba(255,255,255,0.1);border-left:3px solid var(--blue);border-radius:4px;padding:12px;background:#0A0F1C">
                                         <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:5px;display:flex;justify-content:space-between">
                                             <b>${d}</b> <span>Provider: API</span>
                                         </div>
                                         <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;color:rgba(255,255,255,0.8)">
                                             <div><b style="color:#FFFFFF">S:</b> ${n.subjective || "-"}</div>
                                             <div><b style="color:#FFFFFF">O:</b> ${n.objective || "-"}</div>
                                             <div><b style="color:#FFFFFF">A:</b> ${n.assessment || "-"}</div>
                                             <div><b style="color:#FFFFFF">P:</b> ${n.plan || "-"}</div>
                                         </div>
                                         ${n.diagnosis ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.1);font-size:13px"><b style="color:#FFFFFF">Dx:</b> ${n.diagnosis}</div>` : ""}
                                         ${n.prescription ? `<div style="margin-top:4px;font-size:13px;color:#60A5FA;font-weight:600">Rx: ${n.prescription.name} ${n.prescription.dosage} - ${n.prescription.frequency} (#${n.prescription.quantity})</div>` : ""}
                                     </div>
                                 `;
            })
            .join("")
        }
                        </div>
                    </div>

                    <!-- TAB: LABS -->
                    <div id="tab-labs" class="chart-content" style="padding:0;background:transparent">
                    <div id="tab-labs" class="chart-content" style="padding:0;background:transparent">
                        <button class="btn btn-primary" style="width:100%;margin-bottom:20px" onclick="toggleLabForm()">+ New Lab Order</button>
                        
                        <!-- LAB FORM -->
                        <div id="labForm" style="display:none;background:#111827;padding:15px;border-radius:8px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1)">
                            <h4 style="margin-top:0;color:#FFFFFF">Order Labs</h4>
                        <div id="labForm" style="display:none;background:#111827;padding:15px;border-radius:8px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1)">
                            <h4 style="margin-top:0;color:#FFFFFF">Order Labs</h4>
                            <div style="margin-bottom:12px">
                                <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#FFFFFF">Select Panels</label>
                                <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#FFFFFF">Select Panels</label>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="CBC"> CBC</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="CMP"> CMP</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="Lipid Panel"> Lipid Panel</label>
                                    
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="PSA"> PSA</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="Estradiol"> Estradiol</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="CBC"> CBC</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="CMP"> CMP</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="Lipid Panel"> Lipid Panel</label>
                                    
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="PSA"> PSA</label>
                                    <label class="ro" style="color:white"><input type="checkbox" class="lab-panel" value="Estradiol"> Estradiol</label>
                                </div>
                            </div>
                            <div style="margin-bottom:12px">
                                <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#FFFFFF">Diagnosis Code</label>
                                <input id="labDiagnosis" type="text" placeholder="e.g. E29.1" style="width:100%;padding:8px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px">
                                <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#FFFFFF">Diagnosis Code</label>
                                <input id="labDiagnosis" type="text" placeholder="e.g. E29.1" style="width:100%;padding:8px;background:#1F2937;color:white;border:1px solid rgba(255,255,255,0.1);border-radius:4px">
                            </div>
                            <div style="display:flex;gap:10px;justify-content:flex-end">
                                <button class="btn btn-ghost" onclick="toggleLabForm()" style="color:white">Cancel</button>
                                <button class="btn btn-primary" onclick="createLabOrder('${p.uid}')">Create Order & Req</button>
                            </div>
                        </div>

                        <!-- LAB LIST -->
                        <div id="labList" style="display:grid;gap:10px">
                           <!-- Populated by renderLabs -->
                        </div>
                    </div>

                    <!-- TAB: VITALS -->
                    <div id="tab-vitals" class="chart-content" style="padding:0;background:transparent">
                        <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:20px">
                            <h3 style="margin-top:0;color:#FFFFFF;font-size:16px">Weight (lbs)</h3>
                            <div style="height:200px;display:flex;align-items:flex-end;gap:10px;padding-top:20px;border-bottom:1px solid rgba(255,255,255,0.1);position:relative">
                                ${[185, 184, 182, 181, 180, 178]
          .map(
            (w, i) => `
                                    <div style="flex:1;background:rgba(59,130,246,0.3);border-radius:4px 4px 0 0;height:${(w - 150) * 3}px;position:relative;transition:all 0.2s" title="${w} lbs">
                                        <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:700;color:var(--blue)">${w}</div>
                                    </div>
                                `,
          )
          .join("")}
                                <div style="position:absolute;bottom:-25px;left:0;right:0;display:flex;justify-content:space-around;font-size:11px;color:rgba(255,255,255,0.5)">
                                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                                </div>
                            </div>
                        </div>

                        <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px">
                             <h3 style="margin-top:0;color:#FFFFFF;font-size:16px">Blood Pressure</h3>
                             <div style="height:150px;border-left:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.1);position:relative;margin-top:20px">
                        <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px">
                             <h3 style="margin-top:0;color:#FFFFFF;font-size:16px">Blood Pressure</h3>
                             <div style="height:150px;border-left:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.1);position:relative;margin-top:20px">
                                <!-- Mock Line Chart -->
                                <svg style="width:100%;height:100%;overflow:visible">
                                    <polyline points="0,80 50,75 100,78 150,72 200,70 250,68" fill="none" stroke="var(--blush)" stroke-width="2" />
                                    <polyline points="0,120 50,118 100,115 150,112 200,110 250,108" fill="none" stroke="var(--blue)" stroke-width="2" />
                                    
                                    <circle cx="0" cy="80" r="3" fill="var(--blush)" />
                                    <circle cx="50" cy="75" r="3" fill="var(--blush)" />
                                    <circle cx="100" cy="78" r="3" fill="var(--blush)" />
                                    <circle cx="150" cy="72" r="3" fill="var(--blush)" />
                                    <circle cx="200" cy="70" r="3" fill="var(--blush)" />
                                    <circle cx="250" cy="68" r="3" fill="var(--blush)" />

                                    <circle cx="0" cy="120" r="3" fill="var(--blue)" />
                                    <circle cx="50" cy="118" r="3" fill="var(--blue)" />
                                    <circle cx="100" cy="115" r="3" fill="var(--blue)" />
                                    <circle cx="150" cy="112" r="3" fill="var(--blue)" />
                                    <circle cx="200" cy="110" r="3" fill="var(--blue)" />
                                    <circle cx="250" cy="108" r="3" fill="var(--blue)" />
                                </svg>
                                 <div style="display:flex;gap:15px;margin-top:10px;font-size:11px">
                                    <span style="color:var(--blue)">● Systolic</span>
                                    <span style="color:var(--blush)">● Diastolic</span>
                                 </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <!-- TAB: HISTORY -->
                    <div id="tab-history" class="chart-content" style="padding:0;background:transparent">
                    <div id="tab-history" class="chart-content" style="padding:0;background:transparent">
                        <div style="display:grid;gap:10px">
                            ${history.length === 0
          ? '<div style="color:rgba(255,255,255,0.5);font-style:italic">No previous visits recorded.</div>'
          : history
            .map((h) => {
              const d = h.createdAt
                ? new Date(
                  h.createdAt._seconds * 1000,
                ).toLocaleDateString()
                : "Unknown";
              const svc = (
                h.serviceKey || "General"
              ).replace(/_/g, " ");
              const stat = h.status.toUpperCase();
              return `
                                    <div style="border:1px solid var(--border-soft);border-radius:8px;padding:12px">
                                        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                                            <b style="color:var(--txt-main)">${svc}</b>
                                            <span style="font-size:12px">${d}</span>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;align-items:center">
                                            <div style="font-size:12px;color:var(--txt-sub)">${h.id}</div>
                                            <span style="font-size:11px;font-weight:700;background:#f0f0f0;padding:2px 6px;border-radius:4px">${stat}</span>
                                        </div>
                                        <div style="margin-top:10px">
                                            <button class="btn btn-outline" style="padding:4px 10px;font-size:11px" onclick="viewIntake('${h.id}')">View Intake</button>
                                        </div>
                                    </div>
                                `;
            })
            .join("")
        }
                        </div>
                    </div>

                </div>
            </div>
        `;
      // Render Labs List
      const labList = document.getElementById("labList");
      if (labs.length === 0) {
        labList.innerHTML =
          '<div style="color:var(--txt-sub);font-style:italic">No labs ordered.</div>';
      } else {
        labList.innerHTML = labs
          .map((l) => {
            const d = l.createdAt
              ? new Date(l.createdAt._seconds * 1000).toLocaleDateString()
              : "Just now";
            const statusColor =
              l.status === "ordered"
                ? "orange"
                : l.status === "needs_review"
                  ? "red"
                  : "green";
            const showUpload = l.status === "ordered";
            const showReview = l.status === "needs_review";
            const showView = l.status === "reviewed";

            return `
                    <div style="border:1px solid var(--border-soft);border-radius:4px;padding:12px;background:var(--bg-panel)">
                         <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                             <div style="font-weight:700;color:var(--txt-main);font-size:14px">Lab Order #${l.id.slice(0, 5)}</div>
                             <div style="font-size:11px;font-weight:700;color:${statusColor};text-transform:uppercase">${l.status.replace("_", " ")}</div>
                         </div>
                         <div style="font-size:13px;margin-bottom:4px"><b>Panels:</b> ${l.panels.join(", ")}</div>
                         <div style="font-size:13px;margin-bottom:8px"><b>Date:</b> ${d}</div>
                         
                         <div style="display:flex;gap:8px;flex-wrap:wrap">
                             <a href="${l.requisitionUrl
              }" target="_blank" class="btn btn-outline" style="padding:4px 10px;font-size:11px">📄 Req</a>
                             
                             ${showUpload
                ? `
                                <label class="btn btn-primary" style="padding:4px 10px;font-size:11px;cursor:pointer">
                                    ⬆ Upload Result
                                    <input type="file" style="display:none" onchange="uploadLabResult('${l.id}', this)">
                                </label>
                             `
                : ""
              }

                             ${showReview
                ? `
                                <button class="btn btn-primary" style="padding:4px 10px;font-size:11px;background:var(--red);border-color:var(--red)" onclick="reviewLabResult('${l.id}')">Review Needed</button>
                                <a href="${l.resultUrl}" target="_blank" class="btn btn-outline" style="padding:4px 10px;font-size:11px">View Result</a>
                             `
                : ""
              }

                             ${showView
                ? `
                                <a href="${l.resultUrl}" target="_blank" class="btn btn-outline" style="padding:4px 10px;font-size:11px">✅ View Result</a>
                             `
                : ""
              }
                         </div>
                    </div>
                `;
          })
          .join("");
      }
    }

    // --- TABS & LAB FUNCTIONS ---
    function switchTab(tabId, el) {
      document
        .querySelectorAll(".chart-content")
        .forEach((c) => c.classList.remove("active"));
      document.getElementById(tabId).classList.add("active");
      document
        .querySelectorAll(".chart-tab")
        .forEach((t) => t.classList.remove("active"));
      el.classList.add("active");
    }

    function toggleLabForm() {
      const f = document.getElementById("labForm");
      f.style.display = f.style.display === "none" ? "block" : "none";
    }

    async function createLabOrder(patientId) {
      const panels = Array.from(
        document.querySelectorAll(".lab-panel:checked"),
      ).map((c) => c.value);
      const diagnosisCode = document.getElementById("labDiagnosis").value;
      const btn = document.querySelector("#labForm .btn-primary:last-child");

      if (panels.length === 0) return toast("Select at least one panel");

      btn.disabled = true;
      btn.innerText = "Converting...";
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/doctor/labs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ patientId, panels, diagnosisCode }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        toast("Order Created");
        window.open(data.pdfUrl, "_blank");
        openPatientChart(patientId);
      } catch (e) {
        toast("Error creating order");
        btn.disabled = false;
        btn.innerText = "Create Order & Req";
      }
    }

    async function uploadLabResult(orderId, input) {
      const file = input.files[0];
      if (!file) return;

      try {
        toast("Uploading result...");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("orderId", orderId);

        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/doctor/labs/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error("Upload failed");
        toast("Result uploaded!");
        openPatientChart(activePatientId); // Requires global var or re-fetch
      } catch (e) {
        toast("Upload failed");
      }
    }

    async function reviewLabResult(orderId) {
      if (!confirm("Mark this result as Reviewed?")) return;
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(
          `${API}/api/v1/doctor/labs/${orderId}/review`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error("Failed");
        toast("Marked Reviewed");
        openPatientChart(activePatientId);
      } catch (e) {
        toast("Error");
      }
    }
    function toggleSoapForm() {
      const f = document.getElementById("soapForm");
      f.style.display = f.style.display === "none" ? "block" : "none";
    }

    function showSafetyModal(allergy, drug) {
      // Create or get safety modal
      let m = document.getElementById("safetyModal");
      if (!m) {
        m = document.createElement("div");
        m.id = "safetyModal";
        m.className = "mo active";
        m.innerHTML = `
                <div class="modal" style="border:2px solid var(--red);max-width:400px">
                    <div style="text-align:center;color:var(--red);font-size:48px;margin-bottom:10px">⚠️</div>
                    <div class="modal-header" style="justify-content:center;color:var(--red)"><h3>Safety Alert</h3></div>
                    <div style="padding:20px;text-align:center">
                        <p style="font-size:16px;margin-bottom:10px"><strong>ALLERGY DETECTED</strong></p>
                        <p id="safetyMsg"></p>
                    </div>
                    <div style="padding:20px;background:var(--bg-tertiary);display:flex;justify-content:center">
                        <button class="btn btn-primary" onclick="document.getElementById('safetyModal').classList.remove('active')" style="background:var(--red);border-color:var(--red)">Acknowledge & Edit</button>
                    </div>
                </div>
            `;
        document.body.appendChild(m);
      } else {
        m.classList.add("active");
      }

      document.getElementById("safetyMsg").innerHTML =
        `Patient is allergic to <b style="color:var(--red)">${allergy}</b>.<br>Interaction with <b>${drug}</b> blocked.`;
    }

    async function saveSoapNote(patientId) {
      const btn = document.querySelector("#soapForm .btn-primary");
      const originalText = btn.innerText;
      btn.disabled = true;
      btn.innerText = "Saving...";

      // Construct Prescription Object if populated
      let prescription = null;
      const rxName = document.getElementById("rxName").value.trim();
      if (rxName) {
        prescription = {
          name: rxName,
          dosage: document.getElementById("rxDosage").value.trim(),
          frequency: document.getElementById("rxFreq").value.trim(),
          quantity: document.getElementById("rxQty").value.trim(),
        };

        // --- SAFETY CHECK (Phase 6) ---
        // Fetch patient allergies before saving
        try {
          const patRef = await db.collection("patients").doc(patientId).get();
          if (patRef.exists) {
            const allergies = patRef.data().allergies || [];
            // Check if rxName contains any allergy (case-insensitive)
            const conflict = allergies.find((al) =>
              rxName.toLowerCase().includes(al.toLowerCase()),
            );
            if (conflict) {
              showSafetyModal(conflict, rxName);
              // Reset Button
              btn.disabled = false;
              btn.innerText = originalText;
              return; // STOP EXECUTION
            }
          }
        } catch (e) {
          console.error("Safety Check Failed", e);
        }
      }

      const data = {
        patientId,
        subjective: document.getElementById("soapS").value,
        objective: document.getElementById("soapO").value,
        assessment: document.getElementById("soapA").value,
        plan: document.getElementById("soapP").value,
        diagnosis: document.getElementById("soapDiagnosis").value,
        prescription,
      };

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/doctor/soap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error("Failed to save note");

        toast("SOAP Note Saved");
        openPatientChart(patientId); // Refresh UI
      } catch (e) {
        console.error(e);
        toast("Error saving note");
        btn.disabled = false;
        btn.innerText = originalText;
      }
    }

    async function handlePacsUpload() {
      const f = document.getElementById("pacsFile").files[0];
      if (!f) return toast("Please select a file");

      const btn = document.getElementById("uploadBtn");
      const stat = document.getElementById("uploadStatus");
      btn.disabled = true;
      btn.textContent = "Uploading...";
      stat.textContent = "Encrypting and sending to PACS...";
      stat.style.color = "var(--slate)";

      try {
        const fd = new FormData();
        fd.append("dicom", f);
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API}/api/v1/radiology/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }, // FormData handled automatically
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const data = await res.json();
        stat.textContent =
          "✅ Upload Complete! Study ID: " + (data.orthancId || "Received");
        stat.style.color = "green";
        toast("Image uploaded successfully");
        setTimeout(() => {
          document.getElementById("uploadModal").classList.remove("active");
          btn.disabled = false;
          btn.textContent = "Upload Securely";
          stat.textContent = "";
          document.getElementById("pacsFile").value = "";
        }, 3000);
      } catch (e) {
        console.error(e);
        stat.textContent = "❌ Error: " + e.message;
        stat.style.color = "red";
        btn.disabled = false;
        btn.textContent = "Try Again";
      }
    }

    // --- NAVIGATION HELPERS ---
    window.openProviderPortal = function () {
      // alert('Opening Portal...'); // Debugging
      console.log("Opening Provider Portal");
      document.getElementById("landingPage").classList.add("hidden");
      document.getElementById("dashboardPage").classList.add("hidden");
      document.getElementById("adminDashboard").classList.remove("hidden");
      window.scrollTo(0, 0);
      loadAdminConsults();
    };
