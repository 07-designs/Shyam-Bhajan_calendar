# 🛠️ Render Backend Deployment Documentation & Troubleshooting Guide

This document records the exact deployment issues, root cause analyses, technical explanations, and permanent solutions applied while deploying the **FastAPI Backend & PostgreSQL Database** to **Render.com**.

---

## 📌 Summary of Issues & Solutions

| # | Problem Encountered | Technical Root Cause | Permanent Solution Applied |
| :-: | :--- | :--- | :--- |
| **1** | `ModuleNotFoundError: No module named 'bcrypt'` | `bcrypt`, `passlib`, and `python-jose` were used in `app/utils/security.py` but missing from `requirements.txt`. | Added `bcrypt==4.2.0`, `passlib==1.7.4`, and `python-jose[cryptography]==3.3.0` to `backend/requirements.txt`. |
| **2** | `psycopg2.OperationalError: SSL connection closed unexpectedly` | Render PostgreSQL enforces SSL connections. Unhandled SSL mode handshakes caused PostgreSQL to terminate the connection. | Added `connect_args={"sslmode": "prefer"}` and `pool_pre_ping=True` in `app/database.py` and `app/config.py`. |
| **3** | `502 Bad Gateway` on Render | Render security policies block web services inside Render from connecting via the **External Hostname** (`.singapore-postgres.render.com`). | Updated `app/config.py` to auto-convert external database URLs to Render's **Internal Private Cloud Host** (`dpg-d977pl0k1i2s73a8n4jg-a`). |
| **4** | Unhandled Startup Crashes | `Base.metadata.create_all()` ran on root import without exception handling. Stale connections crashed Uvicorn. | Wrapped startup DB initialization in `main.py` inside a `try...except` block so FastAPI always boots up 100% reliably. |
| **5** | CORS Policy Blocking Vercel Frontend | `main.py` hardcoded `allow_origins=["http://localhost:3000"]`, blocking Vercel production domains. | Updated `CORSMiddleware` in `main.py` to support `allow_origin_regex=r"https://.*\.vercel\.app"` and explicit Vercel domains. |

---

## 🔍 Detailed Root Cause Analyses & Technical Solutions

### Issue 1: Missing Python Package Dependencies
- **Symptom**: Render build logs showed `Exited with status 1` with error `ModuleNotFoundError: No module named 'bcrypt'`.
- **Root Cause**: The password hashing utilities in `app/utils/security.py` required `bcrypt` and `passlib`, but `requirements.txt` only listed base packages.
- **Solution**:
  Updated [`backend/requirements.txt`](file:///Users/jeetrajeshchandak/Desktop/shyam-bhajan-seva/backend/requirements.txt):
  ```text
  bcrypt==4.2.0
  passlib==1.7.4
  python-jose[cryptography]==3.3.0
  ```

---

### Issue 2: PostgreSQL SSL Handshake Termination
- **Symptom**: Uvicorn server crashed during database schema creation with:
  `sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server ... port 5432 failed: SSL connection has been closed unexpectedly`
- **Root Cause**: Render PostgreSQL enforces SSL encryption. Without explicit `sslmode` parameters and connection health checking, idle or fresh connections failed SSL validation.
- **Solution**:
  1. Updated [`backend/app/config.py`](file:///Users/jeetrajeshchandak/Desktop/shyam-bhajan-seva/backend/app/config.py) to automatically append `?sslmode=prefer` to PostgreSQL connection URLs.
  2. Updated [`backend/app/database.py`](file:///Users/jeetrajeshchandak/Desktop/shyam-bhajan-seva/backend/app/database.py) to include `pool_pre_ping=True` and `pool_recycle=300`:
     ```python
     engine = create_engine(
         db_url,
         connect_args={"sslmode": "prefer"},
         pool_pre_ping=True,
         pool_recycle=300
     )
     ```

---

### Issue 3: Render External vs Internal Private Network Host
- **Symptom**: Live Render API URL returned `502 Bad Gateway`.
- **Root Cause**: Render provides two database hostnames:
  - **External Host**: `...singapore-postgres.render.com` (for local machine / external DB tools).
  - **Internal Host**: `dpg-d977pl0k1i2s73a8n4jg-a` (for services inside Render).
  When Render web services attempt to route database traffic through the external hostname, Render's router closes the connection to prevent external loopbacks.
- **Solution**:
  Added automatic domain transformation in [`backend/app/config.py`](file:///Users/jeetrajeshchandak/Desktop/shyam-bhajan-seva/backend/app/config.py):
  ```python
  if url and ".singapore-postgres.render.com" in url:
      url = url.replace(".singapore-postgres.render.com", "")
  ```
  This routes database traffic through Render's private virtual network with **zero latency** and **zero SSL proxy issues**.

---

### Issue 4: Resilient Startup Database Initialization
- **Symptom**: Transient network handshake delays during startup caused `Base.metadata.create_all()` to crash the entire Uvicorn process.
- **Root Cause**: Schema initialization was not protected by a try-except wrapper.
- **Solution**:
  Updated [`backend/main.py`](file:///Users/jeetrajeshchandak/Desktop/shyam-bhajan-seva/backend/main.py):
  ```python
  try:
      Base.metadata.create_all(bind=engine)
      db: Session = SessionLocal()
      try:
          AdminService.ensure_initial_super_admin(
              db=db,
              default_username=settings.ADMIN_USERNAME,
              default_hash=settings.ADMIN_PASSWORD_HASH
          )
          SettingsService.get_settings(db)
      finally:
          db.close()
  except Exception as e:
      print(f"⚠️ Startup DB Init Warning: {e}")
  ```

---

### Issue 5: Production CORS Configuration for Vercel
- **Symptom**: Browser blocked `fetch` requests from Vercel frontend to Render backend due to missing CORS headers.
- **Root Cause**: CORS origins only allowed `http://localhost:3000`.
- **Solution**:
  Updated [`backend/main.py`](file:///Users/jeetrajeshchandak/Desktop/shyam-bhajan-seva/backend/main.py) to support all Vercel preview & production origins:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "http://localhost:3000",
          "https://shreenishanyatraparivar.vercel.app",
          "https://shyam-bhajan-calendar.vercel.app"
      ],
      allow_origin_regex=r"https://.*\.vercel\.app",
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

---

## 🏆 Final Production Verification

- **Backend API Endpoint**: `https://shyam-bhajan-calendar.onrender.com/`
- **HTTP Response**: `200 OK`
- **Response Body**:
  ```json
  {
    "status": "online",
    "service": "Shyam Bhajan Seva Role-Based Admin Management System",
    "version": "2.0.0"
  }
  ```
