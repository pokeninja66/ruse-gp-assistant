# GP Assistant — AI-Powered Clinical Companion

GP Assistant is a modern, intelligent medical platform designed to streamline the clinical workflow for General Practitioners (GPs). By leveraging AI voice analysis and a comprehensive patient management system, it allows doctors to focus more on their patients and less on administrative overhead.

## 🚀 Key Features

-   **🎙️ AI Voice Consultation Analysis**: Record patient consultations and automatically extract clinical data including symptoms, anamnesis, and potential diagnoses using advanced LLMs (Gemini/OpenAI).
-   **👤 Comprehensive Patient Profiles**: Manage patient demographics, contact information, and extended medical data (insurance status, citizenship, etc.).
-   **🏥 Structured Clinical Sessions**: A step-by-step guided workflow for every patient visit:
    -   **Anamnesis**: Automatic extraction and manual editing of patient history.
    -   **Status & Vitals**: Track life signs and physical examination results.
    -   **Diagnosis**: AI-assisted diagnostic hypotheses and formal ICD-10 coding.
    -   **Therapy Plan**: Prescribe medications and outline treatment steps.
    -   **Referrals & Test Orders**: Generate and manage outgoing referrals and laboratory orders.
-   **💊 Integrated Drug Database**: Searchable catalogue for accurate medication prescribing.
-   **📅 Clinical Timeline**: A unified history of all patient interactions, recordings, and medical documents.
-   **📱 Premium Mobile Experience**: Fully responsive design with a modern hamburger menu and mobile-optimized clinical views.

## 🛠️ Tech Stack

-   **Frontend**: [TanStack Start](https://tanstack.com/start) (React + Router), [Tailwind CSS v4](https://tailwindcss.com/) for a sleek, modern design.
-   **Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Authentication, Edge Functions, and Storage).
-   **AI**: Integration with LLMs for real-time transcription and clinical data extraction.
-   **State Management**: Type-safe routing and data fetching via TanStack Router.

## ⚙️ Setup & Installation

### Prerequisites

-   Node.js (LTS)
-   Supabase Account

### Environment Variables

Create a `.env` file in the root directory with the following:

```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for admin functions)
GEMINI_API_KEY=your-gemini-key (for AI analysis)
```

### Getting Started

1.  **Clone the repository**:
    ```sh
    git clone https://github.com/pokeninja66/ruse-gp-assistant.git
    cd gp-assistant
    ```

2.  **Install dependencies**:
    ```sh
    npm install
    ```

3.  **Run migrations**:
    Apply the SQL scripts located in the `scripts/` folder (e.g., `migrate_v2.sql`, `fix_clinical_rls.sql`) to your Supabase SQL Editor.

4.  **Start development server**:
    ```sh
    npm run dev
    ```

## 🏗️ Project Structure

-   `src/routes/`: Type-safe routing and page components.
-   `src/components/`: Reusable UI components (Sidebar, Recording Cards, Timeline).
-   `src/utils/`: Business logic, AI analysis pipeline, and Supabase client.
-   `src/styles/`: Design tokens and global CSS (Tailwind v4).
-   `scripts/`: Database migrations and seeding scripts.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
