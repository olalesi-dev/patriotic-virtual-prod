const HAIR_CONSULT_SERVICE_KEY = "hair_loss";
const HAIR_CONSULT_STORAGE_KEY = "pvtHairLossConsultationFlow";
const HAIR_CONSULT_SCREENING_VERSION = "hair_loss_v1";

const HAIR_CONSULT_QUESTIONS = [
  {
    id: "hair_loss_duration",
    text: "How long have you been experiencing hair loss or thinning?",
    type: "single",
    options: [
      ["less_than_6_months", "Less than 6 months"],
      ["6_months_to_1_year", "6 months to 1 year"],
      ["1_to_3_years", "1 to 3 years"],
      ["more_than_3_years", "More than 3 years"],
    ],
  },
  {
    id: "hair_loss_pattern",
    text: "Which best describes your hair loss pattern?",
    type: "single",
    flagValues: ["patchy_specific_spots", "sudden_or_rapid_hair_loss"],
    options: [
      ["receding_or_crown_thinning", "Receding hairline or thinning at the crown (typical male/female pattern)"],
      ["overall_scalp_thinning", "Overall thinning across the scalp"],
      ["patchy_specific_spots", "Patchy hair loss in specific spots"],
      ["sudden_or_rapid_hair_loss", "Sudden or rapid hair loss"],
      ["not_sure", "Not sure"],
    ],
    note: "Patchy or sudden hair loss will be flagged for clinician review before any prescription pathway.",
  },
  {
    id: "hair_loss_medication_history",
    text: "Are you currently taking, or have you recently taken, any medications for hair loss (e.g., finasteride, minoxidil, dutasteride, spironolactone)?",
    type: "single",
    options: [
      ["currently_taking", "Yes - currently taking"],
      ["past_not_current", "Yes - taken in the past but not currently"],
      ["no", "No"],
    ],
    followUp: {
      id: "hair_loss_current_medications_detail",
      text: "Which medication(s) and for how long?",
      requiredWhen: "currently_taking",
    },
  },
  {
    id: "hair_loss_medical_risks",
    text: "Do you have any of the following that we should know about? (Select all that apply)",
    type: "multi",
    flagValues: [
      "prostate_or_breast_cancer_history",
      "liver_disease",
      "pregnant_planning_or_breastfeeding",
      "allergy_to_related_medications",
    ],
    options: [
      ["prostate_or_breast_cancer_history", "History of prostate or breast cancer"],
      ["liver_disease", "Liver disease"],
      ["pregnant_planning_or_breastfeeding", "Currently pregnant, planning pregnancy, or breastfeeding"],
      ["allergy_to_related_medications", "Known allergy to finasteride, minoxidil, or related medications"],
      ["none_of_the_above", "None of the above"],
    ],
    note: "Any selection other than None of the above will be flagged for clinician review before prescription consideration.",
  },
];

function escapeHairHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getHairConsultState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HAIR_CONSULT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveHairConsultState(patch) {
  const current = getHairConsultState();
  const next = {
    serviceKey: HAIR_CONSULT_SERVICE_KEY,
    screening_version: HAIR_CONSULT_SCREENING_VERSION,
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(HAIR_CONSULT_STORAGE_KEY, JSON.stringify(next));
  sessionStorage.setItem(HAIR_CONSULT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function clearHairConsultationFlow() {
  localStorage.removeItem(HAIR_CONSULT_STORAGE_KEY);
  sessionStorage.removeItem(HAIR_CONSULT_STORAGE_KEY);
  window._pendingHairLossConsult = false;
  window.pendingHairLossVerification = null;
}

function getHairQuestion(id) {
  return HAIR_CONSULT_QUESTIONS.find((question) => question.id === id);
}

function getHairOptionLabel(question, value) {
  const option = question.options.find(([optionValue]) => optionValue === value);
  return option ? option[1] : value;
}

function getHairAnswers() {
  const state = getHairConsultState();
  return state.answers && typeof state.answers === "object" ? state.answers : {};
}

function setHairAnswer(questionId, value) {
  const question = getHairQuestion(questionId);
  const answers = getHairAnswers();

  if (question.type === "multi") {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    let next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    if (value === "none_of_the_above" && !current.includes(value)) {
      next = ["none_of_the_above"];
    } else if (value !== "none_of_the_above") {
      next = next.filter((item) => item !== "none_of_the_above");
    }

    answers[questionId] = next;
  } else {
    answers[questionId] = value;
    if (question.followUp && value !== question.followUp.requiredWhen) {
      delete answers[question.followUp.id];
    }
  }

  saveHairConsultState({ step: "screening", answers });
  renderHairScreeningQuestions();
}

function setHairFollowUp(questionId, value) {
  const answers = getHairAnswers();
  answers[questionId] = value;
  saveHairConsultState({ step: "screening", answers });
}

function getHairScreeningFlags(answers) {
  const flags = [];
  HAIR_CONSULT_QUESTIONS.forEach((question) => {
    const flagValues = question.flagValues || [];
    const answer = answers[question.id];
    const values = Array.isArray(answer) ? answer : [answer].filter(Boolean);
    values.forEach((value) => {
      if (flagValues.includes(value)) {
        flags.push({
          question_id: question.id,
          code: `${question.id}:${value}`,
          label: getHairOptionLabel(question, value),
          severity: "review",
        });
      }
    });
  });
  return flags;
}

function renderHairScreeningQuestions() {
  const container = document.getElementById("hairScreeningQuestions");
  if (!container) return;

  const answers = getHairAnswers();
  container.innerHTML = HAIR_CONSULT_QUESTIONS.map((question) => {
    const selected = answers[question.id];
    const options = question.options.map(([value, label]) => {
      const isSelected = Array.isArray(selected) ? selected.includes(value) : selected === value;
      return `
        <button class="ro hair-choice ${question.type === "multi" ? "hair-choice--multi" : ""} ${isSelected ? "sel" : ""}" type="button" data-hair-question="${question.id}" data-hair-value="${value}">
          <div class="rd2"></div>
          <span>${escapeHairHtml(label)}</span>
        </button>
      `;
    }).join("");
    const followUpVisible = question.followUp && selected === question.followUp.requiredWhen;
    const followUp = followUpVisible
      ? `<div class="hair-screening-followup fg" style="margin-bottom:0">
          <input data-hair-followup="${question.followUp.id}" placeholder="${escapeHairHtml(question.followUp.text)}" value="${escapeHairHtml(answers[question.followUp.id] || "")}">
        </div>`
      : "";
    const note = question.note ? `<p class="hair-screening-note">${escapeHairHtml(question.note)}</p>` : "";

    return `
      <div class="iq">
        <h3>${escapeHairHtml(question.text)}</h3>
        <div class="rg">${options}</div>
        ${followUp}
        ${note}
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-hair-question]").forEach((button) => {
    button.addEventListener("click", () => {
      setHairAnswer(button.getAttribute("data-hair-question"), button.getAttribute("data-hair-value"));
    });
  });

  container.querySelectorAll("[data-hair-followup]").forEach((input) => {
    input.addEventListener("input", () => {
      setHairFollowUp(input.getAttribute("data-hair-followup"), input.value);
    });
  });
}

function validateHairScreeningAnswers() {
  const answers = getHairAnswers();
  for (const question of HAIR_CONSULT_QUESTIONS) {
    const answer = answers[question.id];
    if (question.type === "multi") {
      if (!Array.isArray(answer) || answer.length === 0) {
        return `${question.text} is required.`;
      }
    } else if (!answer) {
      return `${question.text} is required.`;
    }

    if (question.followUp && answer === question.followUp.requiredWhen && !String(answers[question.followUp.id] || "").trim()) {
      return question.followUp.text;
    }
  }

  return null;
}

function buildHairScreeningPayload() {
  const answers = getHairAnswers();
  const timestamp = new Date().toISOString();
  return {
    version: HAIR_CONSULT_SCREENING_VERSION,
    responses: HAIR_CONSULT_QUESTIONS.map((question) => {
      const answer = answers[question.id];
      const response = {
        question_id: question.id,
        question_text: question.text,
        answer,
        answer_label: Array.isArray(answer)
          ? answer.map((value) => getHairOptionLabel(question, value))
          : getHairOptionLabel(question, answer),
        timestamp,
      };

      if (question.followUp && answer === question.followUp.requiredWhen) {
        response.follow_up = {
          question_id: question.followUp.id,
          question_text: question.followUp.text,
          answer: String(answers[question.followUp.id] || "").trim(),
          timestamp,
        };
      }

      return response;
    }),
  };
}

function showHairScreeningReviewAlert() {
  const alertEl = document.getElementById("hairScreeningAlert");
  if (!alertEl) return;
  const flags = getHairScreeningFlags(getHairAnswers());
  if (!flags.length) {
    alertEl.classList.add("hidden");
    alertEl.textContent = "";
    return;
  }

  alertEl.classList.remove("hidden");
  alertEl.textContent = "Some answers will be flagged for clinician review before prescription consideration. You can still continue with the consultation request.";
}

function showHairScreeningModal() {
  selSvc = HAIR_CONSULT_SERVICE_KEY;
  window._initialSvcClick = HAIR_CONSULT_SERVICE_KEY;
  window._pendingHairLossConsult = true;
  const modal = document.getElementById("consultModal");
  if (modal) modal.classList.add("active");

  ["cSHair", "cSMetabolicHold", "cS1", "cS2", "cS3", "cS4", "cS5"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== "cSHair");
  });

  const cm = document.querySelector("#consultModal .modal.cm");
  if (cm) cm.classList.remove("cm-verify");
  renderHairScreeningQuestions();
  showHairScreeningReviewAlert();
}

function startHairGrowthConsultation() {
  const state = getHairConsultState();
  saveHairConsultState({
    step: state.step || "screening",
    answers: state.answers || {},
  });
  showHairScreeningModal();
}

async function continueHairConsultationFromScreening() {
  const validationError = validateHairScreeningAnswers();
  if (validationError) return toast(validationError);

  const screening = buildHairScreeningPayload();
  const flags = getHairScreeningFlags(getHairAnswers());
  saveHairConsultState({
    step: "auth",
    screening,
    screeningFlags: flags,
    requiresClinicianReview: flags.length > 0,
  });

  if (!auth.currentUser) {
    document.getElementById("consultModal").classList.remove("active");
    window._pendingHairLossConsult = true;
    return openModal("register");
  }

  return submitHairConsultationCheckout();
}

function buildHairConsultationIntake(profile) {
  const screening = buildHairScreeningPayload();
  const answerSummary = {};
  screening.responses.forEach((response) => {
    answerSummary[response.question_id] = response.answer_label;
    if (response.follow_up) {
      answerSummary[response.follow_up.question_id] = response.follow_up.answer;
    }
  });

  return {
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    email: profile?.email || (auth.currentUser && auth.currentUser.email) || "",
    dateOfBirth: profile?.dateOfBirth || profile?.dob || "",
    state: profile?.state || "",
    phone: profile?.phone || profile?.phoneNumber || "",
    reasonForVisit: "Hair Growth & Hair Loss Consultation",
    chiefComplaint: "Hair loss or hair thinning concern",
    hairLossScreening: answerSummary,
  };
}

async function submitHairConsultationCheckout() {
  const firebaseUser = auth.currentUser || fbUser;
  if (!firebaseUser) return openModal("login");

  const btn = document.getElementById("hairScreeningContinueBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Starting checkout...";
  }

  try {
    token = await firebaseUser.getIdToken();
    user = await loadUserProfile(firebaseUser);
    const screening = buildHairScreeningPayload();
    const intakePayload = buildHairConsultationIntake(user);

    const consRes = await fetch(`${API}/api/v1/consultations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        serviceKey: HAIR_CONSULT_SERVICE_KEY,
        intake: intakePayload,
        screening,
      }),
    });

    const consText = await consRes.text();
    const consData = consText ? JSON.parse(consText) : {};
    if (!consRes.ok) throw new Error(consData.error || "Failed to create consultation");

    const consultationId = consData.id;
    currentConsultId = consultationId;
    sessionStorage.setItem("pendingConsultationId", consultationId);
    localStorage.setItem("pendingConsultationId", consultationId);
    saveHairConsultState({ step: "checkout_started", consultationId });

    const landingOrigin = typeof getLandingOrigin === "function"
      ? getLandingOrigin()
      : window.location.origin;
    const landingPath = window.location.pathname || "/";
    const checkoutReturnUrl = `${landingOrigin}${landingPath}`;

    const payRes = await fetch(`${API}/api/v1/payments/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        serviceKey: HAIR_CONSULT_SERVICE_KEY,
        consultationId,
        returnUrl: checkoutReturnUrl,
        cancelUrl: checkoutReturnUrl,
      }),
    });

    const payText = await payRes.text();
    const payData = payText ? JSON.parse(payText) : {};
    if (!payRes.ok) throw new Error(payData.error || "Payment initialization failed");
    if (!payData.url) throw new Error("Missing checkout URL");

    window.location.href = payData.url;
  } catch (error) {
    console.error("Hair consultation checkout failed:", error);
    toast(error.message || "Hair consultation checkout could not start.");
    showHairScreeningModal();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Continue";
    }
  }
}

async function resumeHairConsultationAfterAuth() {
  const state = getHairConsultState();
  const hasScreening = state && state.screening && state.serviceKey === HAIR_CONSULT_SERVICE_KEY;
  if (!window._pendingHairLossConsult && !hasScreening) return false;
  if (validateHairScreeningAnswers()) {
    showHairScreeningModal();
    return true;
  }

  await submitHairConsultationCheckout();
  return true;
}

window.startHairGrowthConsultation = startHairGrowthConsultation;
window.continueHairConsultationFromScreening = continueHairConsultationFromScreening;
window.resumeHairConsultationAfterAuth = resumeHairConsultationAfterAuth;
window.clearHairConsultationFlow = clearHairConsultationFlow;
