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

## 📄 Documentation

- [Project Architecture](docs/architecture.md) (Coming Soon)
- [Clinical Methodology](docs/methodology.md) (Coming Soon)

---

**Disclaimer**: *SympVis is an AI-powered triage assistant intended for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.*
