 "use client";

import { useMemo, useState } from "react";

type Answer = "yes" | "partial" | "no" | "unsure";

type Question = {
  id: number;
  domain: string;
  text: string;
};

const questions: Question[] = [
  { id: 1, domain: "Governance", text: "Does someone formally own information security for your organization?" },
  { id: 2, domain: "Governance", text: "Do you have documented and approved information security policies that are reviewed periodically?" },
  { id: 3, domain: "Asset Management", text: "Do you maintain an inventory of important systems, applications, devices and data assets?" },
  { id: 4, domain: "Access Management", text: "Do you have a formal process for granting, changing and removing employee access?" },
  { id: 5, domain: "Access Management", text: "Do you periodically review user access to critical systems?" },
  { id: 6, domain: "Identity", text: "Is multi-factor authentication enabled for critical systems and privileged accounts?" },
  { id: 7, domain: "Security Awareness", text: "Do employees receive security awareness training at least annually?" },
  { id: 8, domain: "Incident Management", text: "Do you have a documented incident response plan and process?" },
  { id: 9, domain: "Business Continuity", text: "Are critical data backups performed regularly and is recovery tested periodically?" },
  { id: 10, domain: "Risk Management", text: "Do you maintain a documented security risk register with owners and mitigation plans?" },
  { id: 11, domain: "TPRM", text: "Do you assess security risks before onboarding important vendors or service providers?" },
  { id: 12, domain: "TPRM", text: "Do you periodically review the security posture of critical vendors?" },
  { id: 13, domain: "Security Operations", text: "Do you regularly identify, prioritize and remediate vulnerabilities in your systems?" },
  { id: 14, domain: "Change Management", text: "Are significant production or system changes reviewed and controlled through a defined process?" },
  { id: 15, domain: "Audit Readiness", text: "Can you quickly produce evidence demonstrating that your security controls are operating?" }
];

const value: Record<Answer, number> = { yes: 1, partial: 0.5, no: 0, unsure: 0 };

export default function QuickScan() {
  const [step, setStep] = useState<"landing" | "profile" | "assessment" | "result">("landing");
  const [companySize, setCompanySize] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [market, setMarket] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [email, setEmail] = useState("");
  const [aiReport, setAiReport] = useState<any>(null);
  const [fullReport, setFullReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const score = useMemo(() => {
    const total = questions.reduce((sum, q) => sum + (value[answers[q.id]] ?? 0), 0);
    return Math.round((total / questions.length) * 100);
  }, [answers]);

  const unanswered = questions.filter(q => !answers[q.id]).length;

  const domainScores = useMemo(() => {
    const map: Record<string, { got: number; max: number }> = {};
    questions.forEach(q => {
      map[q.domain] ??= { got: 0, max: 0 };
      map[q.domain].max += 1;
      map[q.domain].got += value[answers[q.id]] ?? 0;
    });
    return Object.entries(map).map(([domain, x]) => ({
      domain,
      score: Math.round((x.got / x.max) * 100)
    }));
  }, [answers]);

  const weakDomains = domainScores.filter(d => d.score < 60).sort((a, b) => a.score - b.score);

  function label(s: number) {
    if (s < 40) return ["High Risk / Early Stage", "Your security program has significant foundational gaps."];
    if (s < 60) return ["Developing", "Core controls exist, but several areas need attention before enterprise security reviews."];
    if (s < 80) return ["Established", "Your security foundation is reasonably mature, but important gaps remain."];
    return ["Strong", "Your organization demonstrates a relatively mature security foundation. Validate remaining gaps against your specific requirements."];
  }

  async function generateReport() {
    setAiLoading(true);
    setAiError("");
    try {
      const payload = {
        score,
        profile: { companySize, companyType, market, goals },
        domainScores,
        responses: questions.map(q => ({
          id: q.id,
          domain: q.domain,
          question: q.text,
          answer: answers[q.id]
        })),
        email
      };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report generation failed");
      setAiReport(data.preview);
      setAssessmentId(data.assessmentId || null);
    } catch (e: any) {
      setAiError(e.message || "Could not generate report.");
    } finally {
      setAiLoading(false);
    }
  }

  async function startCheckout() {
    if (!assessmentId) {
      setAiError("Generate your report first.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start checkout");
      window.location.href = data.purchaseUrl;
    } catch (e: any) {
      setAiError(e.message || "Unable to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function refreshPaidStatus() {
    if (!assessmentId) return;
    try {
      const res = await fetch(`/api/report-status?assessmentId=${encodeURIComponent(assessmentId)}`);
      const data = await res.json();
      const isPaid = !!data.paid;
      setPaid(isPaid);
      if (isPaid) {
        const reportRes = await fetch(`/api/report?assessmentId=${encodeURIComponent(assessmentId)}`);
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          setFullReport(reportData.report);
        }
      }
    } catch (e: any) {
      setAiError("Could not check payment status. Please try again.");
    }
  }

  function toggleGoal(g: string) {
    setGoals(x => x.includes(g) ? x.filter(v => v !== g) : [...x, g]);
  }

  if (step === "landing") return (
    <main className="shell">
      <nav className="nav"><div className="brand">GRC <span>QuickScan</span></div><div className="pill">10-minute assessment</div></nav>
      <section className="hero">
        <div className="eyebrow">STARTUP SECURITY READINESS</div>
        <h1>Could your startup pass an enterprise security review?</h1>
        <p className="lead">Find your biggest security and compliance gaps in 10 minutes — before your customer finds them.</p>
        <button className="primary" onClick={() => setStep("profile")}>Get My Free Security Score →</button>
        <p className="subtle">No credit card required · Informational readiness assessment</p>
      </section>
      <section className="cards">
        <div className="card"><b>🔐 Readiness Score</b><p>See where your security program stands.</p></div>
        <div className="card"><b>🔴 Critical Gaps</b><p>Identify the controls that need attention first.</p></div>
        <div className="card"><b>🏢 Enterprise Readiness</b><p>Spot areas likely to create friction in customer security reviews.</p></div>
      </section>
      <section className="why">
        <h2>Enterprise customers ask difficult security questions.</h2>
        <p>Do you perform access reviews? How do you manage vendors? Do you test backups? Can you produce evidence quickly?</p>
        <p><strong>GRC QuickScan turns those questions into a simple, prioritized action list.</strong></p>
      </section>
    </main>
  );

  if (step === "profile") return (
    <main className="shell narrow">
      <Header />
      <div className="panel">
        <div className="step">STEP 1 OF 2</div>
        <h2>Tell us about your company</h2>
        <p className="muted">This helps make the readiness result more relevant.</p>
        <label>Company size<select value={companySize} onChange={e => setCompanySize(e.target.value)}><option value="">Select</option><option>1–10</option><option>11–50</option><option>51–200</option><option>201+</option></select></label>
        <label>Company type<select value={companyType} onChange={e => setCompanyType(e.target.value)}><option value="">Select</option><option>SaaS</option><option>Fintech</option><option>Healthtech</option><option>E-commerce</option><option>Marketplace</option><option>Other</option></select></label>
        <label>Primary market<select value={market} onChange={e => setMarket(e.target.value)}><option value="">Select</option><option>India</option><option>US</option><option>Europe</option><option>Global</option></select></label>
        <label>What are you preparing for?</label>
        <div className="checks">{["Enterprise customers","ISO 27001","SOC 2","Customer security questionnaires","General security maturity"].map(g => <button key={g} className={goals.includes(g) ? "check selected" : "check"} onClick={() => toggleGoal(g)}>{goals.includes(g) ? "✓" : "○"} {g}</button>)}</div>
        <button className="primary full" disabled={!companySize || !companyType || !market} onClick={() => setStep("assessment")}>Start Assessment →</button>
      </div>
    </main>
  );

  if (step === "assessment") return (
    <main className="shell">
      <Header />
      <div className="assessmentHead">
        <div><div className="step">STEP 2 OF 2</div><h2>Security readiness assessment</h2></div>
        <div className="counter">{15 - unanswered}/15 answered</div>
      </div>
      <div className="questions">
        {questions.map((q, i) => (
          <div className="question" key={q.id}>
            <div className="qnum">{String(i + 1).padStart(2, "0")}</div>
            <div className="qbody"><div className="domain">{q.domain}</div><h3>{q.text}</h3>
              <div className="answers">{(["yes","partial","no","unsure"] as Answer[]).map(a =>
                <button key={a} className={answers[q.id] === a ? "answer active" : "answer"} onClick={() => setAnswers({...answers, [q.id]: a})}>
                  {a === "yes" ? "Yes" : a === "partial" ? "Partially" : a === "no" ? "No" : "Not sure"}
                </button>
              )}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky"><button className="primary" disabled={unanswered > 0} onClick={() => setStep("result")}>{unanswered ? `${unanswered} questions remaining` : "See My Score →"}</button></div>
    </main>
  );

  const [headline, detail] = label(score);

  const priorities = domainScores
    .filter(d => d.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const enterpriseQuestions = [
    { q: "Do you conduct periodic access reviews?", domain: "Access Management" },
    { q: "Do you assess security risk before onboarding critical vendors?", domain: "TPRM" },
    { q: "Do you have a documented incident response process?", domain: "Incident Management" },
    { q: "Are backups and recovery tested periodically?", domain: "Business Continuity" },
    { q: "Can you produce evidence that controls are operating?", domain: "Audit Readiness" }
  ];

  const readinessFor = (domain: string) =>
    domainScores.find(d => d.domain === domain)?.score ?? 0;

  return (
    <main className="shell">
      <Header />
      <section className="resultHero">
        <div className="step">YOUR RESULTS</div>
        <h1>Your Security Readiness Score</h1>
        <div className="score">{score}<span>/100</span></div>
        <div className="status">{score < 40 ? "🔴" : score < 60 ? "🟠" : score < 80 ? "🟡" : "🟢"} {headline}</div>
        <p className="lead">{detail}</p>
      </section>

      <section className="resultGrid">
        <div className="panel">
          <div className="eyebrow">SECURITY MATURITY</div>
          <h2>Domain readiness</h2>
          {domainScores.map(d => (
            <div className="barrow" key={d.domain}>
              <div><span>{d.domain}</span><b>{d.score}%</b></div>
              <div className="bar"><i style={{width: `${d.score}%`}} /></div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="eyebrow">PRIORITIZED FINDINGS</div>
          <h2>Your biggest gaps</h2>
          {priorities.map((d, i) => (
            <div className="gap" key={d.domain}>
              <span>{i < 2 ? "🔴" : "🟠"}</span>
              <div>
                <b>{d.domain}</b>
                <p>{d.score === 0 ? "No positive controls were recorded in this area." : `Current readiness is ${d.score}%. Review this area before an enterprise security assessment.`}</p>
              </div>
            </div>
          ))}
          {priorities.length === 0 && <p>Great foundation — no major domain scored below 80%.</p>}
        </div>
      </section>

      <section className="panel enterprise">
        <div className="enterpriseHeader">
          <div>
            <div className="eyebrow">ENTERPRISE DEAL READINESS</div>
            <h2>Questions your customer may ask</h2>
            <p className="muted">A practical view of common security-review areas based on your answers.</p>
          </div>
          <div className="miniScore"><strong>{Math.round(domainScores.reduce((a, d) => a + d.score, 0) / domainScores.length)}</strong><span>/100</span></div>
        </div>
        <div className="dealTable">
          {enterpriseQuestions.map(item => {
            const s = readinessFor(item.domain);
            return (
              <div className="dealRow" key={item.q}>
                <div><b>{item.q}</b><span>{item.domain}</span></div>
                <strong className={s >= 80 ? "good" : s >= 50 ? "warn" : "bad"}>
                  {s >= 80 ? "🟢 Ready" : s >= 50 ? "🟠 Partial" : "🔴 Gap"}
                </strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel actionPreview">
        <div className="eyebrow">WHAT TO FIX FIRST</div>
        <h2>Your first 30 days</h2>
        <div className="weeks">
          <div><span>WEEK 1</span><b>Foundation</b><p>Assign security ownership, review assets and establish your risk register.</p></div>
          <div><span>WEEK 2</span><b>Access & vendors</b><p>Complete access reviews and identify critical third parties.</p></div>
          <div><span>WEEK 3</span><b>Response & resilience</b><p>Validate incident response and test critical backup/recovery processes.</p></div>
          <div><span>WEEK 4</span><b>Evidence</b><p>Organize policies, control evidence and customer questionnaire responses.</p></div>
        </div>
      </section>

      <section className="aiSection">
        <div className="eyebrow">PERSONALIZED ANALYSIS</div>
        <h2>See what an AI GRC advisor recommends</h2>
        <p className="muted">Your assessment is ready. Generate a personalized report from your actual responses.</p>
        <button className="primary" onClick={generateReport} disabled={aiLoading}>
          {aiLoading ? "Analyzing your assessment…" : "Generate My GRC Report →"}
        </button>
        {aiError && <p className="error">{aiError}</p>}

        {aiReport && (
          <div className="aiReport">
            {!paid && (
              <div className="paywall">
                <div className="eyebrow">REPORT PREVIEW</div>
                <h3>{aiReport.top_risk_title || "Your highest-priority gap"}</h3>
                <p>{aiReport.executive_summary}</p>
                <p className="muted">Your full recommendations, evidence guidance and 30-day action plan are locked until payment is confirmed.</p>
              </div>
            )}
            <div className="reportScore">
              <div><span>Enterprise Deal Readiness</span><strong>{aiReport.enterprise_readiness_score ?? "—"}/100</strong></div>
            </div>
            {paid && fullReport ? <>
            <h3>Executive summary</h3>
            <p>{fullReport.executive_summary}</p>

            <h3>Top risks & recommendations</h3>
            {(fullReport.top_risks || []).map((r: any, i: number) => (
              <article className="riskCard" key={`${r.domain}-${i}`}>
                <div className="riskTop">
                  <div><span className={`priority ${String(r.priority).toLowerCase()}`}>{r.priority}</span><b>{r.title}</b></div>
                  <span>{r.domain}</span>
                </div>
                <p><strong>Current state:</strong> {r.current_state}</p>
                <p><strong>Why it matters:</strong> {r.why_it_matters}</p>
                <p><strong>Recommended actions:</strong></p>
                <ul>{(r.recommendation || []).map((x: string, j: number) => <li key={j}>{x}</li>)}</ul>
                <p><strong>Suggested evidence:</strong> {(r.evidence || []).join(" · ")}</p>
                <p><strong>Effort:</strong> {r.effort}</p>
              </article>
            ))}

            <h3>30-day action plan</h3>
            <div className="weeks">
              {[
                ["WEEK 1", fullReport.thirty_day_plan?.week_1],
                ["WEEK 2", fullReport.thirty_day_plan?.week_2],
                ["WEEK 3", fullReport.thirty_day_plan?.week_3],
                ["WEEK 4", fullReport.thirty_day_plan?.week_4]
              ].map(([title, items]: any) => (
                <div key={title}><span>{title}</span><ul>{(items || []).map((x: string, j: number) => <li key={j}>{x}</li>)}</ul></div>
              ))}
            </div>
            </> : null}
          </div>
        )}
      </section>

      <section className="unlock">
        <div>
          <div className="eyebrow">MONETIZATION READY</div>
          <h2>Turn the analysis into your full client-ready report.</h2>
          <p>In production, this section will be locked until the user completes the Whop purchase.</p>
          <div className="featureList">
            <span>✓ Detailed gap analysis</span>
            <span>✓ Priority ratings</span>
            <span>✓ Enterprise readiness</span>
            <span>✓ Personalized 30-day plan</span>
            <span>✓ Downloadable report</span>
          </div>
        </div>
        <div className="price">
          <strong>$9</strong>
          <span>one-time launch price</span>
          <button className="primary" onClick={startCheckout}>{checkoutLoading ? "Opening checkout…" : "Unlock Full Report →"}</button>
        </div>
      </section>

      {!paid && assessmentId && (
        <div className="paymentCheck">
          <span>Already completed payment?</span>
          <button className="secondary" onClick={refreshPaidStatus}>Check payment status</button>
        </div>
      )}

      <section className="emailbox">
        <h3>Save your result</h3>
        <p>Enter your email to receive your score and assessment summary.</p>
        <div className="emailrow">
          <input placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="secondary" onClick={() => alert(email ? `Saved for ${email}. Connect Supabase/email provider in production.` : "Enter your email first.")}>Save Result</button>
        </div>
      </section>

      <p className="disclaimer">GRC QuickScan is an informational readiness assessment. It does not constitute an audit, certification, legal advice, or a determination of compliance with ISO 27001, SOC 2, or any other standard.</p>
    </main>
  );
}

function Header() {
  return <nav className="nav"><div className="brand">GRC <span>QuickScan</span></div><div className="pill">Startup Security Readiness</div></nav>;
}