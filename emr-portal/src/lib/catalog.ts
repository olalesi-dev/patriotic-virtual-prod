export interface Service {
    id: string;
    k: string;
    name: string;
    desc: string;
    icon: string;
    ic: string;
    c: string;
    price: number;
    priceSuffix?: string;
    cat: string[];
    stripe: string;
    priceId: string;
}

export interface IntakeQuestion {
    k: string;
    l: string;
    t: 'i' | 'yn';
    p?: string;
}

export const svcs: Service[] = [
    { id: 'imaging-video', k: 'imaging_video', name: 'Imaging + Video Consult', desc: 'Full imaging review plus a 30 - 60 minute secure video consultation to discuss findings directly with a specialist.', icon: '📹', ic: 'rose', c: 'rose', price: 449, cat: ['popular', 'radiology'], stripe: 'prod_TmuBq5Pwvt1rBc', priceId: 'PRICE_ID_VIDEO_CONSULT' },
    { id: 'membership-elite', k: 'membership_elite', name: 'All Access — Elite', desc: 'Everything: telehealth visits, specialty programs, AI health tools, AI imaging, and priority scheduling.', icon: '🏆', ic: 'amber', c: 'amber', price: 199, priceSuffix: '/mo', cat: ['popular', 'membership'], stripe: 'prod_TsnS735VNACb3g', priceId: 'PRICE_ID_ELITE' },
    { id: 'digital-platform', k: 'digital_platform', name: 'Digital Health Platform', desc: 'Monthly access to digital health tools, educational content & AI-powered navigation features. No clinical services.', icon: '📱', ic: 'violet', c: 'violet', price: 19, priceSuffix: '/mo', cat: ['ai', 'membership'], stripe: 'prod_TsnTYEU145UpKl', priceId: 'PRICE_ID_DIGITAL' },
    { id: 'weight-loss', k: 'weight_loss', name: 'GLP-1 & Weight Loss', desc: 'Comprehensive medical weight loss evaluation. GLP-1 eligibility screening, personalized titration, dietary guidance. Medication cost separate.', icon: '💊', ic: 'blue', c: 'blue', price: 129, cat: ['popular', 'clinical'], stripe: 'prod_TsnZ1goCbeavNz', priceId: 'PRICE_ID_WEIGHT_LOSS' },
    { id: 'erectile-dysfunction', k: 'erectile_dysfunction', name: 'Erectile Dysfunction', desc: 'Sildenafil, tadalafil & custom compounds — discreetly delivered after cardiovascular safety screening.', icon: '⚡', ic: 'blue', c: 'blue', price: 79, cat: ['mens', 'clinical'], stripe: 'prod_TupASTZvm9MPDJ', priceId: 'PRICE_ID_ED' },
    { id: 'premature-ejaculation', k: 'premature_ejaculation', name: 'Premature Ejaculation', desc: 'Sertraline (SSRI therapy), topical numbing agents & behavioral techniques. Evidence-based, shipped discreetly.', icon: '⏱️', ic: 'violet', c: 'violet', price: 79, cat: ['mens', 'clinical'], stripe: 'prod_TupBXVZaCU7fWJ', priceId: 'PRICE_ID_PE' },
    { id: 'testosterone-hrt', k: 'testosterone_hrt', name: 'Testosterone / HRT', desc: 'Comprehensive hormone evaluation for men & women — testosterone, estrogen, progesterone, DHEA, thyroid support & peptides.', icon: '🧬', ic: 'emerald', c: 'emerald', price: 149, cat: ['mens', 'clinical'], stripe: 'prod_TsnbTXR2n8ni2R', priceId: 'PRICE_ID_HRT' },
    { id: 'ai-imaging', k: 'ai_imaging', name: 'AI-Powered Imaging Analysis', desc: 'Physician-supervised AI interpretation of reports. Educational tools to help you understand findings.', icon: '🔬', ic: 'blue', c: 'blue', price: 99, cat: ['ai', 'radiology'], stripe: 'prod_TsnPLrOTNMh7xM', priceId: 'PRICE_ID_AI_IMAGING' },
    { id: 'report-interpretation', k: 'report_interpretation', name: 'Report Interpretation', desc: 'Expert analysis of your existing radiology report. We translate complex medical jargon into plain English.', icon: '📄', ic: 'indigo', c: 'indigo', price: 149, cat: ['radiology'], stripe: 'prod_Tmu7Z6g8kmwvMd', priceId: 'PRICE_ID_REPORT_INT' },
    { id: 'standard-imaging', k: 'standard_imaging', name: 'Standard Imaging Review', desc: 'Complete second-opinion over-read of your X-Ray, Ultrasound, CT, or MRI images by a board-certified radiologist.', icon: '🖥️', ic: 'violet', c: 'violet', price: 249, cat: ['radiology'], stripe: 'prod_Tmu9kplu78Fs2m', priceId: 'PRICE_ID_STD_REVIEW' },
    { id: 'diagnostic-single', k: 'diagnostic_single', name: 'Single Study Read', desc: 'Official diagnostic report for a single study (CT, XR, US). <24-48h turnaround.', icon: '🖼️', ic: 'blue', c: 'blue', price: 75, priceSuffix: '/read', cat: ['radiology', 'diagnostic'], stripe: '', priceId: '' },
    { id: 'diagnostic-second', k: 'diagnostic_second', name: 'Diagnostic Second Opinion', desc: 'Full diagnostic review + written opinion + patient summary for CT, XR, or US.', icon: '📊', ic: 'indigo', c: 'indigo', price: 250, priceSuffix: '/consult', cat: ['radiology', 'diagnostic'], stripe: '', priceId: '' },
    { id: 'diagnostic-facility', k: 'diagnostic_facility', name: 'Facility Contracts', desc: 'Urgent Care & Outpatient contracts. Unlimited reads, SLA, dedicated upload link.', icon: '🏢', ic: 'navy', c: 'navy', price: 3500, priceSuffix: '/mo+', cat: ['radiology', 'diagnostic'], stripe: '', priceId: '' },
    { id: 'ai-assistant', k: 'ai_assistant', name: 'AI Health Assistant', desc: 'AI-powered health education, symptom guidance & care navigation. Not a substitute for professional medical advice.', icon: '🤖', ic: 'emerald', c: 'emerald', price: 29, cat: ['ai'], stripe: 'prod_TsnOx9T2J8z8Bz', priceId: 'PRICE_ID_AI_ASSISTANT' },
    { id: 'general-visit', k: 'general_visit', name: 'General Visit', desc: 'Virtual visits for non-emergent health concerns — medication management, wellness checks, health advice. Convenient care from home.', icon: '🩺', ic: 'teal', c: 'teal', price: 79, cat: ['clinical'], stripe: 'prod_Tsna4xzySPbKT0', priceId: 'PRICE_ID_GENERAL_VISIT' },
    { id: 'membership-plus', k: 'membership_plus', name: 'All Access — Plus', desc: 'Telehealth visits, AI health assistant, AI imaging tools, and priority scheduling in one subscription.', icon: '⭐', ic: 'blue', c: 'blue', price: 149, priceSuffix: '/mo', cat: ['membership'], stripe: 'prod_TsnRLsuI61fxnt', priceId: 'PRICE_ID_PLUS' },
    { id: 'membership-core', k: 'membership_core', name: 'All Access — Core', desc: 'General telehealth, AI health assistant, AI imaging tools & scheduling. Great starter membership.', icon: '🎯', ic: 'teal', c: 'teal', price: 99, priceSuffix: '/mo', cat: ['membership'], stripe: 'prod_TsnR5LpCR65XOv', priceId: 'PRICE_ID_CORE' },
    { id: 'telehealth-premium', k: 'telehealth_premium', name: 'Telehealth Premium', desc: 'Unlimited/priority access to general telehealth for non-emergency concerns, clinician visits & digital support.', icon: '⚕️', ic: 'emerald', c: 'emerald', price: 99, priceSuffix: '/mo', cat: ['membership'], stripe: 'prod_TsnNYdVBqlNpxO', priceId: 'PRICE_ID_TH_PREMIUM' },
    { id: 'telehealth-standard', k: 'telehealth_standard', name: 'Telehealth Standard', desc: '1 visit/month to general telehealth for non-emergency medical concerns, plus clinician visits & digital support.', icon: '📋', ic: 'blue', c: 'blue', price: 59, priceSuffix: '/mo', cat: ['membership'], stripe: 'prod_TsnM0Eu3XY9ckD', priceId: 'PRICE_ID_TH_STANDARD' },
    { id: 'telehealth-basic', k: 'telehealth_basic', name: 'Telehealth Basic', desc: 'AI + limited visits for general telehealth. Digital support & care navigation for non-emergency concerns.', icon: '💡', ic: 'violet', c: 'violet', price: 29, priceSuffix: '/mo', cat: ['membership'], stripe: 'prod_TsnLdFSY23zwtS', priceId: 'PRICE_ID_TH_BASIC' },
];

export const iQs: Record<string, IntakeQuestion[]> = {
    general_visit: [
        { k: 'chiefComplaint', l: 'What brings you in today?', t: 'i', p: 'Describe your concerns' },
        { k: 'symptomDuration', l: 'How long have you had these concerns?', t: 'i', p: 'e.g. 3 days, 2 weeks' },
        { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' },
        { k: 'allergies', l: 'Drug allergies?', t: 'i', p: 'List allergies or "None"' }
    ],
    weight_loss: [
        { k: 'currentWeight', l: 'Current weight (lbs)?', t: 'i', p: 'e.g. 210' },
        { k: 'height', l: 'Height (inches)?', t: 'i', p: 'e.g. 68' },
        { k: 'previousWeightLoss', l: 'Prior weight loss attempts?', t: 'i', p: 'Describe past efforts' },
        { k: 'hasMedullaryThyroidCancer', l: 'History of medullary thyroid carcinoma?', t: 'yn' },
        { k: 'hasMEN2', l: 'History of MEN2 syndrome?', t: 'yn' },
        { k: 'hasPancreatitis', l: 'History of pancreatitis?', t: 'yn' },
        { k: 'isPregnant', l: 'Pregnant or planning pregnancy?', t: 'yn' }
    ],
    erectile_dysfunction: [
        { k: 'symptomDuration', l: 'How long have you experienced ED?', t: 'i', p: 'e.g. 6 months' },
        { k: 'takesNitrates', l: 'Take nitrate medications (nitroglycerin, isosorbide)?', t: 'yn' },
        { k: 'recentStroke', l: 'Stroke in past 6 months?', t: 'yn' },
        { k: 'recentMI', l: 'Heart attack in past 6 months?', t: 'yn' },
        { k: 'hasCardiovascularDisease', l: 'Cardiovascular disease?', t: 'yn' },
        { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }
    ],
    premature_ejaculation: [
        { k: 'symptomDuration', l: 'How long have you experienced PE?', t: 'i', p: 'e.g. 1 year' },
        { k: 'hasSeizureDisorder', l: 'Seizure disorder?', t: 'yn' },
        { k: 'onMAOIs', l: 'Take MAOI medications?', t: 'yn' },
        { k: 'hasBipolar', l: 'Bipolar disorder?', t: 'yn' },
        { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }
    ],
    testosterone_hrt: [
        { k: 'symptoms', l: 'What symptoms are you experiencing?', t: 'i', p: 'Fatigue, low libido, weight gain, hot flashes, brain fog...' },
        { k: 'gender', l: 'Biological sex?', t: 'i', p: 'Male or Female' },
        { k: 'hasRecentLabs', l: 'Had hormone labs in the last 6 months?', t: 'yn' },
        { k: 'hasProstateCancer', l: 'History of prostate cancer? (Men)', t: 'yn' },
        { k: 'hasBreastCancer', l: 'History of breast cancer?', t: 'yn' },
        { k: 'hasBloodClottingDisorder', l: 'Blood clotting disorder or history of DVT/PE?', t: 'yn' },
        { k: 'hasLiverDisease', l: 'Liver disease?', t: 'yn' },
        { k: 'isPregnant', l: 'Pregnant or nursing? (Women)', t: 'yn' },
        { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' }
    ],
    membership_elite: [
        { k: 'primaryGoal', l: 'What is your primary health goal?', t: 'i', p: 'e.g. Weight loss, hormone balance, general wellness' },
        { k: 'symptomDuration', l: 'Any specific symptoms currently?', t: 'i', p: 'Describe any issues' },
        { k: 'medicalHistory', l: 'Any chronic medical conditions?', t: 'i', p: 'List conditions' },
        { k: 'currentMedications', l: 'Current medications?', t: 'i', p: 'List all medications' },
        { k: 'allergies', l: 'Drug allergies?', t: 'i', p: 'List allergies or "None"' }
    ],
    imaging_video: [
        { k: 'imagingType', l: 'What type of imaging (MRI, CT, X-Ray)?', t: 'i', p: 'e.g. MRI of Knee' },
        { k: 'imagingDate', l: 'Date of exam?', t: 'i', p: 'Approximate date' },
        { k: 'reasonForConsult', l: 'Primary reason for consultation?', t: 'i', p: 'What would you like the doctor to review?' }
    ],
    digital_platform: [
        { k: 'goals', l: 'Primary health goals?', t: 'i', p: 'Education, tracking, navigation details' },
        { k: 'accessDevice', l: 'Do you have a smartphone or computer?', t: 'yn' }
    ],
    ai_imaging: [
        { k: 'examType', l: 'Type of imaging exam?', t: 'i', p: 'e.g. Brain MRI, Chest CT' },
        { k: 'hasDigitalFiles', l: 'Do you have the digital image files (DICOM)?', t: 'yn' }
    ],
    report_interpretation: [
        { k: 'reportSummary', l: 'Briefly describe the report findings:', t: 'i', p: 'What did the report say?' },
        { k: 'mainQuestion', l: 'What is your main question about the report?', t: 'i' }
    ],
    standard_imaging: [
        { k: 'bodyPart', l: 'Body part imaged?', t: 'i', p: 'e.g. Left Knee' },
        { k: 'symptoms', l: 'Current symptoms?', t: 'i', p: 'Pain, swelling, etc.' },
        { k: 'reasonForReview', l: 'Reason for second opinion?', t: 'i' }
    ],
    diagnostic_single: [
        { k: 'modality', l: 'Modality (XR, US, CT)?', t: 'i' },
        { k: 'bodyPart', l: 'Body part?', t: 'i' },
        { k: 'indication', l: 'Reason for exam (Clinical Indication)?', t: 'i' }
    ],
    diagnostic_second: [
        { k: 'originalFinding', l: 'Original diagnosis/finding?', t: 'i' },
        { k: 'discrepancyConcern', l: 'Do you suspect a misdiagnosis?', t: 'yn' },
        { k: 'specificQuestion', l: 'Specific question for radiologist?', t: 'i' }
    ],
    diagnostic_facility: [
        { k: 'facilityName', l: 'Facility Name?', t: 'i' },
        { k: 'monthlyVolume', l: 'Estimated monthly volume?', t: 'i' },
        { k: 'modalities', l: 'Modalities needed?', t: 'i', p: 'XR, US, CT, MRI' },
        { k: 'contactName', l: 'Contact Person?', t: 'i' }
    ],
    ai_assistant: [
        { k: 'healthFocus', l: 'Primary area of health interest?', t: 'i', p: 'e.g. Heart health, Lab interpretation' },
        { k: 'techComfort', l: 'Comfort with technology?', t: 'i', p: 'High, Medium, Low' }
    ],
    membership_plus: [
        { k: 'healthGoals', l: 'What are your health goals?', t: 'i' },
        { k: 'chronicConditions', l: 'Do you manage any chronic conditions?', t: 'i', p: 'Diabetes, Hypertension, etc.' },
        { k: 'currentMeds', l: 'Current medications?', t: 'i' }
    ],
    membership_core: [
        { k: 'healthGoals', l: 'What are your health goals?', t: 'i' },
        { k: 'primaryCareNeeds', l: 'Looking for primary care support?', t: 'yn' }
    ],
    telehealth_premium: [
        { k: 'chiefComplaint', l: 'Reason for visit?', t: 'i' },
        { k: 'symptomDuration', l: 'Duration of symptoms?', t: 'i' },
        { k: 'medications', l: 'Current medications?', t: 'i' },
        { k: 'allergies', l: 'Allergies?', t: 'i' }
    ],
    telehealth_standard: [
        { k: 'chiefComplaint', l: 'Reason for visit?', t: 'i' },
        { k: 'symptomDuration', l: 'Duration of symptoms?', t: 'i' }
    ],
    telehealth_basic: [
        { k: 'chiefComplaint', l: 'Reason for visit?', t: 'i' },
        { k: 'symptomDuration', l: 'Duration of symptoms?', t: 'i' }
    ]
};
