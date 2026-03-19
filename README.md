# Job Application Tracker

A full-stack personal CRM to track recruiter calls, job applications, interview progress, and follow-ups.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Optional AI**: OpenAI API integration

## Features

- 📊 **Dashboard**: Overview stats, recent activity
- 📋 **Application Management**: Full CRUD for job applications
- 📱 **Pipeline (Kanban)**: Drag-and-drop status updates
- 📝 **Notes & Call Tracking**: Timestamped conversation summaries
- 🔔 **Follow-up System**: Reminders and response tracking
- 📅 **Interview Tracker**: Multiple rounds per application
- 📄 **Resume Manager**: Upload and tag multiple resumes
- 📈 **Analytics**: Conversion funnel, source breakdown
- 🤖 **AI Features**: Skill extraction, email generation (optional)
- 🔔 **Notifications**: Follow-up and interview reminders

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Project Structure

```
job-tracker/
├── backend/               # Express.js API
│   ├── src/
│   │   ├── config/       # Database config
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, error handling
│   │   ├── routes/       # API routes
│   │   ├── types/        # TypeScript types
│   │   └── index.ts      # Server entry
│   ├── prisma/           # Database schema
│   └── package.json
├── frontend/             # Next.js app
│   ├── src/
│   │   ├── app/          # Pages
│   │   ├── components/   # React components
│   │   ├── lib/          # API client, utils
│   │   └── styles/      # Global styles
│   └── package.json
└── SPEC.md              # Technical specification
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd job-tracker

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Install PostgreSQL (if not installed)
# On macOS:
brew install postgresql
brew services start postgresql

# On Ubuntu:
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 3. Environment Variables

Create `.env` files:

**Backend (.env):**
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/jobtracker?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# Optional - for AI features
OPENAI_API_KEY="your-openai-api-key"
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### 4. Database Migration

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 5. Start Development Servers

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

### 6. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Applications
- `GET /api/applications` - List all
- `GET /api/applications/:id` - Get by ID
- `POST /api/applications` - Create
- `PUT /api/applications/:id` - Update
- `PATCH /api/applications/:id/status` - Update status
- `DELETE /api/applications/:id` - Delete
- `GET /api/applications/pipeline` - Get pipeline data

### Notes
- `GET /api/applications/:id/notes` - List notes
- `POST /api/applications/:id/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Interviews
- `GET /api/applications/:id/interviews` - List interviews
- `POST /api/applications/:id/interviews` - Schedule interview
- `PUT /api/interviews/:id` - Update interview
- `DELETE /api/interviews/:id` - Delete interview

### Follow-ups
- `GET /api/applications/:id/followups` - List follow-ups
- `POST /api/applications/:id/followups` - Create follow-up
- `PUT /api/followups/:id` - Update follow-up
- `GET /api/followups/due` - Get due follow-ups

### Resumes
- `GET /api/resumes` - List resumes
- `POST /api/resumes/upload` - Upload resume
- `DELETE /api/resumes/:id` - Delete resume

### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/funnel` - Conversion funnel
- `GET /api/analytics/sources` - Source breakdown

### AI (Optional)
- `POST /api/ai/extract-skills` - Extract skills from JD
- `POST /api/ai/generate-email` - Generate follow-up email
- `POST /api/ai/summarize-notes` - Summarize notes

## Status Workflow

```
New Call → JD Received → Applied → Shortlisted → Interview Scheduled → Interview Completed → Offer
                                                            ↓
                                                        Rejected / On Hold
```

## Deployment

### Backend (e.g., Railway, Render, Heroku)
1. Set environment variables in deployment dashboard
2. Connect GitHub repository
3. Build command: `npm run build`
4. Start command: `npm start`

### Frontend (Vercel)
1. Import GitHub repository in Vercel
2. Set environment variables
3. Deploy automatically

## License

MIT
