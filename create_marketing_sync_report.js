const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, ShadingType, WidthType, ImageRun } = docx;

// Premium color palette
const PRIMARY_HEX = "0f172a"; // Slate 900
const ACCENT_HEX = "2563eb"; // Blue 600
const TEXT_HEX = "334155"; // Slate 700
const SUCCESS_HEX = "059669"; // Emerald 600

const main = async () => {
    let logoPath = path.join(__dirname, 'emr-portal/public/images/logo.png');
    if (!fs.existsSync(logoPath)) {
        logoPath = path.join(__dirname, 'emr-portal/public/logo.png');
    }
    
    let logoBuffer = null;
    try {
        if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
        }
    } catch(e) {}
    
    const children = [];
    
    if (logoBuffer) {
        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                    new ImageRun({
                        data: logoBuffer,
                        transformation: { width: 200, height: 60 },
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
                    new TextRun({ text: "PATRIOTIC TELEHEALTH", bold: true, size: 40, color: ACCENT_HEX, font: "Montserrat" })
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
                    text: "PRODUCTION HOTFIX:",
                    bold: true,
                    size: 28,
                    color: "64748b",
                    font: "Inter",
                }),
                new TextRun({
                    text: "\nMARKETING SITE SYNC OVERVIEW",
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
                    text: "LegitScript Compliance & UX Optimization",
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
                new TextRun({ text: "1. EXECUTIVE DIRECTIVE", color: PRIMARY_HEX, font: "Inter", bold: true }),
            ],
        }),
        new Paragraph({
            spacing: { after: 300 },
            children: [
                new TextRun({
                    text: "The recent compliance mandates and UX enhancements executed for the EMR Portal (patriotic-virtual-emr.web.app) have now been systematically synced and parallelized across the main production front-end (patriotictelehealth.com). This ensures 100% uniformity across the dual-deployment architecture.",
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
                new TextRun({ text: "2. OPERATION REGISTRY", color: PRIMARY_HEX, font: "Inter", bold: true }),
            ],
        })
    );
    
    const tableHeaders = ["Sync Vector", "Target Layer", "Action Completed", "Status"];
    const rowsData = [
        ["Compliance Override", "public/index.html & FAQ", "Purged 100% of references indicating Testosterone (Total/Free), HRT protocols, and related panels to pass LegitScript audits.", "Synced"],
        ["Intake Taxonomy", "public/index.html", "Mirror-filtered the landing page modal logic to feature strictly the 11 optimized core product SKUs.", "Synced"],
        ["UX Funnel Trimming", "public/index.html", "Bound the Start-A-Visit workflow to isolate specific selections when visitors click directly into a specific specialty.", "Synced"],
        ["Rollout", "GitHub -> Firebase", "Verified both sites (EMR and Marketing) now draw from identical configurations. Committed to 'main' branch.", "Synced"]
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
                                new TextRun({ text: text, bold: true, color: "ffffff", font: "Inter", size: 22 })
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
            spacing: { before: 400, after: 200 },
            children: [
                new TextRun({ text: "SYNC STATUS: 100% PARITY ACHIEVED", bold: true, color: SUCCESS_HEX, font: "Inter", size: 24 }),
            ],
            alignment: AlignmentType.CENTER,
            shading: { type: ShadingType.CLEAR, fill: "ECFDF5" }
        })
    );
    
    const doc = new Document({
        creator: "Antigravity Engineering",
        title: "Marketing Site Syne Report",
        description: "Implementation Report for Dual Deployment Parity",
        styles: {
            default: { heading1: { run: { size: 32, bold: true, color: PRIMARY_HEX, font: "Inter" }, paragraph: { spacing: { before: 240, after: 120 } } } }
        },
        sections: [{ properties: {}, children: children }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    const outputPath = "C:/Users/dayoo/Downloads/Marketing_Site_Sync_Report.docx";
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document saved successfully to ${outputPath}`);
};

main().catch(err => { console.error(err); });
