# YASAI Logistics – Goods Collection System

A production-ready digital replacement for paper-based Goods Collection Notes (GCN), built with **Next.js 15**, **TypeScript**, **Supabase**, and **ShadCN UI**.

---

## Features

| Feature | Description |
|---|---|
| **Digital GCN** | Create, edit, view, and manage Goods Collection Notes |
| **Auto Collection Number** | Auto-generated `YAS-YYYY-0001` format per year |
| **PDF Generation** | Branded PDF matching YASAI letterhead style |
| **QR Code** | Auto-generated QR code linking to the public tracking page |
| **Public Tracking** | `/track/YAS-2026-0001` — publicly accessible status page |
| **WhatsApp Share** | Pre-filled WhatsApp message with PDF + tracking link |
| **Email Integration** | Send PDF via email using Resend API |
| **Signature Capture** | Digital signatures for staff and receiver |
| **Role-Based Access** | Admin, Operations, Warehouse, Viewer roles |
| **Dark Mode** | Full light/dark theme support |
| **Excel Export** | Export records to `.xlsx` |
| **Audit Logs** | Track all system activity |
| **Responsive** | Mobile-first, works on all screen sizes |

---

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge-ready)
- **PDF**: `@react-pdf/renderer`
- **QR Code**: `qrcode`
- **Email**: Resend
- **Signatures**: `react-signature-canvas`
- **Forms**: `react-hook-form` + `zod`
- **Charts**: `recharts`
- **Export**: `xlsx` (SheetJS)

---

## Folder Structure

```
yasai-logistics/
├── src/
│   ├── app/
│   │   ├── (auth)/login/         # Login page
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── collections/      # GCN list + CRUD
│   │   │   ├── records/          # Full records archive
│   │   │   ├── audit-logs/       # Activity log
│   │   │   └── settings/         # User + company settings
│   │   ├── track/[number]/       # Public tracking page
│   │   └── api/
│   │       ├── collections/      # REST API for GCNs
│   │       ├── pdf/[id]/         # Stream PDF directly
│   │       └── send-email/       # Send email via Resend
│   ├── components/
│   │   ├── ui/                   # ShadCN UI components
│   │   ├── layout/               # Sidebar, Header, Logo
│   │   ├── collections/          # Form, Table, Detail, StatusBadge
│   │   ├── dashboard/            # Stats cards, activity feed
│   │   ├── settings/             # Settings panel
│   │   └── providers/            # ThemeProvider
│   ├── lib/
│   │   ├── supabase/             # Client, Server, Middleware
│   │   ├── pdf.ts                # PDF generation
│   │   ├── qr.ts                 # QR code generation
│   │   ├── email.ts              # Email via Resend
│   │   └── utils.ts              # Utility functions
│   └── types/index.ts            # All TypeScript types
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_storage_buckets.sql
├── Dockerfile
├── docker-compose.yml
└── .env.local.example
```

---

## Setup Guide

### 1. Clone and Install

```bash
git clone <your-repo>
cd yasai-logistics
npm install
```

### 2. Supabase Project Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migrations in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_storage_buckets.sql
   ```
3. Go to **Authentication → Providers** — Email is enabled by default
4. Go to **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your production URL
5. Create your first admin user via **Authentication → Users → Add User**
6. After creating the user, run in SQL Editor:
   ```sql
   UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
# From Supabase Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Keep this SECRET!

# Your app URL (for QR codes and tracking links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (get API key from resend.com)
RESEND_API_KEY=re_xxxxxx
EMAIL_FROM=noreply@yasailogistics.com
EMAIL_FROM_NAME=YASAI Logistics
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full access: create, edit, delete, manage users, view audit logs |
| **Operations** | Create, edit, view collections, send emails/WhatsApp, export |
| **Warehouse** | Create and view collections |
| **Viewer** | View only — cannot create or edit |

### Creating Users

Option 1 – Via Supabase Dashboard:
1. Authentication → Users → Add User
2. Run `UPDATE user_profiles SET role = 'operations' WHERE email = 'xxx';`

Option 2 – Via Settings (Admin only):
- Login as admin → Settings → Users & Roles → Change roles

---

## PDF Generation

The system auto-generates a branded PDF after each collection is created:

- **Header**: YASAI logo, company contact details
- **Body**: Exact layout matching the ProEx GCN reference (Shipper/Consignee table, cargo details, mode of transport checkboxes, billing, signatures)
- **QR Code**: Embedded in the PDF, links to the live tracking page
- **Footer**: YASAI company info with Arabic and English addresses
- **Storage**: Uploaded to Supabase Storage at `goods-collection-notes/pdf/{id}.pdf`

To view a PDF without Storage, access: `GET /api/pdf/{id}`

---

## Tracking Page

Public URL (no login required):
```
https://your-domain.com/track/YAS-2026-0001
```

Shows:
- Collection number, shipper, consignee, destination, weight
- Live status with a visual progress timeline
- Mode of transport icon

---

## WhatsApp Integration

The **Send via WhatsApp** button generates a pre-filled message:

```
*YASAI Logistics*

Collection Number: *YAS-2026-0001*

Goods Collection Note:
https://storage.supabase.co/.../YAS-2026-0001.pdf

Tracking Link:
https://your-domain.com/track/YAS-2026-0001

_Thank you._
```

This opens WhatsApp Web or the mobile app with the message pre-filled.

---

## Excel Export

In the Collections or Records page, click **Export** to download a `.xlsx` file with all visible (filtered) records.

Columns exported:
`Collection #`, `Shipper`, `Consignee`, `Destination`, `Commodity`, `Cargo Type`, `Weight (KG)`, `Volume (CBM)`, `Packages`, `Status`, `Doc Ref`, `Date`

---

## Docker Deployment

### Build and Run

```bash
# Create .env file with production values
cp .env.local.example .env

# Build and start with Docker Compose
docker-compose up -d --build

# View logs
docker-compose logs -f yasai-logistics
```

### Vercel Deployment (Recommended)

1. Push to GitHub
2. Connect to [vercel.com](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy!

---

## Brand Colors

| Color | Hex | Usage |
|---|---|---|
| Navy | `#071A3A` | Primary background, headings, buttons |
| Orange | `#E67A32` | Accents, CTA buttons, "LOGISTICS" text |
| White | `#FFFFFF` | Backgrounds, text on dark |
| Light Gray | `#F5F5F5` | Page background, table rows |

---

## Company Information

From the YASAI Letterhead:

```
YASAI LOGISTICS COMPANY

Phone:   +966 55 932 6687
Email:   info@yasailogistics.com
Website: www.yasailogistics.com

UAE: H.H Shaikh Saud Bin Saqar, Al Muteena Dubai – UAE
KSA: 7579 Ibn Al Mallah, Nahda, Riyadh, KSA
     ٧٥٧٩ ابن الملاح نهضة منطقة الرياض، المملكة العربية السعودية
```

---

## Collection Number Format

```
YAS-{YEAR}-{SEQUENCE}
YAS-2026-0001
YAS-2026-0002
...
YAS-2026-9999
YAS-2027-0001  (resets each year)
```

The sequence is managed by a PostgreSQL sequence per year (`gcn_seq_2026`, etc.) and the `generate_collection_number()` Supabase function.

---

## Security

- All API routes check authentication via Supabase JWT
- Row Level Security (RLS) enforced at database level
- Service Role key never exposed to the client
- Soft deletes (records marked with `deleted_at`, not hard-deleted)
- Role checks on destructive operations
- Activity audit log for all creates/updates/deletes

---

## Known Limitations & Future Improvements

- [ ] Email sending requires Resend account (free tier available)
- [ ] For WhatsApp Business API integration, you'll need a Business account
- [ ] PDF signatures render as base64 images (larger file size)
- [ ] Arabic RTL mode — UI is Arabic-ready but RTL layout requires additional Tailwind config
- [ ] Add `next.config.ts` → `output: "standalone"` for Docker production builds

---

## Support

**YASAI Logistics Company**
- Phone: +966 55 932 6687
- Email: info@yasailogistics.com
- Website: www.yasailogistics.com
