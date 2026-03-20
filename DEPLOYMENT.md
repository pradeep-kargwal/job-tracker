# Free Hosting Options for Job Application Tracker

## Option 1: Vercel + Neon (Recommended - 100% Free)

### Frontend (Vercel - Free)
1. **Push your code to GitHub**
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "Add New Project" → Import your GitHub repo
4. Framework Preset: Next.js
5. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = Your API URL (see below)
6. Deploy! 🎉

### Backend API (Railway or Render - Free)
**Option A: Railway (Easiest)**
1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your backend folder
4. Add Environment Variables:
   - `DATABASE_URL` = Neon PostgreSQL connection string
   - `JWT_SECRET` = Your secret key
   - `PORT` = 5001
   - `FRONTEND_URL` = Your Vercel URL
5. Deploy!

**Option B: Render (Free)**
1. Go to [render.com](https://render.com) and sign up
2. Create "New Web Service"
3. Connect your GitHub repo (backend folder)
4. Build Command: `npm install`
5. Start Command: `npm run start`
6. Add Environment Variables same as above

### Database (Neon - Free Tier)
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (starts with `postgresql://...`)
4. Use this in your backend's `DATABASE_URL`

---

## Option 2: Fly.io (All-in-One - Free)

Fly.io can host both frontend and backend together!

1. Install flyctl: `brew install flyctl`
2. Sign up: `fly auth signup`
3. Launch: `fly launch`
4. Select your region
5. Add secrets:
   - `DATABASE_URL` = Neon or Fly PostgreSQL
   - `JWT_SECRET` = Your secret
   - `NEXT_PUBLIC_API_URL` = Your app URL

---

## Option 3: Streamlit Cloud (If you rebuild in Python)

If you want a simpler Python-based version:
1. Rebuild using FastAPI + Streamlit
2. Deploy to [streamlit.io/cloud](https://streamlit.io/cloud)
3. Use Streamlit's free hosting

---

## Quick Steps for Option 1 (Vercel + Neon + Railway)

### Step 1: Database (Neon)
1. Go to neon.tech → Create project
2. Copy connection string

### Step 2: Backend (Railway)
1. Go to railway.app → New Project
2. Connect GitHub → Select repo (backend folder)
3. Add env vars:
   ```
   DATABASE_URL=postgresql://user:pass@host/db
   JWT_SECRET=any-random-secret-key
   PORT=5001
   FRONTEND_URL=https://your-app.vercel.app
   ```
4. Deploy and copy the generated URL (e.g., `https://your-backend.railway.app`)

### Step 3: Frontend (Vercel)
1. Go to vercel.com → Import repo
2. Add env var:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   ```
3. Deploy!

### Step 4: Update CORS
In Railway dashboard, add:
```
FRONTEND_URL=https://your-app.vercel.app
```

---

## Cost Comparison

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Vercel | ✅ Unlimited | Next.js hosting |
| Railway | ✅ $5 credit/month | Enough for small apps |
| Neon | ✅ 0.5GB storage | PostgreSQL |
| Render | ✅ 750 hours | Sleeps after inactivity |
| Fly.io | ✅ 3 VMs | Great for Docker |

---

## Important Notes

1. **JWT_SECRET**: Generate a secure key: `openssl rand -base64 32`
2. **Environment Variables**: Update `.env` for production
3. **HTTPS**: Both Vercel and Railway provide free SSL
4. **Custom Domain**: Vercel allows free custom domains

---

## Troubleshooting

- **CORS Errors**: Make sure `FRONTEND_URL` matches exactly
- **Database Connection**: Check Neon/Railway connection string
- **Build Errors**: Ensure `package.json` has proper scripts
