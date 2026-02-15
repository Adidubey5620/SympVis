
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { TriageResult, UserSession } from "../types";
import { SYSTEM_INSTRUCTION, URGENT_KEYWORDS } from "../constants";

const checkLayer1Override = (session: UserSession): string[] => {
  const text = session.symptoms_text.toLowerCase();
  const tags = session.tags.map(t => t.toLowerCase());
  const timelineSymptoms = session.timeline?.map(e => e.symptom.toLowerCase()) || [];

  return URGENT_KEYWORDS.filter(keyword =>
    text.includes(keyword.toLowerCase()) ||
    tags.some(tag => tag.includes(keyword.toLowerCase())) ||
    timelineSymptoms.some(ts => ts.includes(keyword.toLowerCase()))
  );
};

export const getTriageResult = async (session: UserSession): Promise<TriageResult> => {
  const detectedUrgent = checkLayer1Override(session);
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION + `
      SMART FOLLOW-UP LOGIC:
      - If your initial assessment is "Yellow", you MUST generate 2 specific "follow_up_questions" in the response to help clarify the risk.
      - Examples: "Is the pain worsening when you take deep breaths?", "Do you have a fever above 100°F?", "Are you feeling more confused than usual?".
      - If "follow_up_answers" are already present in the input, use them to provide the FINAL result and set "follow_up_questions" to null.
      - If the risk is "Red" or "Green", "follow_up_questions" must be null.
      
      TEMPORAL ANALYSIS:
      - Pay close attention to the ORDER of symptoms in the timeline. A progression like "Fever -> Cough -> Shortness of Breath" is significantly more urgent than "Cough -> Fever".
      
      ADDITIONAL TASK:
      - You must also provide a "confidence_reason".
      `,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          session_id: { type: SchemaType.STRING },
          timestamp: { type: SchemaType.STRING },
          risk_level: { type: SchemaType.STRING, enum: ["Green", "Yellow", "Red"], format: "enum" },
          confidence: { type: SchemaType.NUMBER },
          confidence_reason: { type: SchemaType.STRING },
          short_explanation: { type: SchemaType.STRING },
          supporting_signals: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            // minItems/maxItems not supported in standard SchemaType directly in this SDK usually, but let's leave it out or check docs. SchemaType doesn't have minItems etc. 
            // We should trust the model to follow instructions or use standard JSON schema structure if the SDK supports it. 
            // The SDK supports openapi schema. 
          },
          recommended_action: { type: SchemaType.STRING },
          recommended_timeline: { type: SchemaType.STRING },
          override_reason: { type: SchemaType.STRING, nullable: true },
          follow_up_questions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true
          },
          is_uncertain: { type: SchemaType.BOOLEAN },
          export_summary: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              date_time: { type: SchemaType.STRING },
              symptoms_text: { type: SchemaType.STRING },
              symptom_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              user_info: {
                type: SchemaType.OBJECT,
                properties: {
                  age: { type: SchemaType.NUMBER },
                  sex: { type: SchemaType.STRING },
                  known_conditions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                }
              },
              risk_level: { type: SchemaType.STRING },
              confidence: { type: SchemaType.NUMBER },
              one_sentence_reasoning: { type: SchemaType.STRING },
              supporting_signals: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              what_to_do_now: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              when_to_see_doctor: { type: SchemaType.STRING },
              emergency_signs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              notes_for_clinician: { type: SchemaType.STRING }
            }
          },
          safety_disclaimer: { type: SchemaType.STRING }
        },
        required: [
          "session_id", "timestamp", "risk_level", "confidence", "confidence_reason",
          "short_explanation", "supporting_signals", "recommended_action",
          "recommended_timeline", "export_summary", "safety_disclaimer", "is_uncertain"
        ]
      }
    }
  });

  const personalizationContext = `
    CRITICAL CONTEXT:
    User Age: ${session.user.age}
    User Sex: ${session.user.sex}
    Pregnant: ${session.user.pregnant}
    Known Conditions: ${session.user.known_conditions.join(', ') || 'None reported'}
    Vitals: ${session.vitals_reported.fever_f ? session.vitals_reported.fever_f + '°F' : 'No fever reported'}
    Follow-up Answers: ${session.follow_up_answers ? JSON.stringify(session.follow_up_answers) : 'None provided yet'}
    
    TEMPORAL SYMPTOM PROGRESSION (ORDER MATTERS):
    ${session.timeline ? session.timeline.map((e, i) => `${i + 1}. [${e.timeframe}] ${e.symptom}`).join(' -> ') : 'No structured timeline provided'}
  `;

  const result = await model.generateContent(personalizationContext + "\n\n" + JSON.stringify(session));
  const response = await result.response;
  const text = response.text();

  if (!text) throw new Error("No response from AI");

  const parsed = JSON.parse(text) as TriageResult;

  if (detectedUrgent.length > 0) {
    parsed.risk_level = "Red";
    parsed.override_reason = `Rule-based override: detected [${detectedUrgent.join(', ')}]`;
    parsed.follow_up_questions = null;
    parsed.is_uncertain = false;
    if (parsed.confidence < 90) {
      parsed.confidence = 95;
      parsed.confidence_reason = "High confidence: Safety rule override triggered by specific high-risk indicators.";
    }
  }

  return parsed;
};
