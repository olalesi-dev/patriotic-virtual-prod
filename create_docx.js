const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const promptText = `System Setup: 
Please operate using a structured team approach with four roles: 
1. Solutions Architect: First, design the overall implementation strategy and architecture, ensuring all constraints and integrations are respected without impacting existing functionality.
2. Project Manager: Oversee the task execution, manage the handoffs between roles, and validate the quality control workflow.
3. Web Developer: Execute the changes as per the Architect's design.
4. UI/UX Designer: Monitor all visual changes to ensure world-class aesthetics. Do not make any additions that are un-aesthetic, and ensure all existing formatting on the site remains pixel-perfect.

Task:
Implement the 7 exact text and copy additions from the RadiantLogiq / NVIDIA Inception developer brief onto the main landing page/website. I have attached the official NVIDIA Inception Program badge logo for you to use. 

Strict Constraints & Quality Control:
1. Preserve Functionality: Do NOT impact any existing functionality. You must not break or modify any integrations (EmailJS, Doxy.me, or DoseSpot).
2. Preserve Existing Copy: Do not rewrite or remove any existing medical, prescribing, or disclaimer text. 
3. Validation: Implement a quality control method to validate the changes where possible before making them.
4. Git Deployment: Once all changes are completed, tested, and aesthetically validated by the UI/UX persona, push all changes safely to GitHub.

Required Additions (Changes 1-7):
1. Homepage Hero Under-Text: Directly below the existing hero headline/subheadline and before the CTA, add: "Powered by RadiantLogiq, an AI-driven clinical platform for decision support and workflow optimization. RadiantLogiq is a member of the NVIDIA Inception program." (Keep this in a smaller font than the headline with neutral styling).
2. Homepage Trust Line: Near the hero CTA or key intro copy, add: "Our platform integrates advanced clinical software and AI to support efficient, high-quality care delivery." 
3. "Technology & Platform" Section: Add a new, aesthetically consistent section mid-page titled "Technology & Platform". Text: "Patriotic Virtual Telehealth is powered by RadiantLogiq, a physician-founded clinical platform designed to enhance care delivery through workflow optimization and intelligent data processing. RadiantLogiq supports scalable telehealth operations today, with ongoing development of advanced clinical decision support tools for healthcare providers."
4. DoseSpot Trust Line: Add this sentence exactly ONCE on the page (e.g., in the new Tech section or How It Works): "We utilize a secure, integrated e-prescribing platform (DoseSpot) to support safe, compliant, and efficient medication management."
5. Footer Credibility Strip: In the site footer, add the text: "Powered by RadiantLogiq" and "Member, NVIDIA Inception Program". Display the attached NVIDIA Inception Program badge here (ensuring it is not larger than our own company logo), followed by the exact copyright text: "© 2025 NVIDIA, the NVIDIA logo, and NVIDIA Inception Program are trademarks and/or registered trademarks of NVIDIA Corporation in the U.S. and other countries." (Keep all text here small and clean).
6. About/Trust Section: In an appropriate About or Trust section, add: "Built by a physician-led team, RadiantLogiq is designed to improve efficiency and scalability in modern healthcare delivery."
7. Provider-Facing Micro-Copy: In a secondary, non-prominent location on the page, add: "For providers and health systems, RadiantLogiq is being developed to support workflow optimization and clinical decision support." 

Workflow:
The Solutions Architect must begin by defining the implementation plan and file structure. Once approved, the PM will orchestrate the Developer and UI/UX Designer to execute, test, and finally push to GitHub.`;

const paragraphs = promptText.split('\n').map(line => new Paragraph({ text: line }));

const doc = new Document({
    sections: [
        {
            properties: {},
            children: paragraphs,
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('C:\\Users\\dayoo\\Downloads\\Developer_Prompt_Architect.docx', buffer);
    console.log('Document created successfully');
}).catch(console.error);
