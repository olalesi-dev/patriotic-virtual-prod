    /* === AI NAVIGATOR ENGINE === */
    let aiState = "start",
      aiCtx = {};
    function toggleAI() {
      const fab = document.getElementById("aiFab"),
        chat = document.getElementById("aiChat");
      fab.classList.toggle("open");
      chat.classList.toggle("open");
      if (
        chat.classList.contains("open") &&
        !document.getElementById("aiBody").children.length
      )
        aiStart();
    }
    function aiStart() {
      aiState = "start";
      aiCtx = {};
      const b = document.getElementById("aiBody");
      b.innerHTML = "";
      aiBot(
        `Hi! I'm your AI Health Navigator. I can help you find the right service, check if you qualify for treatments, or answer questions about our platform.\n\nWhat can I help you with?`,
        [
          "🔍 Check treatment eligibility",
          "💊 Find a service for me",
          "📋 How does it work?",
          "💰 Pricing & plans",
        ],
      );
    }
    function aiBot(txt, opts) {
      const b = document.getElementById("aiBody");
      const d = document.createElement("div");
      d.className = "ai-msg bot";
      let h = txt.replace(/\n/g, "<br>");
      if (opts && opts.length) {
        h += `<div class="ai-opts">${opts.map((o) => `<button class="ai-opt" onclick="aiPick('${o.replace(/'/g, "\\'")}')">${o}</button>`).join("")}</div>`;
      }
      d.innerHTML = h;
      b.appendChild(d);
      b.scrollTop = b.scrollHeight;
    }
    function aiUser(txt) {
      const b = document.getElementById("aiBody");
      const d = document.createElement("div");
      d.className = "ai-msg user";
      d.textContent = txt;
      b.appendChild(d);
      b.scrollTop = b.scrollHeight;
    }
    function sendAI() {
      const inp = document.getElementById("aiInput"),
        v = inp.value.trim();
      if (!v) return;
      inp.value = "";
      aiPick(v);
    }
    function aiPick(v) {
      aiUser(v);
      setTimeout(() => {
        if (
          v.includes("eligibility") ||
          v.includes("qualify") ||
          v.includes("Check treatment")
        ) {
          aiState = "elig_svc";
          aiBot(
            "Let's check your eligibility. Which treatment are you interested in?",
            [
              "💊 Rx Weight Loss",
              "⚡ Erectile Dysfunction",
              "⏱️ Premature Ejaculation",
              "🩺 General Visit",
            ],
          );
        } else if (v.includes("Find a service") || v.includes("recommend")) {
          aiState = "find";
          aiBot("I can help with that! What's your main concern?", [
            "Lose weight",
            "Sexual health",
            "General health question",
            "Priority radiology reviews",
          ]);
        } else if (v.includes("How does it work")) {
          aiBot(
            "It's simple! 1️⃣ Pick a service, 2️⃣ Complete our safety screening (we check for contraindications automatically), 3️⃣ A board-certified provider reviews your case, 4️⃣ Prescriptions ship to your door in Florida.\n\nEvery treatment follows strict clinical protocols. Would you like to get started?",
            [
              "✅ Start a visit",
              "🔍 Check my eligibility first",
              "💰 See pricing",
            ],
          );
        } else if (
          v.includes("Pricing") ||
          v.includes("plans") ||
          v.includes("cost")
        ) {
          aiBot(
            "Our one-time clinical visits:\n\n🩺 <b>General Visit</b> — $79\n💊 <b>Rx Weight Loss</b> — $129\n⚡ <b>Erectile Dysfunction</b> — $79\n📹 <b>Imaging + Video Consult</b> — $449\n\nMembership plans: <b>All Access — Elite — $199</b>.\n\nWant to check eligibility for a specific treatment?",
            [
              "🔍 Check eligibility",
              "💰 Membership details",
              "✅ Start a visit",
            ],
          );
        } else if (v.includes("Membership details")) {
          aiBot(
            "Our membership tiers:\n\n🏆 <b>All Access Elite</b> — $199/mo (everything + priority)",
            ["✅ Sign up", "🔍 Check eligibility", "📋 More details"],
          );
        } else if (
          v.includes("Start a visit") ||
          v.includes("sign up") ||
          v.includes("register") ||
          v.includes("Sign up")
        ) {
          aiBot(
            "Great! Let me take you to registration. We're currently serving <b>Florida residents only</b>.",
          );
          setTimeout(() => openModal("register"), 1200);
        } else if (aiState === "elig_svc") {
          aiState = "elig_state";
          aiCtx.svc = v;
          aiBot(
            "Great choice. First — are you a <b>Florida resident</b>? We're currently only licensed in FL.",
            ["Yes, I'm in Florida", "No, I'm in another state"],
          );
        } else if (aiState === "elig_state") {
          if (v.includes("Florida") || v.toLowerCase().includes("yes")) {
            aiCtx.state = "FL";
            aiState = "elig_q";
            aiCtx.qi = 0;
            const svcKey = matchSvc(aiCtx.svc);
            aiCtx.svcKey = svcKey;
            const qs = iQs[svcKey];
            if (qs && qs.length) {
              aiCtx.qs = qs;
              aiCtx.answers = {};
              askNext();
            } else {
              showElig(
                true,
                "You're eligible! This service has no specific contraindications to screen for. A provider will do a full review after you submit your visit.",
              );
            }
          } else {
            aiBot(
              `We're not available in your state yet. Want to be notified when we expand?`,
              ["Yes, notify me", "Check another treatment"],
            );
            aiState = "start";
          }
        } else if (aiState === "elig_q") {
          const q = aiCtx.qs[aiCtx.qi];
          if (q.t === "yn") {
            aiCtx.answers[q.k] = v.toLowerCase().includes("yes");
          } else {
            aiCtx.answers[q.k] = v;
          }
          aiCtx.qi++;
          if (aiCtx.qi < aiCtx.qs.length) {
            askNext();
          } else {
            evalElig();
          }
        } else if (
          v.includes("Lose weight") ||
          v.toLowerCase().includes("weight")
        ) {
          aiBot(
            "For weight loss, we offer <b>Rx medication consultations</b> at $129/visit. Your provider screens eligibility, creates a titration schedule, and prescribes if appropriate. Medication cost is separate.\n\nWant to check if you qualify?",
            [
              "🔍 Check my eligibility",
              "✅ Start a weight loss visit",
              "💰 Pricing",
            ],
          );
        } else if (
          v.includes("Hormone") ||
          
          v.includes("HRT") ||
          v.includes("fatigue")
        ) {
          aiBot(
            "We offer <b>Testosterone / HRT consultations</b> at $149/visit for men & women. Your provider evaluates symptoms, reviews labs, and builds a personalized hormone protocol.\n\nOptions include testosterone, estrogen, progesterone, DHEA, thyroid support & peptides.",
            ["🔍 Check eligibility", "✅ Start a visit"],
          );
        } else if (
          v.includes("Sexual") ||
          v.includes("Erectile") ||
          v.includes("ED") ||
          v.includes("erect")
        ) {
          aiBot(
            "We offer:\n\n⚡ <b>Erectile Dysfunction</b> — $79 (sildenafil, tadalafil, custom compounds)\n\nAll medications shipped discreetly after safety screening.",
            ["🔍 Check eligibility", "✅ Start a visit"],
          );
        } else if (
          v.includes("General") ||
          v.includes("sick") ||
          v.includes("cold") ||
          v.includes("flu") ||
          v.includes("health question")
        ) {
          aiBot(
            "Our <b>General Visit</b> ($79) covers non-emergent health concerns — medication management, wellness checks, health advice. A board-certified provider reviews your case.\n\nWant to start a visit?",
            ["✅ Start a visit", "🔍 Check eligibility"],
          );
        } else if (
          v.includes("AI") ||
          v.includes("imaging") ||
          v.includes("digital") ||
          v.includes("tools")
        ) {
          aiBot(
            "Our AI & digital tools:\n\n🔬 <b>AI Imaging Analysis</b> — $99 (physician-supervised report interpretation)\n\nThese are available to everyone, no state restriction!",
            [
              "✅ Sign up",
              "💰 Membership plans",
              "🔍 Check treatment eligibility",
            ],
          );
        } else if (v.includes("notify")) {
          aiBot(
            "We'll let you know as soon as we launch in your state! Our AI tools and digital platform are available nationwide in the meantime.\n\nAnything else I can help with?",
            ["💊 Find a service", "📋 How does it work?"],
          );
        } else {
          aiBot(
            "I can help you with finding the right treatment, checking eligibility, understanding pricing, or getting started with a visit. What would you like to do?",
            [
              "🔍 Check treatment eligibility",
              "💊 Find a service",
              "💰 Pricing & plans",
              "✅ Start a visit",
            ],
          );
        }
      }, 600);
    }
    function matchSvc(txt) {
      const t = txt.toLowerCase();
      if (t.includes("weight") || t.includes("glp")) return "weight_loss";
      if (t.includes("erectile") || t.includes("ed"))
        return "erectile_dysfunction";
      if (t.includes("premature") || t.includes("ejaculation"))
        return "premature_ejaculation";
      if (
        
        t.includes("hrt") ||
        t.includes("hormone")
      )
        return "testosterone_hrt";
      if (t.includes("general")) return "general_visit";
      return "general_visit";
    }
    function askNext() {
      const q = aiCtx.qs[aiCtx.qi];
      if (q.t === "yn") {
        aiBot(q.l, ["Yes", "No"]);
      } else {
        aiBot(q.l);
      }
    }
    function evalElig() {
      const k = aiCtx.svcKey,
        a = aiCtx.answers;
      let block = [];
      if (k === "weight_loss") {
        if (a.hasMedullaryThyroidCancer)
          block.push("history of medullary thyroid carcinoma");
        if (a.hasMEN2) block.push("MEN2 syndrome");
        if (a.hasPancreatitis) block.push("pancreatitis");
        if (a.isPregnant) block.push("pregnancy or planning pregnancy");
      } else if (k === "erectile_dysfunction") {
        if (a.takesNitrates)
          block.push("nitrate medication use (dangerous interaction)");
        if (a.recentStroke) block.push("recent stroke (within 6 months)");
        if (a.recentMI) block.push("recent heart attack (within 6 months)");
      } else if (k === "premature_ejaculation") {
        if (a.onMAOIs) block.push("MAOI medication use");
        if (a.hasSeizureDisorder) block.push("seizure disorder");
      } else if (k === "testosterone_hrt") {
        if (a.hasProstateCancer) block.push("prostate cancer history");
        if (a.hasBreastCancer) block.push("breast cancer history");
        if (a.hasBloodClottingDisorder)
          block.push("blood clotting disorder / DVT/PE history");
        if (a.isPregnant) block.push("pregnancy or nursing");
      }
      if (block.length) {
        showElig(
          false,
          `Based on your answers, you may have contraindications: <b>${block.join(", ")}</b>. Our protocols flag these for safety.\n\nA provider can still review your case — some conditions can be managed. Want to proceed with a full evaluation?`,
        );
      } else {
        showElig(
          true,
          "Great news — based on your screening, you appear to be a good candidate! A board-certified provider will do a full review to confirm.\n\nReady to start your visit?",
        );
      }
    }
    function showElig(pass, msg) {
      aiState = "start";
      const b = document.getElementById("aiBody");
      const d = document.createElement("div");
      d.className = "ai-msg bot";
      const cls = pass ? "" : "warn";
      d.innerHTML = `<div class="ai-elig ${cls}"><h4>${pass ? "✅ Likely Eligible" : "⚠️ Review Needed"}</h4><p>${msg}</p></div><div class="ai-opts" style="margin-top:10px"><button class="ai-opt" onclick="aiPick('Start a visit')">✅ Start a visit</button><button class="ai-opt" onclick="aiPick('Check another treatment')">🔍 Check another treatment</button></div>`;
      b.appendChild(d);
      b.scrollTop = b.scrollHeight;
    }

