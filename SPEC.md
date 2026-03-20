# Job Application Tracker - Technical Specification

## Project Overview
- **Project Name**: Job Application Tracker (Personal Candidate CRM)
- **Project Type**: Full-stack Web Application
- **Core Functionality**: Track recruiter calls, job applications, interview progress, and follow-ups with AI-powered features
- **Target Users**: Job seekers who want to organize and track their job search process

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: React Context + SWR/React Query
- **Drag & Drop**: @dnd-kit (for Kanban)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Validation**: Zod

### Optional AI
- **Provider**: OpenAI API (GPT-4)
- **Features**: JD parsing, skill extraction, email generation, notes summarization

---

## Architecture

### Project Structure
```
job-tracker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── applications.ts
│   │   │   ├── notes.ts
│   │   │   ├── interviews.ts
│   │   │   ├── followups.ts
│   │   │   ├── resumes.ts
│   │   │   └── analytics.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── applicationController.ts
│   │   │   ├── noteController.ts
│   │   │   ├── interviewController.ts
│   │   │   ├── followupController.ts
│   │   │   ├── resumeController.ts
│   │   │   ├── analyticsController.ts
│   │   │   └── aiController.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── applicationService.ts
│   │   │   └── aiService.ts
│   │   ├── utils/
│   │   │   ├── AppError.ts
│   │   │   └── helpers.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx (Dashboard)
│   │   │   │   ├── applications/
│   │   │   │   ├── pipeline/
│   │   │   │   ├── analytics/
│   │   │   │   ├── resumes/
│   │   │   │   └── settings/
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── layout/
│   │   │   └── features/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── types/
│   │   └── context/
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── package.json
│   └── .env.local
└── README.md
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Applications Table
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Recruiter Info
  recruiter_name VARCHAR(255),
  recruiter_company VARCHAR(255),
  hiring_company VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Job Details
  source VARCHAR(100), -- 'Naukri', 'LinkedIn', 'Indeed', 'Referral', 'Other'
  job_role VARCHAR(255),
  tech_stack TEXT[], -- Array of strings for tags
  
  -- JD
  jd_received BOOLEAN DEFAULT false,
  jd_link TEXT,
  jd_file_path TEXT,
  
  -- Application Status
  applied BOOLEAN DEFAULT false,
  applied_date DATE,
  resume_version VARCHAR(100),
  
  -- Pipeline Status (enum)
  current_status VARCHAR(50) DEFAULT 'new_call',
  -- 'new_call', 'jd_received', 'applied', 'shortlisted', 
  -- 'interview_scheduled', 'interview_completed', 'offer', 'rejected', 'on_hold'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notes Table
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general', -- 'call', 'general', 'followup', 'feedback'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Interviews Table
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  round_name VARCHAR(100), -- 'L1', 'L2', 'HR', 'Technical', 'Final'
  scheduled_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  notes TEXT,
  feedback TEXT,
  rating INTEGER, -- 1-5
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Follow-ups Table
```sql
CREATE TABLE followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_date DATE,
  follow_up_type VARCHAR(50), -- 'email', 'call', 'linkedin'
  response_status VARCHAR(50), -- 'pending', 'responded', 'no_response'
  response_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Follow-up History Table
```sql
CREATE TABLE followup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id UUID REFERENCES followups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_type VARCHAR(50),
  response_received TEXT,
  notes TEXT
);
```

### Resumes Table
```sql
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  file_name VARCHAR(255),
  file_path TEXT,
  file_size INTEGER,
  tags TEXT[], -- ['Data Engineer', 'GenAI', 'Full Stack']
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(50), -- 'followup', 'interview', 'application'
  title VARCHAR(255),
  message TEXT,
  reference_id UUID, -- links to application/interview/followup
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create application |
| GET | `/api/applications/:id` | Get application details |
| PUT | `/api/applications/:id` | Update application |
| DELETE | `/api/applications/:id` | Delete application |
| PATCH | `/api/applications/:id/status` | Update status |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications/:id/notes` | Get notes for application |
| POST | `/api/applications/:id/notes` | Create note |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |

### Interviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications/:id/interviews` | Get interviews |
| POST | `/api/applications/:id/interviews` | Schedule interview |
| PUT | `/api/interviews/:id` | Update interview |
| DELETE | `/api/interviews/:id` | Delete interview |

### Follow-ups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications/:id/followups` | Get follow-ups |
| POST | `/api/applications/:id/followups` | Create follow-up |
| PUT | `/api/followups/:id` | Update follow-up |
| GET | `/api/followups/due` | Get due follow-ups |

### Resumes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resumes` | List resumes |
| POST | `/api/resumes` | Upload resume |
| PUT | `/api/resumes/:id` | Update resume |
| DELETE | `/api/resumes/:id` | Delete resume |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard stats |
| GET | `/api/analytics/funnel` | Conversion funnel |
| GET | `/api/analytics/sources` | Source breakdown |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/extract-skills` | Extract skills from JD |
| POST | `/api/ai/generate-email` | Generate follow-up email |
| POST | `/api/ai/summarize-notes` | Summarize notes |

---

## UI/UX Specification

### Color Palette
```css
--primary: #6366f1;        /* Indigo */
--primary-dark: #4f46e5;
--primary-light: #818cf8;
--secondary: #0ea5e9;      /* Sky Blue */
--accent: #f59e0b;         /* Amber */
--success: #10b981;        /* Emerald */
--warning: #f59e0b;        /* Amber */
--error: #ef4444;          /* Red */
--background: #f8fafc;     /* Slate 50 */
--surface: #ffffff;
--text-primary: #1e293b;   /* Slate 800 */
--text-secondary: #64748b;  /* Slate 500 */
--border: #e2e8f0;         /* Slate 200 */
```

### Status Colors
```css
--status-new-call: #6366f1;      /* Indigo */
--status-jd-received: #8b5cf6;  /* Violet */
--status-applied: #0ea5e9;      /* Sky */
--status-shortlisted: #14b8a6;  /* Teal */
--status-interview-scheduled: #f59e0b;  /* Amber */
--status-interview-completed: #10b981;  /* Emerald */
--status-offer: #22c55e;        /* Green */
--status-rejected: #ef4444;     /* Red */
--status-on-hold: #6b7280;      /* Gray */
```

### Typography
- **Headings**: Inter (Google Fonts)
- **Body**: Inter
- **Monospace**: JetBrains Mono (for code/tech stack)

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Page Specifications

### 1. Login/Signup Pages
- Clean, centered card design
- Form validation with error messages
- "Remember me" option
- Password strength indicator (signup)

### 2. Dashboard Page
- **Stats Cards Row**:
  - Total Recruiter Calls (count)
  - Applications Sent (count)
  - Interviews Ongoing (count)
  - Offers (count)
- **Recent Activity List**: Last 10 activities with timestamps
- **Quick Actions**: Add application, Schedule follow-up

### 3. Applications List Page
- Table view with sortable columns
- Search and filter bar
- Bulk actions (delete, status change)
- Pagination

### 4. Application Form (Create/Edit)
- Multi-step form or single form with sections
- File upload for JD
- Tag input for tech stack
- Date pickers

### 5. Pipeline/Kanban Page
- 9 columns matching status enum
- Drag-and-drop cards
- Card shows: Company, Role, Date
- Click to view details

### 6. Application Detail Page
- Header: Company, Role, Status badge
- Tabs: Overview, Notes, Interviews, Follow-ups
- Quick action buttons

### 7. Analytics Page
- **Conversion Funnel Chart**: Bar chart showing conversion rates
- **Source Pie Chart**: Applications by source
- **Timeline Chart**: Applications over time

### 8. Resume Manager Page
- Grid/List view toggle
- Upload modal
- Tag filtering
- Usage tracking

---

## Features Implementation

### Authentication Flow
1. User registers with email/password
2. Password hashed with bcrypt (12 rounds)
3. JWT token generated (24h expiry)
4. Token stored in httpOnly cookie
5. Protected routes check token validity

### Kanban Board
1. Fetch all applications grouped by status
2. Render columns using @dnd-kit
3. On drag end, call API to update status
4. Optimistic UI update with rollback on error

### Follow-up Reminders
1. Daily cron job checks for due follow-ups
2. Create notifications for due items
3. Frontend polls for notifications on load

### AI Integration
1. **Skill Extraction**: Send JD text to GPT-4, parse JSON response
2. **Email Generation**: Template-based with dynamic fields
3. **Note Summarization**: Truncate and structure long notes

---

## Security Measures
- Password hashing with bcrypt
- JWT with short expiry + refresh token
- Input validation with Zod
- SQL injection prevention (Prisma)
- CORS configuration
- Rate limiting (optional)
- File upload restrictions (type, size)

---

## Acceptance Criteria

### Authentication
- [ ] User can register with email/password
- [ ] User can login and receive JWT
- [ ] Protected routes redirect to login
- [ ] Logout clears token

### Dashboard
- [ ] Shows correct counts for all stats
- [ ] Recent activity shows latest 10 items
- [ ] Quick actions work correctly

### Application Management
- [ ] Can create new application with all fields
- [ ] Can edit existing application
- [ ] Can delete application (with confirmation)
- [ ] Status updates reflect immediately

### Pipeline
- [ ] All 9 status columns display
- [ ] Drag and drop updates status
- [ ] Card shows relevant info

### Notes
- [ ] Can add timestamped notes
- [ ] Notes display in chronological order
- [ ] Can edit/delete notes

### Follow-ups
- [ ] Can set follow-up date
- [ ] Due follow-ups appear in dashboard
- [ ] Can log response

### Interviews
- [ ] Can schedule multiple rounds
- [ ] Can mark as completed
- [ ] Can add feedback

### Resumes
- [ ] Can upload resume file
- [ ] Can add tags
- [ ] Can set default resume

### Analytics
- [ ] Funnel chart shows correct data
- [ ] Source breakdown accurate
- [ ] Data refreshes on changes

### UI/UX
- [ ] Mobile responsive
- [ ] Loading states shown
- [ ] Error messages clear
- [ ] Smooth animations

---

## Future Enhancements (Bonus)
- Chrome extension for quick JD save
- Voice-to-text for notes
- Recruiter rating system
- Weekly email reports
- Calendar integration (Google Calendar)
- LinkedIn integration
