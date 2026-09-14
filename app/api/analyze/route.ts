import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

const SYSTEM_PROMPT = `
You are a senior GRC and information security advisor helping early-stage SaaS companies improve security readiness.

You are NOT a certification auditor. Never claim an organization is compliant or non-compliant with ISO 27001, SOC 2, or any other standard.

Analyze the assessment responses and provide practical, prioritized recommendations.

For each gap:
- explain the current state
- explain why it matters
- assign Critical, High, Medium, or Low priority
- recommend practical actions
- suggest evidence the company could maintain
- estimate effort as Quick Win, Moderate, or Significant

Prioritize by security impact, enterprise customer expectations, ease of implementation, and dependencies.

Do not invent facts, certifications, incidents, policies, technologies, customers, or evidence.

Return valid JSON only:
{
  "executive_summary": "string",
  "enterprise_readiness_score": number,
  "top_risks": [
    {
      "title": "string",
      "domain": "string",
      "priority": "Critical|High|Medium|Low",
      "current_state": "string",
      "why_it_matters": "string",
      "recommendation": ["string"],
      "evidence": ["string"],
      "effort": "Quick Win|Moderate|Significant"
    }
  ],
  "thirty_day_plan": {
    "week_1": ["string"],
    "week_2": ["string"],
    "week_3": ["string"],
    "week_4": ["string"]
  }
}
`;

async function saveAssessment(data: any, report: any) {
  try {
    const db = supabaseAdmin();
    const { data: row, error } = await db.from("assessments").insert({
      email: data.email || null,
      company_size: data.profile?.companySize || null,
      company_type: data.profile?.companyType || null,
      market: data.profile?.market || null,
      goals: data.profile?.goals || [],
      score: data.score,
      domain_scores: data.domainScores || [],
      responses: data.responses || [],
      ai_report: report
    }).select("id").single();
    if (error) throw error;
    return row.id;
  } catch (e) {
    console.error("Assessment persistence failed:", e);
    return null;
  }
}

function fallback(data: any) {
  const weak = (data.domainScores || []).filter((d: any) => d.score < 60).sort((a: any,b: any)=>a.score-b.score).slice(0,5);
  const risks = weak.map((d: any) => ({
    title: `${d.domain} needs attention`,
    domain: d.domain,
    priority: d.score < 30 ? "Critical" : d.score < 50 ? "High" : "Medium",
    current_state: `The assessment recorded a readiness score of ${d.score}% for this domain.`,
    why_it_matters: "Weaknesses in this area can create security, audit, or enterprise customer-review friction.",
    recommendation: [
      `Document the current state for ${d.domain}.`,
      `Assign an owner and target date.`,
      "Collect evidence showing the control is implemented and operating."
    ],
    evidence: ["Approved procedure or policy", "Control record or review evidence", "Remediation record where applicable"],
    effort: d.score < 30 ? "Moderate" : "Quick Win"
  }));
  const es = Math.max(0, Math.min(100, Math.round((data.score || 0) * 0.9)));
  return {
    executive_summary: `Your overall Security Readiness Score is ${data.score}/100. The assessment highlights ${weak.length} domain${weak.length === 1 ? "" : "s"} below 60% that should be prioritized before a formal enterprise security review.`,
    enterprise_readiness_score: es,
    top_risks: risks,
    thirty_day_plan: {
      week_1: ["Assign owners for the highest-priority gaps.", "Establish or update the security risk register.", "Document key assets and critical systems."],
      week_2: ["Complete access reviews.", "Identify and classify critical vendors.", "Document remediation actions for open gaps."],
      week_3: ["Review incident response readiness.", "Validate critical backup and recovery processes.", "Close quick-win control gaps."],
      week_4: ["Organize control evidence.", "Review policies and procedures.", "Prepare responses for common enterprise security questions."]
    }
  };
}

// Only a preview goes to the client before payment. The full report (top_risks detail,
// evidence, 30-day plan) stays server-side in Supabase and is only released by
// /api/report once the assessment is confirmed paid.
function previewOf(report: any) {
  return {
    executive_summary: report?.executive_summary ?? null,
    enterprise_readiness_score: report?.enterprise_readiness_score ?? null,
    top_risk_title: report?.top_risks?.[0]?.title ?? null
  };
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data || typeof data.score !== "number") {
      return NextResponse.json({ error: "Invalid assessment payload" }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!key) {
      const report = fallback(data);
      const assessmentId = await saveAssessment(data, report);
      return NextResponse.json({ source: "fallback", preview: previewOf(report), assessmentId });
    }

    const userPrompt = `
Company profile:
${JSON.stringify(data.profile || {}, null, 2)}

Overall score: ${data.score}/100

Domain scores:
${JSON.stringify(data.domainScores || [], null, 2)}

Assessment responses:
${JSON.stringify(data.responses || [], null, 2)}

Generate the personalized report using only the supplied information.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("AI API error", detail);
      const report = fallback(data);
      const assessmentId = await saveAssessment(data, report);
      return NextResponse.json({ source: "fallback", preview: previewOf(report), assessmentId });
    }

    const json = await response.json();
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      const report = fallback(data);
      const assessmentId = await saveAssessment(data, report);
      return NextResponse.json({ source: "fallback", preview: previewOf(report), assessmentId });
    }

    let report: any;
    let source: "ai" | "fallback" = "ai";
    try {
      report = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response as JSON", e);
      report = fallback(data);
      source = "fallback";
    }
    const assessmentId = await saveAssessment(data, report);
    return NextResponse.json({ source, preview: previewOf(report), assessmentId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not generate report" }, { status: 500 });
  }
}
