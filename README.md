# CF AI Incident Response

An AI-powered incident response system built on Cloudflare's platform that helps diagnose and resolve system outages in seconds. Inspired by recent Cloudflare outages, this system uses AI to rapidly pinpoint root causes and provide actionable remediation steps.

## 🚀 Live Application

**Try it now:** [https://cf-ai-incident-response.pages.dev](https://cf-ai-incident-response.pages.dev)

**Backend API:** [https://cf-ai-incident-response.zaineel-s-mithani.workers.dev](https://cf-ai-incident-response.zaineel-s-mithani.workers.dev)

## Screenshots

### New Incident Form
![New Incident Form](Screenshot%202025-11-20%20at%201.27.33%20PM.png)

### Chat Interface
![Chat Interface](Screenshot%202025-11-20%20at%201.28.01%20PM.png)

### Voice Interface
![Voice Interface](Screenshot%202025-11-20%20at%201.29.20%20PM.png)

### Incident Dashboard
![Incident Dashboard](Screenshot%202025-11-20%20at%201.29.29%20PM.png)

## Features

- **Rapid Diagnosis**: AI analyzes incidents and identifies root causes in seconds using Llama 3.3 70B
- **Smart Recommendations**: Generates detailed remediation plans with specific commands and rollback strategies
- **Dual Interface**: Text chat + voice interface for hands-free operation during critical incidents
- **Persistent Memory**: Tracks full incident history and conversation context using Durable Objects
- **Automated Workflows**: Multi-step analysis pipeline that runs in the background
- **Real-time Dashboard**: Monitor incident status, timeline, and affected systems

## Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **LLM** | Llama 3.3 70B (Workers AI) | Natural language understanding and generation |
| **Orchestration** | Cloudflare Workflows | Multi-step automated incident analysis |
| **State Management** | Durable Objects | Persistent conversation history and incident state |
| **API Layer** | Cloudflare Workers | Backend routing and business logic |
| **Frontend** | Cloudflare Pages (React) | User interface |
| **Real-time** | WebSockets | Voice interface communication |

### System Flow

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloudflare Pages│  ◄─── React Frontend + Pages Functions
│   (Frontend)    │
└────────┬────────┘
         │ (Proxy)
         ▼
┌─────────────────┐
│     Worker      │  ◄─── Main Backend API
│   (cf-ai-*)     │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────┐
│ Durable Object  │  │  Workflows   │
│ (Incident State)│  │  (Analysis)  │
└────────┬────────┘  └──────┬───────┘
         │                  │
         └────────┬─────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Workers AI    │
         │  Llama 3.3 70B │
         └────────────────┘
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works!)
- Wrangler CLI (`npm install -g wrangler`)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/zaineel/cf_ai_incident_response.git
cd cf_ai_incident_response
```

### 2. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Authenticate with Cloudflare

```bash
wrangler login
```

### 4. Configure Your Account

Update `wrangler.toml` with your account details if needed. The default configuration should work for most users.

## Running Locally

### Option 1: Run Backend and Frontend Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
npm run dev
```
This starts the Workers development server on `http://localhost:8787`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
This starts the Vite development server on `http://localhost:5173`

Visit `http://localhost:5173` to use the application.

### Option 2: Run Full Stack Together

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Run workers with built frontend
npm run dev
```

## Deployment

### Deploy Backend (Workers + Durable Objects + Workflows)

```bash
npm run deploy
```

### Deploy Frontend (Cloudflare Pages)

```bash
cd frontend
npm run deploy
```

Or connect your GitHub repository to Cloudflare Pages for automatic deployments:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository
4. Configure build settings:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`

## Usage Guide

### Creating an Incident

1. Navigate to the **New Incident** tab
2. Fill in the incident details:
   - **Title**: Optional descriptive name
   - **Description**: What's happening (required)
   - **Severity**: Critical, High, Medium, or Low
   - **Affected Systems**: Comma-separated list of impacted services
   - **Error Logs**: Paste relevant logs or stack traces
3. Click **Create Incident**

### Chat Interface

Once an incident is created:

1. Switch to the **Chat Interface** tab
2. Ask questions about the incident:
   - "What is the root cause?"
   - "What are the immediate remediation steps?"
   - "How can we prevent this in the future?"
3. The AI provides context-aware responses based on the incident details
4. Full conversation history is maintained

**Quick Prompts:**
- What is the root cause of this incident?
- What are the immediate remediation steps?
- What systems are affected?
- How can we prevent this in the future?

### Voice Interface

For hands-free operation during critical incidents:

1. Switch to the **Voice Interface** tab
2. Click **Connect** to establish WebSocket connection
3. Use the text input to test connectivity (voice recording coming soon)

**Note**: Full voice processing (speech-to-text via Whisper) is planned but not yet implemented.

### Dashboard

Monitor incident progress:

1. Switch to the **Dashboard** tab
2. View real-time incident status, timeline, and affected systems
3. See root cause analysis and remediation steps as they're identified
4. Track incident duration and resolution progress

## Example Scenarios

### Scenario 1: API Gateway Timeout

```
Title: API Gateway Timeout Errors
Description: Users reporting 504 errors when accessing /api/users endpoint
Severity: High
Affected Systems: API Gateway, User Service
Logs: [502 Bad Gateway] upstream request timeout after 30s
```

**AI Analysis**: Identifies upstream service timeout, suggests increasing timeout limits, checking database connection pool, and implementing circuit breaker.

### Scenario 2: Database Connection Pool Exhausted

```
Title: Database Connection Errors
Description: Application throwing "cannot acquire connection" errors
Severity: Critical
Affected Systems: PostgreSQL, App Servers
Logs: FATAL: remaining connection slots are reserved for non-replication superuser connections
```

**AI Analysis**: Identifies connection pool exhaustion, suggests immediate connection limit increase, fixing connection leaks, and implementing connection pooling best practices.

## Project Structure

```
cf_ai_incident_response/
├── src/
│   ├── worker.ts                    # Main Worker entry point
│   ├── types.ts                     # TypeScript type definitions
│   ├── incident-conversation.ts     # Durable Object for state management
│   └── incident-workflow.ts         # Workflow for automated analysis
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main React application
│   │   ├── main.tsx                 # React entry point
│   │   ├── components/
│   │   │   ├── NewIncidentForm.tsx  # Form to create new incidents
│   │   │   ├── IncidentChat.tsx     # Chat interface component
│   │   │   ├── VoiceInterface.tsx   # Voice interface component
│   │   │   └── IncidentDashboard.tsx # Dashboard component
│   │   └── styles/
│   │       └── index.css            # Global styles
│   ├── functions/
│   │   └── api/                     # Cloudflare Pages Functions
│   │       ├── chat.ts              # Chat API endpoint
│   │       ├── incident.ts          # Create incident endpoint
│   │       └── incident/[id].ts     # Get incident details
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── wrangler.toml                    # Cloudflare Workers configuration
├── package.json
├── tsconfig.json
├── README.md
└── PROMPTS.md                       # AI prompts documentation
```

## API Documentation

### POST /api/incident

Create a new incident.

**Request:**
```json
{
  "title": "API Gateway Timeout",
  "description": "Users reporting 504 errors",
  "severity": "high",
  "affectedSystems": ["API Gateway", "User Service"],
  "logs": "Error logs here..."
}
```

**Response:**
```json
{
  "incidentId": "INC-1234567890-abc123",
  "status": "created",
  "message": "Incident created and analysis workflow triggered"
}
```

### GET /api/incident/{id}

Get incident details by ID.

**Response:**
```json
{
  "incidentId": "INC-1234567890-abc123",
  "status": "investigating",
  "severity": "high",
  "title": "API Gateway Timeout",
  "description": "Users reporting 504 errors",
  "affectedSystems": ["API Gateway"],
  "startTime": 1234567890000,
  "timeline": [...]
}
```

### POST /api/chat

Send a chat message for an incident.

**Request:**
```json
{
  "message": "What is the root cause?",
  "incidentId": "INC-1234567890-abc123"
}
```

**Response:**
```json
{
  "response": "Based on the logs, the root cause is...",
  "history": [...],
  "incidentData": {...}
}
```

### WebSocket /api/voice

Real-time voice/text communication.

**Message Format:**
```json
{
  "type": "text",
  "message": "What's the status?",
  "incidentId": "INC-1234567890-abc123"
}
```

## AI Capabilities

The system uses **Llama 3.3 70B** for:

1. **Initial Analysis**: Quick assessment of incident impact and affected systems
2. **Root Cause Identification**: Deep analysis to determine why the failure occurred
3. **Remediation Planning**: Step-by-step recovery instructions with specific commands
4. **Prevention Recommendations**: Suggestions to avoid similar incidents
5. **Monitoring Improvements**: Alerts and metrics to detect issues earlier

All prompts are documented in [PROMPTS.md](./PROMPTS.md).

## Implemented Features

- [x] **Full voice processing with Whisper** - Speech-to-text using OpenAI Whisper model
- [x] Real-time audio recording via MediaRecorder API
- [x] WebSocket-based voice communication
- [x] Conversation history for voice interactions
- [x] **Post-incident report generation** - AI-powered comprehensive reports with executive summaries
- [x] Multiple export formats (Markdown, JSON)
- [x] One-click report download from dashboard

## Future Enhancements

- [ ] Text-to-speech for AI responses
- [ ] Integration with monitoring systems (Prometheus, Grafana, Datadog)
- [ ] Automated incident creation from monitoring alerts
- [ ] Team collaboration features
- [ ] Incident playbook library
- [ ] Historical incident search and analysis

## Performance

- **First Response**: < 2 seconds
- **Root Cause Analysis**: 3-5 seconds
- **Workflow Execution**: Background (non-blocking)
- **Global Availability**: Deployed on Cloudflare's edge network

## Cost Estimate

For moderate usage (10-20 incidents/day):

- Workers AI: ~$10-20/month
- Durable Objects: ~$5-10/month
- Workers/Pages: $5/month (paid plan)
- **Total**: ~$20-35/month

Free tier is sufficient for testing and light usage.

## Troubleshooting

### Issue: Worker fails to deploy

**Solution**: Ensure you're authenticated with Wrangler:
```bash
wrangler login
```

### Issue: AI responses are slow

**Solution**: This is normal for the first request (cold start). Subsequent requests are much faster.

### Issue: Durable Object not found

**Solution**: Make sure migrations have run. Redeploy:
```bash
npm run deploy
```

### Issue: Frontend can't connect to backend

**Solution**: Check that both dev servers are running and ports match in `vite.config.ts`.

## Contributing

This project was built as part of the Cloudflare AI Application assignment. Contributions, suggestions, and improvements are welcome!

## License

MIT

## Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Powered by [Llama 3.3](https://ai.meta.com/llama/) via Workers AI
- Inspired by real-world incident response challenges

---

**Built for the Cloudflare Internship Application** | [View on GitHub](https://github.com/zaineel/cf_ai_incident_response)
