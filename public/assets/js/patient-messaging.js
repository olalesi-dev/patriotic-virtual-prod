    /* --- PATIENT MESSAGING --- */
    async function openPatientMessage() {
      console.log("openPatientMessage called");
      if (!user || !user.uid) {
        console.error("User not logged in or missing UID", user);
        return toast("Please log in to message your provider.");
      }

      try {
        console.log("Checking for existing conversation for user:", user.uid);
        // Check for existing conversation
        const snaps = await db
          .collection("conversations")
          .where("participants", "array-contains", user.uid)
          .limit(1)
          .get();

        console.log("Conversation query result empty?", snaps.empty);

        let convId;
        if (!snaps.empty) {
          convId = snaps.docs[0].id;
          console.log("Found existing conversation:", convId);
        } else {
          console.log("Creating new conversation...");
          // Create new conversation
          const ref = await db.collection("conversations").add({
            participants: [user.uid, "test-provider-001"],
            patientName: `${user.firstName} ${user.lastName}`,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            unreadCounts: { [user.uid]: 0, "test-provider-001": 1 },
          });
          convId = ref.id;
          console.log("Created new conversation:", convId);
        }

        renderPatientChatModal(convId);
      } catch (e) {
        console.error("Error in openPatientMessage:", e);
        alert("Error opening chat: " + e.message);
      }
    }

    let patientMsgUnsub = null;
    function renderPatientChatModal(convId) {
      console.log("Rendering Patient Chat Modal for:", convId);
      let m = document.getElementById("ptChatModal");

      // Create Modal Structure if missing
      if (!m) {
        m = document.createElement("div");
        m.id = "ptChatModal";
        m.className = "mo active";
        m.innerHTML = `
                <div class="modal wide" style="height:85vh;max-height:800px;display:flex;flex-direction:column;padding:0;border-radius:20px;overflow:hidden;box-shadow:var(--sh-lg)">
                    
                    <!-- Premium Header -->
                    <div style="padding:24px;border-bottom:1px solid var(--border-soft);display:flex;justify-content:space-between;align-items:center;background:var(--bg-panel);z-index:10">
                        <div style="display:flex;align-items:center;gap:16px">
                            <div style="width:48px;height:48px;border-radius:50%;background:var(--blue-pale);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700">Dr.</div>
                            <div>
                                <h3 style="margin:0;color:var(--txt-main);font-family:var(--font-display);font-size:20px;letter-spacing:-0.02em">Dr. Osunsade</h3>
                                <div style="font-size:13px;color:var(--emerald);font-weight:500;display:flex;align-items:center;gap:4px">
                                    <span style="width:6px;height:6px;background:currentColor;border-radius:50%"></span> Secure Connection
                                </div>
                            </div>
                        </div>
                        <button class="modal-close" style="position:static;width:36px;height:36px;font-size:24px;background:var(--bg-tertiary)" onclick="closePtChat()">×</button>
                    </div>

                    <!-- Chat Area -->
                    <div id="ptChatMsgs" style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px;background:var(--bg-tertiary)">
                        <div style="text-align:center;color:var(--g400);font-size:13px;margin:20px 0">This is a secure, HIPAA-compliant messaging thread.</div>
                        <div style="text-align:center;color:var(--txt-sub)">Loading history...</div>
                    </div>

                    <!-- Input Area -->
                    <div style="padding:20px 24px;background:var(--bg-panel);border-top:1px solid var(--g100);display:flex;gap:12px;align-items:center">
                        <input type="text" id="ptChatIn" placeholder="Type a Secure Message..." 
                               style="flex:1;padding:14px 18px;border:1px solid var(--border-soft);border-radius:24px;font-size:15px;outline:none;transition:all 0.2s"
                               onfocus="this.style.borderColor='var(--blue)';this.style.boxShadow='0 0 0 3px var(--blue-pale)'"
                               onblur="this.style.borderColor='var(--g200)';this.style.boxShadow='none'"
                               onkeydown="if(event.key==='Enter') sendPtMessage('${convId}')">
                        <button class="btn btn-primary" onclick="sendPtMessage('${convId}')" style="border-radius:24px;padding:0 24px;height:48px;font-size:15px">Send</button>
                    </div>
                </div>
            `;
        document.body.appendChild(m);
        m.onclick = (e) => {
          if (e.target === m) closePtChat();
        };
      } else {
        m.classList.add("active");
      }

      // Real-time Subscription
      if (patientMsgUnsub) patientMsgUnsub();
      patientMsgUnsub = db
        .collection("conversations")
        .doc(convId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot((snap) => {
          const div = document.getElementById("ptChatMsgs");
          if (snap.empty) {
            div.innerHTML =
              '<div style="text-align:center;color:var(--g400);font-size:13px;margin-top:40px">No messages yet. Start the conversation!</div>';
            return;
          }

          const msgs = [];
          snap.forEach((doc) => msgs.push(doc.data()));

          div.innerHTML = msgs
            .map((m) => {
              const isMe = m.senderId === user.uid;

              // Format Time
              let timeStr = "Just now";
              if (m.createdAt) {
                const d = m.createdAt.toDate
                  ? m.createdAt.toDate()
                  : new Date(m.createdAt);
                timeStr = d.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });
              }

              if (isMe) {
                // User Message (Right)
                return `
                    <div style="align-self:flex-end;max-width:70%;display:flex;flex-direction:column;align-items:flex-end">
                        <div style="background:var(--blue);color:white;padding:12px 18px;border-radius:18px 18px 4px 18px;box-shadow:var(--sh-sm);font-size:15px;line-height:1.5;position:relative">
                            ${m.text}
                        </div>
                        <div style="font-size:11px;color:var(--g400);margin-top:6px;margin-right:2px;font-weight:500">${timeStr}</div>
                    </div>
                `;
              } else {
                // Provider Message (Left)
                return `
                    <div style="align-self:flex-start;max-width:70%;display:flex;flex-direction:column;align-items:flex-start">
                        <div style="font-size:12px;color:var(--txt-main);margin-bottom:6px;margin-left:2px;font-weight:600">Dr. Osunsade</div>
                        <div style="background:var(--bg-panel);color:var(--g800);padding:12px 18px;border-radius:18px 18px 18px 4px;border:1px solid var(--border-soft);box-shadow:var(--sh-sm);font-size:15px;line-height:1.5">
                            ${m.text}
                        </div>
                        <div style="font-size:11px;color:var(--g400);margin-top:6px;margin-left:2px;font-weight:500">${timeStr}</div>
                    </div>
                `;
              }
            })
            .join("");

          div.scrollTop = div.scrollHeight;
        });
    }

    function closePtChat() {
      document.getElementById("ptChatModal").classList.remove("active");
      if (patientMsgUnsub) patientMsgUnsub();
    }

    async function sendPtMessage(convId) {
      const inp = document.getElementById("ptChatIn");
      const text = inp.value.trim();
      if (!text) return;
      inp.value = "";

      await db
        .collection("conversations")
        .doc(convId)
        .collection("messages")
        .add({
          text,
          senderId: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      await db
        .collection("conversations")
        .doc(convId)
        .update({
          lastMessage: {
            text,
            senderId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          // Increment provider unread
        });
    }

