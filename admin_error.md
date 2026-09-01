# 🚨 Admin Portal Authentication & Redirection Issue Reference (`admin_error.md`)

> **Note**: This file is kept locally for technical reference and is **NOT** committed or pushed to Git.

---

## 📌 1. Current Situation & Executive Summary

- **Public Landing Page Status**: 🟢 **100% Working**. Devotees can visit `https://shreenishanyatraparivar.vercel.app`, select dates, submit Bhajan Sandhya booking requests, and see confirmation feedback.
- **Backend Booking Endpoint**: 🟢 **100% Working**. `POST https://shyam-bhajan-calendar.onrender.com/api/bookings` returns **HTTP 201 Created**, saves the booking request into persistent storage, and queues background WhatsApp alert tasks.
- **Admin Portal Issue**: 🔴 **Redirect Loop / Navigation Stall**. When logging in at `https://shreenishanyatraparivar.vercel.app/login` using credentials (`shyam_bhajan_admin` / `Shyam@2026`), clicking **Authorize Session →** sends `POST /api/auth/login`, which returns **HTTP 200 OK** in Render logs. However, the browser remains on `/login` and does not complete the redirect or load the Admin Dashboard at `/admin`.

---

## 🔍 2. System Architecture & Technical Context

```
   ┌─────────────────────────────────────────────────────────────┐
   │ Frontend:  https://shreenishanyatraparivar.vercel.app        │
   │ Backend:   https://shyam-bhajan-calendar.onrender.com       │
   └─────────────────────────────────────────────────────────────┘
```

Because the frontend is hosted on **Vercel** (`vercel.app`) and the backend is hosted on **Render** (`onrender.com`), all API interactions are **Cross-Domain Cross-Origin requests**.

---

## 🧪 3. Technical Approaches Attempted & Results

### Approach 1: Wildcard CORS (`allow_origins=["*"]`)
- **Action**: Set `allow_origins=["*"]` in FastAPI `CORSMiddleware`.
- **Result**: ❌ **Failed**. Chrome blocked requests using `credentials: 'include'`, reporting:
  `The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'.`

### Approach 2: Explicit Origins & Cross-Site Cookies (`samesite="none"`, `secure=True`)
- **Action**: Added explicit Vercel origins to `CORSMiddleware` and set `samesite="none"`, `secure=True` on httpOnly JWT cookies (`admin_session`).
- **Result**: ❌ **Failed**. Browsers enforcing Third-Party Cookie Phaseout (Chrome Privacy Sandbox / Safari ITP) discarded the httpOnly cookie because the request crossed two different root domains (`vercel.app` vs `onrender.com`).

### Approach 3: Dual-Token Authentication (`localStorage` Bearer Token + Cookies)
- **Action**: Updated `LoginResponse` schema to return `access_token` in JSON body, stored token in `localStorage` upon login, and passed `Authorization: Bearer <token>` on frontend requests.
- **Result**: ⚠️ **Partial**. `POST /api/auth/login` returned **HTTP 200 OK** with token, but navigation to `/admin` still resulted in a bounce back to `/login`.

### Approach 4: Header Priority in `dependencies.py` & Bypassing `must_change_password`
- **Action**: Prioritized `Authorization` header over Cookie in `get_current_admin` dependency and set `must_change_password = False` for `super_admin`.
- **Result**: ⚠️ **Unresolved**. Server logs show `POST /api/auth/login 200 OK` and `GET /api/bookings 200 OK`, but frontend state navigation on Vercel continues to hold/re-render the `/login` view without transitioning to `/admin`.

---

## 🎯 4. Next Steps & Target Resolution

We need to solve this problem to make the Admin Portal 100% functional and ensure seamless navigation between `/login` and `/admin`.
