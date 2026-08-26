# MindReflect AI — Gemini 3.6 Flash & Cloud Firestore Journaling Assistant

A secure, full-stack user-authenticated journaling and reflective AI application built with **Google Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore** user-isolated storage.

---

## 1. System Architecture & Threat Summary

### The 5 Agentic Threat Zones

| Threat Zone | Identified Risks | Implemented Countermeasures |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malformed JSON bodies, prototype pollution, XSS in rendered outputs | Strict JSON payload ingestion, sanitization, input bounds validation, safe Markdown output encoding via `react-markdown`. |
| **2. Planning & Reasoning** | System instruction bypass, model hallucinations or behavioral drift | Scoped system prompts strictly bound to journaling/reflection, temperature clamping (0.3–0.7), explicit mode personas. |
| **3. Tool Execution** | Dynamic evaluation risks, SSRF, unauthorized shell execution | No arbitrary execution sinks; server-only proxying to the official `@google/genai` TypeScript SDK. |
| **4. Memory & State** | Cross-user data leaks, unauthorized reads/writes in Firestore, state desync | Strict owner-bound Firestore security rules (`request.auth.uid == userId`) isolating documents under `/users/{userId}/interactions/{docId}`, `/users/{userId}/notificationSettings/{docId}`, and `/users/{userId}/notificationLogs/{docId}`. |
| **5. Inter-System Communication** | Gemini API key exposure, SSRF via malicious webhook URLs, token leakage | Server-side Gemini API proxy with Secret Manager injection; automated **Resilient Model Fallback Ladder** (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`); and **SSRF-hardened notification proxy** blocking loopbacks, RFC 1918, and metadata endpoints (169.254.169.254). |

---

## 2. Cloud Firestore Security Rules

To guarantee strict user tenant isolation across journal interactions, notification preferences, and audit logs, deploy the following owner-bound security rules to Cloud Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated User Interactions
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Isolated Notification Settings
    match /users/{userId}/notificationSettings/{settingId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Isolated Notification Audit Logs
    match /users/{userId}/notificationLogs/{logId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 3. External Notifications & Webhook API Directive

The application includes an SSRF-hardened notification pipeline allowing reflections to be parsed and dispatched to external collaboration hubs:

### Supported Notification Providers
- **Slack**: Formatted with Slack Block Kit headers, fields, and quote blocks (`https://hooks.slack.com/services/...`).
- **Discord**: Color-coded rich embeds matching the reflection mode (`https://discord.com/api/webhooks/...`).
- **Email & Webhook Relay**: Structured notification payloads delivered to email inboxes or custom webhook proxies.

### Notification Endpoints & Security Directives
- `GET /api/notifications/directive`: Returns the API specification, supported schemas, and SSRF restrictions.
- `POST /api/notifications/test`: Validates webhook connectivity without saving journal content.
- `POST /api/notifications/dispatch`: Executes server-side outbound webhooks with strict HTTPS validation and loopback blocking.

---

## 3. Secret Management & IAM Configuration

Store API keys securely in **Google Cloud Secret Manager** and inject them at runtime without hardcoding:

```bash
# 1. Create and populate the Gemini API key secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Google Cloud Run Deployment Flow

Deploy the containerized full-stack application directly to Google Cloud Run:

```bash
# 1. Build and deploy to Cloud Run
gcloud run deploy mindreflect-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production

# 2. Apply mandatory campaign verification label
gcloud run services update mindreflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 5. Functional Stability & Walkthrough Test Cases

Every user interaction has been mapped to functional verification test cases:

### Test Case 1: Unauthenticated Landing & Google Sign-In
1. Navigate to the application URL in a clean browser session.
2. **Expected Outcome**: The landing page displays with value propositions, security architecture badges, and a "Continue with Google Sign-In" button.
3. Click "Continue with Google Sign-In".
4. Authenticate via the Google popup.
5. **Expected Outcome**: The dashboard transitions into the authenticated private workspace, showing the user's Google avatar and email in the top navigation bar.

### Test Case 2: Multi-Turn Journal Reflection & Gemini Generation
1. In the active journal editor, select the **Reflect** mode pill.
2. Enter a thought or dilemma (e.g. *"I'm feeling overwhelmed balancing my technical roadmap with client deadlines"*).
3. Press **Cmd/Ctrl + Enter** or click **Reflect (reflect)**.
4. **Expected Outcome**:
   - The user reflection is immediately displayed in a styled user bubble.
   - The loading status displays *"Gemini 3.6 Flash is synthesizing insights..."*.
   - Gemini returns an empathetic, structured reflection with markdown headers and questions.
   - A model badge (e.g. `gemini-3.6-flash`) appears on the response card.

### Test Case 3: Firestore Persistence & User Isolation
1. Confirm the sync indicator at top displays **"Synced to Firestore"**.
2. Refresh the browser page.
3. **Expected Outcome**: The previous journal reflection and full multi-turn conversation load instantly from Firestore.
4. Sign out and sign in with a different Google account.
5. **Expected Outcome**: The second user cannot see any of the first user's entries (verified by owner-isolated Firestore paths `/users/{userId}/interactions/`).

### Test Case 4: Multi-Turn Conversation Continuation
1. In an existing entry, write a follow-up response in the bottom composer (e.g. *"What are 3 concrete action steps I can take tomorrow morning?"*).
2. Click **Send Reply**.
3. **Expected Outcome**: Gemini continues the dialogue with full conversation history context, adding a second turn to the same journal entry in Firestore.

### Test Case 5: Mode Switching (Summarize & Brainstorm)
1. Click **New Reflection** in the sidebar.
2. Switch mode to **Summarize** or **Brainstorm**.
3. Enter notes or brainstorming topics and submit.
4. **Expected Outcome**: Gemini responds according to the specialized system instruction (Executive Theme synthesis for Summarize, creative divergent ideas for Brainstorm).

### Test Case 6: Search, Export, and Delete Operations
1. Use the search bar in the sidebar to search for keywords in past entries.
2. Click the **Export** button in the header and download as Markdown (`.md`).
3. Click the delete icon on an entry and confirm deletion.
4. **Expected Outcome**: The document is deleted from Firestore and immediately removed from the sidebar.

### Test Case 7: External Notification Configuration & Webhook Test
1. Click the **Notifications** button in the top navigation bar.
2. In the modal, enable the **Slack** or **Discord** toggle.
3. Enter your incoming webhook URL (e.g. `https://hooks.slack.com/services/...` or `https://discord.com/api/webhooks/...`).
4. Click **Test**.
5. **Expected Outcome**:
   - The backend validates the URL against SSRF rules (enforcing HTTPS and blocking internal networks).
   - A sample formatted notification is dispatched.
   - A success banner appears confirming connectivity.
6. Click **Save Preferences**. The configuration is saved to the user's isolated document in `/users/{userId}/notificationSettings/default`.

### Test Case 8: Automated & Manual Journal Notification Parsing
1. In Notification Settings, set the trigger mode to **Executive Summaries with Action Items** or **Keyword Match Filter**.
2. Create a reflection entry with the Summarize mode.
3. Submit the prompt to Gemini.
4. **Expected Outcome**:
   - Gemini parses and synthesizes the entry.
   - The system matches the trigger criteria and automatically dispatches a Block Kit / Embed notification to the configured channels.
   - An audit record is stored under `/users/{userId}/notificationLogs/` and visible in the modal's "Dispatch Audit Logs" tab.
   - Alternatively, clicking the **# Slack**, **Discord**, or **Email** button on any response card triggers a manual dispatch on demand.

