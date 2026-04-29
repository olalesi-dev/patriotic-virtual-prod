"use client";

import React, { useState, useRef, useEffect } from "react";
import { Scan, ExternalLink, Info } from "lucide-react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const DICOM_TAGS: Record<string, string> = {
    "00080005": "SpecificCharacterSet",
    "00080020": "StudyDate",
    "00080030": "StudyTime",
    "00080050": "AccessionNumber",
    "00080061": "ModalitiesInStudy",
    "00080090": "ReferringPhysicianName",
    "00081190": "RetrieveURL",
    "00100010": "PatientName",
    "00100020": "PatientID",
    "00100030": "PatientBirthDate",
    "00100040": "PatientSex",
    "0020000D": "StudyInstanceUID",
    "00200010": "StudyID",
    "00201206": "NumberOfStudyRelatedSeries",
    "00201208": "NumberOfStudyRelatedInstances",
};

type Study = {
    studyUID: string;
    patientName?: string;
    patientId?: string;
    studyDate?: string;
    studyTime?: string;
    modality?: string;
    accession?: string;
    sex?: string;
    studyURL?: string;
};

export default function PacsPage() {
    const pacsUrl = "https://pacs.patriotictelehealth.com/";

    // Speech State
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [canDownload, setCanDownload] = useState(false);
    const [partialText, setPartialText] = useState("");
    const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
    const [studies, setStudies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudy, setSelectedStudy] = useState<any>(null);
    const [studyDetails, setStudyDetails] = useState<any>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showDictation, setShowDictation] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingStudy, setPendingStudy] = useState<Study | null>(null);
    // Azure Config
    const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
    const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

    // Start Recording
    const startRecording = async () => {
        if (!speechKey || !speechRegion) {
            console.error("Missing Azure Speech Config");
            return;
        }

        try {
            // RESUME (no new mic request)
            if (recognizerRef.current) {
                recognizerRef.current.startContinuousRecognitionAsync(
                    () => {
                        setIsRecording(true);
                        setCanDownload(false);
                    },
                    (err) => {
                        console.error("Resume failed:", err);
                    }
                );
                return;
            }

            // FIRST TIME: get mic stream (REAL FIX)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                speechKey,
                speechRegion
            );

            speechConfig.speechRecognitionLanguage = "en-US";

            // Faster response (live captions feel)
            speechConfig.setProperty(
                SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs,
                "700"
            );

            // IMPORTANT: use stream (not default mic)
            const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(stream);

            const recognizer = new SpeechSDK.SpeechRecognizer(
                speechConfig,
                audioConfig
            );

            recognizerRef.current = recognizer;

            // LIVE TEXT (fast)
            recognizer.recognizing = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                    setPartialText(e.result.text);
                }
            };

            // FINAL TEXT
            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    setTranscript(prev => prev + " " + e.result.text);
                    setPartialText("");
                }
            };

            recognizer.canceled = (s, e) => {
                console.error("Canceled:", e.reason, e.errorDetails);
            };

            recognizer.sessionStarted = () => {
                console.log("Session Started");
            };

            recognizer.sessionStopped = () => {
                console.log("Session Stopped");
            };

            recognizer.startContinuousRecognitionAsync(
                () => {
                    setIsRecording(true);
                },
                (err) => {
                    console.error("Start failed:", err);
                }
            );

        } catch (err: any) {
            toast.error("Microphone error: Requested device not found");
            console.error("Microphone error:", err);
        }
    };

    // Stop Recording
    const stopRecording = () => {
        if (!recognizerRef.current) return;

        recognizerRef.current.stopContinuousRecognitionAsync(
            () => {
                setIsRecording(false);
                setCanDownload(true);
                setPartialText("");
            },
            (err) => {
                console.error("Stop failed:", err);
            }
        );
    };

    // Download PDF
    const downloadPDF = () => {
        const doc = new jsPDF();

        if (!selectedStudy) {
            toast.error("Please select a study first");
            return;
        }

        // Handle array OR object
        const patient = Array.isArray(selectedStudy)
            ? selectedStudy[0]
            : selectedStudy;

        let y = 10;

        const drawBox = (yStart: number, height: number) => {
            doc.setDrawColor(200);
            doc.setFillColor(245, 245, 245);
            doc.rect(10, yStart, 190, height, "F");
        };

        const label = (text: string, x: number, yPos: number) => {
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text(text, x, yPos);
        };

        const value = (text: string, x: number, yPos: number) => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(String(text), x, yPos);
            doc.setFont("helvetica", "normal");
        };

        const sectionTitle = (title: string) => {
            y += 10;
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont("helvetica", "bold");
            doc.text(title.toUpperCase(), 10, y);

            y += 2;
            doc.setDrawColor(200);
            doc.line(10, y, 200, y);
            y += 6;

            doc.setFont("helvetica", "normal");
        };

        const paragraph = (text: string) => {
            doc.setFontSize(10);
            const split = doc.splitTextToSize(text || "", 180);
            doc.text(split, 10, y);
            y += split.length * 6;
        };

        // ================= HEADER =================
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("PATRIOTIC VIRTUAL TELEHEALTH — RADIOLOGY", 10, y);
        y += 6;

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("Radiology Report", 10, y);

        // FINALIZED badge
        doc.setFillColor(220, 255, 220);
        doc.rect(150, y - 5, 50, 8, "F");
        doc.setFontSize(8);
        doc.setTextColor(0, 120, 0);
        doc.text("FINALIZED", 155, y);

        doc.setFont("helvetica", "normal");
        y += 2;

        // ================= PATIENT BOX =================
        drawBox(y, 35);

        // Row 1
        label("PATIENT", 12, y + 6);
        value(patient.patientName || "Unknown", 12, y + 11);

        label("DOB / SEX", 70, y + 6);
        value(
            `${formatDate(patient.studyDate)} · ${patient.sex || "N/A"}`,
            70,
            y + 11
        );

        label("MRN", 130, y + 6);
        value(patient.patientId || "N/A", 130, y + 11);

        // Row 2
        label("ACCESSION #", 12, y + 20);
        value(patient.accession || "N/A", 12, y + 25);

        label("EXAM DATE", 70, y + 20);
        value(
            `${formatDate(patient.studyDate)} ${formatTime(patient.studyTime)}`,
            70,
            y + 25
        );

        label("MODALITY", 130, y + 20);
        value(patient.modality || "N/A", 130, y + 25);

        y += 40;

        // ================= CLINICAL INDICATION =================
        sectionTitle("Clinical Indication");
        paragraph("Persistent cough, hemoptysis");

        // ================= TECHNIQUE =================
        sectionTitle("Technique");
        paragraph(
            "Axial imaging performed using standard protocol. Multiplanar reformatted images were reviewed."
        );

        // ================= COMPARISON =================
        sectionTitle("Comparison");
        paragraph("No prior studies available for comparison.");

        // ================= FINDINGS =================
        sectionTitle("Findings");
        const findingsText = transcript || "No findings dictated";
        paragraph(findingsText);

        // ================= IMPRESSION =================
        sectionTitle("Impression");

        doc.setFillColor(230, 240, 255);
        doc.rect(10, y, 190, 20, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(
            doc.splitTextToSize(
                "Auto-generated impression will appear here based on findings.",
                180
            ),
            12,
            y + 6
        );

        doc.setFont("helvetica", "normal");
        y += 25;

        // ================= PACS REFERENCE =================
        sectionTitle("PACS Reference");
        paragraph(
            `Study UID: ${patient.studyUID || "N/A"}\nViewer: ${patient.studyURL || "N/A"
            }`
        );

        // ================= FOOTER =================
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Dictated via AI Speech-to-Text", 10, y);
        y += 5;
        doc.text(`Generated: ${new Date().toLocaleString()}`, 10, y);

        // SAVE
        doc.save("radiology-report.pdf");

        // RESET
        recognizerRef.current?.stopContinuousRecognitionAsync(() => {
            recognizerRef.current?.close();
            recognizerRef.current = null;

            setTranscript("");
            setPartialText("");
            setIsRecording(false);
            setCanDownload(false);
        });
    };

    const getValue = (obj: any, tag: string) => {
        return obj?.[tag]?.Value?.[0] ?? null;
    };

    const getName = (obj: any) => {
        return obj?.["00100010"]?.Value?.[0]?.Alphabetic ?? "Unknown";
    };

    const formatDate = (d?: string) => {
        if (!d) return "N/A";
        return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
    };

    const formatTime = (t?: string) => {
        if (!t) return "";
        return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
    };

    const pacsserver = async () => {
        try {
            setLoading(true);

            const res = await fetch("/api/pacs");
            const data = await res.json();

            if (!data.raw) {
                throw new Error("No raw data from API");
            }

            // PARSE STRING → ARRAY
            const parsed = JSON.parse(data.raw);

            // ENSURE ARRAY
            if (!Array.isArray(parsed)) {
                throw new Error("Parsed data is not an array");
            }

            // TRANSFORM
            const formatted = parsed.map((item: any) => ({
                studyUID: getValue(item, "0020000D"),
                patientName: getName(item),
                patientId: getValue(item, "00100020") || "N/A",
                studyDate: getValue(item, "00080020"),
                studyTime: getValue(item, "00080030"),
                modality: getValue(item, "00080061") || getValue(item, "00080060"),
                accession: getValue(item, "00080050") || "N/A",
                sex: getValue(item, "00100040") || "N/A",
                studyURL: getValue(item, "00081190"),
            }));

            setStudies(formatted);
            setSelectedStudy(formatted[0]);

        } catch (error) {
            console.error("Error:", error);
            setStudies([]);
            setSelectedStudy(null);
        } finally {
            setLoading(false);
        }
    };

    const getTagRows = (data: any) => {
        if (!data || !data[0]) return [];

        const obj = data[0];

        return Object.keys(DICOM_TAGS).map(tag => ({
            tag,
            description: DICOM_TAGS[tag],
            value:
                obj[tag]?.Value?.[0]?.Alphabetic ||
                obj[tag]?.Value?.[0] ||
                "N/A"
        }));
    };

    const fetchStudyDetails = async (studyUID: string) => {
        try {
            const res = await fetch(`/api/pacs/${studyUID}`);
            const data = await res.json();

            const parsed = JSON.parse(data.raw);

            setStudyDetails(parsed);
            setShowDetails(true);

        } catch (err) {
            console.error("Error fetching details:", err);
        }
    };

    useEffect(() => {
        pacsserver();
    }, []);

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden font-sans">

            {/* HEADER */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Scan className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            PACS Viewer
                        </h2>
                        <p className="text-xs text-slate-500">
                            Picture Archiving and Communication System
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Secure Connection
                    </div>
                    <a
                        href={pacsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in New Tab
                    </a>
                </div>
            </div>

            {/* CONTROLS */}
            {/* <div className="p-4 flex gap-3 border-b">
                <button
                    onClick={startRecording}
                    className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${isRecording
                        ? "bg-green-600 animate-pulse"
                        : "bg-green-600"
                        }`}
                >
                    {isRecording ? "Recording..." : transcript ? "Resume" : "Start"}
                </button>

                <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                    Stop
                </button>

                <button
                    onClick={downloadPDF}
                    disabled={!canDownload}
                    className={`px-4 py-2 text-white rounded-lg ${canDownload ? "bg-indigo-600" : "bg-gray-400 cursor-not-allowed"
                        }`}
                >
                    Download PDF
                </button>
            </div> */}

            {/* TRANSCRIPT */}
            {/* <div className="p-4 bg-white text-black text-sm h-32 overflow-auto border-b">
                {transcript || partialText
                    ? `${transcript} ${partialText}`
                    : "Start dictation to generate report..."}
            </div> */}

            {/* <button
                onClick={pacsserver}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
                Test PACS API
            </button> */}

            {/* <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
                Test Report PDF
            </button> */}

            <div className="p-6 bg-slate-50 dark:bg-slate-900/40">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
                            Study Management
                        </h3>
                        <p className="text-xs text-slate-500">
                            View, analyze and generate reports from PACS studies
                        </p>
                    </div>

                    <div className="text-xs text-slate-500">
                        Total: <span className="font-semibold">{studies.length}</span>
                    </div>
                </div>

                {/* LOADING / EMPTY */}
                {loading && (
                    <div className="p-6 text-center text-sm text-slate-500">
                        Fetching studies from PACS...
                    </div>
                )}

                {!loading && (!Array.isArray(studies) || studies.length === 0) && (
                    <div className="p-6 text-center text-sm text-slate-400 border rounded-lg bg-white dark:bg-slate-800">
                        No studies available
                    </div>
                )}

                {/* TABLE */}
                {Array.isArray(studies) && studies.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">

                        {/* TABLE HEADER */}
                        <div className="grid grid-cols-6 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b dark:border-slate-700">
                            <div>Patient</div>
                            <div>ID</div>
                            <div>Accession</div>
                            <div>Date</div>
                            <div>Modality</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {/* ROWS */}
                        {studies.map((study, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-6 items-center px-4 py-3 text-sm border-b last:border-none hover:bg-indigo-50 dark:hover:bg-slate-700/40 transition"
                            >
                                {/* Patient */}
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        {study.patientName || "Unknown"}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {study.sex || "N/A"}
                                    </div>
                                </div>

                                {/* ID */}
                                <div className="text-slate-600 dark:text-slate-300">
                                    {study.patientId}
                                </div>

                                {/* Accession */}
                                <div className="text-slate-600 dark:text-slate-300">
                                    {study.accession || "-"}
                                </div>

                                {/* Date */}
                                <div className="text-slate-600 dark:text-slate-300">
                                    {formatDate(study.studyDate)}
                                </div>

                                {/* Modality */}
                                <div>
                                    <span className="px-2 py-1 text-xs font-semibold rounded-md bg-indigo-100 text-indigo-700">
                                        {study.modality || "N/A"}
                                    </span>
                                </div>

                                {/* ACTIONS */}
                                <div className="flex justify-end gap-2">

                                    {/* VIEW */}
                                    <button
                                        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-800 text-white rounded-md"
                                        onClick={() => {
                                            setPendingStudy(study);
                                            setShowConfirm(true);
                                        }}
                                    >
                                        View & Dictate
                                    </button>

                                    {/* DETAILS */}
                                    <button
                                        className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                                        onClick={() => fetchStudyDetails(study.studyUID)}                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* PACS IFRAME */}
            <div className="flex-1 bg-slate-900 relative group">
                <iframe
                    src={pacsUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    title="PACS Viewer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 text-white px-4 py-2 rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Info className="w-3 h-3 text-indigo-400" />
                    PACS Viewer
                </div>
            </div>

            {/* Pacs Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

                    {/* MODAL CONTAINER */}
                    <div className="w-full max-w-4xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">

                        {/* HEADER */}
                        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                    Study Details
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Detailed metadata of the selected study
                                </p>
                            </div>

                            <button
                                onClick={() => setShowDetails(false)}
                                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 
                     hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>

                        {/* TABLE CONTAINER */}
                        <div className="max-h-[70vh] overflow-auto">

                            <table className="w-full text-sm border-collapse">

                                {/* TABLE HEAD */}
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                                    <tr className="text-slate-600 dark:text-slate-300">
                                        <th className="text-left px-6 py-3 font-medium">Tag</th>
                                        <th className="text-left px-6 py-3 font-medium">Description</th>
                                        <th className="text-left px-6 py-3 font-medium">Value</th>
                                    </tr>
                                </thead>

                                {/* TABLE BODY */}
                                <tbody>
                                    {getTagRows(studyDetails).map((row, index) => (
                                        <tr
                                            key={index}
                                            className="border-t dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        >
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">
                                                {row.tag}
                                            </td>

                                            <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                                {row.description}
                                            </td>

                                            <td className="px-6 py-3 text-slate-800 dark:text-slate-200 break-all">
                                                {row.value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>

                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">

                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                            Start Dictation?
                        </h2>

                        <p className="text-sm text-slate-500 mb-4">
                            This will open the PACS viewer in the new tab and begin voice recording.
                        </p>

                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs p-3 rounded-lg mb-6">
                            Ensure your microphone is enabled before proceeding.
                        </div>

                        <div className="flex justify-end gap-3">

                            {/* CANCEL */}
                            <button
                                onClick={() => {
                                    stopRecording();
                                    setShowConfirm(false);
                                    setPendingStudy(null);
                                }}
                                className="px-4 py-2 text-sm rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>

                            {/* CONFIRM */}
                            <button
                                onClick={() => {
                                    if (!pendingStudy) return;

                                    const viewerUrl = `${pacsUrl}?StudyInstanceUIDs=${pendingStudy.studyUID}`;

                                    setShowConfirm(false);
                                    setShowDictation(true);

                                    startRecording();
                                    window.open(viewerUrl, "_blank");
                                }}
                                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Yes, Start
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dictation Modal */}
            {showDictation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

                    {/* MODAL */}
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">

                        {/* HEADER */}
                        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                    Dictation Console
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Voice-enabled reporting system
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    stopRecording();
                                    setShowDictation(false)
                                }}
                                className="text-sm px-3 py-1 rounded-md border hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>

                        {/* STATUS */}
                        <div className="px-6 pt-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full
                    ${isRecording ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
                                {isRecording ? "Recording Active" : "Idle"}
                            </div>
                        </div>

                        {/* TEXTAREA */}
                        <div className="p-6">
                            <textarea
                                value={`${transcript} ${partialText}`}
                                readOnly
                                placeholder="Start dictation to generate report..."
                                className="w-full h-48 p-4 text-sm border rounded-xl bg-slate-50 dark:bg-slate-800 
                    text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                            />
                        </div>

                        {/* CONTROLS */}
                        <div className="flex items-center justify-between px-6 pb-6">

                            <div className="flex gap-3">
                                <button
                                    onClick={startRecording}
                                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2
                        ${isRecording ? "bg-green-600 animate-pulse" : "bg-green-600 hover:bg-green-700"}`}
                                >
                                    {isRecording ? "Recording..." : transcript ? "Resume" : "Start"}
                                </button>

                                <button
                                    onClick={stopRecording}
                                    disabled={!isRecording}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:bg-gray-400"
                                >
                                    Stop
                                </button>
                            </div>

                            <button
                                onClick={downloadPDF}
                                disabled={!canDownload}
                                className={`px-4 py-2 text-sm rounded-lg font-medium text-white
                    ${canDownload ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"}`}
                            >
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}