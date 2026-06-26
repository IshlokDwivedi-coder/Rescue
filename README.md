# Rescue

An AI agent that detects tasks you're about to miss and autonomously reschedules them or drafts extension emails.

## How the Agent Works
The application uses a real plan-act-observe agent loop via Gemini Function Calling. When triggered, the Express backend prompts the `gemini-3.5-flash` model with the highest-risk task and three tools: `breakdown_task`, `create_calendar_event`, and `draft_email`. Gemini evaluates the task risk, calls tools to break it down and schedule it, evaluates the result, and loops until the issue is mitigated (capped at 6 iterations). The steps are streamed live to the frontend via Server-Sent Events.

## Google Technologies Used
* **Gemini API** (`@google/genai` SDK, using the latest `gemini-3.5-flash` model for advanced function calling)
* **Gemini Function Calling** (Agentic Tools)
* **Google Cloud Run** (Deployment)

> **Student Hackathon Note:** The underlying AI Studio platform strictly provisions a Node.js full-stack container (React/Vite + Express backend) rather than Python/FastAPI. The application has been faithfully implemented in this exact stack, maintaining the clean "vibe," the plan-act-observe agent loop, and the exact tools you requested.

## DEMO MODE
By default, the application runs in **Demo Mode**. This means it uses simulated fallbacks for Google Calendar and Gmail APIs so that the agent loop can be tested immediately without requiring full Google Cloud OAuth setup. You only need a valid `GEMINI_API_KEY`.

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key to .env
echo "GEMINI_API_KEY=your_key_here" > .env

# 3. Start the full-stack development server
npm run dev
```

## Deploying to Google Cloud Run

```bash
# Ensure you are authenticated and have a project set
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy directly from source (Buildpacks will detect Node.js and build it automatically)
gcloud run deploy rescue-agent \
  --source . \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your_key_here" \
  --port=3000
```
