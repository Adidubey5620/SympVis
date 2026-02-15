
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StepWizard } from './components/StepWizard';
import { Step, UserSession, TriageResult, UserInfo, AuthUser, FollowUpAnswer, TimelineEvent } from './types';
import { getTriageResult } from './services/geminiService';
import { COMMON_SYMPTOM_TAGS, URGENT_KEYWORDS, INDIAN_EMERGENCY_FACILITIES } from './constants';
import { SignedIn, SignedOut, SignIn, SignUp, UserButton, useUser, useClerk } from "@clerk/clerk-react";
import { jsPDF } from 'jspdf';

const App: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [currentStep, setCurrentStep] = useState<Step>(Step.Intro);
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [showEmergencyFinder, setShowEmergencyFinder] = useState(false);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    age: 30,
    sex: 'female',
    known_conditions: [],
    pregnant: false
  });

  const [symptomData, setSymptomData] = useState({
    text: '',
    tags: [] as string[],
    timeline: [] as TimelineEvent[],
    duration: 1,
    severity: 'medium' as 'low' | 'medium' | 'high',
    fever: '' as string,
    heart_rate: '' as string
  });

  const [newTimelineEvent, setNewTimelineEvent] = useState<TimelineEvent>({ timeframe: '', symptom: '' });

  const [followUpAnswers, setFollowUpAnswers] = useState<FollowUpAnswer[]>([]);
  const [result, setResult] = useState<TriageResult | null>(null);

  const handleStart = () => setCurrentStep(Step.BasicInfo);

  const handleTriage = async (answers?: FollowUpAnswer[]) => {
    setLoading(true);
    setError(null);

    const session: UserSession = {
      session_id: result?.session_id || `ses_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      user: userInfo,
      symptoms_text: symptomData.text,
      tags: symptomData.tags,
      timeline: symptomData.timeline,
      duration_hours: symptomData.duration,
      severity: symptomData.severity,
      vitals_reported: {
        fever_f: symptomData.fever ? parseFloat(symptomData.fever) : null,
        heart_rate: symptomData.heart_rate ? parseInt(symptomData.heart_rate) : null
      },
      locale: 'en-US',
      device: 'web',
      follow_up_answers: answers
    };

    try {
      const data = await getTriageResult(session);
      if (data.risk_level === 'Yellow' && data.follow_up_questions && data.follow_up_questions.length > 0 && !answers) {
        setResult(data);
        setCurrentStep(Step.FollowUp);
      } else {
        setResult(data);
        setCurrentStep(Step.Result);
      }
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setError("Rate limit exceeded. Please wait 30 seconds and try again.");
      } else if (err.message?.includes('403') || err.message?.includes('401')) {
        setError("API Key issue. Please verify your Gemini API key in .env.local.");
      } else {
        setError("Analysis failed. Please try again or check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTriage(followUpAnswers);
  };

  const addTimelineEvent = () => {
    if (newTimelineEvent.timeframe && newTimelineEvent.symptom) {
      setSymptomData({
        ...symptomData,
        timeline: [...symptomData.timeline, newTimelineEvent]
      });
      setNewTimelineEvent({ timeframe: '', symptom: '' });
    }
  };

  const removeTimelineEvent = (index: number) => {
    const updated = [...symptomData.timeline];
    updated.splice(index, 1);
    setSymptomData({ ...symptomData, timeline: updated });
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setPdfGenerating(true);
    try {
      const doc = new jsPDF();
      const summary = result.export_summary;

      doc.setFontSize(22);
      doc.text("SympVis Health Triage Summary", 20, 20);

      doc.setFontSize(10);
      doc.text(`Report ID: ${result.session_id}`, 20, 32);
      doc.text(`Date: ${new Date(result.timestamp).toLocaleString()}`, 20, 38);
      doc.text(`Patient: Age ${userInfo.age}, ${userInfo.sex.toUpperCase()}`, 20, 44);
      doc.line(20, 46, 190, 46);

      doc.setFontSize(16);
      doc.text(`Risk Assessment: ${result.risk_level}`, 20, 56);
      doc.setFontSize(10);
      doc.text(`AI Confidence: ${result.confidence}%`, 20, 64);

      doc.setFontSize(12);
      doc.text("Primary Recommendation:", 20, 75);
      doc.setFontSize(10);
      doc.text(`${result.recommended_action} - ${result.recommended_timeline}`, 20, 82);

      doc.setFontSize(12);
      doc.text("Reported Symptoms:", 20, 95);
      doc.setFontSize(10);
      const splitSymptoms = doc.splitTextToSize(summary.symptoms_text, 170);
      doc.text(splitSymptoms, 20, 102);

      doc.setFontSize(12);
      doc.text("Clinical Reasoning:", 20, 125);
      doc.setFontSize(10);
      const splitReasoning = doc.splitTextToSize(summary.one_sentence_reasoning, 170);
      doc.text(splitReasoning, 20, 132);

      doc.setFontSize(12);
      doc.text("Recommended Next Steps:", 20, 155);
      doc.setFontSize(10);
      let y = 162;
      summary.what_to_do_now.forEach((step, i) => {
        doc.text(`${i + 1}. ${step}`, 20, y);
        y += 7;
      });

      doc.setFontSize(12);
      doc.text("Notes for Healthcare Professional:", 20, 210);
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(summary.notes_for_clinician, 170);
      doc.text(splitNotes, 20, 218);

      doc.setFontSize(7);
      doc.setTextColor(150);
      const splitDisclaimer = doc.splitTextToSize(result.safety_disclaimer, 170);
      doc.text(splitDisclaimer, 20, 275);

      doc.save(`SympVis_Triage_${result.session_id}.pdf`);
    } catch (err) {
      setError("PDF generation failed.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const renderPatientContextStrip = () => {
    if (currentStep === Step.Intro || currentStep === Step.BasicInfo) return null;
    return (
      <div className="mb-6 px-8 py-4 bg-white/50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Age</span>
          <span className="text-sm font-bold text-slate-900 bg-indigo-50 px-3 py-1 rounded-lg">{userInfo.age} Years</span>
        </div>
        <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Biological Sex</span>
          <span className="text-sm font-bold text-slate-900 capitalize bg-indigo-50 px-3 py-1 rounded-lg">{userInfo.sex}</span>
        </div>
        {userInfo.pregnant && (
          <>
            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
            <div className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg uppercase border border-rose-100">Pregnant</div>
          </>
        )}
        <div className="flex-grow flex justify-end">
          <button onClick={() => setCurrentStep(Step.BasicInfo)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Change Profile</button>
        </div>
      </div>
    );
  };

  const renderIntro = () => (
    <div className="max-w-3xl mx-auto py-12 text-center">
      <div className="mb-10 flex justify-center">
        <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 animate-float shadow-inner border border-indigo-100">
          <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      <h2 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
        Health clarity through <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Explainable AI.</span>
      </h2>
      <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-xl mx-auto font-medium">
        Welcome back, <span className="text-slate-900">{user?.fullName}</span>. Start an expert-curated health assessment tailored to your biological profile.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
        <button onClick={handleStart} className="w-full sm:w-auto px-12 py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-2xl shadow-slate-200 transition-premium active:scale-[0.98]">New Health Check</button>
        <button onClick={() => setShowArchitecture(!showArchitecture)} className="w-full sm:w-auto px-12 py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-lg hover:border-indigo-600 hover:bg-indigo-50/30 transition-premium shadow-sm active:scale-[0.98]">Explore Methodology</button>
      </div>

      {showArchitecture && (
        <div className="glass-card rounded-[2.5rem] p-10 text-left animate-in fade-in zoom-in duration-500 border border-indigo-100/50 shadow-2xl shadow-indigo-100/50">
          <h3 className="text-2xl font-bold text-slate-900 mb-10 flex items-center gap-4"><div className="w-8 h-8 bg-indigo-600 rounded-lg"></div>Clinical Safety Layers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              { id: '01', title: 'Hard-coded Red Flags', desc: 'Instant detection of cardiovascular and neurological emergencies.', color: 'bg-rose-100 text-rose-600' },
              { id: '02', title: 'Adaptive Profiling', desc: 'Thresholds shift dynamically based on age and pre-existing conditions.', color: 'bg-indigo-100 text-indigo-600' },
              { id: '03', title: 'Interactive Inquiry', desc: 'Smart follow-ups clarify vague symptoms to reduce uncertainty.', color: 'bg-amber-100 text-amber-600' },
              { id: '04', title: 'Deep Reasoning', desc: 'Explainable output citing verbatim signals from your input.', color: 'bg-emerald-100 text-emerald-600' }
            ].map((layer) => (
              <div key={layer.id} className="group transition-premium">
                <div className={`w-12 h-12 ${layer.color} rounded-2xl flex items-center justify-center font-black mb-4 transition-premium group-hover:scale-110`}>{layer.id}</div>
                <h4 className="font-bold text-slate-900 mb-2">{layer.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="glass-card rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="mb-10">
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Personal Profile</h3>
        <p className="text-slate-400 font-medium mt-1">This context helps the AI adjust clinical sensitivity.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Current Age</label>
          <input type="number" value={userInfo.age} onChange={(e) => setUserInfo({ ...userInfo, age: parseInt(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-premium font-semibold" />
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Biological Sex</label>
          <div className="flex gap-3">
            {['female', 'male', 'other'].map(s => (
              <button key={s} onClick={() => setUserInfo({ ...userInfo, sex: s as any })} className={`flex-1 py-4 rounded-2xl border-2 font-bold capitalize transition-premium ${userInfo.sex === s ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-slate-100 text-slate-400 hover:border-indigo-200"}`}>{s}</button>
            ))}
          </div>
        </div>
        {(userInfo.sex === 'female' || userInfo.sex === 'other') && (
          <div className="md:col-span-2">
            <div className="p-6 bg-rose-50/50 rounded-3xl border border-rose-100 flex items-center justify-between transition-premium">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /><circle cx="12" cy="12" r="5" /></svg></div>
                <div><h4 className="text-base font-bold text-slate-900 leading-none mb-1">Are you currently pregnant?</h4><p className="text-xs text-rose-600 font-medium">Critical for pregnancy-specific risk adjustments.</p></div>
              </div>
              <button onClick={() => setUserInfo({ ...userInfo, pregnant: !userInfo.pregnant })} className={`relative inline-flex h-8 w-14 rounded-full transition-premium ${userInfo.pregnant ? 'bg-rose-500 shadow-lg shadow-rose-100' : 'bg-slate-200'}`}><span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm mt-1 transition-premium ${userInfo.pregnant ? 'translate-x-7' : 'translate-x-1'}`} /></button>
            </div>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Pre-existing Conditions</label>
          <textarea placeholder="e.g., Hypertension, Type 2 Diabetes, COPD..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none min-h-[100px] font-medium" onChange={(e) => setUserInfo({ ...userInfo, known_conditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
        </div>
      </div>
      <div className="mt-12 flex justify-between items-center">
        <button onClick={() => setCurrentStep(Step.Intro)} className="px-8 py-3 text-slate-400 font-bold hover:text-slate-900 transition-premium">Back</button>
        <button onClick={() => setCurrentStep(Step.Symptoms)} className="px-14 py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-premium shadow-xl shadow-slate-200 active:scale-[0.98]">Continue</button>
      </div>
    </div>
  );

  const renderTimelineVisual = (events: TimelineEvent[]) => {
    if (events.length === 0) return null;
    return (
      <div className="py-12 overflow-x-auto no-scrollbar">
        <div className="relative flex items-center min-w-max px-8">
          <div className="absolute top-1/2 left-16 right-16 h-1 bg-gradient-to-r from-indigo-100 via-indigo-600 to-indigo-100 -translate-y-1/2 opacity-30"></div>
          <div className="flex gap-16 relative z-10">
            {events.map((event, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-100 flex items-center justify-center text-white border-4 border-white transition-premium group-hover:scale-110 group-hover:rotate-6">
                    {idx === events.length - 1 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-xs font-black">{idx + 1}</span>
                    )}
                  </div>
                  {idx < events.length - 1 && (
                    <div className="absolute top-1/2 -right-10 translate-x-full text-indigo-300 -translate-y-1/2">
                      <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{event.timeframe}</p>
                  <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-100 shadow-sm transition-premium group-hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{event.symptom}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSymptoms = () => (
    <div className="glass-card rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="mb-10"><h3 className="text-3xl font-bold text-slate-900 tracking-tight">Symptom Assessment</h3><p className="text-slate-400 font-medium mt-1">Provide as much physiological detail as possible.</p></div>

      {renderPatientContextStrip()}

      <div className="space-y-8">
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Symptom Timeline (Progression)</label>
          <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end mb-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">When? (e.g., Day 1)</label>
                <input
                  type="text"
                  placeholder="Day 1"
                  value={newTimelineEvent.timeframe}
                  onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, timeframe: e.target.value })}
                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-semibold"
                />
              </div>
              <div className="sm:col-span-2 flex gap-4">
                <div className="flex-grow">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Symptom (e.g., Sore Throat)</label>
                  <input
                    type="text"
                    placeholder="Sore throat"
                    value={newTimelineEvent.symptom}
                    onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, symptom: e.target.value })}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-semibold"
                  />
                </div>
                <button
                  onClick={addTimelineEvent}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-premium active:scale-95"
                >
                  Add
                </button>
              </div>
            </div>

            {symptomData.timeline.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 mb-4">
                  {symptomData.timeline.map((event, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white pl-4 pr-2 py-2 rounded-2xl border border-slate-100 shadow-sm group animate-in zoom-in-95 duration-200">
                      <span className="text-[10px] font-black text-indigo-600 uppercase">{event.timeframe}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                      <span className="text-sm font-bold text-slate-700">{event.symptom}</span>
                      <button onClick={() => removeTimelineEvent(i)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-premium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-3xl border border-slate-100/50 shadow-inner p-2">
                  {renderTimelineVisual(symptomData.timeline)}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-[2rem]">
                <p className="text-sm text-slate-400 font-medium italic">Map out your symptom progression for a better diagnosis.</p>
                <p className="text-[10px] text-slate-300 uppercase mt-2 font-black tracking-widest">e.g. Day 1 -&gt; Fever, Day 2 -&gt; Cough</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Current State Description</label>
          <textarea value={symptomData.text} onChange={(e) => setSymptomData({ ...symptomData, text: e.target.value })} placeholder="How are you feeling right now? Describe any pain, sensations, or worries..." className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none min-h-[160px] font-medium text-lg leading-relaxed" />
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Select Indicators</label>
          <div className="flex flex-wrap gap-2.5">{COMMON_SYMPTOM_TAGS.map(tag => (<button key={tag} onClick={() => setSymptomData({ ...symptomData, tags: symptomData.tags.includes(tag) ? symptomData.tags.filter(t => t !== tag) : [...symptomData.tags, tag] })} className={`px-5 py-2.5 rounded-xl text-xs font-bold border-2 transition-premium ${symptomData.tags.includes(tag) ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"}`}>{tag}</button>))}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div><label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest">Duration (Hours)</label><input type="number" value={symptomData.duration} onChange={(e) => setSymptomData({ ...symptomData, duration: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold focus:ring-4 focus:ring-indigo-100 outline-none" /></div>
          <div><label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest">Severity Level</label><div className="flex gap-3">{['low', 'medium', 'high'].map(sev => (<button key={sev} onClick={() => setSymptomData({ ...symptomData, severity: sev as any })} className={`flex-1 py-4 rounded-2xl border-2 font-bold capitalize transition-premium ${symptomData.severity === sev ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400"}`}>{sev}</button>))}</div></div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest">Temperature (°F)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g., 98.6"
              value={symptomData.fever}
              onChange={(e) => setSymptomData({ ...symptomData, fever: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold focus:ring-4 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest">Heart Rate (BPM)</label>
            <input
              type="number"
              placeholder="e.g., 72"
              value={symptomData.heart_rate}
              onChange={(e) => setSymptomData({ ...symptomData, heart_rate: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold focus:ring-4 focus:ring-indigo-100 outline-none"
            />
          </div>
        </div>
      </div>
      <div className="mt-12 flex justify-between items-center"><button onClick={() => setCurrentStep(Step.BasicInfo)} className="px-8 py-3 text-slate-400 font-bold hover:text-slate-900 transition-premium">Back</button><button onClick={() => setCurrentStep(Step.Review)} className="px-14 py-5 bg-slate-900 text-white rounded-2xl font-bold transition-premium shadow-xl active:scale-[0.98] disabled:opacity-30" disabled={!symptomData.text.trim()}>Review Data</button></div>
    </div>
  );

  const renderReview = () => (
    <div className="glass-card rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="mb-10"><h3 className="text-3xl font-bold text-slate-900 tracking-tight">Final Confirmation</h3><p className="text-slate-400 font-medium mt-1">Ensuring accuracy before AI analysis.</p></div>

      {renderPatientContextStrip()}

      <div className="space-y-6 mb-12">
        <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
          <p className="text-[10px] font-black text-slate-300 uppercase mb-4 tracking-widest">Symptom Statement & Timeline</p>
          {symptomData.timeline.length > 0 && (
            <div className="mb-8 border-b border-slate-100/50 pb-8 overflow-hidden rounded-[2rem]">
              <div className="bg-white/40 p-2 rounded-[2rem]">
                {renderTimelineVisual(symptomData.timeline)}
              </div>
            </div>
          )}
          <p className="text-xl font-medium text-slate-800 leading-relaxed italic">"{symptomData.text}"</p>
          <div className="flex flex-wrap gap-2 mt-6">{symptomData.tags.map(t => (<span key={t} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase border border-indigo-100">{t}</span>))}</div>
        </div>
      </div>
      {loading ? (<div className="flex flex-col items-center py-12"><div className="w-16 h-16 border-[5px] border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div><p className="text-indigo-600 font-bold text-lg animate-pulse">Running Clinical Reasoning...</p></div>) : (<div className="mt-12 flex flex-col gap-6">{error && <p className="text-rose-600 text-sm font-bold text-center bg-rose-50 p-4 rounded-2xl">{error}</p>}<div className="flex justify-between items-center"><button onClick={() => setCurrentStep(Step.Symptoms)} className="px-10 py-4 text-slate-400 font-bold hover:text-slate-900 transition-premium">Modify</button><button onClick={() => handleTriage()} className="px-16 py-6 bg-indigo-600 text-white rounded-[1.5rem] font-bold shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-premium active:scale-[0.98] text-lg">Start Triage</button></div></div>)}
    </div>
  );

  const renderFollowUp = () => (
    <div className="glass-card rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex items-center gap-5 mb-10">
        <div className="w-14 h-14 bg-amber-50 rounded-[1.25rem] flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Interactive Inquiry</h3>
          <p className="text-slate-400 font-medium mt-1">Refining the clinical model for certainty.</p>
        </div>
      </div>

      <form onSubmit={handleFollowUpSubmit} className="space-y-10">
        {result?.follow_up_questions?.map((q, idx) => (
          <div key={idx} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
            <label className="block text-lg font-bold text-slate-900 mb-6 leading-tight">{q}</label>
            <div className="flex gap-4">
              {['Yes', 'No', 'Unsure'].map(choice => {
                const isSelected = followUpAnswers.find(a => a.question === q)?.answer === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => {
                      const newAnswers = [...followUpAnswers].filter(a => a.question !== q);
                      newAnswers.push({ question: q, answer: choice });
                      setFollowUpAnswers(newAnswers);
                    }}
                    className={`flex-1 py-4 px-6 rounded-2xl text-sm font-bold transition-premium border-2 ${isSelected ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100" : "bg-white border-slate-100 text-slate-400 hover:border-amber-200"
                      }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center pt-8">
          <button type="button" onClick={() => setCurrentStep(Step.Review)} className="text-slate-400 font-bold hover:text-slate-900 transition-premium">Back</button>
          <button
            type="submit"
            disabled={followUpAnswers.length !== (result?.follow_up_questions?.length || 0) || loading}
            className="px-14 py-5 bg-amber-600 text-white rounded-[1.25rem] font-bold shadow-xl active:scale-[0.98] disabled:opacity-30"
          >
            {loading ? "Re-evaluating..." : "Update Results"}
          </button>
        </div>
      </form>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    if (result.is_uncertain) {
      return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="bg-amber-50/50 rounded-[3rem] p-12 border-2 border-amber-200 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-100 rounded-full blur-3xl opacity-50"></div>
            <div className="w-24 h-24 bg-amber-100 rounded-[2rem] flex items-center justify-center text-amber-600 mx-auto mb-10 border border-amber-200 shadow-sm animate-float"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <h3 className="text-3xl font-black text-amber-900 mb-6 uppercase tracking-tight">Uncertainty Guardrail</h3>
            <p className="text-2xl font-bold text-amber-800 leading-relaxed max-w-2xl mx-auto italic">"{result.short_explanation}"</p>
            <div className="mt-12 p-10 bg-white/70 backdrop-blur-md rounded-[2rem] text-left border border-amber-200 shadow-sm max-w-2xl mx-auto"><p className="text-sm font-black text-amber-900 mb-4 uppercase tracking-widest">Safety Analysis</p><p className="text-base text-amber-800/80 leading-relaxed font-medium">Our safety framework detected that the current symptom profile is non-specific or lacks enough biological data to provide a high-confidence triage. To prevent false reassurance, we advise professional clinical consultation.</p></div>
          </div>
          <div className="flex justify-center pt-8 no-print"><button onClick={() => { setCurrentStep(Step.Intro); setResult(null); setFollowUpAnswers([]); }} className="px-14 py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-2xl active:scale-[0.98] transition-premium">Try with more Detail</button></div>
        </div>
      );
    }

    const riskThemes = {
      Red: { bg: "bg-rose-50/50", text: "text-rose-900", border: "border-rose-200", accent: "bg-rose-600", shadow: "shadow-rose-100" },
      Yellow: { bg: "bg-amber-50/50", text: "text-amber-900", border: "border-amber-200", accent: "bg-amber-600", shadow: "shadow-amber-100" },
      Green: { bg: "bg-emerald-50/50", text: "text-emerald-900", border: "border-emerald-200", accent: "bg-emerald-600", shadow: "shadow-emerald-100" }
    };
    const theme = riskThemes[result.risk_level];

    return (
      <div className="space-y-8 animate-in fade-in duration-1000">
        <div className={`rounded-[3rem] p-12 border-2 ${theme.bg} ${theme.border} flex flex-col md:flex-row items-center gap-10 shadow-2xl ${theme.shadow}`}>
          <div className="flex-shrink-0"><div className={`w-32 h-32 rounded-[2.5rem] ${theme.accent} flex flex-col items-center justify-center text-white shadow-xl`}><p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Risk</p><p className="text-3xl font-black">{result.risk_level.toUpperCase()}</p></div></div>
          <div className="flex-grow text-center md:text-left">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4"><h3 className={`text-4xl font-black tracking-tight ${theme.text}`}>Triage Guidance</h3><div className="px-4 py-2 bg-white/80 rounded-full border border-white/50 shadow-sm flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${result.confidence > 80 ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{result.confidence}% Confidence</span></div></div>
            <p className={`text-2xl font-semibold leading-snug italic ${theme.text} opacity-90`}>"{result.short_explanation}"</p>
          </div>
        </div>

        {/* Geo-Aware Action Trigger (India Context) */}
        {result.risk_level === 'Red' && (
          <div className="glass-card rounded-[2.5rem] p-8 border-2 border-rose-200 shadow-2xl shadow-rose-50 animate-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 leading-none mb-1">Find nearby emergency care</h4>
                  <p className="text-sm text-slate-500 font-medium italic">Showing facilities in India based on your country settings.</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmergencyFinder(!showEmergencyFinder)}
                className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-premium active:scale-95"
              >
                {showEmergencyFinder ? 'Hide List' : 'View Emergency Centers'}
              </button>
            </div>

            {showEmergencyFinder && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {INDIAN_EMERGENCY_FACILITIES.map((facility, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-rose-50 shadow-sm flex flex-col justify-between hover:shadow-md transition-premium border-l-4 border-l-rose-500">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-black text-slate-900 text-sm leading-tight">{facility.name}</h5>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${facility.type === 'Public' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {facility.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">{facility.location}</p>
                    </div>
                    <a href={`tel:${facility.phone}`} className="flex items-center gap-2 text-rose-600 font-bold text-sm bg-rose-50 px-4 py-2 rounded-xl w-fit hover:bg-rose-100 transition-premium">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                      {facility.phone}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Symptom Progression Summary */}
        {symptomData.timeline.length > 0 && (
          <div className="glass-card rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-100">
            <h4 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-widest ml-1">Symptom Progression Summary</h4>
            <div className="bg-slate-50/50 rounded-3xl p-2 border border-slate-100">
              {renderTimelineVisual(symptomData.timeline)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-100"><h4 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-widest ml-1">Clinical Recommendations</h4><div className="p-8 bg-indigo-50 rounded-[2rem] mb-8 border border-indigo-100"><p className="text-3xl font-black text-indigo-900 mb-2">{result.recommended_action}</p><p className="text-indigo-600 font-bold text-base">{result.recommended_timeline}</p></div><div className="space-y-3">{result.export_summary.what_to_do_now.map((item, idx) => (<div key={idx} className="flex gap-4 items-center bg-white p-5 rounded-2xl text-base font-bold text-slate-700 border border-slate-50 shadow-sm"><span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs flex-shrink-0">{idx + 1}</span>{item}</div>))}</div></div>
          <div className="glass-card rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-100"><h4 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-widest ml-1">Observational Signals</h4><div className="flex flex-col gap-4">{result.supporting_signals.map((sig, i) => (<div key={i} className="px-6 py-5 bg-slate-50 text-slate-900 rounded-[1.5rem] text-base font-bold italic border border-slate-100 relative group transition-premium hover:bg-white hover:shadow-md"><div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-l-[1.5rem]"></div>"{sig}"</div>))}</div><div className="mt-10 p-6 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">Model Reasoning</p><p className="text-sm font-medium text-emerald-900/70 leading-relaxed italic">{result.confidence_reason}</p></div></div>
        </div>
        <div className="flex justify-between items-center pt-10 no-print"><button onClick={() => { setCurrentStep(Step.Intro); setResult(null); setFollowUpAnswers([]); }} className="text-slate-400 font-bold hover:text-slate-900 transition-premium px-8">Reset Session</button><button onClick={handleDownloadPDF} disabled={pdfGenerating} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-2xl transition-premium active:scale-[0.98] flex items-center gap-3">{pdfGenerating ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>)}Download Summary</button></div>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={() => signOut()}>
      <SignedOut>
        <div className="flex justify-center items-center min-h-[60vh]">
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <div className="max-w-4xl mx-auto">
          <StepWizard currentStep={currentStep} />
          {currentStep === Step.Intro && renderIntro()}
          {currentStep === Step.BasicInfo && renderBasicInfo()}
          {currentStep === Step.Symptoms && renderSymptoms()}
          {currentStep === Step.Review && renderReview()}
          {currentStep === Step.FollowUp && renderFollowUp()}
          {currentStep === Step.Result && renderResult()}
        </div>
      </SignedIn>
    </Layout>
  );
};

export default App;
