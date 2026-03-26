const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, ShadingType, WidthType, ImageRun } = docx;

// Premium color palette for brand integration
const PRIMARY_HEX = "0f172a"; // Slate 900
const ACCENT_HEX = "2563eb"; // Blue 600
const TEXT_HEX = "334155"; // Slate 700
const SUCCESS_HEX = "059669"; // Emerald 600

const main = async () => {
    
    // Attempt to load the logo
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
    
    // Custom Header featuring Brand Logo or Text
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
                    text: "UI/UX OPTIMIZATION REPORT",
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
                    text: "Landing Page & Service Intake Enhancements",
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
                    text: "Over the course of the most recent sprints, extensive updates were deployed targeting the primary user-facing landing page configuration for Patriotic Telehealth. The objective was to eliminate UX friction within the service selection modal and dramatically clarify the patient pipeline by isolating relevant clickstreams directly to respective service lines.",
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
                    text: "2. IMPLEMENTATION SUMMARY",
                    color: PRIMARY_HEX,
                    font: "Inter",
                    bold: true,
                }),
            ],
        })
    );
    
    const tableHeaders = [
        "Optimization Vector", "File Target", "Action Taken", "Status"
    ];
    
    const rowsData = [
        ["Service Constriction", "landingModalsData.ts", "Refactored the core public-facing 'svcs' array, purging all non-essential and redundant legacy services. Reduced list to 11 precise offerings securely mapped to valid Stripe checkouts.", "Verified"],
        ["Context Isolation logic", "LandingModals.tsx", "Reengineered the modal rendering script. It now dynamically reads the 'initialService' prop passed from click events and restricts the intake screen to singularly present the selected service intent.", "Verified"],
        ["Fallback Discovery", "LandingModals.tsx", "Ensured global 'Start a Visit' triggers (where 'initialService' is null) gracefully degrade to displaying all 11 standardized clinical lines for manual selection.", "Verified"],
        ["Github CI/CD", "Production Environment", "All changes synced smoothly to 'main' ensuring next-build compiled TS typings strictly adhered to the newly mapped configurations via zero-downtime deployment.", "Verified"]
    ];
    
    const tableRows = [];
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
                    text: "3. DEPLOYMENT & QA METRICS",
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
                    text: "Conversion Pipeline Streamlined: ",
                    bold: true,
                    color: PRIMARY_HEX,
                    font: "Inter",
                    size: 22,
                }),
                new TextRun({
                    text: "Patients clicking distinct offerings like 'Rx Weight Loss' or 'All Access — Elite' are no longer greeted by convoluted, multi-option menus. This hyper-localizes intent and pushes users directly into checkout screens without overwhelming them with duplicate data.",
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
                    text: "STATUS: COMPLETED, VERIFIED, PUSHED TO PRODUCTION",
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
        title: "Service Modal UI/UX Enhancements",
        description: "Implementation Report for Modals Data Constriction & Routing",
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
    const outputPath = "C:/Users/dayoo/Downloads/Landing_Modal_Service_Optimization_Report.docx";
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document saved successfully to ${outputPath}`);
};

main().catch(err => {
    console.error("Failed to generate document:", err);
});
