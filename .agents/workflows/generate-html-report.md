---
description: generate an implementation report using the Patriotic Telehealth HTML format
---
When the user asks for an implementation report or deployment report in HTML format, you MUST use the following professional Tailwind CSS template. NEVER use generic Markdown or plain HTML for the final report to the user if they request the Patriotic Telehealth HTML report.

1. **Understand the Template:**
The template has a distinct UI/UX that relies on `Tailwind CSS` via CDN and uses Google Fonts (`Inter` and `Montserrat`). It includes a header with the Patriotic Telehealth logo, an Executive Overview section, an Action Summary table, and a Validation & Deployment section.

2. **Required Structure Elements:**
   * **Header section:** Must include the `https://patriotictelehealth.com/logo.png` logo, the phrase "IMPLEMENTATION REPORT", and the current date.
   * **Executive Overview:** High-level summary of the overall goal and what was achieved.
   * **Action Summary (Table):** A bordered table listing `Component Area`, `Action Taken`, and `Status` (typically "Verified").
   * **Validation & Deployment:** A description of how it was tested (e.g. "Build Integrity Verified") and deployed (e.g., "Firebase Production Released").
   * **Implementation Status Footer:** A large colored banner at the bottom stating "CERTIFIED & DEPLOYED" (or relevant status).
   * **Footer:** The text `Patriotic Virtual Telehealth | Internal Systems Documentation | Confidential`.

3. **Code Template:**
Use this exact HTML structure and adapt the content inside `<section>`, `<header>`, and `<title>` appropriately based on the work done in the session.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Implementation Report | Patriotic Telehealth</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; color: #334155; }
        h1, h2, h3, .font-montserrat { font-family: 'Montserrat', sans-serif; }
    </style>
</head>
<body class="antialiased min-h-screen p-4 md:p-10 flex justify-center">
    <!-- Document Container -->
    <div class="max-w-4xl w-full bg-white shadow-2xl shadow-slate-300/60 rounded-2xl overflow-hidden border border-slate-200">
        
        <!-- Header Section -->
        <header class="bg-slate-900 px-10 py-14 text-center relative overflow-hidden">
            <!-- Decorative Gradients -->
            <div class="absolute top-0 right-0 shadow-2xl rounded-full bg-teal-500/20 w-64 h-64 blur-3xl -translate-y-10 translate-x-10"></div>
            <div class="absolute bottom-0 left-0 shadow-2xl rounded-full bg-sky-500/20 w-48 h-48 blur-2xl translate-y-10 -translate-x-10"></div>
            
            <img src="https://patriotictelehealth.com/logo.png" alt="Patriotic Telehealth Logo" class="h-16 mx-auto mb-6 relative z-10 block" onerror="this.onerror=null; this.src='https://patriotictelehealth.com/assets/logo.png'">
            
            <h1 class="text-3xl md:text-5xl text-white font-black tracking-tight relative z-10 mb-3 uppercase">Implementation Report</h1>
            <p class="text-teal-400 font-bold tracking-widest uppercase text-sm relative z-10">[ENTER PROJECT SUBTITLE HERE]</p>
            <p class="text-slate-400 text-sm mt-5 relative z-10 font-medium">Date: [ENTER DATE HERE]</p>
        </header>

        <!-- Body Section -->
        <div class="px-8 py-12 md:px-14 md:py-16 space-y-14">
            
            <!-- 1. Executive Overview -->
            <section>
                <div class="flex items-center gap-4 mb-6">
                    <div class="h-8 w-1.5 bg-teal-600 rounded-full"></div>
                    <h2 class="text-2xl text-slate-800 font-extrabold uppercase tracking-tight">1. Executive Overview</h2>
                </div>
                <p class="text-slate-600 text-lg leading-relaxed pl-5 border-l-2 border-slate-100">
                    [ENTER 1-2 PARAGRAPHS SUMMARIZING THE WORK COMPLETED IN THE SESSION.]
                </p>
            </section>

            <!-- 2. Action Summary Table -->
            <section>
                <div class="flex items-center gap-4 mb-6">
                    <div class="h-8 w-1.5 bg-teal-600 rounded-full"></div>
                    <h2 class="text-2xl text-slate-800 font-extrabold uppercase tracking-tight">2. Action Summary</h2>
                </div>
                
                <div class="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-900 text-white text-sm uppercase tracking-wider">
                                <th class="p-5 font-bold">Component Area</th>
                                <th class="p-5 font-bold">Action Taken</th>
                                <th class="p-5 font-bold text-center w-36">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 text-slate-700 bg-white">
                            <!-- Duplicate TR blocks as needed -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="p-5 align-top font-bold text-slate-900">[COMPONENT 1]</td>
                                <td class="p-5 align-top leading-relaxed text-slate-600">[DETAILS OF ACTION 1]</td>
                                <td class="p-5 align-top text-center"><span class="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 w-full border border-emerald-200">Verified</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- 3. Validation -->
            <section>
                <div class="flex items-center gap-4 mb-6">
                    <div class="h-8 w-1.5 bg-teal-600 rounded-full"></div>
                    <h2 class="text-2xl text-slate-800 font-extrabold uppercase tracking-tight">3. Validation & Deployment</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all">
                        <div class="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mb-5 font-bold text-xl ring-4 ring-sky-50 shadow-sm">✓</div>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">Build Integrity Verified</h3>
                        <p class="text-sm text-slate-600 leading-relaxed">[ENTER BUILD VALIDATION DETAILS]</p>
                    </div>
                    <div class="p-6 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all">
                        <div class="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-5 font-bold text-xl ring-4 ring-teal-50 shadow-sm">✓</div>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">Production Released</h3>
                        <p class="text-sm text-slate-600 leading-relaxed">[ENTER DEPLOYMENT DETAILS]</p>
                    </div>
                </div>

                <div class="mt-12 p-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/60 shadow-inner text-center">
                    <h3 class="text-emerald-900/60 font-bold tracking-widest uppercase mb-3 text-sm">Implementation Status</h3>
                    <div class="text-3xl md:text-4xl font-black text-emerald-600 font-montserrat tracking-tight">CERTIFIED & DEPLOYED</div>
                </div>
            </section>
        </div>

        <!-- Footer Section -->
        <footer class="bg-slate-100 px-10 py-10 border-t border-slate-200/80 text-center">
            <p class="text-xs text-slate-400 font-bold tracking-widest uppercase leading-loose">Patriotic Virtual Telehealth<br>Internal Systems Documentation | Confidential</p>
            <p class="text-xs text-slate-400 mt-4 leading-relaxed tracking-wide">© 2026 Antigravity Engineering. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
```

4. **Saving the File:** 
Make sure you write this file directly to the user's Downloads folder or wherever requested, maintaining the `.html` extension.
