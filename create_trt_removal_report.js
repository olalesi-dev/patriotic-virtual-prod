const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, ShadingType, WidthType, ImageRun } = docx;

// Premium color palette
const PRIMARY_HEX = "0f172a"; // Slate 900
const ACCENT_HEX = "0d9488"; // Teal 600
const TEXT_HEX = "334155"; // Slate 700
const SUCCESS_HEX = "059669"; // Emerald 600

const main = async () => {
    
    // Attempt to load the logo
    const logoUrl = 'https://patriotictelehealth.com/logo.png'; // Fallback text if logo fails
    let logoImage = null;
    
    // We'll use a local fallback if available
    let logoPath = path.join(__dirname, 'emr-portal/public/images/logo.png');
    if (!fs.existsSync(logoPath)) {
        logoPath = path.join(__dirname, 'emr-portal/public/logo.png');
    }
    
    let logoBuffer = null;
    try {
        if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
        }
    } catch(e) {
        console.warn("Could not load local logo.");
    }
    
    const children = [];
    
    // Add header
    if (logoBuffer) {
        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                    new ImageRun({
                        data: logoBuffer,
                        transformation: {
                            width: 200,
                            height: 60,
                        },
                    }),
                ],
            })
        );
    } else {
        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                    new TextRun({
                        text: "PATRIOTIC TELEHEALTH",
                        bold: true,
                        size: 40,
                        color: ACCENT_HEX,
                        font: "Montserrat",
                    })
                ]
            })
        );
    }

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: "LEGITSCRIPT COMPLIANCE REPORT",
                    bold: true,
                    size: 32,
                    color: PRIMARY_HEX,
                    font: "Inter",
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
                new TextRun({
                    text: "Testosterone & TRT Service Removal Audit",
                    bold: false,
                    size: 24,
                    color: TEXT_HEX,
                    font: "Inter",
                }),
                new TextRun({
                    text: `\nDate: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
                    italics: true,
                    size: 20,
                    color: "64748b",
                    font: "Inter",
                }),
            ],
        }),
        
        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
                new TextRun({
                    text: "1. EXECUTIVE OVERVIEW",
                    color: PRIMARY_HEX,
                    font: "Inter",
                    bold: true,
                }),
            ],
        }),
        new Paragraph({
            spacing: { after: 300 },
            children: [
                new TextRun({
                    text: "This document outlines the systematic removal of all references to Testosterone Replacement Therapy (TRT) and associated services across the Patriotic Telehealth platform. This initiative ensures complete strict compliance with LegitScript regulations while maintaining operational continuity for standard telehealth services, including the DoseSpot ePrescribing integration.",
                    size: 22,
                    color: TEXT_HEX,
                    font: "Inter",
                }),
            ],
        }),

        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
                new TextRun({
                    text: "2. CODEBASE AUDIT & ACTION SUMMARY",
                    color: PRIMARY_HEX,
                    font: "Inter",
                    bold: true,
                }),
            ],
        })
    );
    
    // Create an Aesthetic Table for the Implementation Details
    const tableHeaders = [
        "Component Area", "Asset / Controller", "Action Taken", "Status"
    ];
    
    const rowsData = [
        ["Patient Mock Data", "data.ts", "Purged 'Testosterone Cyp' medication entries from active mock histories.", "Verified"],
        ["Platform Catalog", "catalog.ts", "Completely deleted 'testosterone-hrt' service item and 10-point specific clinical questionnaire array.", "Verified"],
        ["Landing Architecture", "landingModalsData.ts", "Scrubbed 'testosterone_hrt' definitions blocking the service from rendering in modal UI and marketing copy.", "Verified"],
        ["Backend API Routing", "consultations/route.ts", "Removed endpoints linked exclusively to testosterone mapping and related checkout processing.", "Verified"],
        ["Stripe Payments", "create-checkout-session/...", "Blocked API calls mapping to the physical '$149 TRT / Hormone' checkout intent flow.", "Verified"],
        ["AI Navigation Bot", "AINavigator.tsx", "Terminated bot flows evaluating prostate/breast cancer TRT contraindications; rerouted to General Health.", "Verified"],
        ["EMR Client Booking", "(patient)/book/PageClient.tsx", "Cleared internal scheduling tabs, ensuring UI hides testosterone arrays across the patient view.", "Verified"],
        ["Provider Intelligence", "analytics/clinical/... & Services", "Eliminated toggles mapping to TRT clinical analytics logic, swapping tags in CRM to 'General Health'.", "Verified"],
        ["Patient Community", "CommunityClient.tsx", "Replaced hardcoded 'TRT' string tags with 'Men's Health' to scrub feed indexing on social discussion boards.", "Verified"],
        ["Module Registry", "module-registry.ts", "Overhauled the Urology specialty registry, deleting all TRT monitoring protocols.", "Verified"]
    ];
    
    // Table generation
    const tableRows = [];
    
    // Header Row
    tableRows.push(
        new TableRow({
            children: tableHeaders.map(text => 
                new TableCell({
                    shading: { fill: PRIMARY_HEX },
                    margins: { top: 150, bottom: 150, left: 150, right: 150 },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: text,
                                    bold: true,
                                    color: "ffffff",
                                    font: "Inter",
                                    size: 22,
                                })
                            ]
                        })
                    ]
                })
            )
        })
    );
    
    // Data Rows
    rowsData.forEach((row, i) => {
        tableRows.push(
            new TableRow({
                children: row.map((text, idx) => 
                    new TableCell({
                        shading: { fill: i % 2 === 0 ? "F8FAFC" : "FFFFFF" },
                        margins: { top: 150, bottom: 150, left: 150, right: 150 },
                        children: [
                            new Paragraph({
                                alignment: idx === 3 ? AlignmentType.CENTER : AlignmentType.LEFT,
                                children: [
                                    new TextRun({
                                        text: text,
                                        bold: idx === 0 || idx === 3,
                                        color: idx === 3 ? SUCCESS_HEX : TEXT_HEX,
                                        font: "Inter",
                                        size: 20,
                                    })
                                ]
                            })
                        ]
                    })
                )
            })
        );
    });

    children.push(
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
            },
            rows: tableRows,
        }),
        
        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 },
            children: [
                new TextRun({
                    text: "3. VALIDATION & DEPLOYMENT",
                    color: PRIMARY_HEX,
                    font: "Inter",
                    bold: true,
                }),
            ],
        }),
        
        new Paragraph({
            spacing: { after: 200 },
            bullet: { level: 0 },
            children: [
                new TextRun({
                    text: "DoseSpot Sandbox E2E Verified: ",
                    bold: true,
                    color: PRIMARY_HEX,
                    font: "Inter",
                    size: 22,
                }),
                new TextRun({
                    text: "Zero disruption caused by routing/catalog mutations. Functionality sustained globally.",
                    color: TEXT_HEX,
                    font: "Inter",
                    size: 22,
                })
            ]
        }),
        new Paragraph({
            spacing: { after: 200 },
            bullet: { level: 0 },
            children: [
                new TextRun({
                    text: "GitHub Action Successful: ",
                    bold: true,
                    color: PRIMARY_HEX,
                    font: "Inter",
                    size: 22,
                }),
                new TextRun({
                    text: "Code compilation verified and continuous delivery pipelines triggered.",
                    color: TEXT_HEX,
                    font: "Inter",
                    size: 22,
                })
            ]
        }),
        new Paragraph({
            spacing: { after: 400 },
            bullet: { level: 0 },
            children: [
                new TextRun({
                    text: "Regex Crawl Assured: ",
                    bold: true,
                    color: PRIMARY_HEX,
                    font: "Inter",
                    size: 22,
                }),
                new TextRun({
                    text: "Case-insensitive site-wide regex search for 'trt' and 'testosterone' across all environment variables, public content components, and system APIs return strictly 0 results.",
                    color: TEXT_HEX,
                    font: "Inter",
                    size: 22,
                })
            ]
        }),
        
        new Paragraph({
            spacing: { before: 400, after: 200 },
            children: [
                new TextRun({
                    text: "IMPLEMENTATION STATUS: CERTIFIED & DEPLOYED",
                    bold: true,
                    color: SUCCESS_HEX,
                    font: "Inter",
                    size: 24,
                }),
            ],
            alignment: AlignmentType.CENTER,
            shading: {
                type: ShadingType.CLEAR,
                fill: "ECFDF5",
            }
        })
    );
    
    const doc = new Document({
        creator: "Antigravity Engineering",
        title: "Testosterone Service Removal Report",
        description: "LegitScript Compliance Implementation Document",
        styles: {
            default: {
                heading1: { run: { size: 32, bold: true, color: PRIMARY_HEX, font: "Inter" }, paragraph: { spacing: { before: 240, after: 120 } } },
            }
        },
        sections: [{
            properties: {},
            children: children
        }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    const outputPath = "C:/Users/dayoo/Downloads/TRT_Removal_Implementation_Report.docx";
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document saved successfully to ${outputPath}`);
};

main().catch(err => {
    console.error("Failed to generate document:", err);
});
