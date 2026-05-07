# DeepScan AI - Project Documentation

## Project Overview
DeepScan AI is a state-of-the-art hybrid neural system designed for forensic media analysis. It specializes in detecting deepfakes and synthetic media across various formats (images, audio, and video). The application operates both in a "Cloud Ledger" mode using Firebase and a "Physical Vault Mode" that utilizes local hardware forensic isolation for privacy-focused investigations.

## Technology Stack
- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS with Radix UI components (shadcn/ui style)
- **Backend/Database:** Firebase (Firestore, Authentication, App Hosting)
- **AI/ML:** Genkit AI (Google GenAI integration)
- **Local Storage:** File System Access API (PC Vault Sync)

## Core Features and Functions

### 1. Hybrid Forensic Analysis
The core engine allows users to upload media to analyze for synthetic manipulation.
- **Image Deepfake Analysis:** Identifies visual artifacts and synthetic generation traces in images.
- **Audio Deepfake Analysis:** Detects cloned voices and unnatural vocal biometric patterns.
- **Video Deepfake Analysis:** Scans for facial manipulation, cross-modal synchronization issues, and deepfake artifacts in video.
- **Context-Aware AI:** The analysis flows utilize a "Neural Signature Database" which feeds the AI with known tool signatures, training data signatures, and trending fake alerts to improve accuracy.

### 2. Modes of Operation
- **Neural Ledger (Cloud Mode):** Fully synced with Firebase. Scans, datasets, and history are stored securely in the cloud.
- **Physical Vault Mode:** Hardware isolated mode where investigations are powered locally, and records are synced directly to a physical PC directory (PC Vault) using the browser's File System Access API.

### 3. Application Modules (Tabs)

#### Analyze
- The primary workspace where users upload media (via `MediaUpload` component).
- Displays detailed AI verdicts, confidence scores, neural ancestry (likely generation models), biometric vitals, and highlighted suspicious regions (via `AnalysisResult` component).

#### Vault (Media Vault)
- A secure repository for past forensic cases.
- Users can review previously analyzed media, re-verify results, and manage their stored investigations.

#### Evolution (Model Evolution Tracker)
- Tracks the continuous learning curve of the AI.
- Visualizes how the system's "immune system" grows stronger as more artifacts are analyzed and verified by users.

#### Sentinel (Social Monitor)
- A dashboard that tracks viral deepfakes and trending synthetic media across different platforms.
- Provides early warnings (Sentinel Alerts) about emerging manipulation campaigns.

#### Protect (Authenticity Shield)
- Tools focused on proactive media protection and authenticity verification.

#### History (Detection History)
- A chronological ledger of all performed scans, displaying quick summaries of timestamps, filenames, and AI verdicts.

#### Pattern Hub (Dataset Manager)
- Manages the "Neural Memory".
- Allows users to view and manage known training data signatures, contributing to the system's overall intelligence and detection accuracy.

## AI Engine Architecture (Genkit Flows)
The project utilizes specific AI flows located in `src/ai/flows`:
1. `analyze-image-for-deepfake`: Processes `data:image/*` formats.
2. `analyze-audio-for-deepfake`: Processes `data:audio/*` formats.
3. `analyze-video-for-deepfake`: Processes `data:video/*` formats.

Each flow takes the media data URI and a compiled `learnedContext` (derived from the database) to provide highly contextual and forensic-grade verdicts.
