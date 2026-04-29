export const landingStyles = `
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

:root {
      --navy: #000000;
      --navy-mid: #0a0f1c;
      --navy-light: #1a1f2e;
      --blue: #5b7fff;
      --blue-bright: #7b9fff;
      --blue-electric: #4b6fef;
      --blue-pale: #e8edff;
      --indigo: #7b5fff;
      --violet: #9b7fff;
      --red: #ef4444;
      --red-soft: #fee2e2;
      --coral: #ff6b35;
      --coral-soft: #fff0eb;
      --amber: #ffb800;
      --amber-soft: #fff8e1;
      --emerald: #00d9a3;
      --emerald-soft: #e6fff9;
      --teal: #00c9b7;
      --rose: #ff4b7f;
      --rose-soft: #fff0f5;
      --white: #fff;
      --g50: #f9fafb;
      --g100: #f3f4f6;
      --g200: #2a2f3e;
      --g300: #3a3f4e;
      --g400: #6b7280;
      --g500: #9ca3af;
      --g600: #d1d5db;
      --g700: #e5e7eb;
      --g800: #f3f4f6;
      --r-sm: 10px;
      --r-md: 14px;
      --r-lg: 22px;
      --r-xl: 30px;
      --sh-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
      --sh-md: 0 4px 20px rgba(0, 0, 0, 0.3);
      --sh-lg: 0 12px 40px rgba(0, 0, 0, 0.4);
      --sh-xl: 0 24px 60px rgba(0, 0, 0, 0.5);
      --ease: cubic-bezier(0.4, 0, 0.2, 1);
      --ease-b: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: "Outfit", sans-serif;
      color: #e5e7eb;
      background: #000000;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    ::-webkit-scrollbar {
      width: 5px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--g300);
      border-radius: 10px;
    }

    .container {
      max-width: 1220px;
      margin: 0 auto;
      padding: 0 28px;
    }

    .hidden {
      display: none !important;
    }

    img {
      max-width: 100%;
      display: block;
    }

    /* NAV */
    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.3s var(--ease);
    }

    nav.scrolled {
      box-shadow: var(--sh-sm);
      background: rgba(0, 0, 0, 0.98);
    }

    .nav-inner {
      max-width: 1220px;
      margin: 0 auto;
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .brand-logo-img {
      display: block;
      width: auto;
      height: 42px;
      object-fit: contain;
      flex-shrink: 0;
      transition: all 0.25s var(--ease);
    }

    .brand-logo-dark {
      display: none;
    }

    body:not(.light-theme) .brand-logo-light {
      display: none;
    }

    body:not(.light-theme) .brand-logo-dark {
      display: block;
    }

    body.light-theme .brand-logo-light {
      display: block;
    }

    body.light-theme .brand-logo-dark {
      display: none;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .logo-mark svg {
      width: 100%;
      height: 100%;
    }

    .nav-brand {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .nav-brand-top {
      font-family: "Fraunces", serif;
      font-weight: 800;
      font-size: 17px;
      color: #ffffff;
      letter-spacing: -0.3px;
    }

    .nav-brand-top .bv {
      color: var(--blue);
    }

    .nav-brand-bottom {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 2.8px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.4);
    }

    .nav-links {
      display: flex;
      gap: 6px;
    }

    .nav-links a {
      text-decoration: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      font-weight: 500;
      padding: 8px 14px;
      border-radius: 8px;
      transition: all 0.2s var(--ease);
    }

    .nav-links a:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    .nav-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 22px;
      border-radius: 10px;
      font-family: "Outfit", sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.25s var(--ease);
      border: none;
      outline: none;
      gap: 8px;
    }

    .btn-ghost {
      background: transparent;
      color: var(--g600);
    }

    .btn-ghost:hover {
      color: var(--navy);
      background: var(--g100);
    }

    .btn-primary {
      background: linear-gradient(135deg,
          var(--blue-electric),
          var(--indigo));
      color: #fff;
      box-shadow: 0 2px 12px rgba(59, 130, 246, 0.25);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(59, 130, 246, 0.35);
    }

    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
      border: 1.5px solid var(--g200);
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--blue);
      color: var(--blue);
    }

    .btn-large {
      padding: 15px 32px;
      font-size: 15px;
      border-radius: 12px;
    }

    .btn-white {
      background: #fff;
      color: var(--navy);
    }

    .btn-white:hover {
      background: var(--g50);
      transform: translateY(-1px);
      box-shadow: var(--sh-lg);
    }

    .mobile-toggle {
      display: none;
      background: none;
      border: none;
      font-size: 24px;
      color: var(--navy);
      cursor: pointer;
    }

    /* HERO */
    .hero {
      padding: 130px 0 40px;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 800px 600px at 15% 40%,
          rgba(59, 130, 246, 0.07) 0%,
          transparent 70%),
        radial-gradient(ellipse 600px 500px at 85% 30%,
          rgba(139, 92, 246, 0.05) 0%,
          transparent 70%),
        radial-gradient(ellipse 500px 400px at 50% 90%,
          rgba(249, 115, 22, 0.04) 0%,
          transparent 70%);
      pointer-events: none;
    }

    .hero::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle,
          var(--g200) 1px,
          transparent 1px);
      background-size: 32px 32px;
      opacity: 0.4;
      pointer-events: none;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 8px 18px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      color: #5b7fff;
      margin-bottom: 28px;
      animation: fadeUp 0.6s var(--ease) both;
    }

    .bdot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--emerald);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {

      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }

      50% {
        opacity: 0.5;
        transform: scale(0.85);
      }
    }

    .hero h1 {
      font-family: "Fraunces", serif;
      font-size: 58px;
      line-height: 1.08;
      font-weight: 800;
      color: #ffffff !important;
      letter-spacing: -2px;
      margin-bottom: 22px;
      animation: fadeUp 0.6s var(--ease) 0.1s both;
    }

    .hero h1 .gt {
      background: linear-gradient(135deg, #5b7fff, #7b5fff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-sub {
      font-size: 18px;
      line-height: 1.75;
      color: rgba(255, 255, 255, 0.6);
      max-width: 520px;
      margin-bottom: 36px;
      animation: fadeUp 0.6s var(--ease) 0.2s both;
    }

    .hero-ctas {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      animation: fadeUp 0.6s var(--ease) 0.3s both;
    }

    .hero-trust {
      display: flex;
      gap: 24px;
      margin-top: 44px;
      animation: fadeUp 0.6s var(--ease) 0.4s both;
    }

    .tp {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 500;
      color: var(--g500);
    }

    .ti {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .ti.s {
      background: var(--emerald-soft);
    }

    .ti.d {
      background: var(--blue-pale);
    }

    .ti.b {
      background: var(--amber-soft);
    }

    .ti.p {
      background: var(--rose-soft);
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(28px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .fl-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg,
          rgba(16, 185, 129, 0.08),
          rgba(20, 184, 166, 0.08));
      border: 1px solid rgba(16, 185, 129, 0.15);
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      color: var(--emerald);
      margin-top: 14px;
      animation: fadeUp 0.6s var(--ease) 0.45s both;
    }

    /* Hero visual */
    .hero-vis {
      position: relative;
      animation: fadeUp 0.8s var(--ease) 0.2s both;
    }

    .hv-main {
      border-radius: var(--r-lg);
      overflow: hidden;
      box-shadow: var(--sh-xl);
      position: relative;
      z-index: 2;
      aspect-ratio: 4/3;
    }

    .hv-float {
      position: absolute;
      border-radius: var(--r-md);
      overflow: hidden;
      box-shadow: var(--sh-lg);
      border: 3px solid #fff;
      z-index: 3;
    }

    .hvf-1 {
      width: 160px;
      height: 120px;
      top: -16px;
      right: -20px;
      animation: bob 5s ease-in-out infinite;
    }

    .hvf-2 {
      width: 140px;
      height: 105px;
      bottom: -12px;
      left: -18px;
      animation: bob 5s ease-in-out infinite 2.5s;
    }

    @keyframes bob {

      0%,
      100% {
        transform: translateY(0) rotate(0deg);
      }

      50% {
        transform: translateY(-10px) rotate(1deg);
      }
    }

    .hv-stat {
      position: absolute;
      background: #fff;
      border-radius: var(--r-md);
      padding: 12px 18px;
      box-shadow: var(--sh-lg);
      z-index: 4;
      border: 1px solid var(--g100);
    }

    .hvs-1 {
      top: 40%;
      right: -36px;
      animation: bob 6s ease-in-out infinite 1s;
    }

    .hvs-2 {
      bottom: 20%;
      left: -30px;
      animation: bob 6s ease-in-out infinite 3s;
    }

    .hvs-v {
      font-size: 20px;
      font-weight: 800;
      color: var(--navy);
    }

    .hvs-v.grad {
      background: linear-gradient(135deg, var(--amber), var(--coral));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hvs-l {
      font-size: 11px;
      font-weight: 500;
      color: var(--g400);
      margin-top: 1px;
    }

    /* SAFETY BANNER */
    .safety-bar {
      padding: 20px 0;
      background: linear-gradient(90deg,
          var(--emerald-soft),
          var(--blue-pale),
          var(--amber-soft));
      border-bottom: 1px solid var(--g100);
    }

    .safety-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
    }

    .sb-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--g700);
    }

    .sb-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .sb-icon.bg1 {
      background: var(--emerald);
      color: #fff;
    }

    .sb-icon.bg2 {
      background: var(--blue);
      color: #fff;
    }

    .sb-icon.bg3 {
      background: var(--amber);
      color: #fff;
    }

    .sb-icon.bg4 {
      background: var(--violet);
      color: #fff;
    }

    /* MARQUEE */
    .marquee-section {
      padding: 36px 0;
      background: var(--navy);
      overflow: hidden;
    }

    .marquee-track {
      display: flex;
      gap: 48px;
      animation: mscroll 35s linear infinite;
      width: max-content;
    }

    .marquee-item {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.3);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .marquee-item span {
      color: var(--blue-bright);
      font-size: 18px;
    }

    @keyframes mscroll {
      to {
        transform: translateX(-50%);
      }
    }

    /* SECTIONS */
    .sec-eye {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    .eye-line {
      width: 28px;
      height: 3px;
      border-radius: 2px;
    }

    .eye-blue .eye-line {
      background: linear-gradient(90deg, var(--blue), var(--indigo));
    }

    .eye-blue {
      color: var(--blue);
    }

    .eye-coral .eye-line {
      background: linear-gradient(90deg, var(--coral), var(--amber));
    }

    .eye-coral {
      color: var(--coral);
    }

    .eye-em .eye-line {
      background: linear-gradient(90deg, var(--emerald), var(--teal));
    }

    .eye-em {
      color: var(--emerald);
    }

    .eye-vi .eye-line {
      background: linear-gradient(90deg, var(--violet), var(--indigo));
    }

    .eye-vi {
      color: var(--violet);
    }

    .eye-amber .eye-line {
      background: linear-gradient(90deg, var(--amber), var(--coral));
    }

    .eye-amber {
      color: var(--amber);
    }

    .sec-title {
      font-family: "Fraunces", serif;
      font-size: 46px;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -1.5px;
      margin-bottom: 14px;
      line-height: 1.12;
    }

    .sec-sub {
      font-size: 17px;
      color: var(--g500);
      max-width: 560px;
      line-height: 1.7;
      margin-bottom: 48px;
    }

    /* SERVICES */
    .services {
      padding: 100px 0;
    }

    .services-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 36px;
      flex-wrap: wrap;
    }

    .tab {
      padding: 9px 20px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      background: var(--g50);
      color: var(--g500);
      border: 1.5px solid transparent;
      cursor: pointer;
      transition: all 0.2s var(--ease);
    }

    .tab:hover {
      color: var(--navy);
      background: var(--g100);
    }

    .tab.active {
      background: var(--navy);
      color: #fff;
      box-shadow: 0 2px 8px rgba(10, 22, 40, 0.2);
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 16px;
    }

    .svc {
      /* darkâ€‘mode default: cards should be muted, not blinding white */
      background: var(--navy-light);
      border-radius: var(--r-md);
      padding: 28px 24px;
      border: 1.5px solid var(--g300);
      transition: all 0.3s var(--ease);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      color: #e5e7eb;
      /* text defaults to light on dark card */
    }

    .svc:hover {
      border-color: transparent;
      box-shadow: var(--sh-lg);
      transform: translateY(-4px);
    }

    .svc::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      opacity: 0;
      transition: all 0.3s var(--ease);
    }

    .svc:hover::after {
      opacity: 1;
    }

    .svc[data-c="blue"]::after {
      background: linear-gradient(90deg, var(--blue), var(--indigo));
    }

    .svc[data-c="coral"]::after {
      background: linear-gradient(90deg, var(--coral), var(--amber));
    }

    .svc[data-c="emerald"]::after {
      background: linear-gradient(90deg, var(--emerald), var(--teal));
    }

    .svc[data-c="violet"]::after {
      background: linear-gradient(90deg, var(--violet), var(--rose));
    }

    .svc[data-c="rose"]::after {
      background: linear-gradient(90deg, var(--rose), var(--coral));
    }

    .svc[data-c="amber"]::after {
      background: linear-gradient(90deg, var(--amber), var(--coral));
    }

    .svc[data-c="teal"]::after {
      background: linear-gradient(90deg, var(--teal), var(--emerald));
    }

    .svc-ic {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      margin-bottom: 18px;
    }

    .svc-ic.blue {
      background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    }

    .svc-ic.coral {
      background: linear-gradient(135deg, #ffedd5, #fed7aa);
    }

    .svc-ic.emerald {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    }

    .svc-ic.violet {
      background: linear-gradient(135deg, #ede9fe, #ddd6fe);
    }

    .svc-ic.rose {
      background: linear-gradient(135deg, #ffe4e6, #fecdd3);
    }

    .svc-ic.amber {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
    }

    .svc-ic.teal {
      background: linear-gradient(135deg, #ccfbf1, #99f6e4);
    }

    .svc h3 {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 7px;
    }

    .svc p {
      font-size: 14px;
      color: var(--g500);
      line-height: 1.6;
      margin-bottom: 18px;
    }

    .svc-bot {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .svc-pr {
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
    }

    .svc-pr span {
      font-weight: 400;
      color: var(--g400);
      font-size: 12px;
    }

    .svc-arr {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--g50);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--g400);
      font-size: 14px;
      transition: all 0.2s var(--ease);
    }

    .svc:hover .svc-arr {
      background: var(--blue);
      color: #fff;
      transform: translateX(3px);
    }

    /* PROTOCOL CALLOUT */
    .protocol-section {
      padding: 80px 0;
      background: var(--white);
    }

    .proto-box {
      background: linear-gradient(135deg, var(--navy), #1e293b);
      border-radius: var(--r-xl);
      padding: 56px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .proto-box::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 80% 50%,
          rgba(16, 185, 129, 0.1) 0%,
          transparent 60%);
      pointer-events: none;
    }

    .proto-left h2 {
      font-family: "Fraunces", serif;
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 14px;
      letter-spacing: -0.5px;
      line-height: 1.15;
    }

    .proto-left p {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.45);
      line-height: 1.7;
      margin-bottom: 28px;
    }

    .proto-pills {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pp {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--r-sm);
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s var(--ease);
    }

    .pp:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .pp-ic {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .pp-ic.c1 {
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
    }

    .pp-ic.c2 {
      background: rgba(59, 130, 246, 0.15);
      color: var(--blue);
    }

    .pp-ic.c3 {
      background: rgba(245, 158, 11, 0.15);
      color: var(--amber);
    }

    .pp-ic.c4 {
      background: rgba(139, 92, 246, 0.15);
      color: var(--violet);
    }

    .proto-right {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .pr-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--r-md);
      padding: 24px;
      text-align: center;
      transition: all 0.3s var(--ease);
    }

    .pr-card:hover {
      background: rgba(255, 255, 255, 0.06);
      transform: translateY(-2px);
    }

    .pr-num {
      font-family: "Fraunces", serif;
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .pr-num.n1 {
      color: var(--emerald);
    }

    .pr-num.n2 {
      color: var(--blue-bright);
    }

    .pr-num.n3 {
      color: var(--amber);
    }

    .pr-num.n4 {
      color: var(--violet);
    }

    .pr-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
      font-weight: 500;
    }

    /* PHOTO BANNER - SVG illustrations */
    .photo-banner {
      padding: 0;
      overflow: hidden;
    }

    .photo-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
    }

    .ph {
      aspect-ratio: 3/2;
      overflow: hidden;
      position: relative;
    }

    .ph svg {
      width: 100%;
      height: 100%;
    }

    .ph-ov {
      position: absolute;
      inset: 0;
      background: linear-gradient(0deg,
          rgba(10, 22, 40, 0.65) 0%,
          transparent 60%);
      display: flex;
      align-items: flex-end;
      padding: 16px;
      z-index: 2;
    }

    .ph-ov span {
      color: #fff;
      font-size: 13px;
      font-weight: 600;
    }

    /* HOW IT WORKS */
    .how-section {
      padding: 100px 0;
      background: linear-gradient(180deg, var(--navy) 0%, #0f172a 100%);
      position: relative;
      overflow: hidden;
    }

    .how-section::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 500px 500px at 20% 80%,
          rgba(59, 130, 246, 0.1) 0%,
          transparent 70%),
        radial-gradient(ellipse 400px 400px at 80% 20%,
          rgba(139, 92, 246, 0.08) 0%,
          transparent 70%);
      pointer-events: none;
    }

    .how-section .sec-title {
      color: #fff;
    }

    .how-section .sec-sub {
      color: rgba(255, 255, 255, 0.4);
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      position: relative;
      z-index: 1;
    }

    .step {
      padding: 32px 24px;
      border-radius: var(--r-md);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.3s var(--ease);
    }

    .step:hover {
      background: rgba(255, 255, 255, 0.06);
      transform: translateY(-4px);
    }

    .step-acc {
      width: 40px;
      height: 3px;
      border-radius: 2px;
      margin-bottom: 20px;
    }

    .step:nth-child(1) .step-acc {
      background: var(--blue);
    }

    .step:nth-child(2) .step-acc {
      background: var(--violet);
    }

    .step:nth-child(3) .step-acc {
      background: var(--coral);
    }

    .step:nth-child(4) .step-acc {
      background: var(--emerald);
    }

    .step-num {
      font-family: "Fraunces", serif;
      font-size: 56px;
      font-weight: 800;
      /* use a solid white value instead of a faint gradient so numbers are readable on dark bg */
      color: #ffffff;
      margin-bottom: 16px;
      line-height: 1;
    }

    .step h3 {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }

    .step p {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.4);
      line-height: 1.65;
    }

    /* RADIOLOGY */
    .radiology {
      padding: 100px 0;
      background: var(--g50);
    }

    .rad-intro {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      align-items: center;
      gap: 168px;
      margin-bottom: 40px;
    }

    .rad-intro .sec-title {
      margin-bottom: 14px;
    }

    .rad-intro .sec-sub {
      margin-bottom: 0;
      max-width: 640px;
    }

    .rad-intro-media {
      overflow: hidden;
    }

    .rad-intro-media img {
      width: 80%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      display: block;
    }

    .rad-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .rad-card {
      background: var(--navy-light);
      border-radius: var(--r-lg);
      overflow: hidden;
      border: 1.5px solid var(--g200);
      transition: all 0.3s var(--ease);
    }

    .rad-card:hover {
      box-shadow: var(--sh-lg);
      transform: translateY(-3px);
      border-color: var(--blue);
    }

    .rad-card.feat {
      border-color: var(--amber);
      box-shadow:
        0 0 0 1px var(--amber),
        var(--sh-md);
    }

    .rad-top {
      padding: 32px 28px 0;
    }

    .rad-badge {
      display: inline-flex;
      padding: 5px 14px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }

    .rb-n {
      background: var(--navy);
      color: #fff;
    }

    .rb-b {
      background: linear-gradient(135deg, var(--blue-pale), #e0e7ff);
      color: var(--blue-electric);
    }

    .rb-a {
      background: var(--amber-soft);
      color: var(--amber);
    }

    .rad-card h3 {
      font-family: "Fraunces", serif;
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .rad-card .rd {
      font-size: 14px;
      color: var(--g600);
      line-height: 1.7;
      margin-bottom: 16px;
    }

    .rpt {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      /* slightly lighter than the card so the button pops but remains dark */
      background: var(--navy-mid);
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 16px;
    }

    .rpt span {
      font-weight: 400;
      /* highâ€‘contrast light text instead of muted grey */
      color: #e5e7eb;
      font-size: 12px;
    }

    .rad-feats {
      padding: 20px 28px 28px;
    }

    .rf {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
    }

    .rfc {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .rfc.cb {
      background: var(--blue-pale);
      color: var(--blue);
    }

    .rfc.ce {
      background: var(--emerald-soft);
      color: var(--emerald);
    }

    .rfc.ca {
      background: var(--amber-soft);
      color: var(--amber);
    }

    .rf span {
      font-size: 14px;
      color: var(--g600);
      line-height: 1.5;
    }

    .rad-card.full {
      grid-column: 1/-1;
    }

    .rad-card.full .rad-feats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 32px;
    }

    /* PRICING */
    .pricing {
      padding: 100px 0;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .pc {
      background: var(--navy-light);
      border-radius: var(--r-lg);
      padding: 36px 28px;
      border: 1.5px solid var(--g200);
      transition: all 0.3s var(--ease);
      position: relative;
    }

    .pc:hover {
      box-shadow: var(--sh-lg);
      transform: translateY(-3px);
    }

    .pc.pop {
      border-color: var(--blue);
      box-shadow:
        0 0 0 1px var(--blue),
        var(--sh-md);
    }

    .pop-b {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--blue), var(--indigo));
      color: #fff;
      padding: 4px 18px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pc-ic {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 20px;
    }

    .pc-ic.i1 {
      background: linear-gradient(135deg, #dbeafe, #c7d2fe);
    }

    .pc-ic.i2 {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    }

    .pc-ic.i3 {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
    }

    .pc h3 {
      font-family: "Fraunces", serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 6px;
    }

    .pc .pcd {
      font-size: 14px;
      color: var(--g500);
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .pcp {
      margin-bottom: 24px;
    }

    .pca {
      font-size: 42px;
      font-weight: 800;
      color: var(--navy);
      letter-spacing: -1px;
    }

    .pcper {
      font-size: 14px;
      color: var(--g400);
      margin-left: 4px;
    }

    .pcf {
      list-style: none;
      margin-bottom: 28px;
    }

    .pcf li {
      padding: 8px 0;
      font-size: 14px;
      color: var(--g600);
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--g50);
    }

    .pcf li::before {
      content: "âœ“";
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--emerald-soft);
      color: var(--emerald);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .pc .btn {
      width: 100%;
    }

    /* TESTIMONIALS */
    .testimonials {
      padding: 100px 0;
      background: var(--g50);
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .tc {
      padding: 28px;
      border-radius: var(--r-md);
      border: 1.5px solid var(--g100);
      background: #fff;
      transition: all 0.3s var(--ease);
    }

    .tc:hover {
      box-shadow: var(--sh-md);
      transform: translateY(-2px);
    }

    .tc-stars {
      margin-bottom: 14px;
      font-size: 15px;
      letter-spacing: 2px;
      color: var(--amber);
    }

    .tc blockquote {
      font-size: 15px;
      color: var(--g700);
      line-height: 1.7;
      margin-bottom: 20px;
      font-style: italic;
    }

    .tc-auth {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tc-av {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
    }

    .ta1 {
      background: linear-gradient(135deg, var(--blue), var(--indigo));
    }

    .ta2 {
      background: linear-gradient(135deg, var(--coral), var(--rose));
    }

    .ta3 {
      background: linear-gradient(135deg, var(--emerald), var(--teal));
    }

    .tc-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--navy);
    }

    .tc-det {
      font-size: 12px;
      color: var(--g400);
      margin-top: 1px;
    }

    /* CTA */
    .cta-section {
      padding: 80px 0 100px;
    }

    .cta-box {
      border-radius: var(--r-xl);
      padding: 80px 60px;
      text-align: center;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg,
          var(--navy) 0%,
          #1e293b 50%,
          var(--navy-mid) 100%);
    }

    .cta-box::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 30% 50%,
          rgba(59, 130, 246, 0.15) 0%,
          transparent 60%),
        radial-gradient(ellipse at 70% 50%,
          rgba(139, 92, 246, 0.1) 0%,
          transparent 60%),
        radial-gradient(ellipse at 50% 100%,
          rgba(249, 115, 22, 0.08) 0%,
          transparent 50%);
    }

    .cta-box::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: var(--r-xl);
      background: linear-gradient(135deg,
          var(--blue),
          var(--violet),
          var(--coral),
          var(--blue));
      background-size: 300% 300%;
      animation: bshift 6s ease infinite;
      z-index: -1;
    }

    @keyframes bshift {

      0%,
      100% {
        background-position: 0% 50%;
      }

      50% {
        background-position: 100% 50%;
      }
    }

    .cta-box h2 {
      font-family: "Fraunces", serif;
      font-size: 44px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 14px;
      position: relative;
      z-index: 1;
      letter-spacing: -1px;
    }

    .cta-box p {
      font-size: 17px;
      color: rgba(255, 255, 255, 0.5);
      max-width: 480px;
      margin: 0 auto 36px;
      line-height: 1.7;
      position: relative;
      z-index: 1;
    }

    .cta-box .btn {
      position: relative;
      z-index: 1;
    }

    /* FOOTER */
    footer {
      background: var(--navy);
      color: rgba(255, 255, 255, 0.4);
      padding: 64px 0 28px;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2.2fr 1fr 1fr 1fr 1fr;
      gap: 40px;
      margin-bottom: 48px;
    }

    .footer-brand-text {
      font-size: 14px;
      line-height: 1.7;
      margin-top: 16px;
      max-width: 280px;
    }

    .footer-col h4 {
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .footer-col a {
      display: block;
      color: rgba(255, 255, 255, 0.35);
      text-decoration: none;
      font-size: 14px;
      padding: 4px 0;
      transition: all 0.2s var(--ease);
    }

    .footer-col a:hover {
      color: #fff;
    }

    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    /* MODALS */
    .mo {
      position: fixed;
      inset: 0;
      z-index: 2000;
      background: rgba(10, 22, 40, 0.6);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s var(--ease);
    }

    .mo.active {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      background: var(--navy-mid);
      border-radius: var(--r-lg);
      padding: 44px;
      width: 100%;
      max-width: 440px;
      box-shadow: var(--sh-xl);
      border: 1px solid var(--g200);
      transform: translateY(24px) scale(0.97);
      transition: all 0.35s var(--ease-b);
    }

    .mo.active .modal {
      transform: translateY(0) scale(1);
    }

    .modal.wide {
      max-width: 900px;
    }

    .modal h2 {
      font-family: "Fraunces", serif;
      font-size: 28px;
      color: #ffffff;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }

    .modal .ms {
      font-size: 14px;
      color: var(--g500);
      margin-bottom: 28px;
    }

    .fg {
      margin-bottom: 16px;
    }

    .fg label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--g700);
      margin-bottom: 6px;
    }

    .fg input,
    .fg select,
    .fg textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid var(--g200);
      border-radius: var(--r-sm);
      font-family: "Outfit", sans-serif;
      font-size: 14px;
      color: #ffffff;
      transition: all 0.2s var(--ease);
      background: var(--navy-light);
    }

    .fg input:focus,
    .fg select:focus,
    .fg textarea:focus {
      outline: none;
      border-color: var(--blue);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
    }

    .fr {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .ff {
      margin-top: 12px;
      font-size: 13px;
      color: var(--g500);
      text-align: center;
    }

    .ff a {
      color: var(--blue);
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }

    .cm {
      max-width: 560px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .ip {
      display: flex;
      gap: 4px;
      margin-bottom: 28px;
    }

    .ipb {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: var(--g200);
      transition: all 0.3s var(--ease);
    }

    .ipb.done {
      background: linear-gradient(90deg, var(--blue), var(--indigo));
    }

    .ipb.act {
      background: var(--blue);
      opacity: 0.4;
    }

    .iq {
      margin-bottom: 22px;
    }

    .iq h3 {
      font-size: 17px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 5px;
    }

    .iq p {
      font-size: 14px;
      color: var(--g500);
      margin-bottom: 14px;
    }

    .rg {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ro {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      border: 1.5px solid var(--g200);
      border-radius: var(--r-sm);
      cursor: pointer;
      transition: all 0.2s var(--ease);
    }

    .ro:hover {
      border-color: var(--blue);
    }

    .ro.sel {
      border-color: var(--blue);
      background: var(--blue-pale);
      color: var(--navy);
    }

    .rd2 {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--g300);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s var(--ease);
    }

    .ro.sel .rd2 {
      border-color: var(--blue);
      background: var(--blue);
    }

    .ro.sel .rd2::after {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #fff;
    }

    .ro span {
      font-size: 14px;
      font-weight: 500;
    }

    .ia {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 28px;
    }

    /* TABS */
    .chart-tabs {
      display: flex;
      border-bottom: 2px solid var(--g200);
      margin-bottom: 20px;
    }

    .chart-tab {
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      color: var(--g500);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s ease;
    }

    .chart-tab:hover {
      color: var(--navy);
    }

    .chart-tab.active {
      color: var(--blue);
      border-bottom-color: var(--blue);
    }

    .chart-content {
      display: none;
      animation: fadeUp 0.3s ease;
    }

    .chart-content.active {
      display: block;
    }

    /* DASHBOARD */
    .dashboard {
      display: none;
      padding-top: 70px;
      min-height: 100vh;
      background: var(--g50);
    }

    .dash-header {
      background: #fff;
      border-bottom: 1px solid var(--g200);
      padding: 32px 0;
    }

    .dhi {
      max-width: 1220px;
      margin: 0 auto;
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .dw h1 {
      font-family: "Fraunces", serif;
      font-size: 28px;
      color: var(--navy);
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }

    .dw p {
      font-size: 14px;
      color: var(--g500);
    }

    .db {
      max-width: 1220px;
      margin: 0 auto;
      padding: 28px;
    }

    .ds {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }

    .dsc {
      background: #fff;
      border-radius: var(--r-md);
      padding: 22px;
      border: 1px solid var(--g100);
    }

    .dsc-l {
      font-size: 13px;
      color: var(--g500);
      margin-bottom: 8px;
    }

    .dsc-v {
      font-size: 30px;
      font-weight: 800;
      color: var(--navy);
    }

    .dg {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }

    .dc {
      background: #fff;
      border-radius: var(--r-md);
      border: 1px solid var(--g100);
      overflow: hidden;
    }

    .dc-h {
      padding: 18px 22px;
      border-bottom: 1px solid var(--g100);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .dc-h h3 {
      font-size: 15px;
      font-weight: 700;
      color: var(--navy);
    }

    .cli {
      padding: 14px 22px;
      border-bottom: 1px solid var(--g50);
      display: flex;
      align-items: center;
      gap: 14px;
      transition: all 0.2s var(--ease);
      cursor: pointer;
    }

    .cli:hover {
      background: var(--g50);
    }

    .cli-ic {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
    }

    .cli-info h4 {
      font-size: 14px;
      font-weight: 500;
      color: var(--g800);
    }

    .cli-info p {
      font-size: 12px;
      color: var(--g400);
      margin-top: 1px;
    }

    .toast {
      position: fixed;
      bottom: 28px;
      left: 28px;
      background: var(--navy);
      color: #fff;
      padding: 14px 24px;
      border-radius: var(--r-md);
      box-shadow: var(--sh-xl);
      font-size: 14px;
      font-weight: 500;
      z-index: 3000;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.35s var(--ease-b);
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* ======= AI NAVIGATOR ======= */
    body {
      --ai-label-bg: #0f172a;
      --ai-label-text: #f8fafc;
      --ai-label-border: rgba(148, 163, 184, 0.32);
      --ai-card-bg: #0b1220;
      --ai-card-border: rgba(148, 163, 184, 0.3);
      --ai-head-bg: linear-gradient(135deg,
          rgba(59, 130, 246, 0.2),
          rgba(99, 102, 241, 0.14));
      --ai-body-bg: #020617;
      --ai-title: #f8fafc;
      --ai-sub: #94a3b8;
      --ai-bot-bg: #1e293b;
      --ai-bot-text: #e2e8f0;
      --ai-opt-bg: #0f172a;
      --ai-opt-border: #334155;
      --ai-opt-text: #e2e8f0;
      --ai-opt-hover-bg: #172554;
      --ai-opt-hover-text: #dbeafe;
      --ai-input-wrap: #0b1220;
      --ai-input-bg: #0f172a;
      --ai-input-border: #334155;
      --ai-input-text: #f8fafc;
      --ai-input-placeholder: #94a3b8;
      --ai-typing: #64748b;
      --ai-elig-pass-bg: rgba(16, 185, 129, 0.16);
      --ai-elig-pass-border: rgba(16, 185, 129, 0.42);
      --ai-elig-warn-bg: rgba(245, 158, 11, 0.17);
      --ai-elig-warn-border: rgba(245, 158, 11, 0.42);
      --ai-elig-no-bg: rgba(239, 68, 68, 0.17);
      --ai-elig-no-border: rgba(239, 68, 68, 0.42);
      --ai-elig-text: #e2e8f0;
    }

    body.light-theme {
      --ai-label-bg: #0f172a;
      --ai-label-text: #ffffff;
      --ai-label-border: rgba(15, 23, 42, 0.2);
      --ai-card-bg: #ffffff;
      --ai-card-border: #dbe3ee;
      --ai-head-bg: linear-gradient(135deg,
          rgba(59, 130, 246, 0.08),
          rgba(99, 102, 241, 0.06));
      --ai-body-bg: #f8fafc;
      --ai-title: #0f172a;
      --ai-sub: #64748b;
      --ai-bot-bg: #e2e8f0;
      --ai-bot-text: #1e293b;
      --ai-opt-bg: #ffffff;
      --ai-opt-border: #cbd5e1;
      --ai-opt-text: #0f172a;
      --ai-opt-hover-bg: #eff6ff;
      --ai-opt-hover-text: #1d4ed8;
      --ai-input-wrap: #ffffff;
      --ai-input-bg: #f8fafc;
      --ai-input-border: #cbd5e1;
      --ai-input-text: #0f172a;
      --ai-input-placeholder: #94a3b8;
      --ai-typing: #94a3b8;
      --ai-elig-pass-bg: #ecfdf5;
      --ai-elig-pass-border: rgba(16, 185, 129, 0.3);
      --ai-elig-warn-bg: #fffbeb;
      --ai-elig-warn-border: rgba(245, 158, 11, 0.3);
      --ai-elig-no-bg: #fef2f2;
      --ai-elig-no-border: rgba(239, 68, 68, 0.3);
      --ai-elig-text: #334155;
    }

    .ai-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 1500;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg,
          var(--blue-electric),
          var(--indigo));
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s var(--ease);
      font-size: 24px;
    }

    .ai-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(59, 130, 246, 0.45);
    }

    .ai-fab.open {
      border-radius: 16px;
      width: 56px;
      height: 56px;
    }

    .ai-fab .fab-close {
      display: none;
    }

    .ai-fab.open .fab-icon {
      display: none;
    }

    .ai-fab.open .fab-close {
      display: block;
      font-size: 20px;
    }

    .ai-pulse {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid var(--blue);
      animation: aipulse 2.5s ease-out infinite;
      opacity: 0;
    }

    .ai-fab.open .ai-pulse {
      display: none;
    }

    @keyframes aipulse {
      0% {
        transform: scale(1);
        opacity: 0.5;
      }

      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    .ai-label {
      position: absolute;
      right: 72px;
      background: var(--ai-label-bg);
      color: var(--ai-label-text);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: var(--sh-md);
      border: 1px solid var(--ai-label-border);
      opacity: 0;
      transform: translateX(8px);
      transition: all 0.3s var(--ease);
      pointer-events: none;
    }

    .ai-fab:not(.open):hover .ai-label {
      opacity: 1;
      transform: translateX(0);
    }

    .ai-label::after {
      content: "";
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-left-color: var(--ai-label-bg);
    }

    .ai-chat {
      position: fixed;
      bottom: 100px;
      right: 28px;
      z-index: 1500;
      width: 400px;
      max-height: 560px;
      background: var(--ai-card-bg);
      border-radius: var(--r-lg);
      box-shadow: var(--sh-xl);
      border: 1px solid var(--ai-card-border);
      display: flex;
      flex-direction: column;
      opacity: 0;
      visibility: hidden;
      transform: translateY(16px) scale(0.95);
      transition: all 0.3s var(--ease-b);
    }

    .ai-chat.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .ai-chat-head {
      padding: 18px 20px;
      border-bottom: 1px solid var(--ai-card-border);
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--ai-head-bg);
      border-radius: var(--r-lg) var(--r-lg) 0 0;
    }

    .ai-chat-dot {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--blue), var(--indigo));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #fff;
    }

    .ai-chat-title {
      font-weight: 700;
      font-size: 15px;
      color: var(--ai-title);
    }

    .ai-chat-sub {
      font-size: 11px;
      color: var(--ai-sub);
      margin-top: 1px;
    }

    .ai-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 360px;
      min-height: 200px;
      background: var(--ai-body-bg);
    }

    .ai-msg {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.6;
      animation: fadeUp 0.3s var(--ease) both;
    }

    .ai-msg.bot {
      background: var(--ai-bot-bg);
      color: var(--ai-bot-text);
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .ai-msg.user {
      background: linear-gradient(135deg, var(--blue), var(--indigo));
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .ai-msg .ai-opts {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
    }

    .ai-opt {
      background: var(--ai-opt-bg);
      border: 1.5px solid var(--ai-opt-border);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ai-opt-text);
      cursor: pointer;
      transition: all 0.2s var(--ease);
      text-align: left;
      font-family: "Outfit", sans-serif;
    }

    .ai-opt:hover {
      border-color: var(--blue);
      background: var(--ai-opt-hover-bg);
      color: var(--ai-opt-hover-text);
    }

    .ai-chat-input {
      padding: 12px 16px;
      border-top: 1px solid var(--ai-card-border);
      background: var(--ai-input-wrap);
      display: flex;
      gap: 8px;
    }

    .ai-chat-input input {
      flex: 1;
      border: 1.5px solid var(--ai-input-border);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      font-family: "Outfit", sans-serif;
      color: var(--ai-input-text);
      background: var(--ai-input-bg);
      outline: none;
      transition: all 0.2s var(--ease);
    }

    .ai-chat-input input::placeholder {
      color: var(--ai-input-placeholder);
    }

    .ai-chat-input input:focus {
      border-color: var(--blue);
    }

    .ai-chat-input button {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--blue), var(--indigo));
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s var(--ease);
    }

    .ai-chat-input button:hover {
      transform: scale(1.05);
    }

    .ai-typing {
      display: flex;
      gap: 4px;
      padding: 8px 0;
      align-self: flex-start;
    }

    .ai-typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ai-typing);
      animation: blink 1.4s infinite both;
    }

    .ai-typing span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .ai-typing span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes blink {

      0%,
      80%,
      100% {
        opacity: 0.3;
      }

      40% {
        opacity: 1;
      }
    }

    .ai-elig {
      background: var(--ai-elig-pass-bg);
      border: 1px solid var(--ai-elig-pass-border);
      border-radius: 10px;
      padding: 14px;
      margin-top: 8px;
    }

    .ai-elig.warn {
      background: var(--ai-elig-warn-bg);
      border-color: var(--ai-elig-warn-border);
    }

    .ai-elig.no {
      background: var(--ai-elig-no-bg);
      border-color: var(--ai-elig-no-border);
    }

    .ai-elig h4 {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .ai-elig p {
      font-size: 12px;
      line-height: 1.5;
      color: var(--ai-elig-text);
    }

    @media (max-width: 1024px) {
      .hero h1 {
        font-size: 44px;
      }

      .steps-grid,
      .pricing-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .footer-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .rad-intro {
        grid-template-columns: 1fr;
        gap: 18px;
      }

      .rad-intro-media {
        max-width: 560px;
        width: 100%;
      }

      .photo-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .proto-box {
        grid-template-columns: 1fr;
        padding: 40px 28px;
      }
    }

    @media (max-width: 768px) {
      .nav-links {
        display: none;
      }

      .mobile-toggle {
        display: block;
      }

      .hero-grid {
        grid-template-columns: 1fr;
        gap: 40px;
      }

      .hero h1 {
        font-size: 36px;
        letter-spacing: -1px;
      }

      .hero-vis {
        order: -1;
      }

      .services-grid,
      .rad-grid,
      .test-grid,
      .steps-grid,
      .pricing-grid {
        grid-template-columns: 1fr;
      }

      .rad-card.full {
        grid-column: auto;
      }

      .rad-card.full .rad-feats {
        grid-template-columns: 1fr;
      }

      .ds {
        grid-template-columns: repeat(2, 1fr);
      }

      .dg {
        grid-template-columns: 1fr;
      }

      .cta-box {
        padding: 48px 24px;
      }

      .cta-box h2 {
        font-size: 28px;
      }

      .footer-grid {
        grid-template-columns: 1fr 1fr;
      }

      .footer-bottom {
        flex-direction: column;
        gap: 8px;
      }

      .modal {
        margin: 16px;
        padding: 28px;
      }

      .sec-title {
        font-size: 32px;
      }

      .hero-trust {
        flex-direction: column;
        gap: 10px;
      }

      .proto-box {
        padding: 32px 20px;
      }

      .proto-right {
        grid-template-columns: 1fr 1fr;
      }

      .safety-inner {
        gap: 16px;
      }

      .sb-item {
        font-size: 11px;
      }

      .ai-chat {
        width: calc(100vw - 32px);
        right: 16px;
        bottom: 90px;
        max-height: 70vh;
      }
    }

    .modal.wide {
      max-width: 95vw !important;
      width: 1400px;
      padding: 0 !important;
      display: flex;
      flex-direction: column;
      height: 90vh;
      overflow: hidden;
    }

    /* Premium Specific Header for Patient Chart */
    .modal.wide .modal-header {
      background: #0a0f1c !important;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-direction: row-reverse;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    .modal.wide .modal-header h3 {
      font-family: "Fraunces", serif;
      font-size: 32px;
      font-style: italic;
      color: #ffffff !important;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .modal.wide .modal-close {
      position: static;
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #1f2937;
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      color: #ffffff;
      transition: all 0.2s;
    }

    .modal.wide .modal-close:hover {
      background: var(--red-soft);
      color: var(--red);
      border-color: var(--red);
    }

    /* Force Chart Content to Fill Available Height */
    .modal.wide #intakeContent {
      flex: 1;
      max-height: none !important;
      /* Override inline style */
      padding: 0 !important;
      overflow: hidden !important;
      /* Internal grid handles scrolling */
      display: flex;
      flex-direction: column;
    }

    /* Ensure Footer is at Bottom */
    .modal.wide .modal-footer {
      padding: 20px 30px;
      background: #0a0f1c;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: auto;
      flex-shrink: 0;
    }

    .chart-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: #0a0f1c;
      padding: 0 20px;
    }

    .chart-tabs .tab,
    .chart-tabs .chart-tab {
      padding: 15px 20px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    .chart-tabs .tab.active,
    .chart-tabs .chart-tab.active {
      color: var(--blue);
      border-bottom-color: var(--blue);
    }

    .chart-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #000000;
      display: none;
    }

    .chart-content.active {
      display: block;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--g300);
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
    }

    /* Message Styling for Provider Chat */
    .admin-tab {
      padding: 20px 0;
      font-weight: 500;
      color: var(--g500);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .admin-tab:hover {
      color: var(--navy);
    }

    .admin-tab.active {
      font-weight: 600;
      color: var(--blue);
      border-bottom-color: var(--blue);
    }

    /* PATIENT DASHBOARD TABS */
    .dash-tabs {
      display: flex;
      gap: 20px;
      border-bottom: 1px solid var(--g200);
      background: var(--navy-mid);
      padding: 0 20px;
    }

    .dash-tab {
      padding: 14px 10px;
      font-size: 14px;
      font-weight: 600;
      color: var(--g500);
      cursor: pointer;
      border-bottom: 2.5px solid transparent;
      transition: all 0.2s var(--ease);
      user-select: none;
    }

    .dash-tab:hover {
      color: white;
    }

    .dash-tab.active {
      color: white;
      border-bottom-color: var(--blue);
    }

    .billing-card {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--g100);
      padding: 20px;
      margin-bottom: 20px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-pill.active {
      background: var(--emerald-soft);
      color: var(--emerald);
    }

    .status-pill.issue {
      background: var(--red-soft);
      color: var(--red);
    }

    .status-pill.cancelled {
      background: var(--g100);
      color: var(--g500);
    }

    /* CALENDAR EVENT HOVER */
    .fc-event {
      cursor: pointer;
      transition:
        transform 0.2s var(--ease),
        box-shadow 0.2s var(--ease) !important;
    }

    .fc-event:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      filter: brightness(1.1);
    }

    .msg-thread {
      transition: background 0.2s;
    }

    .msg-thread:hover {
      background: var(--g50);
    }

    .msg-thread.active {
      background: #f0f9ff;
    }

    .msg-thread.unread {
      background: #fee2e2;
    }

    /* Light red for unread attention */

    .msg-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 75%;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
    }

    /* FULLCALENDAR OVERRIDES (Premium Theme) */
    .fc {
      font-family: "Inter", sans-serif !important;
      --fc-border-color: var(--g200);
      --fc-button-text-color: var(--navy);
      --fc-button-bg-color: white;
      --fc-button-border-color: var(--g200);
      --fc-button-hover-bg-color: var(--g50);
      --fc-button-hover-border-color: var(--g300);
      --fc-button-active-bg-color: var(--blue-pale);
      --fc-button-active-border-color: var(--blue);
      --fc-today-bg-color: rgba(59, 130, 246, 0.05) !important;
      --fc-event-bg-color: var(--blue);
      --fc-event-border-color: var(--blue);
    }

    .fc-toolbar-title {
      font-family: "Fraunces", serif;
      font-size: 20px !important;
    }

    .fc-col-header-cell-cushion {
      color: var(--g500);
      font-weight: 500;
      font-size: 13px;
      text-transform: uppercase;
      padding: 10px 0 !important;
    }

    .fc-daygrid-day-number {
      color: var(--g600);
      font-size: 14px;
      font-weight: 500;
      padding: 8px !important;
    }

    .fc .fc-button-primary {
      color: var(--navy) !important;
      border: 1px solid var(--g200) !important;
      background: white !important;
      box-shadow: var(--sh-sm);
      font-weight: 600;
      font-size: 13px;
      text-transform: capitalize;
      padding: 6px 16px !important;
      border-radius: 8px !important;
    }

    .fc .fc-button-primary:hover {
      background: var(--g50) !important;
    }

    .fc .fc-button-primary:not(:disabled).fc-button-active {
      background: var(--blue) !important;
      color: white !important;
      border-color: var(--blue) !important;
    }

    /* BOOKING WIZARD STYLES */
    .date-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }

    .date-cell {
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--g200);
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .date-cell:hover:not(.disabled) {
      border-color: var(--blue);
      background: var(--blue-pale);
    }

    .date-cell.selected {
      background: var(--blue);
      color: white;
      border-color: var(--blue);
      box-shadow: var(--sh-md);
    }

    .date-cell.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      background: var(--g50);
    }

    .time-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      max-height: 300px;
      overflow-y: auto;
    }

    .time-slot {
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--g200);
      text-align: center;
      cursor: pointer;
      font-weight: 500;
      color: var(--navy);
      transition: all 0.2s;
      background: white;
    }

    .time-slot:hover {
      border-color: var(--blue);
      color: var(--blue);
      background: var(--blue-pale);
      transform: translateY(-2px);
    }

    .time-slot.selected {
      background: var(--blue);
      color: white;
      border-color: var(--blue);
      box-shadow: var(--sh-md);
    }

    .msg-bubble.me {
      background: var(--blue);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }

    .msg-bubble.them {
      background: white;
      border: 1px solid var(--g200);
      color: var(--navy);
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }

    .msg-time {
      font-size: 10px;
      color: var(--g400);
      margin-top: 4px;
      text-align: right;
    }

    /* NEW SECTIONS CSS */
    .safety-bar {
      position: relative;
      padding: 16px 0;
      background: #020617;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .safety-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
          rgba(16, 185, 129, 0.15) 0%,
          transparent 25%,
          transparent 75%,
          rgba(245, 158, 11, 0.15) 100%);
      pointer-events: none;
    }

    .sb-inner {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
      position: relative;
      z-index: 2;
    }

    .sb-item {
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .sb-icon {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: white;
    }

    .marquee-section {
      background: #0b1221;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 18px 0;
      overflow: hidden;
    }

    .marquee-track {
      display: flex;
      gap: 48px;
      animation: scroll 40s linear infinite;
      white-space: nowrap;
      min-width: 100%;
    }

    .marquee-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .marquee-item span {
      font-size: 18px;
    }

    @keyframes scroll {
      0% {
        transform: translateX(0);
      }

      100% {
        transform: translateX(-50%);
      }
    }

    /* DARK THEME TESTIMONIALS Override */
    .testimonials {
      background-color: #020617;
      /* Very Dark Navy */
      padding: 100px 0;
    }

    .testimonials .sec-title {
      color: #ffffff !important;
    }

    .testimonials .sec-sub {
      color: #94a3b8;
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 60px;
    }

    .tc {
      background: #0f172a;
      /* Dark Slate */
      border: 1px solid #1e293b;
      /* Subtle Border */
      padding: 32px;
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    .tc:hover {
      transform: translateY(-5px);
      border-color: #334155;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      background: #111827;
    }

    .tc-stars {
      color: #f59e0b;
      /* Amber */
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 24px;
    }

    .tc blockquote {
      font-size: 16px;
      line-height: 1.7;
      color: #e2e8f0;
      /* Light text */
      font-style: italic;
      margin-bottom: 28px;
      flex-grow: 1;
    }

    .tc-auth {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: auto;
    }

    .tc-name {
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
    }

    .tc-det {
      color: #64748b;
      font-size: 12px;
      margin-top: 2px;
    }

    /* RADIOLOGY SECTION - DARK THEME */
    .radiology {
      background-color: #000000 !important;
      color: #ffffff !important;
    }

    .radiology .sec-title {
      color: #ffffff !important;
    }

    .radiology .sec-sub {
      color: #9ca3af !important;
      /* Light Grey */
    }

    /* Ensure Cards are Dark with White Text */
    .rad-card {
      background-color: #0f172a !important;
      border: 1px solid #1e293b !important;
    }

    .rad-card h3 {
      color: #ffffff !important;
    }

    .rad-card .rd {
      color: #cbd5e1 !important;
      /* Light Grey Text inside dark card */
    }

    /* PROTOCOL SECTION - DARK THEME */
    .protocol-section {
      background-color: #000000 !important;
    }

    .proto-box {
      border: 1px solid #1e293b !important;
      /* Subtle border for separation on black bg */
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05);
      /* Additional subtle highlight */
    }

    /* SERVICES SECTION - DARK THEME */
    .services {
      background-color: #000000 !important;
    }

    .services .sec-title {
      color: #ffffff !important;
    }

    .services .sec-sub {
      color: #94a3b8 !important;
    }

    /* Dark Mode Tabs */
    .tab {
      background: transparent !important;
      color: #94a3b8 !important;
      border: 1px solid #334155 !important;
    }

    .tab:hover {
      border-color: #ffffff !important;
      color: #ffffff !important;
    }

    .tab.active {
      background: #ffffff !important;
      color: #000000 !important;
      border-color: #ffffff !important;
    }

    /* Service Tiles: Dark Theme (Similar to Tabs) */
    #svcGrid .svc,
    .svc {
      background-color: #0f172a !important;
      background: #0f172a !important;
      border: 1px solid #1e293b !important;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }

    #svcGrid .svc:hover,
    .svc:hover {
      background-color: #1e293b !important;
      border-color: #334155 !important;
      transform: translateY(-4px);
    }

    #svcGrid .svc h3,
    .svc h3 {
      color: #ffffff !important;
    }

    #svcGrid .svc p,
    .svc p {
      color: #94a3b8 !important;
      /* Slate 400 */
    }

    .svc-pr {
      color: #ffffff !important;
    }

    /* Protocol Cards: Ensure visibility on Black */
    .pr-card {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    .pr-label {
      color: #94a3b8 !important;
    }

    /* DARK MODE PROVIDER PORTAL OVERRIDE */
    #adminDashboard {
      background: #000000 !important;
      color: #e5e7eb !important;
    }

    #adminDashboard .container>div:nth-child(2) {
      /* Main Card */
      background: #0a0f1c !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    #adminDashboard h1 {
      /* Title */
      color: #ffffff !important;
    }

    #adminDashboard .admin-tab {
      /* Tabs Inactive */
      color: rgba(255, 255, 255, 0.6) !important;
      border-bottom-color: transparent !important;
    }

    #adminDashboard .admin-tab.active {
      /* Tabs Active */
      color: #ffffff !important;
      border-bottom-color: var(--blue) !important;
    }

    #adminDashboard .admin-tab:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.05) !important;
    }

    #adminDashboard>.container>div:nth-child(2)>div:first-child {
      /* Tab Header Container */
      background: #0a0f1c !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    /* TABLE STYLES */
    #adminDashboard table thead tr {
      background: #111827 !important;
    }

    #adminDashboard table th {
      color: rgba(255, 255, 255, 0.9) !important;
      font-weight: 600 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    #adminDashboard table td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: rgba(255, 255, 255, 0.8) !important;
    }

    #adminDashboard table tr:hover td {
      background: rgba(255, 255, 255, 0.02) !important;
    }

    /* MESSAGING STYLES */
    #msgThreadList {
      background: #0a0f1c !important;
      border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    #msgThreadList .msg-thread {
      background: transparent !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: rgba(255, 255, 255, 0.8) !important;
    }

    #msgThreadList .msg-thread:hover {
      background: rgba(255, 255, 255, 0.03) !important;
    }

    #msgThreadList .msg-thread.active {
      background: rgba(59, 130, 246, 0.1) !important;
      border-left: 3px solid var(--blue);
    }

    #chatHeader {
      background: #0a0f1c !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    #chatHeader>div:first-child {
      color: #ffffff !important;
    }

    #chatHeader>div:nth-child(2) {
      color: rgba(255, 255, 255, 0.5) !important;
    }

    #chatMessages {
      background: #000000 !important;
    }

    #chatInputArea {
      background: #0a0f1c !important;
      border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    #chatInput {
      background: #1f2937 !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    #chatInput::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    /* SCHEDULE STYLES */
    #view-admin-schedule>div:first-child {
      background: #0a0f1c !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    #view-admin-schedule h3 {
      color: #ffffff !important;
    }

    #todaysAgenda {
      color: rgba(255, 255, 255, 0.6) !important;
    }

    #providerCalendar {
      background: #0a0f1c !important;
      color: #ffffff !important;
    }

    /* FullCalendar Dark Mode Override */
    .fc-theme-standard td,
    .fc-theme-standard th {
      border-color: rgba(255, 255, 255, 0.1) !important;
    }

    .fc-col-header-cell-cushion,
    .fc-timegrid-slot-label-cushion {
      color: rgba(255, 255, 255, 0.8) !important;
    }

    .fc-timegrid-axis-cushion {
      color: rgba(255, 255, 255, 0.6) !important;
    }

    /* DARK MODE PATIENT DASHBOARD OVERRIDE */
    .dashboard {
      background: #000000 !important;
      color: #e5e7eb !important;
    }

    .dash-header {
      background: #0a0f1c !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    .dw h1 {
      color: #ffffff !important;
    }

    .dw p {
      color: rgba(255, 255, 255, 0.6) !important;
    }

    .dashboard .btn-outline {
      background: rgba(255, 255, 255, 0.05) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      color: #ffffff !important;
    }

    .dashboard .btn-outline:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: var(--blue) !important;
    }

    /* Stats Cards */
    .dsc {
      background: #0a0f1c !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }

    .dsc-l {
      color: rgba(255, 255, 255, 0.6) !important;
    }

    .dsc-v {
      color: #ffffff !important;
    }

    /* Content Cards */
    .dc {
      background: #0a0f1c !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    .dc-h {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    .dc-h h3 {
      color: #ffffff !important;
    }

    /* Quick Actions */
    .cli {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    .cli:hover {
      background: rgba(255, 255, 255, 0.03) !important;
    }

    .cli-info h4 {
      color: #ffffff !important;
    }

    .cli-info p {
      color: rgba(255, 255, 255, 0.5) !important;
    }

    /* Consultation List Items (Generated via JS) */
    #cList>div {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    #cList>div>div:first-child>div:first-child {
      /* Service Name */
      color: #ffffff !important;
    }

    #cList>div>div:first-child>div:nth-child(2) {
      /* Date */
      color: rgba(255, 255, 255, 0.5) !important;
    }

    /* ABOUT MODAL THEME TOKENS */
    #aboutModal {
      --about-bg: #0a0f1c;
      --about-border: rgba(255, 255, 255, 0.1);
      --about-title: #ffffff;
      --about-text: rgba(255, 255, 255, 0.84);
      --about-muted: #cbd5e1;
      --about-card: #111827;
      --about-accent: #93c5fd;
      background: rgba(2, 6, 23, 0.74);
    }

    body.light-theme #aboutModal {
      --about-bg: #ffffff;
      --about-border: #d1d5db;
      --about-title: #0f172a;
      --about-text: #334155;
      --about-muted: #64748b;
      --about-card: #f8fafc;
      --about-accent: #1d4ed8;
      background: rgba(15, 23, 42, 0.42);
    }

    #aboutModal .modal {
      background: var(--about-bg) !important;
      border: 1px solid var(--about-border) !important;
      color: var(--about-text) !important;
      box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.45),
        0 10px 10px -5px rgba(0, 0, 0, 0.35) !important;
    }

    #aboutModal h2,
    #aboutModal h3 {
      color: var(--about-title) !important;
    }

    #aboutModal p,
    #aboutModal li {
      color: var(--about-text) !important;
    }

    #aboutModal b {
      color: var(--about-title) !important;
    }

    #aboutModal [style*="var(--g50)"] {
      background: var(--about-card) !important;
      border: 1px solid var(--about-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    #aboutModal [style*="var(--navy)"] {
      color: var(--about-title) !important;
    }

    #aboutModal [style*="var(--g500)"] {
      color: var(--about-muted) !important;
    }

    #aboutModal [style*="var(--g600)"],
    #aboutModal [style*="var(--g700)"] {
      color: var(--about-text) !important;
    }

    #aboutModal [style*="var(--blue)"] {
      color: var(--about-accent) !important;
    }

    /* AUTH MODAL THEME TOKENS */
    #authModal {
      --auth-bg: #0b1220;
      --auth-border: rgba(255, 255, 255, 0.12);
      --auth-title: #ffffff;
      --auth-text: #dbe3ef;
      --auth-muted: #9fb0c9;
      --auth-link: #93c5fd;
      --auth-field-bg: #111b2d;
      --auth-field-border: rgba(148, 163, 184, 0.36);
      --auth-field-text: #f8fafc;
      --auth-field-placeholder: #8ea0bc;
      --auth-outline-bg: rgba(255, 255, 255, 0.04);
      --auth-outline-border: rgba(148, 163, 184, 0.4);
      --auth-outline-text: #f8fafc;
      --auth-outline-hover-bg: rgba(147, 197, 253, 0.14);
      --auth-outline-hover-border: #60a5fa;
      --auth-outline-hover-text: #dbeafe;
      --auth-divider: rgba(148, 163, 184, 0.35);
      background: rgba(2, 6, 23, 0.75);
    }

    body.light-theme #authModal {
      --auth-bg: #ffffff;
      --auth-border: #d1d5db;
      --auth-title: #0f172a;
      --auth-text: #334155;
      --auth-muted: #64748b;
      --auth-link: #1d4ed8;
      --auth-field-bg: #f8fafc;
      --auth-field-border: #cbd5e1;
      --auth-field-text: #0f172a;
      --auth-field-placeholder: #94a3b8;
      --auth-outline-bg: #f8fafc;
      --auth-outline-border: #cbd5e1;
      --auth-outline-text: #0f172a;
      --auth-outline-hover-bg: #eff6ff;
      --auth-outline-hover-border: #93c5fd;
      --auth-outline-hover-text: #1d4ed8;
      --auth-divider: #cbd5e1;
      background: rgba(15, 23, 42, 0.42);
    }

    #authModal .modal {
      background: var(--auth-bg) !important;
      border: 1px solid var(--auth-border) !important;
      color: var(--auth-text) !important;
      box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.45),
        0 10px 10px -5px rgba(0, 0, 0, 0.35) !important;
    }

    #authModal .auth-register-modal {
      max-width: 980px;
      width: min(980px, calc(100vw - 48px));
    }

    #authModal .auth-register-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 14px;
    }

    #authModal .auth-register-grid .fg {
      margin-bottom: 16px;
    }

    #authModal h2 {
      color: var(--auth-title) !important;
    }

    #authModal .ms,
    #authModal .ff {
      color: var(--auth-muted) !important;
    }

    #authModal .ff a {
      color: var(--auth-link) !important;
    }

    #authModal .fg label {
      color: var(--auth-text) !important;
    }

    #authModal .fg input,
    #authModal .fg select,
    #authModal .fg textarea {
      background: var(--auth-field-bg) !important;
      border-color: var(--auth-field-border) !important;
      color: var(--auth-field-text) !important;
    }

    #authModal .fg input::placeholder,
    #authModal .fg textarea::placeholder {
      color: var(--auth-field-placeholder) !important;
    }

    #authModal .btn-outline {
      background: var(--auth-outline-bg) !important;
      border-color: var(--auth-outline-border) !important;
      color: var(--auth-outline-text) !important;
    }

    #authModal .btn-outline:hover {
      background: var(--auth-outline-hover-bg) !important;
      border-color: var(--auth-outline-hover-border) !important;
      color: var(--auth-outline-hover-text) !important;
    }

    #authModal [style*="background: var(--g200)"] {
      background: var(--auth-divider) !important;
    }

    #authModal [style*="color: var(--g400)"] {
      color: var(--auth-muted) !important;
    }

    .auth-register-modal {
      max-width: 980px;
      width: min(980px, calc(100vw - 48px));
    }

    .auth-verify-modal {
      max-width: 920px;
      width: min(920px, calc(100vw - 48px));
    }

    .auth-register-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 14px;
      align-items: start;
    }

    .auth-register-grid .fg {
      margin-bottom: 16px;
    }

    .auth-register-grid .auth-span-2 {
      grid-column: span 2;
    }

    .auth-readonly-field {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid var(--g200);
      border-radius: var(--r-sm);
      font-family: "Outfit", sans-serif;
      font-size: 14px;
      color: #ffffff;
      background: var(--navy-light);
      opacity: 0.95;
    }

    .auth-readonly-label {
      display: block;
    }

    .auth-verify-frame {
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .auth-register-actions {
      display: flex;
      justify-content: center;
    }

    .auth-register-button {
      width: min(100%, 320px);
      justify-content: center;
    }

    .consult-auth-gate {
      margin: 0 0 18px;
      padding: 16px;
      border: 1px solid rgba(91, 127, 255, 0.28);
      border-radius: 14px;
      background: rgba(91, 127, 255, 0.08);
    }

    .consult-auth-copy {
      margin: 0 0 12px;
      color: var(--g700);
      font-size: 13px;
      line-height: 1.55;
    }

    .consult-auth-status {
      margin: 0 0 16px;
      color: var(--g600);
      font-size: 13px;
      line-height: 1.55;
    }

    @media (max-width: 980px) {
      .auth-register-modal {
        width: min(760px, calc(100vw - 32px));
      }

      .auth-verify-modal {
        width: min(760px, calc(100vw - 32px));
      }

      .auth-register-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .auth-register-grid .auth-span-2 {
        grid-column: span 2;
      }
    }

    @media (max-width: 640px) {
      .auth-register-grid {
        grid-template-columns: 1fr;
      }

      .auth-register-grid .auth-span-2 {
        grid-column: auto;
      }

      .auth-register-button {
        width: 100%;
      }

      .auth-verify-modal {
        width: min(100vw - 24px, 680px);
      }
    }

    @media (max-width: 900px) {
      #authModal .auth-register-modal {
        width: min(760px, calc(100vw - 32px));
      }

      #authModal .auth-register-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      #authModal .auth-register-grid {
        grid-template-columns: 1fr;
      }
    }

    /* DARK MODE PATIENT CHART OVERRIDE */
    #patientChart .modal {
      background: #000000 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #e5e7eb !important;
    }

    #patientChart .modal>div:first-child {
      /* Header */
      background: #0a0f1c !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    #patientChart h2,
    #patientChart h3,
    #patientChart h4 {
      color: #ffffff !important;
    }

    #patientChart p,
    #patientChart span,
    #patientChart label {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    #patientChart .chart-tabs .tab {
      color: rgba(255, 255, 255, 0.6) !important;
    }

    #patientChart .chart-tabs .tab.active {
      color: #ffffff !important;
      border-bottom-color: var(--blue) !important;
    }

    #patientChart .chart-tabs .tab:hover {
      color: #ffffff !important;
    }

    /* Content Cards (History, SOAP, Labs) */
    #patientChart .chart-content>div>div {
      /* The white cards */
      background: #0a0f1c !important;
      box-shadow: none !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    /* Inputs */
    #patientChart input,
    #patientChart textarea,
    #patientChart select {
      background: #1f2937 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
    }

    #patientChart .form-control {
      background: #1f2937 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
    }

    /* Chat/Messages in Chart */
    #patientChart .chat-interface {
      background: #0a0f1c !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
    }

    #patientChart #providerChatHistory {
      background: #000000 !important;
    }

    #patientChart .modal-close {
      color: #ffffff !important;
    }

    /* REFINED DARK MODE PATIENT CHART */
    #patientChart .modal {
      background: #000000 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #e5e7eb !important;
    }

    #patientChart h2,
    #patientChart h3,
    #patientChart h4 {
      color: #ffffff !important;
    }

    #patientChart p,
    #patientChart span,
    #patientChart label,
    #chartIntake,
    #labResultsList,
    #patientChart div[style*="color:var(--g700)"],
    #patientChart div[style*="color:var(--g500)"] {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    #patientChart input,
    #patientChart textarea,
    #patientChart select {
      background: #1f2937 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
    }

    #patientChart .btn-outline {
      background: rgba(255, 255, 255, 0.05) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      color: #ffffff !important;
    }

    #patientChart .chart-content>div>div {
      background: #0a0f1c !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    /* CONSULT MODAL THEME TOKENS */
    #consultModal {
      --consult-bg: #0b1220;
      --consult-border: rgba(148, 163, 184, 0.3);
      --consult-title: #f8fafc;
      --consult-text: #dbe3ef;
      --consult-muted: #9fb0c9;
      --consult-choice-bg: #0f172a;
      --consult-choice-border: #334155;
      --consult-choice-text: #e2e8f0;
      --consult-choice-hover: #13203a;
      --consult-choice-sel-bg: rgba(59, 130, 246, 0.16);
      --consult-choice-sel-text: #dbeafe;
      --consult-progress: #334155;
      --consult-input-bg: #0f172a;
      --consult-input-border: #334155;
      --consult-input-text: #f8fafc;
      --consult-input-ph: #94a3b8;
      --consult-summary-bg: #111827;
      --consult-summary-border: rgba(148, 163, 184, 0.26);
      background: rgba(2, 6, 23, 0.74);
    }

    body.light-theme #consultModal {
      --consult-bg: #ffffff;
      --consult-border: #d1d5db;
      --consult-title: #0f172a;
      --consult-text: #334155;
      --consult-muted: #64748b;
      --consult-choice-bg: #ffffff;
      --consult-choice-border: #cbd5e1;
      --consult-choice-text: #0f172a;
      --consult-choice-hover: #eff6ff;
      --consult-choice-sel-bg: #dbeafe;
      --consult-choice-sel-text: #1d4ed8;
      --consult-progress: #cbd5e1;
      --consult-input-bg: #f8fafc;
      --consult-input-border: #cbd5e1;
      --consult-input-text: #0f172a;
      --consult-input-ph: #94a3b8;
      --consult-summary-bg: #f8fafc;
      --consult-summary-border: #dbe3ee;
      background: rgba(15, 23, 42, 0.42);
    }

    #consultModal .modal.cm {
      background: var(--consult-bg) !important;
      border: 1px solid var(--consult-border) !important;
      color: var(--consult-text) !important;
      box-shadow:
        0 20px 25px -5px rgba(0, 0, 0, 0.45),
        0 10px 10px -5px rgba(0, 0, 0, 0.35) !important;
    }

    #consultModal h2,
    #consultModal h3 {
      color: var(--consult-title) !important;
    }

    #consultModal p,
    #consultModal .ms {
      color: var(--consult-text) !important;
    }

    #consultModal .iq p,
    #consultModal [style*="color: var(--g500)"] {
      color: var(--consult-muted) !important;
    }

    #consultModal .ipb {
      background: var(--consult-progress) !important;
    }

    #consultModal .ro {
      background: var(--consult-choice-bg) !important;
      border-color: var(--consult-choice-border) !important;
      color: var(--consult-choice-text) !important;
    }

    #consultModal .rd2 {
      border-color: var(--consult-choice-border) !important;
    }

    #consultModal .ro:hover {
      border-color: var(--blue) !important;
      background: var(--consult-choice-hover) !important;
    }

    #consultModal .ro.sel {
      border-color: var(--blue) !important;
      background: var(--consult-choice-sel-bg) !important;
      color: var(--consult-choice-sel-text) !important;
    }

    #consultModal input,
    #consultModal select,
    #consultModal textarea {
      color: var(--consult-input-text) !important;
      border-color: var(--consult-input-border) !important;
      background: var(--consult-input-bg) !important;
    }

    #consultModal input::placeholder,
    #consultModal textarea::placeholder {
      color: var(--consult-input-ph) !important;
    }

    #consultModal [style*="background: var(--g50)"] {
      background: var(--consult-summary-bg) !important;
      border: 1px solid var(--consult-summary-border);
    }

    #consultModal #cS3>p {
      color: var(--consult-muted) !important;
    }

    #consultModal #rSum {
      background: var(--consult-summary-bg) !important;
      border: 1px solid var(--consult-summary-border) !important;
      color: var(--consult-text) !important;
    }

    #consultModal .consult-rsum-block {
      margin-bottom: 14px;
    }

    #consultModal .consult-rsum-block:last-child {
      margin-bottom: 0;
    }

    #consultModal .consult-rsum-label {
      font-size: 12px;
      color: var(--consult-muted);
      margin-bottom: 3px;
    }

    #consultModal .consult-rsum-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--consult-title);
    }

    #consultModal .consult-rsum-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 7px 0;
      border-bottom: 1px solid var(--consult-choice-border);
      font-size: 14px;
    }

    #consultModal .consult-rsum-key {
      color: var(--consult-muted);
    }

    #consultModal .consult-rsum-answer {
      font-weight: 600;
      color: var(--consult-title);
      text-align: right;
    }

    #consultModal .consult-rsum-empty {
      font-size: 13px;
      color: var(--consult-muted);
      padding: 6px 0 2px;
    }

    #consultModal .btn-ghost {
      color: var(--consult-text) !important;
    }

    #consultModal .btn-ghost:hover {
      color: var(--consult-title) !important;
      background: rgba(148, 163, 184, 0.18) !important;
    }

    /* LIGHT THEME */
    body.light-theme {
      background: #ffffff;
      color: #1f2937;
    }

    .light-theme nav {
      background: rgba(255, 255, 255, 0.9);
      border-bottom-color: rgba(0, 0, 0, 0.05);
    }

    .light-theme .nav-brand-top {
      color: #111827;
    }

    .light-theme .nav-brand-bottom {
      color: #6b7280;
    }

    .light-theme .nav-links a {
      color: #4b5563;
    }

    .light-theme .nav-links a:hover {
      color: #111827;
      background: #f3f4f6;
    }

    .light-theme .mobile-toggle {
      color: #111827;
    }

    .light-theme .btn-ghost {
      color: #4b5563;
    }

    .light-theme .btn-ghost:hover {
      color: #111827;
      background: #f3f4f6;
    }

    .light-theme .btn-white {
      background: #1f2937;
      color: #fff;
    }

    .light-theme .btn-white:hover {
      background: #000;
    }

    .light-theme .btn-outline {
      color: #1f2937;
      border-color: #e5e7eb;
      background: transparent;
    }

    .light-theme .btn-outline:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    /* Sections background overrides */
    .light-theme .radiology,
    .light-theme .protocol-section,
    .light-theme .services {
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }

    .light-theme .rad-card,
    .light-theme .proto-box,
    .light-theme .svc,
    .light-theme #svcGrid .svc {
      background-color: #f9fafb !important;
      border-color: #e5e7eb !important;
      color: #1f2937 !important;
      /* dark text for cards */
    }

    .light-theme .svc h3 {
      color: var(--navy) !important;
    }

    .light-theme .svc p {
      color: var(--g500) !important;
    }

    .light-theme .rad-card h3,
    .light-theme .sec-title,
    .light-theme .services .sec-title {
      color: #111827 !important;
    }

    .light-theme .rad-card .rd,
    .light-theme .services .sec-sub,
    .light-theme .sec-sub {
      color: #6b7280 !important;
    }

    .light-theme .tab {
      color: #6b7280 !important;
      border-color: #e5e7eb !important;
    }

    .light-theme .tab:hover {
      color: #111827 !important;
      border-color: #9ca3af !important;
    }

    .light-theme .tab.active {
      background: #1f2937 !important;
      color: #fff !important;
      border-color: #1f2937 !important;
    }

    /* =========================================================
       LANDING REDESIGN LAYER
       Inspired by D:\Work\Doctor\patriotic-vt landing system
       Keeps existing HTML/JS functionality intact.
    ========================================================== */
    :root {
      --land-bg: #f8fafc;
      --land-fg: #0f172a;
      --land-muted: #64748b;
      --land-primary: #1e40af;
      --land-primary-strong: #1d4ed8;
      --land-secondary: #ef4444;
      --land-surface: #ffffff;
      --land-border: #e2e8f0;
      --land-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
      --land-radius: 24px;
    }

    body {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      color: var(--land-fg);
      background:
        radial-gradient(900px 450px at 10% -5%,
          rgba(30, 64, 175, 0.08),
          transparent 60%),
        radial-gradient(900px 420px at 100% 20%,
          rgba(239, 68, 68, 0.06),
          transparent 55%),
        var(--land-bg);
    }

    #landingPage {
      color: var(--land-fg);
      background: transparent;
    }

    #landingPage .container,
    #mainNav .nav-inner {
      max-width: 1660px;
      padding-left: 24px;
      padding-right: 24px;
    }

    #mainNav {
      background: transparent;
      border-bottom: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      transition: all 0.28s var(--ease);
    }

    #mainNav.scrolled {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(148, 163, 184, 0.28);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    }

    #mainNav .nav-inner {
      height: 86px;
    }

    #mainNav.scrolled .nav-inner {
      height: 72px;
    }

    #mainNav .nav-logo {
      gap: 14px;
    }

    #mainNav .brand-logo-img {
      height: 46px;
    }

    #mainNav.scrolled .brand-logo-img {
      height: 42px;
    }

    #mainNav .logo-mark {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.28);
    }

    #mainNav .nav-brand-top {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      transition: color 0.25s var(--ease);
    }

    #mainNav .nav-brand-top .bv {
      color: #60a5fa;
    }

    #mainNav .nav-brand-bottom {
      font-size: 11px;
      letter-spacing: 0.16em;
      color: rgba(226, 232, 240, 0.85);
      transition: color 0.25s var(--ease);
    }

    #mainNav .nav-links {
      gap: 8px;
    }

    #mainNav .nav-links a {
      color: rgba(248, 250, 252, 0.92);
      font-size: 14px;
      font-weight: 600;
      padding: 10px 14px;
      border-radius: 999px;
      transition: all 0.24s var(--ease);
    }

    #mainNav .nav-links a:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.16);
    }

    #mainNav .nav-actions {
      gap: 10px;
    }

    #mainNav.scrolled .nav-brand-top {
      color: var(--land-fg);
    }

    #mainNav.scrolled .nav-brand-bottom {
      color: var(--land-muted);
    }

    #mainNav.scrolled .nav-links a {
      color: #475569;
    }

    #mainNav.scrolled .nav-links a:hover {
      color: var(--land-primary);
      background: rgba(30, 64, 175, 0.08);
    }

    #mainNav .mobile-toggle {
      color: #ffffff;
    }

    #mainNav.scrolled .mobile-toggle {
      color: var(--land-fg);
    }

    #mainNav .btn,
    #landingPage .btn {
      border-radius: 999px;
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      font-weight: 700;
      padding: 12px 24px;
    }

    #mainNav .btn-primary,
    #landingPage .btn-primary {
      background: var(--land-secondary);
      color: #ffffff;
      box-shadow: 0 12px 22px rgba(239, 68, 68, 0.28);
    }

    #mainNav .btn-primary:hover,
    #landingPage .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 18px 28px rgba(239, 68, 68, 0.34);
    }

    #mainNav .btn-outline,
    #landingPage .btn-outline {
      background: #ffffff;
      color: var(--land-fg);
      border: 1px solid var(--land-border);
    }

    #mainNav .btn-outline:hover,
    #landingPage .btn-outline:hover {
      border-color: #bfd2ff;
      color: var(--land-primary);
      background: #eff6ff;
    }

    #mainNav .btn-ghost {
      color: #ffffff;
    }

    #mainNav .btn-ghost:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.14);
    }

    #mainNav.scrolled .btn-ghost {
      color: #334155;
    }

    #mainNav.scrolled .btn-ghost:hover {
      color: var(--land-primary);
      background: rgba(30, 64, 175, 0.08);
    }

    #landingPage .btn-large {
      font-size: 15px;
      padding: 15px 30px;
    }

    #landingPage .hero {
      position: relative;
      min-height: 100svh;
      display: flex;
      align-items: center;
      padding: 152px 0 96px;
      background: #0b1120;
      overflow: hidden;
    }

    #landingPage .hero::before {
      background:
        linear-gradient(108deg,
          rgba(2, 6, 23, 0.92) 20%,
          rgba(15, 23, 42, 0.74) 58%,
          rgba(30, 64, 175, 0.5) 100%),
        url("/assets/hero_dark.png") center/cover no-repeat;
      opacity: 1;
    }

    #landingPage .hero::after {
      background:
        radial-gradient(circle at 82% 16%,
          rgba(59, 130, 246, 0.54),
          transparent 38%),
        radial-gradient(circle at 15% 85%,
          rgba(239, 68, 68, 0.22),
          transparent 36%);
      opacity: 1;
      mix-blend-mode: screen;
    }

    #landingPage .hero-grid {
      grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr);
      gap: 56px;
      align-items: center;
    }

    #landingPage .hero-badge {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ffffff;
      font-weight: 600;
      backdrop-filter: blur(8px);
    }

    #landingPage .hero h1 {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      letter-spacing: -0.03em;
      font-size: clamp(2.5rem, 5vw, 4.6rem);
      line-height: 1.03;
      /* make sure the landing redesign doesn't turn this dark */
      color: #ffffff !important;
    }

    #landingPage .hero h1 .gt {
      background: none;
      -webkit-text-fill-color: initial;
      color: #60a5fa;
    }

    #landingPage .hero-sub {
      max-width: 620px;
      font-size: 1.1rem;
      line-height: 1.72;
      color: rgba(226, 232, 240, 0.92);
    }

    #landingPage .hero-ctas {
      gap: 12px;
    }

    #landingPage .hero-trust {
      margin-top: 34px;
      gap: 18px;
      flex-wrap: wrap;
    }

    #landingPage .tp {
      color: #dbeafe;
      font-weight: 600;
      font-size: 12px;
      gap: 8px;
    }

    #landingPage .ti {
      width: 30px;
      height: 30px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.14) !important;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    #landingPage .fl-badge {
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #bfdbfe;
      backdrop-filter: blur(8px);
    }

    #landingPage .hero .btn-outline {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.35);
      color: #ffffff;
    }

    #landingPage .hero .btn-outline:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.55);
      color: #ffffff;
    }

    #landingPage .hv-main {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 30px;
      box-shadow: 0 28px 70px rgba(2, 6, 23, 0.52);
      overflow: hidden;
    }

    #landingPage .hv-main img {
      border-radius: 30px !important;
      box-shadow: none !important;
    }

    #landingPage .safety-bar {
      background: #ffffff !important;
      border-top: 1px solid var(--land-border) !important;
      border-bottom: 1px solid var(--land-border) !important;
      padding: 22px 0;
    }

    #landingPage .safety-bg {
      background: linear-gradient(90deg,
          rgba(30, 64, 175, 0.08),
          rgba(239, 68, 68, 0.06));
    }

    #landingPage .sb-inner {
      gap: 18px 24px;
      justify-content: center;
    }

    #landingPage .sb-item {
      color: #334155;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
    }

    #landingPage .sb-icon {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      font-size: 11px;
    }

    #landingPage .marquee-section {
      background: #f8fafc !important;
      border-bottom: 1px solid var(--land-border);
      padding: 18px 0;
    }

    #landingPage .marquee-track {
      gap: 14px;
      animation: scroll 34s linear infinite !important;
    }

    #landingPage .marquee-item {
      background: #ffffff;
      border: 1px solid var(--land-border);
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 12px;
      color: #64748b;
      letter-spacing: 0.02em;
      text-transform: none;
    }

    #landingPage .marquee-item span {
      color: var(--land-primary);
      font-size: 16px;
    }

    #landingPage .services {
      background: #ffffff !important;
      padding: 106px 0;
    }

    #landingPage .sec-eye,
    #landingPage .eye-blue,
    #landingPage .eye-coral,
    #landingPage .eye-em,
    #landingPage .eye-vi,
    #landingPage .eye-amber {
      color: var(--land-primary) !important;
    }

    #landingPage .eye-line {
      background: linear-gradient(90deg,
          var(--land-primary),
          #3b82f6) !important;
      width: 28px;
      height: 3px;
      border-radius: 999px;
    }

    #landingPage .sec-title,
    #landingPage .services .sec-title {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      color: var(--land-fg) !important;
      font-size: clamp(2rem, 4.2vw, 3.5rem);
      line-height: 1.08;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
    }

    #landingPage .sec-sub,
    #landingPage .services .sec-sub {
      color: var(--land-muted) !important;
      font-size: 1.08rem;
      line-height: 1.78;
      max-width: 760px;
      margin-bottom: 40px;
    }

    #landingPage .services-tabs {
      gap: 10px;
      margin-bottom: 32px;
    }

    #landingPage .tab {
      border-radius: 999px !important;
      background: #f8fafc !important;
      color: #475569 !important;
      border: 1px solid #d8e0ea !important;
      font-weight: 700;
      letter-spacing: 0;
      padding: 10px 18px;
    }

    #landingPage .tab:hover {
      color: var(--land-primary) !important;
      border-color: #bfd2ff !important;
      background: #eff6ff !important;
    }

    #landingPage .tab.active {
      background: var(--land-primary) !important;
      color: #ffffff !important;
      border-color: var(--land-primary) !important;
      box-shadow: 0 8px 20px rgba(30, 64, 175, 0.28);
    }

    #landingPage .services-grid {
      gap: 18px;
    }

    #landingPage #svcGrid .svc,
    #landingPage .svc {
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      border-radius: var(--land-radius);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    }

    #landingPage #svcGrid .svc h3,
    #landingPage .svc h3 {
      color: #ffffff !important;
    }

    #landingPage #svcGrid .svc p,
    #landingPage .svc p {
      color: #d8d8dafff !important;
    }

    #landingPage .svc-pr {
      color: var(--land-fg) !important;
    }

    #landingPage .svc-pr span {
      color: var(--land-muted);
    }

    #landingPage .svc-arr {
      background: #eff6ff;
      color: var(--land-primary);
    }

    #landingPage .svc:hover .svc-arr {
      background: var(--land-primary);
      color: #ffffff;
    }

    #landingPage .protocol-section {
      background: #f8fafc !important;
      padding: 86px 0;
    }

    #landingPage .proto-box {
      border: none !important;
      box-shadow: 0 26px 70px rgba(30, 64, 175, 0.34) !important;
      background: linear-gradient(138deg,
          #1e3a8a 0%,
          #1e40af 56%,
          #1d4ed8 100%);
      border-radius: 40px;
      padding: 60px;
      gap: 42px;
      position: relative;
      overflow: hidden;
    }

    #landingPage .proto-box::before {
      content: "";
      position: absolute;
      right: -120px;
      top: -120px;
      width: 340px;
      height: 340px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.14);
      pointer-events: none;
    }

    #landingPage .proto-box::after {
      content: "";
      position: absolute;
      left: -90px;
      bottom: -90px;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.2);
      pointer-events: none;
    }

    #landingPage .proto-left,
    #landingPage .proto-right {
      position: relative;
      z-index: 2;
    }

    #landingPage .proto-left h2 {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      font-size: clamp(2rem, 3vw, 3rem);
      line-height: 1.1;
      color: #ffffff;
      letter-spacing: -0.03em;
      margin-bottom: 16px;
    }

    #landingPage .proto-left p {
      color: #dbeafe;
      line-height: 1.72;
    }

    #landingPage .proto-pills {
      margin-top: 26px;
      gap: 12px;
    }

    #landingPage .pp {
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 14px;
      color: #eff6ff;
      font-size: 14px;
    }

    #landingPage .pp-ic {
      background: #ffffff;
      color: var(--land-primary);
      border-radius: 10px;
      font-weight: 800;
    }

    #landingPage .pr-card {
      background: #ffffff !important;
      border: 1px solid #dbeafe !important;
      box-shadow: 0 10px 24px rgba(30, 64, 175, 0.2);
      border-radius: 20px;
      padding: 18px 22px;
    }

    #landingPage .pr-num {
      color: var(--land-primary);
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      letter-spacing: -0.02em;
    }

    #landingPage .pr-label {
      color: var(--land-muted) !important;
    }

    #landingPage .how-section {
      background: #0b1120;
      padding: 108px 0;
      position: relative;
      overflow: hidden;
    }

    #landingPage .how-section::before {
      background:
        radial-gradient(600px 280px at 84% 0%,
          rgba(59, 130, 246, 0.2),
          transparent 70%),
        radial-gradient(520px 260px at 12% 100%,
          rgba(239, 68, 68, 0.16),
          transparent 70%);
      opacity: 1;
    }

    #landingPage .how-section .sec-eye {
      color: #93c5fd !important;
    }

    #landingPage .how-section .eye-line {
      background: linear-gradient(90deg, #60a5fa, #3b82f6) !important;
    }

    #landingPage .how-section .sec-title {
      color: #ffffff !important;
    }

    #landingPage .how-section .sec-sub {
      color: #cbd5e1 !important;
      margin-bottom: 34px;
    }

    #landingPage .steps-grid {
      gap: 18px;
    }

    #landingPage .step {
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: var(--land-radius);
      padding: 30px 24px;
      transition:
        transform 0.25s var(--ease),
        border-color 0.25s var(--ease),
        box-shadow 0.25s var(--ease);
    }

    #landingPage .step:hover {
      transform: translateY(-4px);
      border-color: rgba(96, 165, 250, 0.44);
      box-shadow: 0 20px 40px rgba(2, 6, 23, 0.45);
    }

    #landingPage .step-acc {
      background: linear-gradient(90deg, #ef4444, #3b82f6);
      height: 4px;
      border-radius: 999px;
      margin-bottom: 14px;
    }

    #landingPage .step-num {
      color: #ffffff;
    }

    #landingPage .step h3 {
      color: #ffffff;
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
    }

    #landingPage .step p {
      color: #cbd5e1;
    }

    #landingPage .radiology {
      background: #ffffff !important;
      color: var(--land-fg) !important;
      padding: 110px 0;
    }

    #landingPage .radiology .sec-title {
      color: var(--land-fg) !important;
    }

    #landingPage .radiology .sec-sub {
      color: var(--land-muted) !important;
    }

    #landingPage .radiology .sec-sub span {
      color: #dc2626 !important;
    }

    #landingPage .rad-grid {
      gap: 18px;
      margin-top: 10px;
    }

    #landingPage .rad-card {
      background: #ffffff !important;
      border: 1px solid var(--land-border) !important;
      border-radius: var(--land-radius);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.07);
      overflow: hidden;
      transition:
        transform 0.25s var(--ease),
        box-shadow 0.25s var(--ease),
        border-color 0.25s var(--ease);
    }

    #landingPage .rad-card:hover {
      transform: translateY(-5px);
      border-color: rgba(30, 64, 175, 0.28) !important;
      box-shadow: var(--land-shadow);
      background: #ffffff !important;
    }

    #landingPage .rad-top {
      padding: 28px;
    }

    #landingPage .rad-card h3 {
      color: var(--land-fg) !important;
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      font-size: 21px;
      letter-spacing: -0.01em;
      margin-bottom: 10px;
    }

    #landingPage .rad-card .rd {
      color: var(--land-muted) !important;
    }

    #landingPage .rad-badge {
      border-radius: 999px;
      background: #dbeafe;
      color: var(--land-primary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
      font-weight: 800;
    }

    #landingPage .rb-n {
      background: #fee2e2;
      color: #b91c1c;
    }

    #landingPage .rb-a {
      background: #e2e8f0;
      color: #0f172a;
    }

    #landingPage .rpt {
      /* landing layer was overriding the button color with a dark variable */
      color: #ffffff;
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      letter-spacing: -0.02em;
    }

    #landingPage .rpt span {
      color: #e5e7eb;
    }

    #landingPage .testimonials {
      background: linear-gradient(180deg,
          #eff6ff 0%,
          #f8fafc 100%) !important;
      padding: 108px 0;
    }

    #landingPage .testimonials .sec-title {
      color: var(--land-fg) !important;
    }

    #landingPage .testimonials .sec-sub {
      color: var(--land-muted) !important;
    }

    #landingPage .test-grid {
      gap: 18px;
      margin-top: 38px;
    }

    #landingPage .tc {
      background: #ffffff !important;
      border: 1px solid var(--land-border) !important;
      border-radius: var(--land-radius);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      padding: 28px;
    }

    #landingPage .tc:hover {
      border-color: rgba(30, 64, 175, 0.28) !important;
      background: #ffffff !important;
      box-shadow: var(--land-shadow);
      transform: translateY(-4px);
    }

    #landingPage .tc-stars {
      color: var(--land-secondary);
      margin-bottom: 16px;
    }

    #landingPage .tc blockquote {
      color: #334155;
      font-style: normal;
      margin-bottom: 18px;
    }

    #landingPage .tc-auth {
      border-top: 1px solid var(--land-border);
      padding-top: 16px;
      margin-top: auto;
    }

    #landingPage .tc-av {
      border-radius: 999px;
      background: #dbeafe;
      color: var(--land-primary);
    }

    #landingPage .tc-name {
      color: var(--land-fg);
    }

    #landingPage .tc-det {
      color: var(--land-muted);
    }

    #landingPage .cta-section {
      background: #f8fafc;
      padding: 20px 0 100px;
    }

    #landingPage .cta-box {
      background: linear-gradient(138deg,
          #1e3a8a 0%,
          #1e40af 60%,
          #1d4ed8 100%);
      border-radius: 40px;
      box-shadow: 0 30px 68px rgba(30, 64, 175, 0.33);
      padding: 72px 36px;
      position: relative;
      overflow: hidden;
    }

    #landingPage .cta-box::before {
      content: "";
      position: absolute;
      right: -120px;
      top: -120px;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.16);
    }

    #landingPage .cta-box::after {
      content: "";
      position: absolute;
      left: -110px;
      bottom: -110px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.22);
    }

    #landingPage .cta-box h2,
    #landingPage .cta-box p,
    #landingPage .cta-box .btn {
      position: relative;
      z-index: 2;
    }

    #landingPage .cta-box h2 {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      font-size: clamp(2rem, 3.6vw, 3.3rem);
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin-bottom: 12px;
    }

    #landingPage .cta-box p {
      color: #dbeafe;
      max-width: 760px;
      margin: 0 auto 30px;
      line-height: 1.7;
    }

    #landingPage .btn-white {
      background: #ffffff;
      color: var(--land-primary);
      border-radius: 999px;
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.28);
    }

    #landingPage .btn-white:hover {
      background: #f8fafc;
      color: var(--land-primary-strong);
    }

    #landingPage footer {
      background: #ffffff;
      border-top: 1px solid var(--land-border);
      padding: 84px 0 36px;
    }

    #landingPage footer .footer-grid {
      grid-template-columns: 2fr 1fr 1fr;
      gap: 34px;
      margin-bottom: 36px;
    }

    #landingPage footer .nav-logo {
      align-items: center;
    }

    #landingPage footer .brand-logo-img {
      height: 50px;
    }

    #landingPage footer .nav-brand-top {
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      color: var(--land-fg) !important;
      font-size: 22px;
    }

    #landingPage footer .nav-brand-top .bv {
      color: var(--land-primary) !important;
    }

    #landingPage footer .nav-brand-bottom {
      color: var(--land-muted) !important;
      letter-spacing: 0.16em;
    }

    #landingPage .footer-brand-text {
      color: var(--land-muted);
      max-width: 420px;
      line-height: 1.72;
    }

    #landingPage .footer-col h4 {
      color: var(--land-fg);
      font-size: 15px;
      margin-bottom: 14px;
    }

    #landingPage .footer-col a {
      color: var(--land-muted);
      font-size: 14px;
      margin-bottom: 8px;
      display: block;
      transition: color 0.2s var(--ease);
    }

    #landingPage .footer-col a:hover {
      color: var(--land-primary);
    }

    #landingPage .footer-bottom {
      border-top: 1px solid var(--land-border);
      color: #94a3b8;
      padding-top: 22px;
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.5;
    }

    /* keep look consistent if theme toggle is clicked */
    body.light-theme #mainNav,
    body.light-theme #mainNav.scrolled {
      background: rgba(255, 255, 255, 0.9) !important;
      border-bottom: 1px solid rgba(148, 163, 184, 0.28) !important;
    }

    body.light-theme #mainNav .nav-brand-top {
      color: var(--land-fg) !important;
    }

    body.light-theme #mainNav .nav-brand-bottom {
      color: var(--land-muted) !important;
    }

    body.light-theme #mainNav .nav-links a {
      color: #475569 !important;
    }

    body.light-theme #mainNav .nav-links a:hover {
      color: var(--land-primary) !important;
      background: rgba(30, 64, 175, 0.08) !important;
    }

    body.light-theme #mainNav .btn-ghost {
      color: #334155 !important;
    }

    body.light-theme #mainNav .btn-ghost:hover {
      color: var(--land-primary) !important;
      background: rgba(30, 64, 175, 0.08) !important;
    }

    @media (max-width: 1200px) {
      #landingPage .hero-grid {
        grid-template-columns: 1fr;
        gap: 34px;
      }

      #landingPage .hero-vis {
        max-width: 680px;
      }

      #landingPage .proto-box {
        grid-template-columns: 1fr;
        padding: 46px;
      }
    }

    @media (max-width: 1024px) {
      #landingPage .steps-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      #landingPage .rad-grid {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 900px) {
      #mainNav .nav-links {
        display: none;
      }

      #mainNav .mobile-toggle {
        display: block;
      }

      #mainNav .nav-inner {
        height: 72px;
      }

      #landingPage .hero {
        padding-top: 126px;
      }

      #landingPage .hero h1 {
        font-size: clamp(2rem, 8vw, 3.2rem);
      }

      #landingPage .footer-grid {
        grid-template-columns: 1fr !important;
      }

      #landingPage .footer-bottom {
        flex-direction: column;
        gap: 6px;
        align-items: flex-start;
      }
    }

    @media (max-width: 700px) {
      #landingPage .container {
        padding-left: 16px;
        padding-right: 16px;
      }

      #landingPage .hero-ctas .btn {
        width: 100%;
      }

      #landingPage .hero-trust {
        gap: 10px;
      }

      #landingPage .tp {
        width: calc(50% - 5px);
      }

      #landingPage .steps-grid {
        grid-template-columns: 1fr;
      }

      #landingPage .cta-box {
        border-radius: 30px;
        padding: 50px 22px;
      }
    }

    /* =========================================================
       HERO SERVICES EXPERIENCE (V1 LOCKED)
    ========================================================== */
    #landingPage .hero-showcase {
      position: relative;
      overflow: hidden;
      min-height: 100svh;
      padding: 132px 0 74px;
      background: #030712;
      isolation: isolate;
    }

    #landingPage .hero-showcase::before,
    #landingPage .hero-showcase::after {
      content: none !important;
    }

    #landingPage .hero-video-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }

    #landingPage .hero-bg-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: saturate(1.05) contrast(1.02);
      transform: scale(1.01);
    }

    #landingPage .hero-video-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(102deg,
          rgba(2, 6, 23, 0.68) 10%,
          rgba(2, 6, 23, 0.44) 48%,
          rgba(15, 23, 42, 0.22) 100%);
    }

    #landingPage .hero-video-glow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(680px 340px at 84% 15%,
          rgba(96, 165, 250, 0.34),
          transparent 66%),
        radial-gradient(620px 300px at 14% 88%,
          rgba(239, 68, 68, 0.2),
          transparent 64%);
      mix-blend-mode: screen;
    }

    #landingPage .hero-showcase .hero-inner {
      position: relative;
      z-index: 2;
    }

    #landingPage .hero-showcase .hero-grid {
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      gap: 32px;
      align-items: start;
    }

    #landingPage .hero-copy {
      min-width: 0;
      max-width: 720px;
    }

    #landingPage .hero-showcase .hero-badge {
      margin-bottom: 18px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.24);
    }

    #landingPage .hero-showcase .hero-sub {
      margin-bottom: 24px;
    }

    #landingPage .hero-showcase .hero-trust {
      margin-top: 22px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      max-width: 560px;
    }

    #landingPage .hero-showcase .tp {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 56px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.24);
      background: rgba(255, 255, 255, 0.12);
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 700;
    }

    #landingPage .hero-showcase .ti {
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: rgba(255, 255, 255, 0.18) !important;
      border: 1px solid rgba(255, 255, 255, 0.28);
      color: #fff;
    }

    #landingPage .hero-showcase .tp-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.25;
    }

    #landingPage .hero-showcase .tp-k {
      font-size: 11px;
      font-weight: 700;
      color: #bfdbfe;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    #landingPage .hero-showcase .tp-v {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #landingPage .hero-showcase .fl-badge {
      margin-top: 20px;
      font-size: 11px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    #landingPage .hero-variant-switch {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
      margin-bottom: 14px;
    }

    #landingPage .hero-v-btn {
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(15, 23, 42, 0.65);
      color: #dbeafe;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 999px;
      padding: 7px 12px;
      cursor: pointer;
      transition: all 0.2s var(--ease);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    #landingPage .hero-v-btn:hover {
      border-color: rgba(255, 255, 255, 0.65);
      color: #ffffff;
      transform: translateY(-1px);
    }

    #landingPage .hero-v-btn.active {
      background: #ffffff;
      color: #1e3a8a;
      border-color: #ffffff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.24);
    }

    #landingPage .hero-services-showcase {
      border-radius: 28px;
      padding: 20px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.34);
      box-shadow: 0 28px 64px rgba(2, 6, 23, 0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      min-width: 0;
    }

    #landingPage .hero-services-head {
      margin-bottom: 14px;
    }

    #landingPage .hero-services-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      padding: 6px 11px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    #landingPage .hero-services-head h3 {
      margin-top: 12px;
      color: #ffffff;
      font-family: "Plus Jakarta Sans", "Outfit", sans-serif;
      font-size: 24px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }

    #landingPage .hero-services-head p {
      margin-top: 6px;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.55;
    }

    #landingPage .hero-services-tabs {
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    #landingPage .hero-services-tabs .tab {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #dbeafe !important;
      border: 1px solid rgba(148, 163, 184, 0.4) !important;
      border-radius: 999px !important;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 12px;
      text-transform: none;
      letter-spacing: 0;
    }

    #landingPage .hero-services-tabs .tab:hover {
      background: rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.6) !important;
    }

    #landingPage .hero-services-tabs .tab.active {
      background: #ffffff !important;
      color: #1e3a8a !important;
      border-color: #ffffff !important;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.35);
    }

    #landingPage .hero-services-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      max-height: 452px;
      overflow: auto;
      padding-right: 2px;
    }

    #landingPage .hero-services-grid .svc {
      background: rgba(255, 255, 255, 0.12) !important;
      border: 1px solid rgba(148, 163, 184, 0.36) !important;
      border-radius: 18px;
      box-shadow: none;
      padding: 16px 14px 14px;
      min-height: 176px;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }

    #landingPage .hero-services-grid .svc:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      border-color: rgba(255, 255, 255, 0.62) !important;
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.34);
      transform: translateY(-2px);
    }

    #landingPage .hero-services-grid .svc-arr {
      width: 26px;
      height: 26px;
      background: rgba(255, 255, 255, 0.12);
      color: #dbeafe;
      border: 1px solid rgba(255, 255, 255, 0.26);
    }

    #landingPage .hero-services-grid .svc:hover .svc-arr {
      background: #ffffff;
      color: #1e3a8a;
      transform: translateX(2px);
    }

    #landingPage .hero-services-grid .svc-ic {
      width: 42px;
      height: 42px;
      font-size: 19px;
      border-radius: 12px;
      margin-bottom: 12px;
      background: rgba(255, 255, 255, 0.15) !important;
      border: 1px solid rgba(255, 255, 255, 0.22);
    }

    #landingPage .hero-services-grid .svc-ic.indigo {
      background: linear-gradient(135deg,
          rgba(99, 102, 241, 0.35),
          rgba(129, 140, 248, 0.3)) !important;
    }

    #landingPage .hero-services-grid .svc-ic.navy {
      background: linear-gradient(135deg,
          rgba(30, 58, 138, 0.45),
          rgba(30, 64, 175, 0.32)) !important;
    }

    #landingPage .hero-services-grid .svc h3 {
      color: #ffffff !important;
      font-size: 15px;
      line-height: 1.3;
      margin-bottom: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #landingPage .hero-services-grid .svc p {
      color: #cbd5e1 !important;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #landingPage .hero-services-grid .svc-pr {
      color: #ffffff !important;
      font-size: 13px;
    }

    #landingPage .hero-services-grid .svc-pr span {
      color: #bfdbfe !important;
      font-size: 11px;
    }

    body.hero-variant-v2 #landingPage .hero-showcase .hero-grid {
      grid-template-columns: 1fr;
      gap: 22px;
    }

    body.hero-variant-v2 #landingPage .hero-copy {
      max-width: 900px;
    }

    body.hero-variant-v2 #landingPage .hero-services-showcase {
      padding: 18px 16px;
    }

    body.hero-variant-v2 #landingPage .hero-services-grid {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: hidden;
      max-height: none;
      padding-bottom: 6px;
    }

    body.hero-variant-v2 #landingPage .hero-services-grid .svc {
      min-width: 262px;
      flex: 0 0 262px;
    }

    body.hero-variant-v3 #landingPage .hero-showcase .hero-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    body.hero-variant-v3 #landingPage .hero-services-showcase {
      background: rgba(2, 6, 23, 0.8);
      border-color: rgba(96, 165, 250, 0.45);
    }

    body.hero-variant-v3 #landingPage .hero-services-head h3 {
      font-size: 20px;
    }

    body.hero-variant-v3 #landingPage .hero-services-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      max-height: 420px;
    }

    body.hero-variant-v3 #landingPage .hero-services-grid .svc {
      min-height: 158px;
      padding: 14px 12px 12px;
    }

    body.hero-variant-v3 #landingPage .hero-services-grid .svc p {
      -webkit-line-clamp: 2;
      margin-bottom: 10px;
    }

    body.hero-variant-v4 #landingPage .hero-showcase .hero-grid {
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      align-items: stretch;
    }

    body.hero-variant-v4 #landingPage .hero-services-showcase {
      display: grid;
      grid-template-columns: 210px minmax(0, 1fr);
      grid-template-areas:
        "head head"
        "tabs grid";
      gap: 12px;
    }

    body.hero-variant-v4 #landingPage .hero-services-head {
      grid-area: head;
    }

    body.hero-variant-v4 #landingPage .hero-services-tabs {
      grid-area: tabs;
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
      margin-bottom: 0;
    }

    body.hero-variant-v4 #landingPage .hero-services-tabs .tab {
      width: 100%;
      text-align: left;
      justify-content: flex-start;
      padding: 10px 12px;
    }

    body.hero-variant-v4 #landingPage .hero-services-grid {
      grid-area: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-height: 420px;
    }

    body.hero-variant-v5 #landingPage .hero-showcase .hero-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    body.hero-variant-v5 #landingPage .hero-copy {
      margin: 0 auto;
      text-align: center;
      max-width: 940px;
    }

    body.hero-variant-v5 #landingPage .hero-ctas,
    body.hero-variant-v5 #landingPage .hero-trust {
      justify-content: center;
    }

    body.hero-variant-v5 #landingPage .hero-services-head {
      text-align: center;
    }

    body.hero-variant-v5 #landingPage .hero-services-tabs {
      justify-content: center;
    }

    body.hero-variant-v5 #landingPage .hero-services-grid {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      max-height: 438px;
    }

    body.hero-variant-v5 #landingPage .hero-services-grid .svc {
      grid-column: span 4;
      min-height: 168px;
    }

    body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(1) {
      grid-column: span 8;
    }

    body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(2) {
      grid-column: span 4;
    }

    body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(n + 3) {
      grid-column: span 3;
    }

    @media (max-width: 1280px) {
      #landingPage .hero-services-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      body.hero-variant-v3 #landingPage .hero-services-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      body.hero-variant-v5 #landingPage .hero-services-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      body.hero-variant-v5 #landingPage .hero-services-grid .svc,
      body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(1),
      body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(2),
      body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(n + 3) {
        grid-column: span 3;
      }
    }

    @media (max-width: 1100px) {
      #landingPage .hero-showcase {
        padding-top: 124px;
      }

      #landingPage .hero-showcase .hero-grid,
      body.hero-variant-v3 #landingPage .hero-showcase .hero-grid,
      body.hero-variant-v4 #landingPage .hero-showcase .hero-grid {
        grid-template-columns: 1fr;
      }

      #landingPage .hero-services-showcase {
        padding: 16px;
      }

      body.hero-variant-v4 #landingPage .hero-services-showcase {
        grid-template-columns: 1fr;
        grid-template-areas:
          "head"
          "tabs"
          "grid";
      }

      body.hero-variant-v4 #landingPage .hero-services-tabs {
        flex-direction: row;
        flex-wrap: wrap;
      }

      body.hero-variant-v4 #landingPage .hero-services-tabs .tab {
        width: auto;
        text-align: center;
      }
    }

    @media (max-width: 760px) {
      #landingPage .hero-variant-switch {
        justify-content: flex-start;
      }

      #landingPage .hero-v-btn {
        padding: 6px 10px;
        font-size: 10px;
      }

      #landingPage .hero-services-head h3 {
        font-size: 20px;
      }

      #landingPage .hero-services-grid,
      body.hero-variant-v3 #landingPage .hero-services-grid,
      body.hero-variant-v4 #landingPage .hero-services-grid,
      body.hero-variant-v5 #landingPage .hero-services-grid {
        grid-template-columns: 1fr;
        max-height: 420px;
      }

      #landingPage .hero-services-grid .svc,
      body.hero-variant-v2 #landingPage .hero-services-grid .svc,
      body.hero-variant-v5 #landingPage .hero-services-grid .svc,
      body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(1),
      body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(2),
      body.hero-variant-v5 #landingPage .hero-services-grid .svc:nth-child(n + 3) {
        min-width: 100%;
        grid-column: auto;
      }

      #landingPage .hero-showcase .hero-trust {
        grid-template-columns: 1fr;
        max-width: 100%;
      }

      #landingPage .hero-showcase .tp-v {
        white-space: normal;
      }
    }

    /* --- USER REQUESTED FIXES --- */

    /* --- HERO SECTION: ALWAYS DARK --- */
    /* This section should never change color regardless of Theme toggle */
    #landingPage .hero h1 {
      color: #ffffff !important;
    }

    #landingPage .hero-sub {
      color: rgba(226, 232, 240, 0.92) !important;
    }

    #landingPage .hero::after {
      background-image:
        radial-gradient(circle, rgba(59, 130, 246, 0.54), transparent 38%),
        radial-gradient(circle, rgba(239, 68, 68, 0.22), transparent 36%) !important;
    }

    #landingPage .hero {
      background: #0b1120 !important;
    }

    #landingPage .hero::before {
      background:
        linear-gradient(108deg,
          rgba(2, 6, 23, 0.92) 20%,
          rgba(15, 23, 42, 0.74) 58%,
          rgba(30, 64, 175, 0.5) 100%),
        url("/assets/hero_dark.png") center/cover no-repeat !important;
    }

    #landingPage .hero-ctas .btn-outline {
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      background: rgba(255, 255, 255, 0.09) !important;
    }

    #landingPage .hero-services-showcase {
      background: rgba(15, 23, 42, 0.7) !important;
      border: 1px solid rgba(148, 163, 184, 0.34) !important;
    }

    #landingPage .hero-services-head h3 {
      color: #ffffff !important;
    }

    #landingPage .hero-services-head p {
      color: #cbd5e1 !important;
    }

    #landingPage .hero-services-grid .svc {
      background: rgba(255, 255, 255, 0.12) !important;
      border: 1px solid rgba(148, 163, 184, 0.36) !important;
    }

    #landingPage .hero-services-grid .svc:hover {
      background: rgba(255, 255, 255, 0.2) !important;
    }

    #landingPage .hero-services-grid .svc h3 {
      color: #ffffff !important;
    }

    #landingPage .hero-services-grid .svc p {
      color: #cbd5e1 !important;
    }

    #landingPage .hero-services-tabs .tab {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #dbeafe !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    #landingPage .hero-services-tabs .tab.active {
      background: #ffffff !important;
      color: #1e3a8a !important;
    }

    #landingPage .hero-badge {
      background: rgba(255, 255, 255, 0.14) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
      color: #ffffff !important;
    }

    #landingPage .tp .tp-k {
      color: #ffffff !important;
    }

    #landingPage .tp .tp-v {
      color: #94a3b8 !important;
    }

    #landingPage .ti {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    #landingPage .fl-badge {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }

    /* Keep Nav dark when over the Hero in light mode */
    .light-theme nav:not(.scrolled) {
      background: rgba(0, 0, 0, 0.7) !important;
      backdrop-filter: blur(20px) !important;
      border-bottom-color: rgba(255, 255, 255, 0.1) !important;
    }

    .light-theme nav:not(.scrolled) .nav-brand-top,
    .light-theme nav:not(.scrolled) .nav-links a,
    .light-theme nav:not(.scrolled) .btn-ghost,
    .light-theme nav:not(.scrolled) .mobile-toggle {
      color: #ffffff !important;
    }

    /* 3. For light mode, everything under hero is fine as it is. */

    /* 4. For dark mode however, change all the light sections and backgrounds to dark. */
    body:not(.light-theme) #mainNav.scrolled {
      background: rgba(2, 6, 23, 0.95) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    body:not(.light-theme) #mainNav.scrolled .nav-brand-top {
      color: #ffffff !important;
    }

    body:not(.light-theme) #mainNav.scrolled .nav-links a {
      color: #e2e8f0 !important;
    }

    body:not(.light-theme) #mainNav.scrolled .nav-links a:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.1) !important;
    }

    body:not(.light-theme) #mainNav.scrolled .btn-ghost,
    body:not(.light-theme) #mainNav.scrolled .mobile-toggle {
      color: #ffffff !important;
    }

    body:not(.light-theme) #mainNav.scrolled .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    body:not(.light-theme) #landingPage .safety-bar {
      background: #020617 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    body:not(.light-theme) #landingPage .safety-bg {
      background: linear-gradient(90deg,
          rgba(16, 185, 129, 0.15) 0%,
          transparent 25%,
          transparent 75%,
          rgba(245, 158, 11, 0.15) 100%) !important;
    }

    body:not(.light-theme) #landingPage .sb-item {
      color: rgba(255, 255, 255, 0.9) !important;
    }

    body:not(.light-theme) #landingPage .marquee-section {
      background: #0b1221 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    body:not(.light-theme) #landingPage .marquee-item {
      background: rgba(255, 255, 255, 0.05) !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      color: rgba(255, 255, 255, 0.5) !important;
    }

    body:not(.light-theme) #landingPage .radiology,
    body:not(.light-theme) #landingPage .how-section,
    body:not(.light-theme) #landingPage .services,
    body:not(.light-theme) #landingPage .protocol-section,
    body:not(.light-theme) #landingPage .pricing,
    body:not(.light-theme) #clinicians {
      background-color: #020617 !important;
    }

    body:not(.light-theme) #landingPage .sec-title,
    body:not(.light-theme) #landingPage .services .sec-title,
    body:not(.light-theme) #landingPage .protocol-section .sec-title,
    body:not(.light-theme) #landingPage .pricing .sec-title {
      color: #ffffff !important;
    }

    body:not(.light-theme) #landingPage .sec-sub,
    body:not(.light-theme) #landingPage .services .sec-sub,
    body:not(.light-theme) #landingPage .pricing .sec-sub {
      color: #94a3b8 !important;
    }

    body:not(.light-theme) #landingPage .sec-eye {
      color: #60a5fa !important;
    }

    body:not(.light-theme) #landingPage .rad-card,
    body:not(.light-theme) #landingPage .svc,
    body:not(.light-theme) #landingPage .pc,
    body:not(.light-theme) #landingPage .pr-card {
      background-color: #0f172a !important;
      border-color: #1e293b !important;
    }

    body:not(.light-theme) #landingPage .rad-card:hover,
    body:not(.light-theme) #landingPage .svc:hover,
    body:not(.light-theme) #landingPage .pc:hover {
      background-color: #1e293b !important;
      border-color: #334155 !important;
    }

    body:not(.light-theme) #landingPage .rad-card h3,
    body:not(.light-theme) #landingPage .pc h3,
    body:not(.light-theme) #landingPage .svc h3 {
      color: #ffffff !important;
    }

    body:not(.light-theme) #landingPage .rad-card .rd,
    body:not(.light-theme) #landingPage .pc .pcd,
    body:not(.light-theme) #landingPage .pc .pca,
    body:not(.light-theme) #landingPage .pc .pcf li,
    body:not(.light-theme) #landingPage .svc p {
      color: #94a3b8 !important;
    }

    body:not(.light-theme) #landingPage .tab {
      background: transparent !important;
      color: #94a3b8 !important;
      border-color: #334155 !important;
    }

    body:not(.light-theme) #landingPage .tab:hover {
      color: #ffffff !important;
      border-color: #ffffff !important;
    }

    body:not(.light-theme) #landingPage .tab.active {
      background: #ffffff !important;
      color: #000000 !important;
    }

    /* Testimonials & Footer */
    body:not(.light-theme) #landingPage .testimonials {
      background: #020617 !important;
    }

    body:not(.light-theme) #landingPage .testimonials .sec-title {
      color: #ffffff !important;
    }

    body:not(.light-theme) #landingPage .testimonials .sec-sub {
      color: #94a3b8 !important;
    }

    body:not(.light-theme) #landingPage .tc {
      background: #0f172a !important;
      border-color: #1e293b !important;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4) !important;
    }

    body:not(.light-theme) #landingPage .tc:hover {
      background: #111827 !important;
      border-color: #334155 !important;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5) !important;
    }

    body:not(.light-theme) #landingPage .tc blockquote {
      color: #e2e8f0 !important;
    }

    body:not(.light-theme) #landingPage .tc-name {
      color: #ffffff !important;
    }

    body:not(.light-theme) #landingPage .tc-det {
      color: #94a3b8 !important;
    }

    body:not(.light-theme) #landingPage .tc-stars {
      color: #fbbf24 !important;
    }

    body:not(.light-theme) #landingPage .tc-av {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
    }

    body:not(.light-theme) #landingPage .cta-section {
      background-color: #020617 !important;
    }

    body:not(.light-theme) #landingPage footer {
      background: #000000 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    body:not(.light-theme) #landingPage footer .footer-brand-text {
      color: #94a3b8 !important;
    }

    body:not(.light-theme) #landingPage footer h4 {
      color: rgba(255, 255, 255, 0.7) !important;
    }

    body:not(.light-theme) #landingPage footer a {
      color: rgba(255, 255, 255, 0.4) !important;
    }

    body:not(.light-theme) #landingPage footer a:hover {
      color: #ffffff !important;
    }
`;
