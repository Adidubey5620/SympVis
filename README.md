# SympVis - Premium Symptom Triage with Explainable AI

SympVis is a modern web application designed to provide users with health clarity through intelligent, explainable symptom triage. Built with a focus on clinical safety and biological context, it leverages the Gemini 2.5 Flash model to analyze symptoms and provide actionable guidance.

## 🌟 Key Features

- **Biological Profiling**: Customizes assessment sensitivity based on age, sex, pregnancy status, and pre-existing conditions.
- **Explainable AI Reasoning**: Provides a "Confidence Reason" for every triage result, citing specific signals from user input.
- **Dynamic Symptom Timeline**: Visualize the progression of symptoms over time for more accurate temporal analysis.
- **Interactive Inquiry**: Smart follow-up questions to reduce uncertainty in vague symptom profiles.
- **Safety Guardrails**: Rule-based overrides for high-risk red flags (cardiovascular, neurological, etc.).
- **Report Generation**: Export a detailed clinical summary as a PDF, formatted for both patients and healthcare professionals.
- **Emergency Finder**: Geo-aware directory of emergency facilities (currently optimized for India).

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **AI Engine**: Google Generative AI (Gemini 2.5 Flash)
- **Utilities**: jsPDF for report generation, Lucide-style icons (via SVG)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vis
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📋 Recommended Environment

This project is optimized for the **Gemini 2.5 Flash** model. Ensure your API Key from [Google AI Studio](https://aistudio.google.com/) has access to this model for the best experience.

## � Inspiration

We've all spiraled down the rabbit hole of searching symptoms online ("Dr. Google"), only to be met with worst-case scenarios that induce panic rather than clarity. Standard symptom checkers are often rigid, lacking the nuance of a real conversation. We wanted to build a bridge between the user and professional care: a **"Triage Coach"** that listens like a doctor, understands your specific biological context (age, sex, pregnancy), and—most importantly—**explains its reasoning**. Our goal was to reduce health anxiety by providing a transparent, evidence-based risk assessment.

## ⚕️ What it does

SympVis is an intelligent, privacy-first triage application that acts as your first line of defense.
1.  **Contextual Intake**: It gathers critical biological markers (Age, Sex, Pregnancy status, Chronic conditions) to tailor its risk model.
2.  **Visual Symptom Timeline**: Users can map out exactly *when* symptoms appeared, helping the AI understand disease progression (e.g., "Fever started 2 days ago, Rash today").
3.  **Interactive Follow-up**: Instead of making a guess on vague info, SympVis asks 2-3 targeted clarification questions (generated dynamically) to rule out strict emergencies.
4.  **Explainable Results**: It delivers a coded Risk Level (Green/Yellow/Red) accompanied by a "Confidence Score" and a "Confidence Reason," explicitly citing which user-reported symptoms led to the conclusion.
5.  **Actionable Output**: Users get a generated PDF summary to show their doctor and, in high-risk cases, are immediately shown a directory of nearby emergency facilities.

## 🛠️ How we built it

-   **The Core (AI)**: We leveraged **Google's Gemini 2.5 Flash** for its speed and reasoning capabilities. We used a "Chain of Thought" prompting strategy to force the model to evaluate biological risk factors *before* generating a final verdict.
-   **Frontend**: Built with **React 19** and **Vite** for a blazing fast experience. We used **Tailwind CSS** to create a "Glassmorphism" aesthetic that feels clean, premium, and calming—essential for a health app.
-   **State Management**: Complex multi-step wizard logic handles the flow from Basic Info -> Timeline -> Triage -> Follow-up -> Results.
-   **Security**: Integrated **Clerk** for seamless, secure user authentication. 
-   **Output**: Used `jspdf` to programmatically generate a professional clinical summary that patients can physically take to a hospital.

## 🛑 Challenges we ran into

1.  **The "Uncertainty" Problem**: Early versions of the model would confidently guess even when the symptoms were vague. We had to implement a strict "Uncertainty Guardrail" where the AI is instructed to reject the request and ask for more detail if the confidence threshold isn't met.
2.  **Structured JSON from AI**: Getting the LLM to consistently return valid JSON for not just the risk level, but also the dynamic follow-up questions and array of "Observation Signals", was tricky. We refined our schema definition to ensure robust parsing.
3.  **Visualizing Time**: Designing a UI that allows users to easily impute a "Timeline" of symptoms (Day 1 vs Day 3) required several iterations to make it intuitive on mobile.

## 🏆 Accomplishments that we're proud of

-   **The "Explainability" Layer**: We didn't just want a black box. Seeing the AI quote specific symptoms back to the user ("I am concerned because you mentioned *shortness of breath* in combination with *chest pain*") builds immense trust.
-   **Premium UX/UI**: The application feels like a high-end medical device interface. The animations and transitions make the experience less clinical and more comforting.
-   **Dynamic Safety**: The system automatically adjusts its sensitivity. For example, a fever of 100.4°F triggers a different risk path for a pregnant user versus a general user.

## 🧠 What we learned

-   **Context is King**: A symptom check without biological context (age/sex) is nearly useless. Adding these parameters improved our AI's accuracy dramatically.
-   **Prompt Engineering is a Safety Feature**: You cannot rely on the model's default training for medical advice. You must explicitly instruct it on boundaries (e.g., "Do not diagnose, only assess risk").
-   **User Trust**: Users are more likely to accept an AI's advice if it admits when it's unsure, rather than forcing an answer.

## 🔮 What's next for SympVis Triage Coach

-   **Multimodal Analysis**: Integrating Gemini's vision capabilities to allow users to upload photos of visible symptoms (rashes, swelling) for analysis.
-   **Voice Interface**: Adding a "Speak your symptoms" feature for elderly users or those in distress.
-   **Live Integration**: Connecting the "Emergency Finder" directly to hospital wait-time APIs.
-   **Local LLM Support**: Exploring on-device models for privacy-focused, offline triage in remote areas.

## �📄 Documentation

- [Project Architecture](docs/architecture.md) (Coming Soon)
- [Clinical Methodology](docs/methodology.md) (Coming Soon)

---

**Disclaimer**: *SympVis is an AI-powered triage assistant intended for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*
