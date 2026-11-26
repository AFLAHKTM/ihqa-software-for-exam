# India Holy Quran Award — Kerala Initial Screening & Live Assessment Platform

Official online examination and live Quran recitation assessment extension aligned with [indiaquranaward.com](https://indiaquranaward.com/).

## Architecture Highlights

1. **Stage 1: Kerala Initial Screening (`/` · `/login` · `/dashboard` · `/exam`)**
   - Brand-aligned institutional UI (`#034ea2` royal blue, `#f0b64f` gold, `#53be95` emerald, `Noto Sans`, `Noto Sans Malayalam`, `Amiri Quran` RTL).
   - Server-synchronized examination timer (`server_deadline_at`), automatic answer saving, duplicate-attempt DB lock (`UNIQUE(student_id, exam_config_id)`), randomized question & option orders, configurable negative marking, and controlled result visibility.
   - Staggered Kerala regional batch scheduling designed for **40,000+ students** across all 14 districts.

2. **Stage 2: Live Quran Recitation Assessment (`/assessment` · `/judge`)**
   - 1-to-1 private LiveKit WebRTC rooms (`roomRecord: false`, no Egress/media retention).
   - Student pre-session Camera/Mic/Network check, minor consent confirmation, and Waiting Room.
   - Isolated Judge Portal (`/judge`) with queue management, room admission, and 100-mark scorecard (`Tajweed /30`, `Makharij /25`, `Fluency /20`, `Accuracy /15`, `Voice /10`).

3. **Central Administration (`/admin`)**
   - All 10 management modules: Students, Institutions, 14 Kerala Districts, Multilingual Question Bank, Exam Config, Scheduling & Live Rooms, Results, Merit List, CSV & Excel (`.xlsx`) Exports, and RBAC + Immutable Audit Logs.

## Running Locally

```bash
npm install
npm run dev
```

When `DATABASE_URL` is unset, the platform automatically initializes a persistent local PostgreSQL instance via `@electric-sql/pglite` at `./data/ihqa-pgdata` using `db/schema.sql`.
