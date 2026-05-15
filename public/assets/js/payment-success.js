    // New Function specifically for Payment Return
    function waitForLandingAuth(timeoutMs = 12000) {
      if (!auth) return Promise.resolve(null);
      if (auth.currentUser) return Promise.resolve(auth.currentUser);

      return new Promise((resolve) => {
        let settled = false;
        let unsubscribe = null;
        const timer = window.setTimeout(() => finish(auth.currentUser || null), timeoutMs);

        function finish(firebaseUser) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (typeof unsubscribe === "function") unsubscribe();
          resolve(firebaseUser || auth.currentUser || null);
        }

        try {
          unsubscribe = auth.onAuthStateChanged(
            (firebaseUser) => finish(firebaseUser),
            () => finish(null),
          );
        } catch (error) {
          console.warn("Auth restoration wait failed:", error);
          finish(auth.currentUser || null);
        }
      });
    }

    function setPendingPaymentSuccess(consultationId) {
      if (!consultationId) return;
      sessionStorage.setItem("pendingPaymentSuccessConsultationId", consultationId);
      localStorage.setItem("pendingPaymentSuccessConsultationId", consultationId);
    }

    function clearPendingPaymentSuccess(consultationId) {
      const sessionId = sessionStorage.getItem("pendingPaymentSuccessConsultationId");
      const localId = localStorage.getItem("pendingPaymentSuccessConsultationId");
      if (!consultationId || sessionId === consultationId) {
        sessionStorage.removeItem("pendingPaymentSuccessConsultationId");
      }
      if (!consultationId || localId === consultationId) {
        localStorage.removeItem("pendingPaymentSuccessConsultationId");
      }
    }

    function promptSignInForPaidConsultation(consultationId) {
      setPendingPaymentSuccess(consultationId);
      toast("Payment received. Sign in to finish identity verification.");
      openModal("login");
    }

    async function resumePendingPaymentSuccess() {
      const pendingId =
        sessionStorage.getItem("pendingPaymentSuccessConsultationId") ||
        localStorage.getItem("pendingPaymentSuccessConsultationId");

      if (!pendingId) return false;
      await handlePaymentSuccess(pendingId);
      return true;
    }

    window.resumePendingPaymentSuccess = resumePendingPaymentSuccess;

    async function handlePaymentSuccess(consultationId) {
      console.log("Processing payment success for:", consultationId);
      currentConsultId = consultationId; // Assign to global variable

      try {
        const signedInUser = await waitForLandingAuth();
        if (!signedInUser) {
          promptSignInForPaidConsultation(consultationId);
          return;
        }

        fbUser = signedInUser;
        token = await signedInUser.getIdToken();
        user = await loadUserProfile(signedInUser);
        updateNav();

        const updateTasks = [];

        if (typeof db !== 'undefined' && consultationId) {
          const ts = firebase.firestore.FieldValue.serverTimestamp();
          const uid = signedInUser.uid;

          // 1. Read the existing consultation to get serviceKey + intake data
          let serviceKey = null;
          let intakeData = {};
          try {
            const consultDoc = await db.collection('consultations').doc(consultationId).get();
            if (consultDoc.exists) {
              serviceKey = consultDoc.data().serviceKey || null;
              intakeData = consultDoc.data().intake || {};
            }
          } catch (e) {
            console.log("Could not read consultation doc:", e.message);
          }

          // 2. Update consultations doc — MUST include uid so EMR query works
          updateTasks.push(
            db.collection('consultations').doc(consultationId).set({
              status: 'waitlist',
              paymentStatus: 'paid',
              uid: uid,           // ← critical: EMR queries by this field
              updatedAt: ts
            }, { merge: true }).catch(e => console.log("Consultations sync skipped:", e.message))
          );

          // 3. Write to patients/{uid}/appointments sub-collection — the EMR dashboard + My Appointments page listens here
          if (uid) {
            const subApptData = {
              consultationId: consultationId,
              patientUid: uid,
              status: 'PENDING_SCHEDULING',
              paymentStatus: 'paid',
              serviceKey: serviceKey || selSvc || null,
              intakeAnswers: intakeData,
              providerName: 'Patriotic Provider',
              type: 'Telehealth',
              meetingUrl: 'https://doxy.me/patriotictelehealth',
              createdAt: ts,
              updatedAt: ts
            };

            updateTasks.push(
              db.collection('patients').doc(uid).collection('appointments').doc(consultationId)
                .set(subApptData, { merge: true })
                .catch(e => console.log("Patient sub-appt sync skipped:", e.message))
            );

            // 3.5 Auto-sync vital intake answers back up to the main users/{uid} profile
            if (intakeData) {
              const profileSync = {};
              if (intakeData.address) profileSync.address = intakeData.address;
              if (intakeData.city) profileSync.city = intakeData.city;
              if (intakeData.zip) profileSync.zip = intakeData.zip;
              if (intakeData.phone) profileSync.phone = intakeData.phone;
              if (intakeData.phoneOrVideo) profileSync.preferredContact = intakeData.phoneOrVideo;
              if (intakeData.biologicalSex) profileSync.gender = intakeData.biologicalSex;
              if (intakeData.currentMeds && intakeData.currentMeds.toLowerCase() !== 'no') {
                profileSync.currentMedications = intakeData.currentMeds;
              }
              if (intakeData.allergies && intakeData.allergies.toLowerCase() !== 'no') {
                profileSync.allergies = intakeData.allergies;
              }

              if (Object.keys(profileSync).length > 0) {
                profileSync.updatedAt = ts;
                updateTasks.push(
                  db.collection('users').doc(uid).set(profileSync, { merge: true })
                    .catch(e => console.log("Profile auto-sync skipped:", e.message))
                );
              }
            }
          }

          // 4. Also update top-level appointments collection
          const apptData = {
            status: 'PENDING_SCHEDULING',
            paymentStatus: 'paid',
            serviceKey: serviceKey || selSvc || null,
            updatedAt: ts
          };
          if (uid) apptData.patientId = uid;

          updateTasks.push(
            db.collection('appointments').doc(consultationId).set(apptData, { merge: true })
              .catch(e => console.log("Appointments sync skipped:", e.message))
          );
        }

        await Promise.all(updateTasks);
        console.log("✅ Appointment written to all EMR collections successfully.");
        clearPendingPaymentSuccess(consultationId);

        // Google Ads Conversion tracking for purchase
        try {
          if (typeof gtag === 'function') {
            // First conversion event (purchase)
            gtag('event', 'purchase', {
              transaction_id: consultationId
            });
            // Second conversion event (from new email instructions)
            gtag('event', 'conversion', {
              'send_to': 'AW-18019342434/A_dTCKjiv6kcEOKwpZBD'
            });
            console.log("✅ Google Ads conversion events triggered.");
          }
        } catch (e) {
          console.error("Google Ads tracking error:", e);
        }

        // Redirect patient to EMR portal success page with a bridge token for auto-login
        await redirectToEMRSuccess(consultationId);

      } catch (err) {
        console.error("Error finalizing payment flow:", err);
        // Fallback: show local success if redirect fails
        showBookingSuccess();
      }

      // Clean URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname,
      );
    }

    // Redirect to EMR portal with Firebase custom token for cross-domain SSO
    async function redirectToEMRSuccess(consultationId) {
      const EMR_BASE = getEmrOrigin();
      try {
        const signedInUser = await waitForLandingAuth();
        if (!signedInUser) {
          promptSignInForPaidConsultation(consultationId);
          return;
        }

        const name = (
          ((user && user.firstName) || '') + ' ' + ((user && user.lastName) || '')
        ).trim();

        const idTok = await signedInUser.getIdToken();
        const bridgeRes = await fetch(`${API}/api/v1/auth/bridge-token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idTok}`, 'Content-Type': 'application/json' }
        });
        const data = await bridgeRes.json().catch(() => ({}));
        if (!bridgeRes.ok || !data.customToken) {
          throw new Error(data.error || data.message || `Bridge token failed with status ${bridgeRes.status}.`);
        }

        const successUrl = new URL(`${EMR_BASE}/book/success`);
        successUrl.searchParams.set('consultationId', consultationId || '');
        successUrl.searchParams.set('patientName', name);
        successUrl.searchParams.set('token', data.customToken);
        window.location.href = successUrl.toString();
      } catch (e) {
        console.error('Redirect to EMR failed:', e);
        showBookingSuccess(); // Fallback to local page
      }
    }
