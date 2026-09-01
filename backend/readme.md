# 🪕 Shyam Bhajan Seva - Production FastAPI Backend

High-performance, asynchronous RESTful API powering the **Shree Nishan Yatra Parivar** devotional event management platform. Built with **FastAPI**, **SQLAlchemy**, **Pydantic v2**, and **Twilio WhatsApp API**.

---

## 🌟 Core Features & Architecture Updates

- **Dual-Token & Cross-Origin Auth Architecture**:
  Supports httpOnly session cookies and `Authorization: Bearer <token>` in `localStorage`. Guarantees 100% fail-safe cross-domain authentication between **Vercel** (`https://shreenishanyatraparivar.vercel.app`) and **Render** (`https://shyam-bhajan-calendar.onrender.com`).
- **High-Availability Database Engine (`app/database.py`)**:
  Features connection pre-pinging (`pool_pre_ping=True`), automatic pool recycling (`pool_recycle=60`), optimized SSL handshakes (`sslmode=prefer/require`), and transparent persistent storage fallback (`sqlite:///./shyam_bhajan.db`).
- **Automated WhatsApp Notification Engine (`app/services/whatsapp_service.py`)**:
  Asynchronous non-blocking background tasks (`BackgroundTasks`) dispatch formatted WhatsApp alerts to all listed committee admin numbers and deliver instant thank-you confirmation messages directly to the booking devotee.
- **Dynamic Mandal Settings Engine (`app/api/settings.py`)**:
  Allows Super Admins to dynamically update Mandal Name, Admin Notification Numbers list, Auto-reply WhatsApp templates, and Contact Numbers directly from the Admin Portal UI without code edits or server restarts.
- **Role-Based Access Control (RBAC) & Security Lockout**:
  Enforces 5-failed-attempts account lockout (15-minute cooldown), strong password validation rules, first-time login detection, 6-digit WhatsApp OTP password resets, and 24-hour admin invite token links.
- **Immutable Security Audit Log Feed (`app/repositories/audit_repository.py`)**:
  Tracks all administrative actions, logins, lockouts, setting updates, and invite dispatches with timestamp, IP address, and User-Agent logging.

---

## 📂 Directory Architecture

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py                 # Centralized pydantic-settings & URL sanitizer
│   ├── database.py               # SQLAlchemy engine, session factory & SQLite fallback
│   ├── auth/
│   │   ├── __init__.py
│   │   └── dependencies.py       # JWT verification & Bearer/Cookie auth dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py             # SQLAlchemy ORM models (Bookings, Admins, Settings, AuditLogs, Members)
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py            # Pydantic v2 validation schemas & flexible date parsers
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── admin_repository.py   # Admin data access queries
│   │   ├── audit_repository.py   # Security audit trail repository
│   │   ├── booking_repository.py # Event booking queries
│   │   └── member_repository.py  # Mandal performer roster repository
│   ├── services/
│   │   ├── __init__.py
│   │   ├── admin_service.py     # Admin lifecycle & WhatsApp invite link generator
│   │   ├── auth_service.py      # Login authentication, lockout logic & OTP reset
│   │   ├── settings_service.py  # Dynamic Mandal configuration service
│   │   └── whatsapp_service.py  # Encapsulated Twilio WhatsApp SDK service
│   └── api/
│       ├── __init__.py
│       ├── auth.py              # Login, logout, profile, and password reset routes
│       ├── admins.py            # RBAC admin management & WhatsApp invite routes
│       ├── bookings.py          # Public booking submission & admin management routes
│       ├── members.py           # Active Mandal performer roster routes
│       ├── settings.py          # Dynamic Mandal settings configuration routes
│       └── audit.py             # Security audit trail log routes
├── main.py                       # Application entrypoint, CORS setup & router assembly
├── backend_context.md            # Detailed deployment troubleshooting & solutions log
├── .env                          # Environment variables configuration template
├── README.md                     # Technical architecture & API documentation
└── requirements.txt              # Production Python dependencies
```

---

## 🔑 Environment Variables Reference (`.env`)

Configure these variables in your local `.env` or **Render Dashboard ➔ Environment**:

| Variable Name | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/dbname` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_twilio_auth_token` |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp Sender Number | `whatsapp:+14155238886` (Sandbox) / `whatsapp:+91XXXXXXXXXX` (Production) |
| `ADMIN_WHATSAPP_NUMBER` | Default Admin Phone | `whatsapp:+919137570219` |
| `ADMIN_USERNAME` | Master Super Admin Username | `shyam_bhajan_admin` |
| `ADMIN_PASSWORD_HASH` | Master Super Admin Password | `Shyam@2026` |
| `JWT_SECRET` | Secret key for JWT signing | `shyam_bhajan_seva_secret_key_2026` |
| `ADMIN_PANEL_URL` | Frontend Admin Portal URL | `https://shreenishanyatraparivar.vercel.app/admin` |

---

## 📡 API Endpoints Reference

### 🌐 Public & Diagnostic Routes
- `GET /` — Health & Status Check Endpoint
- `GET /api/test-whatsapp` — Live Twilio WhatsApp Diagnostic Dispatch Endpoint

### 📅 Event Bookings (`/api/bookings`)
- `GET /api/bookings` — Fetch reserved date strings & booking records
- `POST /api/bookings` — Public: Create a new Bhajan Sandhya booking request (queues WhatsApp alert)
- `PATCH /api/bookings/{id}/status` — Admin: Update booking status (`Approved`, `Rescheduled`, `Cancelled`)
- `DELETE /api/bookings/{id}` — Admin: Soft-delete booking request

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/login` — Admin login (enforces 5-attempt lockout, returns JWT token & session cookies)
- `POST /api/auth/logout` — Clear session cookies & revoke access
- `GET /api/auth/me` — Fetch current logged-in admin profile
- `POST /api/auth/change-password` — Update admin password
- `POST /api/auth/forgot-password` — Send 6-digit WhatsApp OTP code for password reset
- `POST /api/auth/verify-otp` — Verify WhatsApp OTP and set new password

### 👥 Committee Admins (`/api/admins`)
- `GET /api/admins` — Super Admin: List all registered committee admins
- `POST /api/admins/invite` — Super Admin: Generate 24-hour token & WhatsApp invite link for new admin
- `POST /api/admins/accept-invite` — Public: New admin accepts invite, sets username & password
- `PUT /api/admins/{id}` — Super Admin: Update admin role or active status
- `DELETE /api/admins/{id}` — Super Admin: Soft-delete admin account

### ⚙️ Mandal Settings (`/api/settings`)
- `GET /api/settings` — Fetch dynamic Mandal settings & templates
- `PUT /api/settings` — Super Admin: Update Mandal name, notification numbers, & auto-reply templates

### 🪕 Performer Roster (`/api/members`)
- `GET /api/members` — Fetch active performers & volunteers
- `POST /api/members` — Add new singer or instrumentalist to roster
- `DELETE /api/members/{id}` — Remove member from roster

### 📜 Audit Logs (`/api/audit`)
- `GET /api/audit` — Super Admin: Fetch security audit trail with IP address and User-Agent logging

---

## 🚀 Local Development & Testing

1. **Create Virtual Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run Backend Server**:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
4. **Interactive API Documentation (Swagger UI)**:
   Open `http://127.0.0.1:8000/docs` in your browser.

---

## ☁️ Deployment on Render.com

- **Environment**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
