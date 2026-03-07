# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-03-07)


### Features

* add ability to hide data entry base tabs ([ba49c14](https://github.com/symonbaikov/lumio/commit/ba49c144225936d0e5b9aae25ada5a9d02e00e45))
* add audit log endpoint and backend improvements ([41a3a88](https://github.com/symonbaikov/lumio/commit/41a3a882f8c4b5bc09bd8b0d5399a36a075ce1a0))
* add frontend build and serving to backend ([2df4c66](https://github.com/symonbaikov/lumio/commit/2df4c665642bc6fc5502bc0a86b9bc0bd26f7f6c))
* add interactive guided tours system ([97f6251](https://github.com/symonbaikov/lumio/commit/97f62514edf7cb1f1f74bbbe15ffe67f684a90a6))
* add localization support for error messages ([d1a52ab](https://github.com/symonbaikov/lumio/commit/d1a52ab5fabe4d2096291314de8f28fec55de754))
* add search and pagination UI for statements page ([de5c852](https://github.com/symonbaikov/lumio/commit/de5c852034d0f516ef2dc183ef5857a737a5921e))
* add search, pagination, and duplicate handling for statements ([2bdee34](https://github.com/symonbaikov/lumio/commit/2bdee3437fdb9c2d4e160d3c3a557740ea8288d9))
* add workspace entities and database migration ([60cbd48](https://github.com/symonbaikov/lumio/commit/60cbd4811d44369eafbcc6896ad131e11a54e094))
* add workspace management UI ([0a5e4d5](https://github.com/symonbaikov/lumio/commit/0a5e4d5774fda2d58a65302cdb19f6947ea458a7))
* add workspaces module and API endpoints ([1bfa8af](https://github.com/symonbaikov/lumio/commit/1bfa8af0e79c1cd851b380882cd8fc9b05b93cb5))
* **admin:** human-readable audit log ([8b8ee8d](https://github.com/symonbaikov/lumio/commit/8b8ee8d39994f20f92f6c9027cf300a16fa245be))
* **audit:** add human-readable formatter ([cbdd151](https://github.com/symonbaikov/lumio/commit/cbdd151cf2c5394776fecf10a193dae15fbc73ea))
* **audit:** add list filters for action and user ([41a49da](https://github.com/symonbaikov/lumio/commit/41a49dafdc7ac545aa46582410f4b0ce56aa9f8e))
* **audit:** support action and user filters ([019bd7d](https://github.com/symonbaikov/lumio/commit/019bd7df769a7a32470c4d03cb99559bf33b380c))
* **audit:** update table structure and filters ([eecafb2](https://github.com/symonbaikov/lumio/commit/eecafb21df2e7c6c2d56c478e3df8711d8d4203c))
* **backend:** add new modules for audit, gmail, import and workspace scoping support ([1e363a3](https://github.com/symonbaikov/lumio/commit/1e363a33145fa7e370e0cb6806146719f2d9eb88))
* **backend:** add shared utilities and helpers ([8f64441](https://github.com/symonbaikov/lumio/commit/8f64441b1ac64ec0204c366cff151cf9c2240e76))
* **backend:** add tolerant matching to IntelligentDeduplicationService ([20e7119](https://github.com/symonbaikov/lumio/commit/20e71193f99ebf9425574ed44ad1011351d8e745))
* **backend:** add TransactionFingerprintService for duplicate detection ([e98b50c](https://github.com/symonbaikov/lumio/commit/e98b50ce5d2726fd45e1735fddd75eeb4ce67f51))
* **backend:** emit domain events and improve sync logic ([fbaa8ea](https://github.com/symonbaikov/lumio/commit/fbaa8ea0047bbb4cb32fa4fb21ff64a830ae01bd))
* **backend:** enhance statement parsing, processing and classification engine ([2ec622c](https://github.com/symonbaikov/lumio/commit/2ec622cf37985580a6b3a767f357220c38db9ac0))
* **backend:** implement custom tables with import capabilities ([43d67ab](https://github.com/symonbaikov/lumio/commit/43d67ab243705139181b4eb89de5d2ced0d63708))
* **backend:** implement ImportSessionService for orchestrating import workflow ([c63b29f](https://github.com/symonbaikov/lumio/commit/c63b29fad5c502b816343b4add9b6cb7052322e2))
* **backend:** implement notification system and balance module infrastructure ([67236e5](https://github.com/symonbaikov/lumio/commit/67236e57e971be8d571dbf1fb01a0a561db4501b))
* **backend:** implement storage system with dropbox and google drive integrations ([f9c17a7](https://github.com/symonbaikov/lumio/commit/f9c17a7a7e1a32fa14b245ae8aaebdb5ae789725))
* **backend:** update auth, reports and data-entry modules ([7f3c236](https://github.com/symonbaikov/lumio/commit/7f3c23692d7d4e2e80598e692ce47c28f729bc55))
* **backend:** update core infrastructure, entities and migrations ([5941919](https://github.com/symonbaikov/lumio/commit/59419190c4304f5130ff0df142fcabd84bf92573))
* **dashboard:** add /dashboard/trends endpoint aggregating all data sources ([80be0f8](https://github.com/symonbaikov/lumio/commit/80be0f808977a7783191c353184961a01ab2a294))
* **dashboard:** add data health metrics to dashboard API and hook ([7ffb8d0](https://github.com/symonbaikov/lumio/commit/7ffb8d0fcfb8ae0ea31b110921e014366e87b578))
* **dashboard:** add inline onboarding empty state to Overview tab ([db0459b](https://github.com/symonbaikov/lumio/commit/db0459b3a52d256fc81e6a3c6969c926bc4a3ab7))
* **dashboard:** add range param to useDashboard hook ([b77d985](https://github.com/symonbaikov/lumio/commit/b77d985b3bfda36bec9cfcc9d83a167f9f8e2156))
* **dashboard:** add range param, topMerchants, topCategories, AuditEvent activity ([8d0ebae](https://github.com/symonbaikov/lumio/commit/8d0ebaeafd67cfd0fb7355cdeb6eddc43d736d67))
* **dashboard:** add skeleton components for Trends, Data Health tabs and QuickActionsBar ([c6c1c73](https://github.com/symonbaikov/lumio/commit/c6c1c736e0b42120c16332433e63f7c0517efa3f))
* **dashboard:** add TopCategoriesCard, RangeSwitcher, EmptyState components ([2eb310d](https://github.com/symonbaikov/lumio/commit/2eb310da402a11f6102a5d9e823fbfdee9b333db))
* **dashboard:** add TopMerchantsCard component ([e00455f](https://github.com/symonbaikov/lumio/commit/e00455fa34e65882136875dc5559c76e159bf509))
* **dashboard:** full overview redesign — 6 KPI cards, top categories, range-aware labels ([5853066](https://github.com/symonbaikov/lumio/commit/5853066887992cfbf4f7572a6a21f98fede1c556))
* **dashboard:** full redesign with new layout, range switcher, and i18n keys ([232dc97](https://github.com/symonbaikov/lumio/commit/232dc97732d94ed7e4f69bbb602737adc2002507))
* **dashboard:** implement Trends and Data Health tabs, fix i18n content ([fc270f3](https://github.com/symonbaikov/lumio/commit/fc270f34f4baa13bfa69e40e38e8109f771be014))
* **dashboard:** make Action Required section larger and more prominent ([8cdc79c](https://github.com/symonbaikov/lumio/commit/8cdc79c3c896b538dd4a48ffa9ce0342ab2b424f))
* **dashboard:** make Cash Flow full-width and stack Categories below it ([437f044](https://github.com/symonbaikov/lumio/commit/437f044ef6c2bb8ee678350abed8b68fe661a1a7))
* **dashboard:** remove To Pay and Overdue KPI cards from Financial Snapshot ([e9ddb90](https://github.com/symonbaikov/lumio/commit/e9ddb9076e2036bedf0beff7e20fea071ebf27f9))
* **dashboard:** replace net flow line with income/expense dual-line chart in CashFlowMini ([fa04d6f](https://github.com/symonbaikov/lumio/commit/fa04d6fa784923994de418967bfea8deb3b6bcd1))
* **dashboard:** rewire to Overview/Trends/Data Health tabs with persistent Quick Actions bar ([f2abb4a](https://github.com/symonbaikov/lumio/commit/f2abb4aa2ad1180fafc787605fed6b0a9ebdd3c0))
* **dashboard:** standardize Overview card border-radius to 12px ([1d70f89](https://github.com/symonbaikov/lumio/commit/1d70f891f9758c1bd58ccbd3d29355d17be6114c))
* **db:** update database schema with new entities and migrations ([5f5df97](https://github.com/symonbaikov/lumio/commit/5f5df977cdf87286ce6b5cd0417f4e864bf16bd8))
* enhance main feature pages with improved UI ([60024b7](https://github.com/symonbaikov/lumio/commit/60024b78ff1617d9596d8a07f063c651bde69622))
* **frontend:** add shared UI components and stories ([ab795ca](https://github.com/symonbaikov/lumio/commit/ab795ca2106d53da51e1c60077cb2d1e5092996c))
* **frontend:** enhance custom tables and reports ([2a08a70](https://github.com/symonbaikov/lumio/commit/2a08a70bad100556a158fb9cf1212eba4e718f76))
* **frontend:** enhance statements, transactions, and reporting UI ([cc24eb5](https://github.com/symonbaikov/lumio/commit/cc24eb5ab407e1cb9737d2e2f92b89e2e93e464f))
* **frontend:** implement notifications ui ([5757aa8](https://github.com/symonbaikov/lumio/commit/5757aa81de4cbd8fa7fd029a72c3fba0362b7d41))
* **frontend:** implement storage and integration management UI ([66eabbf](https://github.com/symonbaikov/lumio/commit/66eabbfa1b5f5da0d8ae49568d24fc0bd812a8f6))
* **frontend:** implement UI for workspaces, audit logs, and gmail integration ([a7a5dc8](https://github.com/symonbaikov/lumio/commit/a7a5dc8633348959b0dca1fd59b7da118bde0adc))
* **frontend:** redesign profile settings and workspace configuration ([b067ca1](https://github.com/symonbaikov/lumio/commit/b067ca1224132a8f09640a2670a2cdafdbdc7e3a))
* **frontend:** refactor custom tables with TanStack table and improved UI ([30eec81](https://github.com/symonbaikov/lumio/commit/30eec81f2e98187fd9a5a9a8af3d211854eaa538))
* **frontend:** refresh workspace flows and shared UI primitives ([435a852](https://github.com/symonbaikov/lumio/commit/435a8527b82d9d686267ab59ffd0eeef473978d1))
* **frontend:** setup mantine and global theme updates ([91075c7](https://github.com/symonbaikov/lumio/commit/91075c70b2cbf721526ef04687489108f1c10c9f))
* **frontend:** update authentication pages and logic ([4e5cfde](https://github.com/symonbaikov/lumio/commit/4e5cfdef320f130ddf36b4725dc46fa0a528a3de))
* **frontend:** update settings, admin panel and tour system ([28c1310](https://github.com/symonbaikov/lumio/commit/28c131014151f52d323d7e23040449450d687f73))
* implement dark mode theme system ([c31751c](https://github.com/symonbaikov/lumio/commit/c31751c25e8ef588601b1f510f5a1c6fb82da3ff))
* implement workspace-scoped access control ([a38182c](https://github.com/symonbaikov/lumio/commit/a38182ccf3c03b7bb00c45f0ef1b0bfcaf32d979))
* **import:** add retry service and custom error classes ([bfb4e96](https://github.com/symonbaikov/lumio/commit/bfb4e962d06c3c1ee70304fc867b734a0f5c950b))
* integrate dark mode toggle and theme provider ([102fc62](https://github.com/symonbaikov/lumio/commit/102fc6255f81f91821793a779c83ab4a8bc2938e))
* integrate workspace creation with user registration ([c467685](https://github.com/symonbaikov/lumio/commit/c467685c7304dbf59b59545285760a1e7ceb190a))
* **reports:** add report history entity, generate endpoint, and migration ([610037e](https://github.com/symonbaikov/lumio/commit/610037e875928deea33d61c09c4f15bc04fe3329))
* **reports:** implement Cash Flow and Expense by Category report templates ([c72acda](https://github.com/symonbaikov/lumio/commit/c72acda44714b33d49c890de18c89e564240e93e))
* **reports:** implement P&L report template with Excel and CSV export ([446f206](https://github.com/symonbaikov/lumio/commit/446f206fa50b1713eb4e5dd271b1c06dbec30e69))
* **reports:** rewrite Reports as Report Builder with template cards, generator, and history ([58b0125](https://github.com/symonbaikov/lumio/commit/58b0125f21ed5f5647a55d34aab8b6cca7e20f2e))
* **reports:** update guided tour for Report Builder layout ([e6d6717](https://github.com/symonbaikov/lumio/commit/e6d671701561c35e6e1b15101a34d32010c2d57b))
* **reports:** update i18n content for Report Builder ([eb76eb7](https://github.com/symonbaikov/lumio/commit/eb76eb7ad41afd2b29691f4c2ee0629c3795360e))
* **side-panel:** prioritize work queues over insight navigation ([34af335](https://github.com/symonbaikov/lumio/commit/34af33544af9316bea3db16e586e94f5fec85d31))
* **statements:** add grouped duplicate review and bulk resolution actions ([a43e240](https://github.com/symonbaikov/lumio/commit/a43e24027138196d820f57c74a663cd4d8de8109))
* **statements:** add manual expense creation and drawer refactor ([683fc17](https://github.com/symonbaikov/lumio/commit/683fc17d4a79b8735853195fdc0d952baa194e6b))
* **statements:** add Transaction table tab (moved from Dashboard) ([e5705be](https://github.com/symonbaikov/lumio/commit/e5705bea10d9c3f572a0847992d92c643da721c2))
* **statements:** implement bulk selection and actions ([fc541b1](https://github.com/symonbaikov/lumio/commit/fc541b16efc144f554c932c71682d56386efbd57))
* **trends:** remove counterparty chart, period card, and rows count from TrendsTab ([97ff995](https://github.com/symonbaikov/lumio/commit/97ff9951fed0f571d89f9c7d4af2a02a046bad8e))
* **ui:** elevate FAB layer and add quick scan button ([4688409](https://github.com/symonbaikov/lumio/commit/4688409c21ddbedf75f509f4f36a5daff3451af3))
* update auth, admin, settings, and integration pages ([7b8c9d1](https://github.com/symonbaikov/lumio/commit/7b8c9d1bf44300d9d3cf5dc4d6703ed94a1e9310))
* **users:** standardize avatar filename handling and serving ([b6befea](https://github.com/symonbaikov/lumio/commit/b6befeae615541f7d600b60e7fc13fe86a019ead))


### Bug Fixes

* **audit:** add payable to audit entity type enum ([44f40dd](https://github.com/symonbaikov/lumio/commit/44f40dd3e41e73c736a98da5ef2e93b23e46e9ca))
* **audit:** refine formatter descriptions ([b376e77](https://github.com/symonbaikov/lumio/commit/b376e77da3f74c6c4e89ee1933153ebb20990b7d))
* **backend:** add missing deleteTag endpoint ([c6e5834](https://github.com/symonbaikov/lumio/commit/c6e5834a5b3a724132c3ebeee3b0a6936b90ef58))
* **backend:** address security and code quality issues in TransactionFingerprintService ([49d06bb](https://github.com/symonbaikov/lumio/commit/49d06bb9f1f08646bf70c2f5617dc308d265100d))
* **backend:** address spec compliance issues in ImportSessionService ([005921c](https://github.com/symonbaikov/lumio/commit/005921c40e6fb1ed7a501e17014f807fede9bec7))
* **backend:** resolve linting and formatting issues ([c6c4b10](https://github.com/symonbaikov/lumio/commit/c6c4b10c64356c6ef3d225acb6309e9ab0d6aa92))
* **dashboard:** always show main dashboard even when empty ([deb62c0](https://github.com/symonbaikov/lumio/commit/deb62c0ce482ec3903b32fa9228c35f2027c811f))
* **dashboard:** compute totalBalance from all-time transactions, not wallet.initialBalance ([b99fe49](https://github.com/symonbaikov/lumio/commit/b99fe4951b77d99e4916976cbf1ebcd5d8d95fdc))
* **dashboard:** exclude duplicate transactions from uncategorized action count ([f2e4230](https://github.com/symonbaikov/lumio/commit/f2e4230e4103833fe59d6c86d8ffb87260083ac5))
* **dashboard:** hide empty sections to avoid blank blocks ([2bc7cdd](https://github.com/symonbaikov/lumio/commit/2bc7cddd01965b78909a40e8adaf127943250c21))
* **dashboard:** sort imports in test file for biome compliance ([6bec822](https://github.com/symonbaikov/lumio/commit/6bec822b07cd39af9fe4a26cc0369bd9a9f7fce8))
* **dashboard:** use _props pattern for placeholder tabs, extract static actions array in QuickActionsBar ([57d9765](https://github.com/symonbaikov/lumio/commit/57d97654269191aa25c8126f92be2bd18f378014))
* **dashboard:** use strict undefined check for reviewCount in QuickActionsBar ([5c339c0](https://github.com/symonbaikov/lumio/commit/5c339c0061de3020b9c4e964eaa5aaa4cf5adfef))
* **dashboard:** wire date-picker into useDashboard and fix Statistics tab required props ([41c5284](https://github.com/symonbaikov/lumio/commit/41c528497fe40205938a2147015bd1f0db62955b))
* delete gmail receipts integration and point dashbard to generic table views ([aeea8d7](https://github.com/symonbaikov/lumio/commit/aeea8d769ca1d2a63333a4bd2856e099f49098ef))
* disable auto migrations to avoid conflicts with existing schema ([f8fdede](https://github.com/symonbaikov/lumio/commit/f8fdede92d7eff7b670bef9edb93970cd80c6333))
* disable auto migrations to prevent startup errors ([60e9fb9](https://github.com/symonbaikov/lumio/commit/60e9fb99bc7054d1a26003cd25d2e72a4d85df3e))
* **docker:** add dev stage to backend Dockerfile for devDependencies ([54591fb](https://github.com/symonbaikov/lumio/commit/54591fbedd227d887ceca3e722e26bc848049450))
* **docker:** remove Task 3 dependencies from Dockerfile ([6189206](https://github.com/symonbaikov/lumio/commit/6189206b858e04fc25f11685a3b31b8ac610b994))
* **docker:** update docker-compose.dev.yml to target dev stage ([59568eb](https://github.com/symonbaikov/lumio/commit/59568ebbe6865fc3b7cfb3e82fed34a8896f0415))
* enable auto migrations on startup ([1137f24](https://github.com/symonbaikov/lumio/commit/1137f24f8fea3a30223e4ac11e7c070dd96bcaa8))
* **frontend:** add serverExternalPackages for intlayer node:fs compat ([a5b9dc7](https://github.com/symonbaikov/lumio/commit/a5b9dc780cff707f7cd1291b79e5f97d4c4895e0))
* **frontend:** improve handling of disabled categories and lists ([6ba411c](https://github.com/symonbaikov/lumio/commit/6ba411c228e867b848335339f631371702d8f3b2))
* **frontend:** remove verbose PDFThumbnail logging ([23cf3e0](https://github.com/symonbaikov/lumio/commit/23cf3e07bff827f7f5f0dbfa00c73d05818839a8))
* **frontend:** resolve linting and formatting issues ([ef8a0ee](https://github.com/symonbaikov/lumio/commit/ef8a0ee2ca453d6b89052736ae69044d85f13579))
* **frontend:** restore gmail receipt preview modal and fix DeleteRowModal portal target ([db76773](https://github.com/symonbaikov/lumio/commit/db767739ef28f6959fe559f6014c4f7c85b94637))
* **import:** format test file to single-line function call ([d070220](https://github.com/symonbaikov/lumio/commit/d070220e291a7827fb781467ece3ea0e1dfa9215))
* **import:** register ImportRetryService in ImportModule ([558a981](https://github.com/symonbaikov/lumio/commit/558a981cf69433c14ae40cf367ecf89740415f0c))
* **import:** rely on persisted transaction counts ([912a9d2](https://github.com/symonbaikov/lumio/commit/912a9d262b8437b70697379b682b0ee9de923621))
* **parsing:** auto-commit parsed transactions ([24d6ab8](https://github.com/symonbaikov/lumio/commit/24d6ab8bebfd2d79fbc876476ded6e22eb1db7fd))
* **parsing:** avoid reprocessing completed imports ([debf856](https://github.com/symonbaikov/lumio/commit/debf856e38785c55d1537576af3578646a368006))
* **parsing:** clarify AI reconciliation skip logs ([c13c18a](https://github.com/symonbaikov/lumio/commit/c13c18a50d7fe866b16c23f1a84fc2f37c563574))
* **parsing:** handle Kaspi period and balance formats ([8d45c48](https://github.com/symonbaikov/lumio/commit/8d45c48ffbe5246717ca651ec4df8014318629a5))
* **parsing:** handle parsed statements with persisted transactions ([d4cd10a](https://github.com/symonbaikov/lumio/commit/d4cd10a311b9b9c063a15466708a78e4b16a4a15))
* **parsing:** require explicit AI enablement ([6f2758d](https://github.com/symonbaikov/lumio/commit/6f2758df9f8dc1fb0d837561409c45276a76ab60))
* remove invalid useStaticAssets method ([e621cfd](https://github.com/symonbaikov/lumio/commit/e621cfd49c8d4df0cb25f68ef4409a8462b6a54b))
* remove syntax errors and simplify deployment ([94fd35e](https://github.com/symonbaikov/lumio/commit/94fd35eb9f2b39b621564c559eccc6bdd2afb899))
* **seed:** compile scripts locally before running in dev ([086a40e](https://github.com/symonbaikov/lumio/commit/086a40e55c0ab8c2e15303c09eaf5eb69a699675))
* **seed:** pre-compile seed scripts to avoid ts-node OOM ([4a3a2c6](https://github.com/symonbaikov/lumio/commit/4a3a2c66a94aee91cefc5c17b14138112a85aa44))
* **seed:** use compiled scripts for all tools, fix local fallback ([6a3a4f9](https://github.com/symonbaikov/lumio/commit/6a3a4f98fd4d09b0281f039049018fb2cc2360e1))
* **statements:** await list refresh after upload ([906f36f](https://github.com/symonbaikov/lumio/commit/906f36f86773e2c95b0c2af8dcab64f607d47b51))
* **statements:** separate upload and refresh errors ([77479f9](https://github.com/symonbaikov/lumio/commit/77479f90ead1129f004ce06716938d9ca1081519))


### Performance Improvements

* optimize tour initialization timing ([3c9e6c1](https://github.com/symonbaikov/lumio/commit/3c9e6c1197e19dbc9d5dc7ed0ca81ff3304e350c))

## [Unreleased]

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
