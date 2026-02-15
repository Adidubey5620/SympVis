
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  known_conditions?: string[];
}

export interface UserInfo {
  age: number;
  sex: 'male' | 'female' | 'other';
  known_conditions: string[];
  pregnant: boolean;
}

export interface FollowUpAnswer {
  question: string;
  answer: string;
}

export interface TimelineEvent {
  timeframe: string;
  symptom: string;
}

export interface UserSession {
  session_id: string;
  timestamp: string;
  user: UserInfo;
  symptoms_text: string;
  tags: string[];
  timeline?: TimelineEvent[];
  duration_hours: number;
  severity: 'low' | 'medium' | 'high';
  vitals_reported: {
    fever_f: number | null;
    heart_rate: number | null;
  };
  locale: string;
  device: string;
  follow_up_answers?: FollowUpAnswer[];
}

export interface TriageResult {
  session_id: string;
  timestamp: string;
  risk_level: "Green" | "Yellow" | "Red";
  confidence: number;
  confidence_reason: string;
  short_explanation: string;
  supporting_signals: [string, string];
  recommended_action: string;
  recommended_timeline: string;
  override_reason: string | null;
  follow_up_questions: string[] | null;
  is_uncertain: boolean; // Flag for Uncertainty Mode
  export_summary: {
    title: string;
    date_time: string;
    symptoms_text: string;
    symptom_tags: string[];
    user_info: {
      age: number;
      sex: string;
      known_conditions: string[];
    };
    risk_level: string;
    confidence: number;
    one_sentence_reasoning: string;
    supporting_signals: [string, string];
    what_to_do_now: string[];
    when_to_see_doctor: string;
    emergency_signs: string[];
    notes_for_clinician: string;
  };
  safety_disclaimer: string;
}

export enum Step {
  Intro = 0,
  BasicInfo = 1,
  Symptoms = 2,
  Review = 3,
  FollowUp = 4,
  Result = 5
}
