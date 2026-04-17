const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, AlignmentType, ShadingType, WidthType, ImageRun } = docx;

const PRIMARY_HEX = "0f172a"; 
const TEXT_HEX = "334155";
const ACCENT_HEX = "2563eb"; 

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
            spacing: { after: 400 },
            children: [
                new TextRun({
                    text: "FIREBASE ENVIRONMENT KEYS",
                    bold: true,
                    size: 32,
                    color: PRIMARY_HEX,
                    font: "Inter",
                }),
                new TextRun({
                    text: `\nExported: ${new Date().toLocaleDateString('en-US')}`,
                    italics: true,
                    size: 20,
                    color: "64748b",
                    font: "Inter",
                }),
            ],
        }),
        new Paragraph({
            spacing: { after: 300 },
            children: [
                new TextRun({
                    text: "The following environment variables are the production Firebase configuration keys required for the front-end Vite or NextJS application. Please keep these credentials secure.",
                    size: 22,
                    color: TEXT_HEX,
                    font: "Inter",
                }),
            ],
        })
    );
    
    const tableHeaders = ["Environment Variable", "Value"];
    const rowsData = [
        ["VITE_FIREBASE_API_KEY", "AIzaSyBtW_7IUCMqbk5V1MzqdIJzgufZEhzjyP8"],
        ["VITE_FIREBASE_AUTH_DOMAIN", "patriotic-virtual-prod.firebaseapp.com"],
        ["VITE_FIREBASE_PROJECT_ID", "patriotic-virtual-prod"],
        ["VITE_FIREBASE_STORAGE_BUCKET", "patriotic-virtual-prod.firebasestorage.app"],
        ["VITE_FIREBASE_MESSAGING_SENDER_ID", "189906910824"],
        ["VITE_FIREBASE_APP_ID", "1:189906910824:web:16d108f48445cb0e7d85dd"]
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
                            alignment: AlignmentType.LEFT,
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
                                alignment: AlignmentType.LEFT,
                                children: [
                                    new TextRun({
                                        text: text,
                                        bold: idx === 0,
                                        color: idx === 0 ? PRIMARY_HEX : TEXT_HEX,
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
        })
    );
    
    const doc = new Document({
        creator: "Antigravity Engineering",
        title: "Firebase Environment Keys",
        description: "Exported Firebase Configuration",
        sections: [{ properties: {}, children: children }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    const outputPath = "C:/Users/dayoo/Downloads/Firebase_Environment_Keys.docx";
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document saved successfully to ${outputPath}`);
};

main().catch(err => { console.error(err); });
