    function closePromoModal() {
      document.getElementById('promoModal').classList.remove('active');
    }

    async function submitPromoEmail() {
      const em = document.getElementById('promoEmail').value.trim();
      if(!em || !em.includes('@')) return alert('Please enter a valid email');
      const btn = document.getElementById('promoBtn');
      btn.innerText = 'Saving...';
      btn.disabled = true;
      try {
        await db.collection('crm_leads').add({
          email: em,
          code: 'NEW2026',
          source: 'landing_popup',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('promoSuccess').style.display = 'block';
        setTimeout(closePromoModal, 3000);
        localStorage.setItem('promo2026_seen', 'true');
      } catch(e) {
        console.error(e);
        // Fallback even if firestore fails
        document.getElementById('promoSuccess').style.display = 'block';
        setTimeout(closePromoModal, 3000);
        localStorage.setItem('promo2026_seen', 'true');
      }
    }

    window.addEventListener('load', () => {
      // Show after 3 seconds if not already seen
      if(!localStorage.getItem('promo2026_seen')) {
        setTimeout(() => {
          document.getElementById('promoModal').classList.add('active');
        }, 3000);
      }
    });
  