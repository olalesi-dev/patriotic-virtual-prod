    function openVideoConsult() {
      const frame = document.getElementById("doxyFrame");
      frame.src = frame.getAttribute("data-src");
      document.getElementById("videoModal").classList.add("active");
    }
    function closeVideoConsult() {
      document.getElementById("videoModal").classList.remove("active");
      // Reset iframe to stop camera/mic
      const f = document.getElementById("doxyFrame");
      f.src = "about:blank";
    }

    window.addEventListener("message", async (e) => {
      if (e.data && e.data.type === 'VOUCHED_DONE') {
        if (e.data.context === 'signup') return;
        const success = e.data.success;
        const jobId = e.data.jobId;
        
        if (fbUser && db) {
           try {
              const refs = [
                db.collection('patients').doc(fbUser.uid),
                db.collection('users').doc(fbUser.uid)
              ];
              for (const ref of refs) {
                 await ref.set({
                    vouchedJobId: jobId,
                    isIdentityVerified: success
                 }, { merge: true });
              }
           } catch (err) {
              console.log("Failed to save vouched status", err);
           }
        }
        
        if (success) {
           toast("Identity verification completed successfully.");
           document.getElementById("authModal").classList.remove("active");
           window._pendingVisit = false;
           openConsultation();
        } else {
           toast("Identity verification failed. Please try again or contact support.");
        }
      }
    });
  
