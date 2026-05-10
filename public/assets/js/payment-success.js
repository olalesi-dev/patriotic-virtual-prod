    // New Function specifically for Payment Return
    async function handlePaymentSuccess(consultationId) {
      console.log("Processing payment success for:", consultationId);
      currentConsultId = consultationId; // Assign to global variable

      try {
        const updateTasks = [];

        if (typeof db !== 'undefined' && consultationId) {
          const ts = firebase.firestore.FieldValue.serverTimestamp();
          const uid = (auth && auth.currentUser) ? auth.currentUser.uid : null;

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

        // Google Ads Conversion tracking for purchase
        try {
          if (typeof gtag === 'function') {
            gtag('event', 'purchase', {
              transaction_id: consultationId
            });
            console.log("✅ Google Ads purchase conversion event triggered.");
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
      const EMR_BASE = 'https://patriotic-virtual-emr.web.app';
      try {
        const name = encodeURIComponent(
          ((user && user.firstName) || '') + ' ' + ((user && user.lastName) || '')
        ).trim();
        // Try to get bridge token for SSO
        let tokenParam = '';
        if (auth && auth.currentUser) {
          try {
            const idTok = await auth.currentUser.getIdToken();
            const bridgeRes = await fetch(`${API}/api/v1/auth/bridge-token`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${idTok}` }
            });
            if (bridgeRes.ok) {
              const { customToken } = await bridgeRes.json();
              tokenParam = `&token=${encodeURIComponent(customToken)}`;
            }
          } catch (bridgeErr) {
            console.warn('Bridge token failed, proceeding without SSO:', bridgeErr.message);
          }
        }
        const successUrl = `${EMR_BASE}/book/success?consultationId=${encodeURIComponent(consultationId || '')}&patientName=${name}${tokenParam}`;
        window.location.href = successUrl;
      } catch (e) {
        console.error('Redirect to EMR failed:', e);
        showBookingSuccess(); // Fallback to local page
      }
    }


