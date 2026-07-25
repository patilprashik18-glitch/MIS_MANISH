# Prompt for Antigravity

Build a standalone web application for **Manish Flour Mills Pvt Ltd (MFMPL)**,
a wheat flour mill (100 TPD capacity), to replace their current Excel-based
daily reporting with a proper web app. This is a fresh, independent project
— not connected to any existing ERP system.

## Overview

The app tracks two daily reports for the mill:
1. **Daily Mill Report** — production, sales, purchase, grinding, bran
   byproducts, moisture, power consumption, wheat stock, attendance
2. **Padtal Report** — a wheat-milling yield & realization/profitability
   reconciliation (per-product yield %, realization rate vs wheat cost,
   margin analysis)

Both are filled in once per day and viewed via a dashboard with date-wise,
weekly, monthly, and yearly views.

## Tech stack
- Backend: Node.js + Express
- Database: PostgreSQL
- Frontend: React + Tailwind CSS
- Auth: Google OAuth 2.0, restricted to an admin-defined allowlist of
  email addresses (not open sign-up)
- Charting: Recharts or Chart.js for trend visualizations
- PDF export: any solid library (e.g. Puppeteer or pdf-lib) for per-day
  report printing

## Users & roles
Two roles:
1. **Admin** — full access: create/edit/view any date, any historical
   record; manage user list and roles; view all dashboards, trends,
   comparisons; export PDFs; receive automated alerts
2. **Mill Floor** — can only create/edit **today's** entry (Daily Mill
   Report + Padtal Report); can view a simplified "today's summary" view
   after saving, but not the full historical dashboard or trend charts

Admins can edit any date at any time (override), even past locked entries.
Mill Floor users are locked out of editing once the date has passed
(yesterday's entry becomes read-only to them, editable only by Admin).

## UI / Design direction
- Clean, modern, light theme (white/light gray background, a single
  accent color — e.g. a warm amber/gold or deep blue, your choice, but
  keep it consistent throughout)
- **Rounded buttons and rounded card corners throughout** — soft,
  approachable, modern feel, not sharp corporate edges
- Generous spacing, clear typography, large touch-friendly inputs on the
  Mill Floor entry form (this may be used on a shared floor tablet/PC)
- Grinding and bran-related field labels should show **Hindi text
  alongside the English label** (e.g. "Mill Grinding (मिल पिसाई)"),
  matching how floor staff currently read the paper/Excel sheet. All
  other parts of the UI are English-only.
- Mobile-responsive dashboard so numbers can be checked from a phone

## Master data — Products (important)
Product names must NOT be manually typed each day. Create a **Product
Master** list (Admin-manageable — add/edit/deactivate products from a
settings page), and every repeating table below (Finish Stock, Sales
Report, Sales Pending Souda, Today's Production, Yield Detail, etc.)
should **auto-populate one row per active product** when a new day's
report is created, with only the numeric fields (katta, qtl, %, amount,
rate, yield%, etc.) left blank for entry. Staff should never need to
add/type a product name in the daily flow — they just fill in numbers
next to a pre-listed product.

Similarly, create small master lists (Admin-manageable) for:
- **Salesmen** (Aditya, Kailash Sharma, Admin, Admin 2, etc. — used in
  Salesman-wise Sales)
- **Expense heads** (used in Padtal's Expense Detail — electric bill,
  salary, PP bag, rent, transport, director remuneration, etc.)
- **Wheat stock locations** (used in Wheat Stock Location-wise)
- **Jute bag types** (used in Jute Bags Stock)

All of these should pre-populate their respective daily tables the same
way — no manual row-adding for standard recurring items. Only allow
adding a brand new row if something genuinely new needs tracking (e.g. a
new product added mid-year), and that should go through the Admin-only
master list first, which then automatically appears in future daily
forms — not typed inline on the report itself.

I will provide the actual product/salesman/expense/location lists from
the current Excel file — use those as the initial master data, don't
invent placeholder names.

## Data model — Daily Mill Report (one entry per date)
Include these sections (ask me for exact field names/precision only if
something is ambiguous — otherwise proceed with sensible defaults):
- Finish Stock (repeating: product, katta, qtl, %) + totals
- Sales Report (repeating: product, katta, qtl, %, amount) + totals
- Sales Pending Souda (repeating: product, katta, qtl, %, amount) + totals
- Grinding Summary: mill grinding, chakki grinding, totals, daily averages
  (Hindi labels here)
- Bran Production: fine/super delux/delux/coarse/chakki bran, load,
  bhushi (x2), calcium, kanki (Hindi labels here)
- Today's Production (repeating: product, katta, qtl, %) + totals
- Salesman-wise Sales (repeating: salesman, amount) + per-salesman and
  grand totals
- Moisture Report (repeating rows) + maida%, average%, wheat moisture%,
  difference%
- Mill Grinding running totals: yesterday / today / till-date
- Mill Stop Report: total stop hours, total running hours, total hours
- Wheat Stock: opening, received, total, grinding, closing, closing adjusted
- Sales Summary: today/to-date/avg/total for qty, value, rate + transport
  sale, cash CD amount, net rate, sales return, maida transport
- Purchase Summary: today/to-date/avg/total for qty, value, rate
- Difference Sale vs Purchase (net & gross, today & to-date)
- BF/BR50/M50 byproduct rates
- At A Glance: read-only auto-calculated rollup of the key numbers above
- Power Consumption: units consumed, grinding qty, unit/qtl, rate/unit,
  electricity cost per bag (today & to-date)
- Jute Bags Stock (repeating) + totals
- Wheat Stock Location-wise (repeating) + total
- **Attendance** (repeating: department [Admin/General/Mill Staff/
  Security/Packing/Loading/Unloading/Bardana], total, present, absent) +
  rollup totals

## Data model — Padtal Report (one entry per date)
- Wheat lot reference (optional text)
- Yield Detail (repeating: product, yield %, rate/bag, rate/kg, avg rate) +
  total yield %
- Wheat rate, wheat rate less 4% (auto: wheat_rate × 0.96)
- Grinding expense, moisture %, moisture adjustment (auto: wheat_rate ×
  moisture% ÷ 100 × 0.03)
- Realization value (auto: sum of yield detail avg rates)
- Final realization rate (auto: realization value − grinding expense −
  moisture adjustment)
- Difference amount (auto: final realization rate − wheat rate less 4%)
- Difference % (auto: difference amount ÷ wheat rate less 4% × 100) —
  **this is the key profitability indicator**
- Expense Detail (repeating: expense head, amount) + total
- Notes (free text)

All auto-calculated fields must be computed server-side, never trusted
from client input.

## Dashboard & Reports (Admin only, full access)
- Date-wise single-day view (both reports side by side or tabbed)
- Weekly / Monthly / Yearly aggregate views with a date-range picker
- **Trend charts**: grinding output over time, sales vs purchase over
  time, moisture % over time, Padtal difference % (margin) over time
- **Month-vs-month comparison view**: pick two periods, see key metrics
  side by side with % change
- **PDF export** of any single day's Daily Mill Report or Padtal Report
- **Alerts**: flag/highlight in the UI (and optionally in the automated
  email) when moisture % is outside a normal range (ask me for the
  threshold, don't assume one), or when Padtal difference % goes negative
  (losing money that day)
- **Audit trail**: log who created/edited each report and when, viewable
  by Admin

## Notifications
- Automated daily or weekly email summary (Admin configurable — let
  Admin choose frequency) with key numbers
- Immediate alert email when an abnormal value is detected (moisture out
  of range, or negative Padtal margin)

## Data entry methods
Both must work:
1. **Manual form entry** — the primary flow, especially for Mill Floor
2. **Excel upload** — a file upload (Admin-visible, and optionally Mill
   Floor too) that parses an uploaded `.xlsx` in the same layout as the
   mill's current sheet, and creates or updates that date's report
   (update if one already exists for that date, create if not). I will
   provide a sample Excel file — build the parser against the actual
   file structure, not assumptions, and handle merged cells / minor
   layout drift defensively (e.g. match by row labels where possible
   rather than fixed cell coordinates).

## Working style
- Build in stages: project scaffold → DB schema (including master data
  tables for Products, Salesmen, Expense Heads, Locations, Bag Types) →
  auth (Google OAuth + roles) → Admin master-data management screens →
  Daily Mill Report entry form & API (auto-populated from master data) →
  Padtal Report entry form & API (same) → dashboard & trend charts →
  Excel import → PDF export → alerts & email notifications → audit trail.
- After each stage, summarize what was built so I can review before
  moving on.
- Ask before assuming: the moisture "normal range" threshold, exact Hindi
  translations for field labels (confirm the ones I mentioned, don't
  invent more), the accent color choice, and the Google OAuth allowlist
  (list of emails + their roles).
- Do not connect this to any existing ERP system — this is fully standalone.