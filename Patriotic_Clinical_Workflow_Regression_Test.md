# Regression Test Script: Clinical Prescribing Workflow

**Project Names:** Patriotic Virtual Telehealth & EMR Portal
**Patient Portal:** [https://patriotictelehealth.com/](https://patriotictelehealth.com/)
**Provider Portal (EMR):** [https://patriotic-virtual-emr.web.app/](https://patriotic-virtual-emr.web.app/)
**Integrated Services:** DoseSpot (e-Prescribing), Surescripts Network
**Date:** [Insert Date]
**Tester:** [Insert Name]

---

## Assumptions & Pre-requisites
1. The tester has valid testing credentials for both the Patient Portal and the Provider EMR Portal.
2. The DoseSpot sandbox/production environment is actively integrated and authenticating API calls.
3. Test patients and test providers are pre-configured in the system.

---

## Step-by-Step Workflow Execution

### Step 1 — Patient Intake & Registration

**Objective:** Verify that a patient can successfully onboard, complete clinical intake, and consent to treatment.

**Actions:**
1. Navigate to the patient portal: `https://patriotictelehealth.com/`
2. Create a new patient account or log in as an existing test patient.
3. Select a service line (e.g., GLP-1 Weight Loss, General Consult).
4. Fill out the structured intake questionnaire (chief complaint, medical history, medications, allergies, and BMI/screening questions).
5. Review and sign the Electronic Informed Consent and Notice of Privacy Practices.
6. Submit the intake form.

**Expected Results:**
- Intake form fields adapt dynamically to the chosen service line.
- Patient identity step passes verification.
- Upon submission, data is securely transmitted and a success confirmation is displayed to the patient.

> **[Insert Screenshot 1: Patient completing the clinical intake questionnaire at patriotictelehealth.com]**
> **[Insert Screenshot 2: Electronic Informed Consent signature page]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---

### Step 2 — AI-Assisted Clinical Review

**Objective:** Verify the CDS (Clinical Decision Support) engine parses intake data and flags relevant clinical warnings.

**Actions:**
1. Log into the Provider EMR: `https://patriotic-virtual-emr.web.app/`
2. Open the chart/consult request for the test patient created in Step 1.
3. Locate the AI Clinical Review / CDS summary section.

**Expected Results:**
- The AI summary accurately reflects the patient's submitted intake data.
- Eligibility criteria are clearly displayed.
- Any simulated contraindications (e.g., allergies or BMI mismatches) are prominently flagged, indicating required provider follow-up.

> **[Insert Screenshot 3: Provider EMR dashboard highlighting the AI Clinical Review and contraindication flags]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---

### Step 3 — Provider Clinical Decision & Prescription Initiation

**Objective:** Verify that the provider can review the record and initiate a DoseSpot prescription directly from the EMR interface.

**Actions:**
1. In the Provider EMR (`https://patriotic-virtual-emr.web.app/`), navigate to the test patient's prescribing/medication module.
2. Review the patient demographics and clinical summary.
3. Open the DoseSpot integration frame/modal.
4. Search for a test medication (e.g., a non-controlled test drug).
5. Fill out the prescription details: strength, dosage form, quantity, days supply, refills, and DAW indicator.
6. Select a test pharmacy routing location (e.g., retail or mail-order).

**Expected Results:**
- DoseSpot frame loads successfully via SSO/API integration.
- Provider NPI/License is automatically attached.
- All prescription fields (drug, quantity, pharmacy) are selectable without errors.

> **[Insert Screenshot 4: Provider filling out the DoseSpot prescription details within the EMR portal]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---

### Step 4 — Prescription Transmission via DoseSpot

**Objective:** Validate that authorizing the prescription securely transmits data to DoseSpot and passes internal clinical rules.

**Actions:**
1. In the DoseSpot module, click "Approve" or "Send Prescription".
2. Observe any DoseSpot clinical alerts (e.g., Drug-Drug interactions, if purposely triggered).
3. Confirm and authorize the final transmission.

**Expected Results:**
- EMR initiates a secure REST API call to DoseSpot.
- DoseSpot runs interaction/allergy checks.
- Prescription is successfully queued for Surescripts network packaging.
*(Note: If testing EPCS for controlled substances, verify two-factor authentication prompts).*

> **[Insert Screenshot 5: DoseSpot authorization screen showing successful drug interaction checks/transmission]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---

### Step 5 — Surescripts Network Routing

**Objective:** Confirm that DoseSpot successfully formats and routes the NCPDP SCRIPT (NewRx) to the selected pharmacy via Surescripts.

**Actions:**
1. Navigate to the Prescription History or EMR audit logs for the patient.
2. Check the outbound network status for the recently transmitted Rx.

**Expected Results:**
- The prescription status updates to "Sent to Pharmacy" or "Transmitted".
- The EMR/DoseSpot logs reflect successful Surescripts NewRx routing to the designated retail or specialty pharmacy.

> **[Insert Screenshot 6: Prescription history showing 'Transmitted' status to the selected pharmacy]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---

### Step 6 — Pharmacy Dispensing & Fill Status Return

**Objective:** Validate that the EMR receives and surfaces dispensing loop-back notifications (RxFill) from the pharmacy.

**Actions:**
1. Trigger a mock RxFill response from the DoseSpot sandbox/test tools (simulating the pharmacy filling the medication).
2. Check the Provider Dashboard in the EMR (`https://patriotic-virtual-emr.web.app/`).

**Expected Results:**
- The Provider dashboard prominently displays an "RxFilled" or "Dispensed" notification for the patient.
- The patient's chart reflects the updated, active medication status.

> **[Insert Screenshot 7: Provider Dashboard or Notifications Center showing the returning RxFill status notification]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---

### Step 7 — Medication History Retrieval

**Objective:** Validate that patient medication history can be pulled from Surescripts/DoseSpot, enriching the record and logging the event.

**Actions:**
1. In the Provider EMR (`https://patriotic-virtual-emr.web.app/`), navigate to the test patient's Medication History section.
2. Ensure patient consent is toggled to 'Yes'.
3. Initiate a "Refresh" or "Sync Medication History" request.
4. Navigate to the EMR System Audit Logs (if accessible).

**Expected Results:**
- DoseSpot/Surescripts returns a list of previously prescribed/filled medications.
- Data successfully populates in the patient's EMR clinical record.
- The retrieval action is logged as a discrete audit event, tied to the requesting provider's credentials.

> **[Insert Screenshot 8: Populated patient medication history list pulled from Surescripts]**
> **[Insert Screenshot 9: Audit log showing the distinct medication history pull event]**

**Pass/Fail:** [ ] Pass  [ ] Fail
**Notes:** ________________________________________________

---
**End of Regression Test Script**
