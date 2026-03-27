"use client";

import React, { useState, useEffect, useRef } from "react";
import { iQs } from "@/features/landing/components/landingModalsData";

type Message = {
  id: number;
  type: "bot" | "user";
  text: string;
  isHtml?: boolean;
  options?: string[];
  isElig?: boolean;
  pass?: boolean;
};

export default function AINavigator() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  
  const [aiState, setAiState] = useState("start");
  const [aiCtx, setAiCtx] = useState<Record<string, any>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // DRAG STATE
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - dragStartRef.current.startX;
      const dy = dragStartRef.current.startY - clientY; // Note: bottom-based logic
      
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDraggedRef.current = true;
      }

      let newX = dragStartRef.current.x - dx; // right based
      let newY = dragStartRef.current.y - dy; // bottom based
      
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > maxX) newX = maxX;
      if (newY > maxY) newY = maxY;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStartEvent = (clientX: number, clientY: number) => {
    hasDraggedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      x: position.x,
      y: position.y,
      startX: clientX,
      startY: clientY
    };
  };

  const handleDragStart = (e: React.MouseEvent) => {
    handleDragStartEvent(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStartEvent(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      aiStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const addBotMessage = (text: string, options?: string[], isHtml = false, eligInfo?: { isElig: true, pass: boolean }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: "bot",
        text,
        isHtml,
        options,
        ...eligInfo,
      },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: "user",
        text,
      },
    ]);
  };

  const aiStart = () => {
    setAiState("start");
    setAiCtx({});
    setMessages([]);
    addBotMessage(
      `Hi! I'm your AI Health Navigator. I can help you find the right service, check if you qualify for treatments, or answer questions about our platform.\n\nWhat can I help you with?`,
      [
        "🔍 Check treatment eligibility",
        "💊 Find a service for me",
        "📋 How does it work?",
        "💰 Pricing & plans",
      ]
    );
  };

  const matchSvc = (txt: string) => {
    const t = txt.toLowerCase();
    if (t.includes("weight") || t.includes("glp")) return "weight_loss";
    if (t.includes("erectile") || t.includes("ed")) return "erectile_dysfunction";
    if (t.includes("premature") || t.includes("ejaculation")) return "premature_ejaculation";

    if (t.includes("general")) return "general_visit";
    return "general_visit";
  };

  const askNext = (ctxSnapshot: Record<string, any>) => {
    const q = ctxSnapshot.qs[ctxSnapshot.qi];
    if (q.t === "yn") {
      addBotMessage(q.l, ["Yes", "No"]);
    } else {
      addBotMessage(q.l);
    }
  };

  const showElig = (pass: boolean, msg: string) => {
    setAiState("start");
    addBotMessage(msg, undefined, false, { isElig: true, pass });
  };

  const evalElig = (ctxSnapshot: Record<string, any>) => {
    const k = ctxSnapshot.svcKey;
    const a = ctxSnapshot.answers;
    let block: string[] = [];

    if (k === "weight_loss") {
      if (a.hasMedullaryThyroidCancer) block.push("history of medullary thyroid carcinoma");
      if (a.hasMEN2) block.push("MEN2 syndrome");
      if (a.hasPancreatitis) block.push("pancreatitis");
      if (a.isPregnant) block.push("pregnancy or planning pregnancy");
    } else if (k === "erectile_dysfunction") {
      if (a.takesNitrates) block.push("nitrate medication use (dangerous interaction)");
      if (a.recentStroke) block.push("recent stroke (within 6 months)");
      if (a.recentMI) block.push("recent heart attack (within 6 months)");
    } else if (k === "premature_ejaculation") {
      if (a.onMAOIs) block.push("MAOI medication use");
      if (a.hasSeizureDisorder) block.push("seizure disorder");

    }

    if (block.length > 0) {
      showElig(
        false,
        `Based on your answers, you may have contraindications: <b>${block.join(", ")}</b>. Our protocols flag these for safety.\n\nA provider can still review your case — some conditions can be managed. Want to proceed with a full evaluation?`
      );
    } else {
      showElig(
        true,
        "Great news — based on your screening, you appear to be a good candidate! A board-certified provider will do a full review to confirm.\n\nReady to start your visit?"
      );
    }
  };

  const processInput = (v: string) => {
    let nextState = aiState;
    let nextCtx = { ...aiCtx };

    if (v === "✅ Start a visit" || v.includes("Start a visit") || v.includes("sign up") || v.includes("register") || v.includes("Sign up")) {
      addBotMessage("Great! Let me take you to registration. We're currently serving <b>Florida residents only</b>, with Indiana coming soon.", undefined, true);
      setTimeout(() => {
        window.location.href = "/?#services"; // Or trigger landing modals 
      }, 1200);
    } else if (v.includes("eligibility") || v.includes("qualify") || v.includes("Check treatment") || v.includes("Check my eligibility")) {
      nextState = "elig_svc";
      addBotMessage(
        "Let's check your eligibility. Which treatment are you interested in?",
        [
          "💊 GLP-1 Weight Loss",
          "⚡ Erectile Dysfunction",
          "⏱️ Premature Ejaculation",

          "🩺 General Visit",
        ]
      );
    } else if (v.includes("Find a service") || v.includes("recommend")) {
      nextState = "find";
      addBotMessage("I can help with that! What's your main concern?", [
        "Lose weight",
        "Sexual health",
        "General health question",
        "AI health tools",
      ]);
    } else if (v.includes("How does it work")) {
      addBotMessage(
        "It's simple! 1️⃣ Pick a service, 2️⃣ Complete our safety screening (we check for contraindications automatically), 3️⃣ A board-certified provider reviews your case, 4️⃣ Prescriptions ship to your door in Florida.\n\nEvery treatment follows strict clinical protocols. Would you like to get started?",
        ["✅ Start a visit", "🔍 Check my eligibility first", "💰 See pricing"]
      );
    } else if (v.includes("Pricing") || v.includes("plans") || v.includes("cost") || v.includes("See pricing")) {
      addBotMessage(
        "Our one-time clinical visits:\n\n🩺 <b>General Visit</b> — $79\n💊 <b>GLP-1 Weight Loss</b> — $129\n⚡ <b>Erectile Dysfunction</b> — $79\n📹 <b>Imaging + Video Consult</b> — $449\n\nMembership plans: <b>All Access — Elite — $199</b>.\n\nWant to check eligibility for a specific treatment?",
        ["🔍 Check eligibility", "💰 Membership details", "✅ Start a visit"]
      );
    } else if (v.includes("Membership details")) {
      addBotMessage(
        "Our membership tiers:\n\n🏆 <b>All Access Elite</b> — $199/mo (everything + priority)",
        ["✅ Start a visit", "🔍 Check eligibility", "📋 More details"]
      );
    } else if (aiState === "elig_svc" || v.includes("Check another treatment")) {
      nextState = "elig_state";
      nextCtx.svc = v;
      addBotMessage(
        "Great choice. First — are you a <b>Florida resident</b>? We're currently only licensed in FL.",
        ["Yes, I'm in Florida", "No, I'm in another state"]
      );
    } else if (aiState === "elig_state") {
      if (v.includes("Florida") || v.toLowerCase().includes("yes")) {
        nextCtx.state = "FL";
        nextState = "elig_q";
        nextCtx.qi = 0;
        const svcKey = matchSvc(nextCtx.svc);
        nextCtx.svcKey = svcKey;
        const qs: any = (iQs as any)[svcKey];
        if (qs && qs.length) {
          nextCtx.qs = qs;
          nextCtx.answers = {};
          askNext(nextCtx);
        } else {
          showElig(true, "You're eligible! This service has no specific contraindications to screen for. A provider will do a full review after you submit your visit.");
        }
      } else {
        addBotMessage(`We're not available in your state yet. Want to be notified when we expand?`, ["Yes, notify me", "Check another treatment"]);
        nextState = "start";
      }
    } else if (aiState === "elig_q") {
      const q = nextCtx.qs[nextCtx.qi];
      if (q.t === "yn") {
        nextCtx.answers[q.k] = v.toLowerCase().includes("yes");
      } else {
        nextCtx.answers[q.k] = v;
      }
      nextCtx.qi++;
      if (nextCtx.qi < nextCtx.qs.length) {
        askNext(nextCtx);
      } else {
        evalElig(nextCtx);
      }
    } else if (v.includes("Lose weight") || v.toLowerCase().includes("weight")) {
      addBotMessage("For weight loss, we offer <b>GLP-1 medication consultations</b> at $129/visit. Your provider screens eligibility, creates a titration schedule, and prescribes if appropriate. Medication cost is separate.\n\nWant to check if you qualify?", ["🔍 Check my eligibility", "✅ Start a visit", "💰 Pricing"]);

    } else if (v.includes("Sexual") || v.includes("Erectile") || v.includes("ED") || v.includes("erect")) {
      addBotMessage("We offer:\n\n⚡ <b>Erectile Dysfunction</b> — $79 (sildenafil, tadalafil, custom compounds)\n\nAll medications shipped discreetly after safety screening.", ["🔍 Check eligibility", "✅ Start a visit"]);
    } else if (v.includes("General") || v.includes("sick") || v.includes("cold") || v.includes("flu") || v.includes("health question")) {
      addBotMessage("Our <b>General Visit</b> ($79) covers non-emergent health concerns — medication management, wellness checks, health advice. A board-certified provider reviews your case.\n\nWant to start a visit?", ["✅ Start a visit", "🔍 Check eligibility"]);
    } else if (v.includes("AI") || v.includes("imaging") || v.includes("digital") || v.includes("tools")) {
      addBotMessage("Our AI & digital tools:\n\n🔬 <b>AI Imaging Analysis</b> — $99 (physician-supervised report interpretation)\n\nThese are available to everyone, no state restriction!", ["✅ Start a visit", "💰 Membership plans", "🔍 Check treatment eligibility"]);
    } else if (v.includes("notify")) {
      addBotMessage("We'll let you know as soon as we launch in your state! Our AI tools and digital platform are available nationwide in the meantime.\n\nAnything else I can help with?", ["💊 Find a service", "📋 How does it work?"]);
    } else {
      addBotMessage(
        "I can help you with finding the right treatment, checking eligibility, understanding pricing, or getting started with a visit. What would you like to do?",
        ["🔍 Check treatment eligibility", "💊 Find a service", "💰 Pricing & plans", "✅ Start a visit"]
      );
    }

    setAiState(nextState);
    setAiCtx(nextCtx);
  };

  const handleSend = () => {
    const v = inputValue.trim();
    if (!v) return;
    setInputValue("");
    addUserMessage(v);
    setTimeout(() => {
      processInput(v);
    }, 600);
  };

  const handleOptionClick = (opt: string) => {
    addUserMessage(opt);
    setTimeout(() => {
      processInput(opt);
    }, 600);
  };

  return (
    <div style={{ position: 'fixed', right: `${position.x}px`, bottom: `${position.y}px`, zIndex: 999999 }}>
      <button
        className={`ai-fab ${isOpen ? "open" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          if (!hasDraggedRef.current) setIsOpen(!isOpen);
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
        onDragStart={(e) => e.preventDefault()}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
      >
        <div className="ai-pulse" style={{ pointerEvents: 'none' }}></div>
        <span className="fab-icon" style={{ pointerEvents: 'none' }}>💬</span>
        <span className="fab-close" style={{ pointerEvents: 'none' }}>✕</span>
        <div className="ai-label" style={{ pointerEvents: 'none' }}>Drag or Click</div>
      </button>

      <div className={`ai-chat ${isOpen ? "open" : ""}`} style={{ right: 0, bottom: '80px', position: 'absolute', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}>
        <div 
          className="ai-chat-head" 
          onMouseDown={handleDragStart} 
          onTouchStart={handleTouchStart}
          onDragStart={(e) => e.preventDefault()}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
        >
          <div className="ai-chat-dot">🤖</div>
          <div style={{ flex: 1 }}>
            <div className="ai-chat-title">AI Health Navigator</div>
            <div className="ai-chat-sub">Check eligibility · Find services · Get started</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-white hover:text-indigo-200">✕</button>
        </div>
        <div className="ai-chat-body">
          {messages.map((m) => (
            <div key={m.id} className={`ai-msg ${m.type}`}>
              {m.isElig ? (
                <>
                  <div className={`ai-elig ${m.pass ? "" : "warn"}`}>
                    <h4>{m.pass ? "✅ Likely Eligible" : "⚠️ Review Needed"}</h4>
                    <span dangerouslySetInnerHTML={{ __html: m.text }}></span>
                  </div>
                  <div className="ai-opts" style={{ marginTop: "10px" }}>
                    <button className="ai-opt" onClick={() => handleOptionClick("✅ Start a visit")}>
                      ✅ Start a visit
                    </button>
                    <button className="ai-opt" onClick={() => handleOptionClick("Check another treatment")}>
                      🔍 Check another treatment
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {m.isHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, "<br>") }}></span>
                  ) : (
                    <span>{m.text.split("\n").map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}</span>
                  )}
                  {m.options && (
                    <div className="ai-opts">
                      {m.options.map((opt, i) => (
                        <button key={i} className="ai-opt" onClick={() => handleOptionClick(opt)}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="ai-chat-input">
          <input
            type="text"
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <button onClick={handleSend}>→</button>
        </div>
      </div>
    </div>
  );
}
