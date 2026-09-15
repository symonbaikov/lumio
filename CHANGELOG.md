# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Income tax declaration (2026-09-14)

- **Tax declaration wizard** (`/tax-declaration`, `GET/PUT/POST /income-tax/*`) drafts the annual
  income tax return for the self-employed: disclaimer, profile, category → form-line mapping, data
  check, draft, PDF/XLSX export, finalize and reopen. Only mappings the user confirmed count.
- **Rule packs:** Germany Anlage EÜR (2025–2026), Spain Modelo 100 estimación directa simplificada
  (2025–2026), Poland PIT-36L (2025–2026), PIT-28 and PIT-36 (2025); every other country gets a
  generic annual income and expense summary.
- **Official FX sources** for Poland (NBP table A) and Italy (Banca d'Italia); a missing rate is
  reported as an issue instead of defaulting to 1.
- **Filing information** — form, deadlines, portal and record retention — for 25 EU countries.

#### Receipt locations and self-hosted maps (2026-09-14)

- Receipts get a location from a manual pin, the geocoded merchant address, the photo's EXIF GPS or
  the device position (in-app camera only, after per-device consent); `PATCH/DELETE
  /receipts/:id/location`.
- Optional Compose profiles `maps` (Planetiler + tileserver-gl, four styles) and `geocoder`
  (Nominatim). The backend proxies tiles (`/maps/styles`, `/maps/tiles/...`); the feature stays off
  until `TILESERVER_URL` / `GEOCODER_URL` are set.

#### Account security (2026-09-14)

- Self-service password reset by email (`/auth/forgot-password`, `/auth/reset-password`): single-use
  1-hour tokens, all sessions revoked on reset.
- Email changes take effect only after the confirmation link sent to the new address is opened.

#### Content background (2026-09-14)

- A bundled or uploaded photo behind the app content, with adjustable dimming (Settings → General).

### Changed

#### Cookie sessions and API hardening (2026-09-14)

- **Breaking for API clients:** browsers now authenticate with HttpOnly `access_token` /
  `refresh_token` cookies, and `/auth/login` no longer returns tokens in the body. Scripts can still
  send `Authorization: Bearer` or `X-Api-Key`.
- Double-submit CSRF protection on cookie-authenticated writes (`csrf_token` cookie →
  `x-csrf-token` header).
- The access token lifetime dropped from 30 days (set in `docker-compose.yml` and the JWT module
  default) to **30 minutes**; the refresh token stays at 30 days.
- New settings: `CORS_ORIGINS`, `AUTH_COOKIE_SAMESITE`, `AUTH_COOKIE_DOMAIN`,
  `PASSWORD_RESET_TOKEN_SECRET`, `BCRYPT_ROUNDS`. In production the backend refuses to start without
  a CORS origin.
- helmet security headers, Redis-backed rate limit counters, and an egress guard that blocks
  private and loopback addresses for user-supplied URLs.

#### Self-hosted delivery (2026-09-14)

- CD builds, scans, signs and publishes images on `v*.*.*` tags (or manual runs) and stops there:
  no staging/production environments, no post-deploy smoke check, no `staging` branch triggers.

#### Aurum-style charts (2026-09-13)

- **Cash flow on the Trends tab** is now monthly income/expense bars with a signed net total and an
  All time / 5 years / 12 mo / This year switcher (`?cf=`), backed by the new
  `GET /dashboard/cash-flow?range=` endpoint (whole calendar months, empty months zero-filled).
- **Net worth, category donuts (Overview and Trends) and the ROI projection** moved from ECharts to
  Recharts with the same look: no Y axis or grid, year ticks only across calendar years, first/last
  label row, theme colours via CSS variables.
- Chart design follows [Aurum](https://github.com/ZProger/Aurum) by ZProger; reimplemented, no Aurum
  code included. The goal Sankey, the spend trend forecast and the statements charts stay on ECharts.

### Removed

#### Bundled monitoring and Railway (2026-09-14)

- The Prometheus + Grafana stack: `docker-compose.observability.yml`, `observability/`, and
  `make observability` / `make observability-stop`. `/api/v1/metrics` stays; guard it with
  `METRICS_AUTH_TOKEN` and scrape it with your own collector.
- Railway deployment: `RAILWAY.md`, `railway.json`, its Conftest policy and the docs page.

### Fixed

#### API URL Path in Document Viewer (2025-01-20)

- **Fixed incorrect API URL paths** in `/statements/:id/view` page
  - Added missing `/api/v1/` prefix to statement and transactions fetch requests
  - Previously: `${API_URL}/statements/:id` (404 error)
  - Now: `${API_URL}/api/v1/statements/:id` (works correctly)
  - Impact: Document viewer page now loads data successfully
  - Files changed: `frontend/app/statements/[id]/view/page.tsx`

### Added

#### Transaction Document Viewer (2025-01-XX)

- **New Document View Page** (`/statements/:id/view`)
  - Beautiful, professionally formatted document for viewing bank statements and transactions
  - Optimized for viewing and printing
  - Responsive design for desktop, tablet, and mobile devices
  
- **TransactionDocumentViewer Component**
  - Rich header with gradient background and bank information
  - Summary cards showing: starting balance, income, expenses, ending balance
  - Detailed transaction table with all fields
  - Visual indicators: color-coded borders (green for income, red for expenses)
  - Category chips displayed under transaction purpose
  - Print-optimized styles with color preservation
  
- **Action Panel Features**
  - Back button to return to previous page
  - Edit button to switch to edit mode
  - Print button with browser print dialog integration
  
- **Print Optimization**
  - A4 format with 15mm margins
  - Color preservation (gradients, borders, semantic colors)
  - Smart page breaks (no broken tables/rows)
  - Hidden UI elements (action panel not printed)
  - Optimized fonts and spacing for printing
  
- **Data Formatting**
  - Numbers: localized formatting with thousand separators (e.g., `1 234 567.89 KZT`)
  - Dates: DD.MM.YYYY format (e.g., `27.11.2025`)
  - Currency codes displayed alongside amounts
  
- **Documentation**
  - `DOCUMENT_VIEWER.md` - English technical documentation
  - `ПРОСМОТР_ДОКУМЕНТА_ТРАНЗАКЦИЙ.md` - Russian user guide
  - `TESTING_DOCUMENT_VIEWER.md` - Comprehensive testing guide

### Changed

#### Storage Page Navigation

- **View Button Behavior**
  - Previously: Clicking eye icon (👁️) in Storage navigated to edit page (`/statements/:id/edit`)
  - Now: Clicking eye icon navigates to new document view page (`/statements/:id/view`)
  - Edit page still accessible via "Edit" button in document view or directly from statements list

### Technical Details

#### New Files
- `frontend/app/components/TransactionDocumentViewer.tsx` - Main document viewer component
- `frontend/app/statements/[id]/view/page.tsx` - Document view page wrapper
- `docs/DOCUMENT_VIEWER.md` - English documentation
- `docs/ПРОСМОТР_ДОКУМЕНТА_ТРАНЗАКЦИЙ.md` - Russian documentation
- `docs/TESTING_DOCUMENT_VIEWER.md` - Testing guide

#### Modified Files
- `frontend/app/storage/page.tsx` - Updated `handleView()` navigation target

#### API Endpoints Used
- `GET /api/v1/statements/:id` - Fetch statement data
- `GET /api/v1/statements/:id/transactions` - Fetch transactions list

#### Dependencies
- Material-UI components: Box, Paper, Table, Typography, Chip, etc.
- Material-UI icons: TrendingUp, TrendingDown, AccountBalance, CalendarToday, Receipt
- Next.js navigation: useRouter

#### Browser Support
- Chrome/Edge (recommended for best print quality)
- Firefox
- Safari
- Opera

### Performance

- Fast loading for statements with up to 500 transactions (< 3s)
- Acceptable performance for statements with up to 2000 transactions (< 10s)
- No memory leaks detected in testing
- Smooth scrolling and hover effects

### UX Improvements

- **Visual Clarity**: Color-coded transaction types (green/red)
- **Information Density**: All data visible at once
- **Professional Appearance**: Gradient header, clean layout
- **Easy Navigation**: Clear action buttons
- **Quick Access**: One click from Storage to document view

### Known Limitations

1. Large statements (>5000 transactions) may have performance issues
2. Safari may not preserve gradient colors when printing
3. PDF export only available through browser (no server-side generation yet)
4. Internet Explorer 11 not supported

### Future Enhancements

Planned features:
- [ ] Server-side PDF generation
- [ ] Configurable column visibility
- [ ] Transaction filtering within document
- [ ] Watermark support for printed documents
- [ ] Charts and visualizations
- [ ] Period comparison
- [ ] Multiple document templates
- [ ] Company logo customization

---

## [Previous versions]

(Previous changelog entries would go here)

---

**Note**: This project uses semantic versioning. Version numbers follow the pattern MAJOR.MINOR.PATCH where:
- MAJOR: Incompatible API changes
- MINOR: Backwards-compatible functionality additions
- PATCH: Backwards-compatible bug fixes