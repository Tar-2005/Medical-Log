# 🏥 Sovereign Health Wallet
### Patient-Centric, Zero-Trust Longitudinal Health Memory Layer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%20--%203.12-blue.svg)](https://www.python.org/)
[![HL7 FHIR](https://img.shields.io/badge/Standard-HL7%20FHIR%20R4-orange.svg)](https://hl7.org/fhir/R4/)
[![Security](https://img.shields.io/badge/Encryption-AES--256--GCM-red.svg)](#security-model)

---

## 📖 Executive Summary

The **Sovereign Health Wallet** is a next-generation, privacy-first healthcare memory layer designed to give patients complete ownership and cryptographic sovereignty over their electronic medical records. 

In traditional healthcare systems, medical records remain fragmented across multiple hospital silos or stored in high-risk centralized databases vulnerable to breaches. The **Sovereign Health Wallet** replaces centralized trust with a **Zero-Trust, offline-first client architecture**:
- Medical records are encrypted on the patient's device using **AES-256** before ever syncing to the cloud.
- Healthcare providers can only access patient history via a **physical, dynamic QR-code handshake** initiated by the patient.
- Unstructured lab documents and prescriptions are automatically digitized and categorized into structured **HL7 FHIR R4** standards via a hybrid pipeline combining local machine learning OCR and cloud clinical AI agents.

---

## ⭐ Key Pros & Architectural Advantages

| # | Feature Advantage | Benefit & Technical Implementation |
|---|---|---|
| 1 | **True Zero-Trust Privacy** | Protected Health Information (PHI) is encrypted on the device using AES-256 before leaving the mobile client. Cloud storage holds only encrypted ciphertext blobs—service providers and cloud hosts cannot read patient data. |
| 2 | **Ephemeral Physical Handshake** | Eliminates central search databases. Doctors cannot search for patients by name or national ID. Access requires the patient to physically present a dynamic, time-limited cryptographic QR token (15-minute validity). |
| 3 | **95% Token & Cost-Efficient AI** | Rather than transmitting full multi-megabyte document images to costly cloud vision models, images are pre-processed locally on the server via an embedded **PaddleOCR** engine. Only extracted raw text is passed to Google Gemini, saving ~95% in token costs while preserving speed. |
| 4 | **Offline-First Resilience** | The patient mobile wallet operates fully offline using local storage. Patients can view historical charts, register vitals, and browse documents without connectivity. Encrypted state queues sync automatically when back online. |
| 5 | **HL7 FHIR R4 Interoperability** | Clinical measurements, vitals, and lab observations are mapped to international FHIR R4 resources (`Observation`, `ClinicalImpression`, `Patient`) with standard LOINC and SNOMED-CT clinical coding. |
| 6 | **Tamper-Evident Audit Logs** | Every access event, doctor review, file download, and emergency break-glass action is recorded in an immutable, append-only PostgreSQL audit log protected by database triggers. |
| 7 | **Emergency Break-Glass Protocol** | Life-threatening emergencies allow authorized providers to invoke a audited break-glass override that logs justification, doctor credentials, and immediately flags the patient's record for review. |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 📱 PATIENT MOBILE WALLET                    │
│      React Native • Local AES-256 • Offline FHIR Cache      │
│  - Patient auth & profile management                        │
│  - Camera / Gallery lab report ingestion                    │
│  - Ephemeral QR access token generator                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
               Dynamic QR Handshake / Direct API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 🌐 DOCTOR WEB PORTAL                        │
│             Next.js 14 • TailwindCSS • Recharts             │
│  - Real-time QR scanner & token verification                │
│  - Client-side browser decryption of medical records        │
│  - Longitudinal timeline, vitals trends & biometric charts  │
│  - Clinical Scribe for structured doctor consultation notes │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    RESTful API Endpoints
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 ⚙️ BACKEND INTELLIGENCE API                 │
│                 Node.js Express API Engine                  │
│  ├── Local PaddleOCR Engine (Python PP-OCRv4)               │
│  ├── AI Analyst Agent (Gemini FHIR Structuring)             │
│  ├── AI Synthesizer Agent (Longitudinal Clinical Summaries) │
│  ├── Emergency Break-Glass Controller                       │
│  └── Append-Only Audit Logging Service                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                 Encrypted Sync & Storage
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 🗄️ DATABASE & CLOUD LAYER                   │
│                PostgreSQL / Supabase Cloud                  │
│  - Row-Level Security (RLS) enforcement                     │
│  - Encrypted backup payload storage                         │
│  - Append-only clinical audit logs                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
Sovereign_Health_Wallet/
├── backend/                     # Node.js API, AI Agents & Python OCR Engine
│   ├── config/                  # Environment & Supabase initialization
│   ├── controllers/             # Endpoint business logic (Analyst, Patient, Scribe)
│   ├── db/                      # Schema definitions & RLS policies
│   ├── lib/                     # Cryptography, JWT, FHIR validator, LLM utilities
│   ├── middleware/              # QR auth, Rate limiters, Error handlers
│   ├── routes/                  # Express route controllers
│   ├── scripts/                 # paddle_ocr.py & test utilities
│   ├── services/                # Synthesizer, Analyst, Audit, Emergency services
│   ├── tests/                   # Automated unit & integration tests
│   ├── uploads/                 # Local staging directory for OCR files
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies & scripts
│   ├── requirements.txt         # Python dependencies for PaddleOCR
│   └── server.js                # Express application entrypoint
│
├── doctor-portal/               # Healthcare Provider Next.js Web Application
│   ├── app/                     # Next.js App Router (Doctor & Hospital dashboards)
│   ├── components/              # Reusable UI (Biometric charts, QR input, Timeline)
│   ├── context/                 # AuthContext & PatientContext state providers
│   ├── lib/                     # Database and utility helpers
│   ├── .env.local.example       # Doctor Portal environment template
│   ├── next.config.js           # Next.js build configuration
│   ├── package.json             # Web portal dependencies
│   └── tailwind.config.js       # Tailwind CSS styling configuration
│
├── mobile-app/                  # Patient Health Wallet Mobile Application
│   ├── assets/                  # App icons, splash screens, and images
│   ├── src/
│   │   ├── navigation/          # Bottom tabs and Stack navigators
│   │   ├── screens/             # Auth, Dashboard, UploadDocument, ConsentQR
│   │   ├── services/            # AES crypto, Supabase sync, Gemini, Local storage
│   │   └── theme/               # Colors, typography, and styling constants
│   ├── App.js                   # Mobile application root
│   ├── app.json                 # Mobile metadata & configuration
│   ├── .env.example             # Mobile environment template
│   └── package.json             # Mobile app dependencies & scripts
│
├── database/                    # SQL Database Schemas & Migrations
│   ├── schema.sql               # Full PostgreSQL FHIR R4 schema
│   ├── rls-policies.sql         # Row Level Security access policies
│   └── supabase_setup.sql       # Supabase encrypted_backups table & RLS
│
├── package.json                 # Root convenience scripts
├── requirements.txt             # Python requirements for OCR module
└── README.md                    # Project documentation & run guide
```

---

## 📋 System Requirements

Ensure the following tools are installed on your machine:
- **Node.js**: `v18.x` or `v20.x` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.x` or higher (comes bundled with Node.js)
- **Python**: `3.10`, `3.11`, or `3.12` ([Download Python](https://www.python.org/))
- **Git**: For version management

---

## 🚀 Quick Start Guide

Follow these steps to set up and run all components of the system.

### Step 1: Database Setup (Supabase)

1. Navigate to [Supabase](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, go to **Authentication → Providers → Email** and toggle **Confirm email** to **OFF** (for instant development registration).
3. Open the **SQL Editor** in the Supabase Dashboard.
4. Copy and execute the contents of `database/supabase_setup.sql`.
5. Retrieve your project credentials from **Project Settings → API**:
   - `Project URL`
   - `anon public` key
   - `service_role` secret key

---

### Step 2: Backend & Python OCR Engine

The backend provides the Express REST API, background AI synthesizer agent, and the local PaddleOCR processing engine.

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python OCR requirements:
   ```bash
   pip install -r requirements.txt
   ```
   *(Or from the project root: `pip install -r requirements.txt`)*

4. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and configure your credentials:
     ```env
     PORT=4000
     NODE_ENV=development
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     AES_ENCRYPTION_KEY=c796302e13f3728e3b9a294aa8920044f7169a571e8b071275db569d72cf4755
     JWT_SECRET=this-is-a-very-long-secret-for-jwt-signing-12345
     GEMINI_API_KEY=your-gemini-api-key
     LLM_MODEL=gemini-2.5-flash
     ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The API server will start on `http://localhost:4000`.

---

### Step 3: Doctor Web Portal

The Doctor Portal enables medical staff to scan patient QR codes, decrypt authorized records in real time, and review historical vitals.

1. Open a second terminal and navigate to the `doctor-portal` folder:
   ```bash
   cd doctor-portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.local.example` to `.env.local`:
     ```bash
     cp .env.local.example .env.local
     ```
   - Verify `NEXT_PUBLIC_API_URL` points to your backend:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:4000/api
     ```

4. Start the web application:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

### Step 4: Patient Mobile Application

The mobile app enables patients to store encrypted records, upload lab reports, track vitals, and generate doctor access tokens.

1. Open a third terminal and navigate to the `mobile-app` folder:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env`:
     ```env
     EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
     EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
     EXPO_PUBLIC_GEMINI_API_KEY="your-gemini-api-key"
     EXPO_PUBLIC_API_URL="http://localhost:4000/api"
     ```
     *(Note: If running on a physical phone via network, replace `localhost` with your computer's local LAN IP, e.g., `http://192.168.1.X:4000/api`)*

4. Launch the application:
   ```bash
   npm start
   ```
   - Press **w** in the terminal to run in your web browser.
   - Or scan the displayed QR code with the **Expo Go** app on your iOS or Android mobile device.

---

## ⚙️ Environment Variables Summary

### 1. `backend/.env`
| Variable | Description |
|---|---|
| `PORT` | Server listening port (default: `4000`) |
| `NODE_ENV` | Environment mode (`development` or `production`) |
| `SUPABASE_URL` | Supabase project API URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase administrative service role key |
| `AES_ENCRYPTION_KEY` | 64-character hex key (32 bytes) for AES-256 encryption |
| `JWT_SECRET` | Secret key (minimum 32 characters) for signing QR tokens |
| `JWT_EXPIRY` | Token lifespan (default: `15m`) |
| `GEMINI_API_KEY` | Google Gemini API key for clinical AI structuring |
| `LLM_MODEL` | AI model name (default: `gemini-2.5-flash`) |

### 2. `doctor-portal/.env.local`
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (e.g., `http://localhost:4000/api`) |

### 3. `mobile-app/.env`
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project API URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous client key |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API key for on-device AI naming |
| `EXPO_PUBLIC_API_URL` | Backend API URL reachable by device (e.g. `http://localhost:4000/api`) |

---

## 🧪 Testing the Complete Flow

1. **Patient Registration**:
   - Open the Patient Mobile App.
   - Register a new account with email and password.
   - Log in. Notice that the local AES-256 key is derived directly on-device.

2. **Document Ingestion & AI Extraction**:
   - Go to the **Upload** tab.
   - Take a picture or select an image of a lab report / prescription.
   - The document is processed by local PaddleOCR, then categorized into FHIR observations by Gemini.
   - The encrypted record is automatically backed up to Supabase.

3. **QR Handshake & Doctor Access**:
   - In the mobile app, go to the **Consent QR** tab and tap **Generate Access QR**.
   - Copy or view the generated dynamic handshake token.
   - In the Doctor Portal (`http://localhost:3000`), enter or scan the token.
   - The portal verifies the token against the backend and decrypts the patient's longitudinal timeline, vital graphs, and lab reports locally in the doctor's browser.

---

## 🔒 Security & Privacy Guarantees

- **Zero Plaintext Storage**: All medical data stored in remote databases is encrypted using AES-256. Neither database administrators nor cloud providers hold the decryption keys.
- **No Central Searchability**: Patients cannot be queried by name, phone number, or government identity. Access is granted strictly via ephemeral, cryptographic tokens.
- **Append-Only Auditing**: Every access, query, and download is timestamped and immutably written to audit logs with database-enforced non-repudiation.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
