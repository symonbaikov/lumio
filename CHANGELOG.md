# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-10-02)


### Features

* add encrypted workspace backups ([76a0894](https://github.com/symonbaikov/lumio/commit/76a0894209f0be353657ec3fae9a80e075a7697a))
* add graphify code graph rag ([268f796](https://github.com/symonbaikov/lumio/commit/268f796d7f90c601921902d713c1625b58ad4684))
* add local LLM spending analysis ([de35e30](https://github.com/symonbaikov/lumio/commit/de35e30df1e5d4bda73130cd1c12c7d7292a4477))
* **agents:** scoped API keys, agent writes audited as their actor and undoable, MCP and security docs ([dcf1733](https://github.com/symonbaikov/lumio/commit/dcf173376683e9856f23e8f68831c79da25245ad))
* **app:** cash runway, receivables, account data rights, global search, PWA, transaction files ([#126](https://github.com/symonbaikov/lumio/issues/126)) ([0344e8d](https://github.com/symonbaikov/lumio/commit/0344e8dd95795ef76626580b496416a9f634d0b6))
* **audit:** record every mutation once, with the acting user ([c33fe1f](https://github.com/symonbaikov/lumio/commit/c33fe1f2773c3c9b44c1cfd8fa90b83ac10b938a))
* **audit:** record every mutation once, with the acting user ([cbda158](https://github.com/symonbaikov/lumio/commit/cbda15822a43ccf57354b8887a3ec285bf019c4b))
* **auth:** improve auth and categorization setup ([aeb2006](https://github.com/symonbaikov/lumio/commit/aeb20066c604cd826b4d668ac6c1de3c5d722654))
* **auth:** remove Google sign-in capability ([c37e108](https://github.com/symonbaikov/lumio/commit/c37e1080f2580c12aec2f5ea43641058c0f5ae4f))
* **auth:** remove Google sign-in capability ([c7b49c5](https://github.com/symonbaikov/lumio/commit/c7b49c5246dfa2e30bd0957cb3112b8777834b98))
* **backend:** add API keys, budgets, and subscriptions modules ([ef4bae1](https://github.com/symonbaikov/lumio/commit/ef4bae108e5ef79627c7f0f6dc1c195f9208487f))
* **backend:** add API keys, budgets, and subscriptions modules ([6b0e324](https://github.com/symonbaikov/lumio/commit/6b0e324859c52ad3e1a7c6a03d92171759fe96af))
* **backend:** add service settings and categorization ([3144fce](https://github.com/symonbaikov/lumio/commit/3144fcefbdc6827a3af5423986ac74952c50edd6))
* **backend:** update core entities and infrastructure ([67dc9a2](https://github.com/symonbaikov/lumio/commit/67dc9a288c6c6746a4be6f0530ea0b33b6472a75))
* **backend:** update core entities, services, and infrastructure ([0b63191](https://github.com/symonbaikov/lumio/commit/0b63191c2cb46a8509d301a91e7e086acdf16fb7))
* **balance:** allow custom accounts under expandable sections ([#113](https://github.com/symonbaikov/lumio/issues/113)) ([f96310f](https://github.com/symonbaikov/lumio/commit/f96310f3588e82be64e092771225cbf40cc5fcce))
* **bank-sync:** pull statements from the user's own SimpleFIN account ([b9fc1bb](https://github.com/symonbaikov/lumio/commit/b9fc1bb9699a37b821cf019f359674f54aa6775f))
* **budgets:** open the budget form in a side drawer ([8552a92](https://github.com/symonbaikov/lumio/commit/8552a92752891c45e06879d9828da881a5559f7a))
* **budgets:** rollover modes, parent-category budgets, "what would this do" before booking ([b4a9614](https://github.com/symonbaikov/lumio/commit/b4a961457d4e7f5e02f58d0370d654f4bad17ac4))
* **budgets:** support goal-linked budgets in create/update flow ([771efab](https://github.com/symonbaikov/lumio/commit/771efab25dce18a85b2ed46eb1aac57f992641ab))
* **budgets:** support manual spent tracking ([757c758](https://github.com/symonbaikov/lumio/commit/757c7580bbee20a238cc5356356e99c8cbe15add))
* **chat:** add per-user AI provider settings and cloud engine gating ([f6b5b49](https://github.com/symonbaikov/lumio/commit/f6b5b4925da3243332b02c1f96e7dfafb0b5c3c5))
* **classification:** record where a category came from, add switches, guard learning ([f3c9912](https://github.com/symonbaikov/lumio/commit/f3c9912b9645c581dcd469ce5471e2fb88609d46))
* **crypto:** Bitcoin, Tron and Solana sync plus a redesigned /crypto page ([f17c05e](https://github.com/symonbaikov/lumio/commit/f17c05e5488800b6cc61a0f6739ccde56e7fada2))
* **crypto:** Bitcoin, Tron and Solana sync plus a redesigned /crypto page ([56918f1](https://github.com/symonbaikov/lumio/commit/56918f114cc6e1ac7fde3a866ed94d4b8a64c35c))
* **crypto:** connect any injected browser wallet, not only MetaMask ([5bf2e7c](https://github.com/symonbaikov/lumio/commit/5bf2e7c0fae7e26fa7b3cc84b84f0e76d25264dd))
* **crypto:** connect any injected browser wallet, not only MetaMask ([b75a53c](https://github.com/symonbaikov/lumio/commit/b75a53c8fff77c533afd74cd8009b721a18588a9))
* **crypto:** connect read-only crypto wallets and fold them into the stats ([#118](https://github.com/symonbaikov/lumio/issues/118)) ([0ca058b](https://github.com/symonbaikov/lumio/commit/0ca058b0157cd690284d4f805032f7f335a5712d))
* **crypto:** dashboard card follows the selected month; audit wallet changes ([492ed16](https://github.com/symonbaikov/lumio/commit/492ed160be1ae75318aad1ee839cfa1c0e1b4b20))
* **crypto:** dashboard card follows the selected month; audit wallet changes ([0855b68](https://github.com/symonbaikov/lumio/commit/0855b68e88c23eb9ab29125c6f5db701ec416bf2))
* **crypto:** track wallet balances with retrying price/sync fetches ([f5de33a](https://github.com/symonbaikov/lumio/commit/f5de33a63544bd2eddc00b718eec5e491525312f))
* **crypto:** turn the connect-wallet dialog into a drawer ([7ef6c05](https://github.com/symonbaikov/lumio/commit/7ef6c0558596d8bc1b675cb2007f6975d244db4f))
* **currency:** hand-entered exchange rates belong to one workspace ([ce4f0f8](https://github.com/symonbaikov/lumio/commit/ce4f0f8b379f717f8cc99744c44b75564dc83bb1))
* **currency:** say when a rate is missing instead of pretending it is 1 ([694a342](https://github.com/symonbaikov/lumio/commit/694a342e047d51500ea599387a4d128af5b0c143))
* **custom-tables:** add per-column style and table templates ([4f3001f](https://github.com/symonbaikov/lumio/commit/4f3001f2b68142d9d0277c2caeb4eed518699ab9))
* **custom-tables:** add rows as a local draft before the first save ([4ade8bb](https://github.com/symonbaikov/lumio/commit/4ade8bbb3a83a4695e8acb5a71131a3afb8a8355))
* **custom-tables:** convert tables to statements ([0ee7264](https://github.com/symonbaikov/lumio/commit/0ee72648312fc64734e677bdcc6c251c63ff7eff))
* **custom-tables:** expand table functionality across 17 features ([bb234de](https://github.com/symonbaikov/lumio/commit/bb234de14a79e8e0f2b3cdd95e3428ce7c9e2903))
* **custom-tables:** rebuild the table UI on a shared data-grid kit ([9e2a1fe](https://github.com/symonbaikov/lumio/commit/9e2a1fe20b2fd6ddb91dd0156220c6cf838e95b3))
* **custom-tables:** rebuild the table UI on a shared data-grid kit ([d386df9](https://github.com/symonbaikov/lumio/commit/d386df91351db866f9348debf31417e77b8d0402))
* **dashboard:** add finance ops overview ([38636e9](https://github.com/symonbaikov/lumio/commit/38636e9fb8392223351ca859acf513a3af30ab15))
* **dashboard:** redesign dashboard with shared card kit, month strip and category icons ([5d6a08e](https://github.com/symonbaikov/lumio/commit/5d6a08e760179661432707e638279b1d821d0089))
* **dashboard:** use live metrics and linked filters ([5c2bc55](https://github.com/symonbaikov/lumio/commit/5c2bc559c1443aed5dc0a9500eda4638a710c4bc))
* **dev:** add one-command bootstrap ([49dcb7c](https://github.com/symonbaikov/lumio/commit/49dcb7ce642f1345efee560ae2a38e3a4c1d6b1f))
* **electron:** add desktop application with native shell ([8d5e96e](https://github.com/symonbaikov/lumio/commit/8d5e96e3d5398443a90181aa4d75af9460de5918))
* **exchange-rates:** add public API fallback ([837aece](https://github.com/symonbaikov/lumio/commit/837aece74ccc67d66ef6a8ad817f818cf1120f72))
* experimental mode gate, OCR PDF rasterization and parsing fixes ([6643a6e](https://github.com/symonbaikov/lumio/commit/6643a6ea1fb9ee4cb882fab6784d45e92dc0f7ee))
* **forecast:** cash-flow forecast with safe-to-spend, runway and scenarios ([a8e14d9](https://github.com/symonbaikov/lumio/commit/a8e14d909ca890a3f9899b8526c5888bdffd752a))
* **frontend:** add budgets, subscriptions pages and MCP server ([31395ca](https://github.com/symonbaikov/lumio/commit/31395ca8d97adac7457d27c2707403675f409b56))
* **frontend:** add budgets, subscriptions pages and update custom tables ([5fe05c5](https://github.com/symonbaikov/lumio/commit/5fe05c596762e96437b10bb4cc233e52ce7b51bd))
* **frontend:** add Webhooks plugin to Plugins tab ([e399b9c](https://github.com/symonbaikov/lumio/commit/e399b9c27ad597f6436ff51a56efa58c432369c3))
* **frontend:** comprehensive dark mode coverage across all pages ([a11b619](https://github.com/symonbaikov/lumio/commit/a11b61906ea1eb2443588e0aaa9c7057d5b0ad9a))
* **frontend:** consolidate dashboard, statements, and workspace UI updates ([#115](https://github.com/symonbaikov/lumio/issues/115)) ([7fbd202](https://github.com/symonbaikov/lumio/commit/7fbd20218af655518bf1638eab5ac7d85718480b))
* **frontend:** fix remaining hardcoded colors for dark mode ([aa54460](https://github.com/symonbaikov/lumio/commit/aa54460085c0ac57c97c543dcf36dbde308d85db))
* **frontend:** migrate dark mode inline styles to theme tokens ([691ad03](https://github.com/symonbaikov/lumio/commit/691ad030971082cb43e378e02eca25be1e8cdd4f))
* **frontend:** polish custom tables, workspaces, and notifications ([cdf2f56](https://github.com/symonbaikov/lumio/commit/cdf2f561c7ede553bc56105f8a0a8c8d5608e38b))
* **frontend:** show an Update button when a newer release is published ([#127](https://github.com/symonbaikov/lumio/issues/127)) ([e51099d](https://github.com/symonbaikov/lumio/commit/e51099d58689fefaedbd698f5493f5a6d696701d))
* **frontend:** stack receipt fields and unify expense drawer rows ([#119](https://github.com/symonbaikov/lumio/issues/119)) ([f9e5ba4](https://github.com/symonbaikov/lumio/commit/f9e5ba45f33548568d89d61c6235c359f2ec68a7))
* **frontend:** update sidebar brand styling ([4afba3c](https://github.com/symonbaikov/lumio/commit/4afba3c5323e94963b9bf8f6581eba3bde68910a))
* **frontend:** update sidebar brand styling ([dee0855](https://github.com/symonbaikov/lumio/commit/dee0855b17e185137ddce5583ee2066117ab6798))
* **frontend:** update UI components, navigation, and workspace views ([cda4ab6](https://github.com/symonbaikov/lumio/commit/cda4ab6d992c20148141b4245a4cd5244c7476b2))
* **frontend:** update UI components, navigation, and workspace views ([4c7304b](https://github.com/symonbaikov/lumio/commit/4c7304b4e0c1d2a780937a0464ac0f6c54e22fc5))
* **gmail-imap:** add IMAP receipt source support to Gmail module ([1c0b17f](https://github.com/symonbaikov/lumio/commit/1c0b17f32f935f8ed9dd340716eac1828eb1a0fb))
* **goals:** add goal flow detail page with plan/budget/savings tracking ([63709a6](https://github.com/symonbaikov/lumio/commit/63709a6eea243e19ca822329f0c80eae690c2fff))
* **i18n:** add Kazakh locale and update content translations ([1769ba8](https://github.com/symonbaikov/lumio/commit/1769ba8a0cfc572a482f5a054fa781afe675c520))
* **i18n:** move remaining hardcoded strings to intlayer ([102619e](https://github.com/symonbaikov/lumio/commit/102619ef6be0c69be11feaa3027c630b963eef65))
* **i18n:** move remaining hardcoded strings to intlayer ([3addc54](https://github.com/symonbaikov/lumio/commit/3addc54b35b6dd666bbe9f05248f10e9444c2462))
* **imap:** browse mailbox folders, fix sync for pre-read emails, add S3 auto-backup ([e8c4a35](https://github.com/symonbaikov/lumio/commit/e8c4a35064055968296e8d8b48a854a81d9adb8a))
* **import:** OFX/QFX, QIF, camt.053, MT940, bank CSV presets, statements from the mailbox ([7692109](https://github.com/symonbaikov/lumio/commit/76921095ce6e2d930ef76bb0126e63f2f3adc70b))
* income tax declaration, receipt locations/maps, auth hardening and infra cleanup ([ace052a](https://github.com/symonbaikov/lumio/commit/ace052afbc8c0f730fb0526de27a2abfb834a12f))
* income tax declaration, receipt maps, auth hardening and infra cleanup ([5aaf9d6](https://github.com/symonbaikov/lumio/commit/5aaf9d62a22cd38b212905d2a94c17f294c650e9))
* **income-tax:** EU filing dates, Italian FX, Polish tax scale, record retention ([482d902](https://github.com/symonbaikov/lumio/commit/482d9028e2553794f3339569d725d9376a3d6b73))
* **insights:** credit experts by name in the reader's language ([9e81efd](https://github.com/symonbaikov/lumio/commit/9e81efd6bafebe8c89a6654e901582846027db57))
* **insights:** credit experts by name in the reader's language ([ef69761](https://github.com/symonbaikov/lumio/commit/ef697611ea2cc5209be74a5a2f05337f6f2fc776))
* **insights:** render keyed advice in the reader's interface language ([55dcbcc](https://github.com/symonbaikov/lumio/commit/55dcbcc0e000e727ccad8da3225c0f317cdd15da))
* **insights:** render keyed advice in the reader's interface language ([d695f7f](https://github.com/symonbaikov/lumio/commit/d695f7f463e9f0475a9fd2b7b1baead013447da0))
* **insights:** route insight notifications to their source page ([5f76347](https://github.com/symonbaikov/lumio/commit/5f763474d1890ed2db26e3e243f92685d2072837))
* **insights:** stoic advice and a daily quote ([c14f514](https://github.com/symonbaikov/lumio/commit/c14f514a5dfee0b20433c206cee9261e9d8a1446))
* **insights:** stoic advice and a daily quote ([5c76cdb](https://github.com/symonbaikov/lumio/commit/5c76cdb3a0fa3ffe0c47795f2b0bab3045042706))
* **integrations,plugins:** turn both tabs into two-layer side panels ([ba19bb9](https://github.com/symonbaikov/lumio/commit/ba19bb9608081e5f03f46e69175d05fa85bcb66b))
* **investments:** accounts with holdings and ticker prices, contributions as transfers, net-worth ranges and all-time high ([69b7afc](https://github.com/symonbaikov/lumio/commit/69b7afce9da670a4d8e9107f97d8fa4269ed9365))
* **invoices:** add clients, itemized invoices, PDF export and recurrence ([ead23fb](https://github.com/symonbaikov/lumio/commit/ead23fbbb83ef4776014e44ed69cafadb9b136cd))
* **invoices:** add clients, itemized invoices, PDF export and recurrence ([6b534ac](https://github.com/symonbaikov/lumio/commit/6b534ac2714cfa8036bf5fb409f9f0cf0e88ca46))
* **ledger:** add double-entry general ledger ([7bc9098](https://github.com/symonbaikov/lumio/commit/7bc90989eb5d30a71ce3630420c348f06ef2ed1e))
* **ledger:** book crypto transfers at their recorded fiat value ([fca6275](https://github.com/symonbaikov/lumio/commit/fca6275227813531d593a8e9d6e9db50b7b93c01))
* **ledger:** book wallet opening balances ([d10a618](https://github.com/symonbaikov/lumio/commit/d10a61898da3bacae696a3dc9a20861cdaff500e))
* **ledger:** double-entry general ledger, FX-correct reports, bill payments and revaluation ([c74d183](https://github.com/symonbaikov/lumio/commit/c74d1838ea080dd4c57075ddda91d3108dfc55d5))
* **ledger:** revalue foreign-currency balances on request ([c26151f](https://github.com/symonbaikov/lumio/commit/c26151fa735bc71db0e9f8c100b9e0745c7653b8))
* **mcp-server:** add MCP server with tools and resources ([8d7a902](https://github.com/symonbaikov/lumio/commit/8d7a90275a4bd4be262af236a75325a92c242f93))
* migrate frontend data fetching to React Query, redesign settings tabs, fix receipts and OCR handling ([edcd435](https://github.com/symonbaikov/lumio/commit/edcd43548c5cad4d373828ee5e22819ade0f8055))
* **mobile:** add MobileBottomBar component with 5-tab navigation ([1260d5e](https://github.com/symonbaikov/lumio/commit/1260d5ebb6bca17691d3b3ec7e00dc7c9f44a630))
* **mobile:** add upward radial menu to bottom bar FAB ([79fbbc5](https://github.com/symonbaikov/lumio/commit/79fbbc54789a59ed8185f8ac5bf5f69cef2a8049))
* **mobile:** implement MobileMenuDrawer with full navigation ([60ebdde](https://github.com/symonbaikov/lumio/commit/60ebdde18b30d3bacab871a56ce316a608dca655))
* **mobile:** integrate bottom bar, hide old sidebar/hamburger on mobile ([513533b](https://github.com/symonbaikov/lumio/commit/513533b24fbeb3dbc22b347664432f773262b158))
* **mobile:** offline entries, web push, home-screen shortcuts ([ce77246](https://github.com/symonbaikov/lumio/commit/ce77246a74118f7497581c07abfc997670480992))
* **mobile:** replace breadcrumbs with logo in TopBar on mobile ([325fb5f](https://github.com/symonbaikov/lumio/commit/325fb5f7865f530bc6ae48d71a8c45bbcae41360))
* **nav:** unify the statements panel into one shell sidebar, drop breadcrumbs ([89ac9e9](https://github.com/symonbaikov/lumio/commit/89ac9e92a32ec6925fe9df7f9d24c0d6c7357057))
* **nav:** unify the statements panel into one shell sidebar, drop breadcrumbs ([5bcd0b9](https://github.com/symonbaikov/lumio/commit/5bcd0b99bef374d99bd1e3149a5dfa543dd63e60))
* **notes:** add notes module with mentions support ([9580bf2](https://github.com/symonbaikov/lumio/commit/9580bf21905f9ff9ff7b7abab621ca1209786ab7))
* **notifications:** add i18n for all notification messages (20 languages) ([208f8d8](https://github.com/symonbaikov/lumio/commit/208f8d8968f34be143b0327ea47bd47475bf9a29))
* **notifications:** extend event types and delivery preferences ([d6c5377](https://github.com/symonbaikov/lumio/commit/d6c53773d572f49d73e46adc0869330cb4b9f329))
* **notifications:** open the related page and ring the item on click ([6c4fa14](https://github.com/symonbaikov/lumio/commit/6c4fa14c175057b455f21971214caa90f1b0caff))
* **open-protocol-integrations:** add user-managed integration settings ([08669e5](https://github.com/symonbaikov/lumio/commit/08669e5c03c9cb4fc084ea1d5d5cfdab17473589))
* **parsing:** make statement import atomic, idempotent and recoverable ([#128](https://github.com/symonbaikov/lumio/issues/128)) ([d9ef900](https://github.com/symonbaikov/lumio/commit/d9ef900b59742e8736066e7ed134b07954924232))
* **payables:** improve payables and recurring services ([5f62b61](https://github.com/symonbaikov/lumio/commit/5f62b61b83020e9f700b9d25181b65e1b4d09f90))
* **payables:** settle a bill against its bank transaction or in cash ([de3c0d7](https://github.com/symonbaikov/lumio/commit/de3c0d77d8bc6d5dd8778be55d872a25266d26b0))
* phase 1 of the 2026 expectations plan — review inbox, receipts↔bank rows, Telegram inbound, subscriptions 2.0, budget mechanics, Home/Business profile ([5c7f15a](https://github.com/symonbaikov/lumio/commit/5c7f15aa19bb4dd62217f91d9c3091ef7416228f))
* phase 2 of the 2026 expectations plan — forecast, investments, cash-flow map, trusted agents, small-business pack ([cd0a660](https://github.com/symonbaikov/lumio/commit/cd0a6600fe5ee832278366f0e8ac6907c500b241))
* **receipts:** ask for the shop once GPS comes back after a scan without it ([a3fbcb0](https://github.com/symonbaikov/lumio/commit/a3fbcb0e98567c5fde2d87865643ce6c3186ba63))
* **receipts:** ask for the shop once GPS comes back after a scan without it ([90308af](https://github.com/symonbaikov/lumio/commit/90308af35b157d007131ef0d6fce81a29ca11101))
* **receipts:** match receipts to bank rows, split by line items, read email bodies ([31b3b15](https://github.com/symonbaikov/lumio/commit/31b3b158c2f534133d6cdd0f6b624edef1057638))
* **reports:** cash-flow map — sankey, treemap, period comparison, transfers switch, CSV ([d7b0eed](https://github.com/symonbaikov/lumio/commit/d7b0eed43283627eada39841b9af148aba2f3e81))
* **reports:** fix broken generation and build out the Reports tab ([#123](https://github.com/symonbaikov/lumio/issues/123)) ([570affc](https://github.com/symonbaikov/lumio/commit/570affc4651c175f8889b8ee5e8a4c6312698424))
* **review-inbox:** one queue for everything that needs a decision ([2e474b4](https://github.com/symonbaikov/lumio/commit/2e474b4e55bf7bd65c5837f06a577a749aa37c09))
* **scss:** add comprehensive dark mode to shell layout ([f8c38ce](https://github.com/symonbaikov/lumio/commit/f8c38cea9fa380ab4bdcf74d4c936cf3a01b5ec6))
* **scss:** add dark mode coverage to SCSS components ([866e41e](https://github.com/symonbaikov/lumio/commit/866e41e9c53d80c3e7616fcf50c54aaa05614805))
* **search:** turn header search into a drawer with Search and Favorites tabs ([9472c11](https://github.com/symonbaikov/lumio/commit/9472c11912ae58be03c502a364315ee2c5cceec3))
* **search:** turn header search into a drawer with Search and Favorites tabs ([b0be46f](https://github.com/symonbaikov/lumio/commit/b0be46f94ff5e63d14d80c0f0b6baa736ce717bd))
* **security:** add a download button for 2FA recovery codes ([ae5f484](https://github.com/symonbaikov/lumio/commit/ae5f4845588f174d912c4c17cf4bc6e9254901e7))
* **security:** add a download button for 2FA recovery codes ([0abc5fb](https://github.com/symonbaikov/lumio/commit/0abc5fb3ad152030ba1ed0ff80ae0c87372bd646))
* **settings:** expand the settings menu across seven areas ([58f8835](https://github.com/symonbaikov/lumio/commit/58f8835b3bd7056343055f8bf56c2d48b7b3031c))
* **settings:** expand the settings menu, and four bugs found on the way ([7d8b64d](https://github.com/symonbaikov/lumio/commit/7d8b64d11f8048b28cb9bf3ff85acd1c898010a5))
* **settings:** let users hide the daily quote banner ([8c32371](https://github.com/symonbaikov/lumio/commit/8c32371bf506ad5527291bc46b06f90a276d9763))
* **settings:** let users hide the daily quote banner ([11ed95c](https://github.com/symonbaikov/lumio/commit/11ed95ca2fa6c627bee7190b41bb946d3acf80ac))
* **settings:** name time zones in the interface language ([9e3fae5](https://github.com/symonbaikov/lumio/commit/9e3fae526f9b7a218a83962b337daca57de56bb8))
* **settings:** name time zones in the interface language ([018729e](https://github.com/symonbaikov/lumio/commit/018729e92bb5be4903358b1d9763dc44529b5b8a))
* **shortcuts:** add help modal and global shortcuts provider ([699ed69](https://github.com/symonbaikov/lumio/commit/699ed6903c3dec55f9997b06e4aca01596b967f7))
* **shortcuts:** add keyboard shortcuts infrastructure with help modal ([1a87389](https://github.com/symonbaikov/lumio/commit/1a8738939835486ba6164139cbc3c6b98a7eec5d))
* **shortcuts:** add tinykeys and keyboard shortcuts infrastructure ([335f5b8](https://github.com/symonbaikov/lumio/commit/335f5b88ea82dfc46472e02c76a75dd38f37b25f))
* **shortcuts:** wire page-level shortcuts on statements page ([84136d8](https://github.com/symonbaikov/lumio/commit/84136d8bde7f11872b04309513e30fe12f817544))
* **smb:** bank reconciliation, AR/AP ageing, duplicate bills, dunning reminders, owners report ([00ad875](https://github.com/symonbaikov/lumio/commit/00ad8754974b3288d1da820b4fe8111f3b567010))
* **statements-ui:** add configurable columns and table overflow ([eaae025](https://github.com/symonbaikov/lumio/commit/eaae0255cedb242b08cfd04d8eed537062431fcc))
* **statements:** add edit review helper components ([cd719f6](https://github.com/symonbaikov/lumio/commit/cd719f6b0ad2c5019d9eb006ed18cba13554e846))
* **statements:** add summary metadata for configurable columns ([6247cba](https://github.com/symonbaikov/lumio/commit/6247cbab77d169076def31d3a476023ace2c65a7))
* **statements:** keep the review stage on the server ([0d725a4](https://github.com/symonbaikov/lumio/commit/0d725a474cd7508c3858b535a42833572870a8e0))
* **statements:** keep the review stage on the server ([7e52cf3](https://github.com/symonbaikov/lumio/commit/7e52cf3d525faae25ce9f91030dd39e443971506))
* **statements:** redesign the create-expense drawer ([6cadb18](https://github.com/symonbaikov/lumio/commit/6cadb18b7c33e3c5eb57054216cb5f02d54ea2c9))
* **statements:** redesign the create-expense drawer ([dab4cd1](https://github.com/symonbaikov/lumio/commit/dab4cd15846f1e036c23eed681cd28f889872465))
* **statements:** simplify analytics views and upload flows ([ba99ecc](https://github.com/symonbaikov/lumio/commit/ba99ecc31745ee8f299ecfcb06c0c4a448868314))
* **subscriptions:** add charge calendar matrix and vendor brand icons ([c4e6d67](https://github.com/symonbaikov/lumio/commit/c4e6d672cafc957ec73e41e635b3c483932a41c2))
* **subscriptions:** price-change alerts, duplicates, cost per use, sinking funds, bills in the calendar ([56344f0](https://github.com/symonbaikov/lumio/commit/56344f067ba086379e2dfe754519e7c823f4a8dd))
* **sync:** add workspace file export from profile ([428849e](https://github.com/symonbaikov/lumio/commit/428849e1809ec6498d007893d40febcec3bf75cf))
* **tax:** add jurisdiction reference tables and statutory seed ([c03acaf](https://github.com/symonbaikov/lumio/commit/c03acafeb11e7272ec2616817e5d348cad204803))
* **tax:** add money utility and the tax calculation core ([51241f2](https://github.com/symonbaikov/lumio/commit/51241f2a62380dd8576fd74069924bd5e4f4a887))
* **tax:** add period returns with filing and transaction locking ([f5b82ce](https://github.com/symonbaikov/lumio/commit/f5b82ce4779f899b6538efcddd31349ffee17edb))
* **tax:** add rules engine and automatic rate assignment ([1624a80](https://github.com/symonbaikov/lumio/commit/1624a80d62f98adacd55f4ad6baf4da61144b046))
* **tax:** add screens for the period return and tax rules ([90af09d](https://github.com/symonbaikov/lumio/commit/90af09d422b430357a1d0e1f137234f090cb9382))
* **tax:** add workspace country picker with flags and accuracy notice ([d77fb21](https://github.com/symonbaikov/lumio/commit/d77fb21dd930ec1e6fe130f01edb74d58250a890))
* **tax:** assess tax on the parser, receipt and split paths ([02f02ba](https://github.com/symonbaikov/lumio/commit/02f02ba9233df794e7529ed7ea53c4da611b51f6))
* **tax:** bind workspaces to a jurisdiction and version their rate set ([0df7082](https://github.com/symonbaikov/lumio/commit/0df7082293dcc3fae696061e82656c434b21fa1b))
* **tax:** export the return as PDF or XLSX ([24ba8c1](https://github.com/symonbaikov/lumio/commit/24ba8c1da1884c0af44e6da0667b334e6afda08e))
* **tax:** implement reverse charge for cross-border EU B2B ([1493faa](https://github.com/symonbaikov/lumio/commit/1493faaa00cc2deaa0707252290be31c7fa0903c))
* **tax:** watch turnover against the registration threshold ([7ac7608](https://github.com/symonbaikov/lumio/commit/7ac76084d0a2959b91e853714a2576987114b2ce))
* **telegram:** take receipts and expenses from the chat ([b5ce625](https://github.com/symonbaikov/lumio/commit/b5ce625e2ee7f2950ec71477b732f19a04b76813))
* **topbar:** show user name + avatar in trigger, User Actions title in dropdown ([2411811](https://github.com/symonbaikov/lumio/commit/2411811cce8acfed9be7411d2e99cef81be8555f))
* **tours:** start page tours only from the help menu ([609590d](https://github.com/symonbaikov/lumio/commit/609590dd4021c9a6c301d3357ffc8005e79e51b5))
* **transactions:** pair the legs of transfers between own accounts ([85b5e31](https://github.com/symonbaikov/lumio/commit/85b5e31b687212ba4c185df7dbf147a9e239c394))
* **transactions:** reimbursement links, account-aware duplicates, roadmap ([4f5fb0c](https://github.com/symonbaikov/lumio/commit/4f5fb0c3bd50fc579130e263b0b38362d2f24747))
* **tutorial:** add welcome tutorial texts in all 21 locales ([bb78cfa](https://github.com/symonbaikov/lumio/commit/bb78cfa7fde3a1cf1dd0f01ff34c747799698730))
* **tutorial:** show new accounts a welcome tutorial of the sidebar pages ([3bd2365](https://github.com/symonbaikov/lumio/commit/3bd2365f14898fc0392c8d949648f90275573ae3))
* **ui:** 404 page, error and clients empty-state illustrations ([74b88d3](https://github.com/symonbaikov/lumio/commit/74b88d344258846a9e20bdb3f572e7dbc516da86))
* **ui:** 404 page, error and clients empty-state illustrations ([8398aa5](https://github.com/symonbaikov/lumio/commit/8398aa519be15b97e97902854d142da9e5b6fe26))
* **ui:** replace native &lt;select&gt; with shared Select component ([7ec8b21](https://github.com/symonbaikov/lumio/commit/7ec8b214e9bf849b43cd71871eb4ab57a28d212b))
* **ui:** replace the remaining native date inputs with the MUI date picker ([e1a6b02](https://github.com/symonbaikov/lumio/commit/e1a6b028d219691c3211751ec03c8a0fe5ea2be1))
* **ui:** replace the remaining native date inputs with the MUI date picker ([73490cc](https://github.com/symonbaikov/lumio/commit/73490cc6e9e3e29ccf54be654f0c973681a71a7d))
* **users:** record when the welcome tutorial was closed ([9c5666f](https://github.com/symonbaikov/lumio/commit/9c5666f9add8df622c61320c5d0517b3920c9b68))
* **users:** require a liability disclaimer on first sign-in ([0f6f578](https://github.com/symonbaikov/lumio/commit/0f6f57806d091d0ee42b56d871d93a9be9fe1ed4))
* **webhooks:** add all webhook controllers ([5066ad7](https://github.com/symonbaikov/lumio/commit/5066ad709f2034e02b908d697a4c0c70e7d4cf18))
* **webhooks:** add core webhook services (endpoints, subscriptions, delivery, dispatcher) ([f46e4b3](https://github.com/symonbaikov/lumio/commit/f46e4b3d589a4ab930ac3fa618d733e4aa23c4d7))
* **webhooks:** add migration for webhook tables ([adafe35](https://github.com/symonbaikov/lumio/commit/adafe3540a55735b628dc491f568933b1282fcd3))
* **webhooks:** add receipt.approved event emission and event interfaces ([75a8f8d](https://github.com/symonbaikov/lumio/commit/75a8f8d934c7ee402e53614857631c857b3af8cc))
* **webhooks:** add webhook DTOs ([7956e7b](https://github.com/symonbaikov/lumio/commit/7956e7bba78efa4b40ff199c67b13fc0895f2e0f))
* **webhooks:** add webhook system with endpoints, subscriptions, and delivery ([b24aa7e](https://github.com/symonbaikov/lumio/commit/b24aa7e8690840e7c808a8a1b667d236d15d9b1e))
* **webhooks:** add WebhookEndpoint, WebhookSubscription, WebhookDelivery entities ([3c6eb38](https://github.com/symonbaikov/lumio/commit/3c6eb384c0472081f7c147f94630ee6afa574e71))
* **webhooks:** add WebhookEventsListener bridging EventEmitter2 to outbound queue ([07c5552](https://github.com/symonbaikov/lumio/commit/07c55528eedfac1a06695465b0d6785a28ed4f2a))
* **webhooks:** add WebhookProcessorService with retry/backoff queue ([d1d9974](https://github.com/symonbaikov/lumio/commit/d1d9974088b173175ab36b95235eb7596c943d22))
* **webhooks:** add WebhookTokenGuard and WebhookInboundService ([92727a9](https://github.com/symonbaikov/lumio/commit/92727a9f13c6d7f9721f7402c4938365a8e3bd18))
* **webhooks:** wire WebhooksModule into app ([e931ed5](https://github.com/symonbaikov/lumio/commit/e931ed5eda1c21abe0ada91628cd0454cdaef977))
* **website:** carry the new brand emblem into the docs site marks ([dbadb75](https://github.com/symonbaikov/lumio/commit/dbadb75753d46baec294e3034729bee603450793))
* welcome tutorial for new accounts; page tours only from the help menu ([1de94bc](https://github.com/symonbaikov/lumio/commit/1de94bc72b535c514d1480b98b2e9f0168dcd780))
* **workspaces:** category icon picker and shared currency drawer ([43b7982](https://github.com/symonbaikov/lumio/commit/43b79829832e07b4a4409f17450c29a68954a556))
* **workspaces:** category icon picker and shared currency drawer ([5d94cd4](https://github.com/symonbaikov/lumio/commit/5d94cd438700553aefa4e9140ae9e187b65a45dc))
* **workspaces:** Home or Business profile that trims the menu ([1208e85](https://github.com/symonbaikov/lumio/commit/1208e856798cb3f6172040e22ae82b3f96970b6a))


### Bug Fixes

* **a11y:** fix keyboard-focus traps and add a focus-ring audit script ([cd014b2](https://github.com/symonbaikov/lumio/commit/cd014b2ebb964abb7f55408f3f6ddd1ac1488676))
* address CodeQL alerts, statement API errors and a disallowed licence ([20790de](https://github.com/symonbaikov/lumio/commit/20790deff33eaa46f2469ba11c99998491c89c99))
* address CodeQL findings in file-validator and statements.service ([aad1757](https://github.com/symonbaikov/lumio/commit/aad175773a194fce6e1c6b6e321cc146dadb3d5c))
* address lumio security findings ([f6f2c89](https://github.com/symonbaikov/lumio/commit/f6f2c89cb28f6798d41ed5edb4d69afc86c06425))
* **analytics:** sync receipt edits, fix source badge, and cross-currency totals ([#114](https://github.com/symonbaikov/lumio/issues/114)) ([eedcfb6](https://github.com/symonbaikov/lumio/commit/eedcfb6a395b73604a42b5f4e4cf4c238b724d6b))
* **auth:** hide app chrome on forgot-password, reset-password and verify-email ([92e403d](https://github.com/symonbaikov/lumio/commit/92e403d8c0edff30ee3a34e7b10a09c40a76980b))
* **auth:** hide app chrome on forgot-password, reset-password and verify-email ([6f89717](https://github.com/symonbaikov/lumio/commit/6f89717a25e510a5e4fb7131da81b4ec60f22036))
* **auth:** keep users signed in while the refresh token is valid ([790a31a](https://github.com/symonbaikov/lumio/commit/790a31a790c39583560d689d49042b0a6cf2c940))
* **auth:** keep users signed in while the refresh token is valid ([644f014](https://github.com/symonbaikov/lumio/commit/644f01436977dd6edfc6a0fb6a960d1fe88769bd))
* **auth:** keep users signed in while the refresh token is valid ([4f39e2c](https://github.com/symonbaikov/lumio/commit/4f39e2cdbfd2a567db00228a1ec5103beaef8609))
* **auth:** reject access tokens whose session was revoked ([116467f](https://github.com/symonbaikov/lumio/commit/116467f2bff2305b4c7026310014fac25c0a3d00))
* **backend:** default imports of CommonJS packages were undefined at runtime ([d470af3](https://github.com/symonbaikov/lumio/commit/d470af378080b4bcddae05622e52a3dc6966f090))
* **backend:** default imports of CommonJS packages were undefined at runtime ([0f8c538](https://github.com/symonbaikov/lumio/commit/0f8c5385e683c10b15e42c24766ef1e645b608e0))
* **backend:** fix TypeScript cast error in workspace-crud-base ([d8dc7ba](https://github.com/symonbaikov/lumio/commit/d8dc7bac11eff197adc529dd26e314f4df47620b))
* **backend:** wait longer for postgres on dev startup ([a2ab60f](https://github.com/symonbaikov/lumio/commit/a2ab60f004d9b72dd6504941eb7c3a5bf8c6de64))
* **balance,net-worth:** convert every amount into the workspace currency ([31f250d](https://github.com/symonbaikov/lumio/commit/31f250dc91db19ef7f0d144de539d9c84320bf06))
* **bank-sync:** key pulled rows by account and transaction id ([5c9e492](https://github.com/symonbaikov/lumio/commit/5c9e4926c1e29e38f7e60839ad7d35d6b219ffa4))
* bind integrations and remaining request paths to the current workspace (re-land [#189](https://github.com/symonbaikov/lumio/issues/189)) ([03081b8](https://github.com/symonbaikov/lumio/commit/03081b8accbb95835163fa78d1adbb34c52eb8f6))
* **categories:** one English 'Uncategorized' fallback per workspace and type ([121104d](https://github.com/symonbaikov/lumio/commit/121104df1c17c49716476f2e61755dec1f907167))
* **categories:** one English 'Uncategorized' fallback per workspace and type ([9b8158d](https://github.com/symonbaikov/lumio/commit/9b8158d6702c1b9a67a564376b682207ad4a00ad))
* **chat-mode:** harden cloud provider routing and system-turn handling ([58d304b](https://github.com/symonbaikov/lumio/commit/58d304b0b4ed7ffdf0129a15f9d3b231839499ad))
* **chat-mode:** harden cloud provider routing and system-turn handling ([23c18b0](https://github.com/symonbaikov/lumio/commit/23c18b0f2f1e64c0084750fdec57e4b139f3a89b))
* check the workspace being edited in the remaining request paths ([c8fb726](https://github.com/symonbaikov/lumio/commit/c8fb7266ba271f0fab350d581c97ada8c7b8fa93))
* **ci:** clear lint errors on main and give the frontend type check enough heap ([7f9715b](https://github.com/symonbaikov/lumio/commit/7f9715bf49580eee96d2d18b3b2c5fe729d277df))
* **ci:** clear lint errors on main and give the type check enough heap ([edcb3b9](https://github.com/symonbaikov/lumio/commit/edcb3b9dd9a7c430064a2bf96640ea4ee3ee4d01))
* **ci:** fix lint configs and remove dead code for CI/CD green builds ([1625783](https://github.com/symonbaikov/lumio/commit/1625783c61904b7a06f84303a2a589b41c23a905))
* **ci:** give the frontend ESLint run enough heap ([44a1a4b](https://github.com/symonbaikov/lumio/commit/44a1a4b981772f25e6cea9accceb9c3c1111562b))
* **ci:** make electron build independent of CI on push events ([bd13fa6](https://github.com/symonbaikov/lumio/commit/bd13fa6235520d80932c93502b707e1195eda73b))
* **ci:** make electron build independent of CI on push events ([5199067](https://github.com/symonbaikov/lumio/commit/519906781fe0c9b9c3a7c02c0a35297155c6ba38))
* **ci:** repair the five pipeline checks failing on main ([#124](https://github.com/symonbaikov/lumio/issues/124)) ([4d5fb1f](https://github.com/symonbaikov/lumio/commit/4d5fb1f4e9747620583b62d17505321d76fd7980))
* **ci:** stop referencing the secrets context inside if conditions ([#104](https://github.com/symonbaikov/lumio/issues/104)) ([5e559d3](https://github.com/symonbaikov/lumio/commit/5e559d3050bab657c7344a47209ccf4378c83aec))
* close bank-statement parsing gaps found across a multi-phase audit ([4999c92](https://github.com/symonbaikov/lumio/commit/4999c924156d530c96704c7bcfd8933aa93fc1f0))
* close remaining unlinkAll path-taint alert and CI lint import order ([d2d6e26](https://github.com/symonbaikov/lumio/commit/d2d6e26e49e8c7c1e11e53793a001d480e52a087))
* **css:** remove !important, add stylelint rule to enforce it ([1c825b9](https://github.com/symonbaikov/lumio/commit/1c825b95a7001bfba05d1208dbe9aa90dac40dc8))
* **custom-tables:** make grid checkboxes and column settings work ([f963202](https://github.com/symonbaikov/lumio/commit/f963202e2aedf41dfe6fe74587644e81efd21766))
* **custom-tables:** make grid checkboxes and column settings work ([6ba58d8](https://github.com/symonbaikov/lumio/commit/6ba58d8183954c0034733665da7ed056fe183c62))
* **dark-mode:** fix remaining light backgrounds in panels, danger zone, and duplicate badges ([dff5419](https://github.com/symonbaikov/lumio/commit/dff541943dc8b3e92555880353d95c6870f6d275))
* **dark-mode:** fix white backgrounds and MUI portal hover states ([9dfd256](https://github.com/symonbaikov/lumio/commit/9dfd256ca2a34a40dfaa52a4fdaac7114fd3a7a8))
* **dashboard:** replace hand-drawn plus icon with shared icon component ([#110](https://github.com/symonbaikov/lumio/issues/110)) ([67c8249](https://github.com/symonbaikov/lumio/commit/67c8249d283b17e70d020c5432cf8b0536efb3d1))
* defects the behaviour review of the ledger gaps confirmed ([5d06dcc](https://github.com/symonbaikov/lumio/commit/5d06dccbd8c08de14b8ad3e4247046d0c36c928c))
* **deps:** bump adm-zip to 0.6.1 to clear GHSA-7q85-xj36-vmfc ([8453dbe](https://github.com/symonbaikov/lumio/commit/8453dbeee63d9497a0dc5cc3acb90a42f4daa1c8))
* **docker:** clear the Trivy HIGH/CRITICAL findings in runtime images ([d961354](https://github.com/symonbaikov/lumio/commit/d96135400cd82fc053eb483b1acf768655e11ec2))
* **egress:** make the Copilot Autofix SSRF change build and stay strict ([f4a5bc7](https://github.com/symonbaikov/lumio/commit/f4a5bc7612d72d9e6730cbcedc2ab3f308a96f08))
* **exchange-rates:** never borrow a rate from after the requested day ([faa65e3](https://github.com/symonbaikov/lumio/commit/faa65e3fbfc75dfa1c2b498f3c3b391d21471f30))
* **forecast:** read the runway off the projected balance ([64a048f](https://github.com/symonbaikov/lumio/commit/64a048f8b42ca8e1d133da53b7464c562fd8c3a9))
* **forecast:** show the runway with one decimal in the reader's locale ([cae4f5a](https://github.com/symonbaikov/lumio/commit/cae4f5a5dbc5071e2e74f2f1cc372099493fd1f0))
* **frontend a11y:** clear the remaining Biome 2 errors ([6b15b56](https://github.com/symonbaikov/lumio/commit/6b15b56dfe8bc275dcd0971f4ce8d8c23ff0080d))
* **frontend:** clear mechanical Biome 2 errors ([9c83151](https://github.com/symonbaikov/lumio/commit/9c831517c20e98497042e55a414bc275a154687b))
* **frontend:** fix last 8 hardcoded border colors in statements and receipts ([b41b567](https://github.com/symonbaikov/lumio/commit/b41b567e11f884fd193bff9cd42e79b0716d61f7))
* **frontend:** fix remaining dark mode light areas in statements and tours ([b31df2d](https://github.com/symonbaikov/lumio/commit/b31df2dd8fa877c76e0f4fd23ed75e90927bd7a9))
* **frontend:** keep the workspace a request was meant for ([aa244ae](https://github.com/symonbaikov/lumio/commit/aa244ae5788891181d50f67cfbdedd2972b56372))
* **frontend:** restore React components renamed by biome autofix ([ce00def](https://github.com/symonbaikov/lumio/commit/ce00def2662c87c0fe8398d03bec4f9c49871dee))
* **gmail:** bind the integration to the workspace it was connected in ([7b3e95d](https://github.com/symonbaikov/lumio/commit/7b3e95de09a0cb36e59338290cef2f04ecce250e))
* **gmail:** scope receipt routes to the current workspace ([1752f16](https://github.com/symonbaikov/lumio/commit/1752f16160194cb9a0e9ed167a08a3d37f93c6b9))
* **import:** accept a .csv that Windows declares as Excel ([13c3c51](https://github.com/symonbaikov/lumio/commit/13c3c5147d0ba6c92715871f0aac8736f2fdf5a4))
* **import:** decode OFX entities in one pass ([8fef358](https://github.com/symonbaikov/lumio/commit/8fef35872f5f848fc86b7e4680bcf7dc9f4307f5))
* **insights:** keep the alert banner readable in dark theme ([914eee1](https://github.com/symonbaikov/lumio/commit/914eee13cec4cd0a84697c2443525dac7db4bc15))
* **integrations:** bind Google Drive and Dropbox to their workspace ([673e733](https://github.com/symonbaikov/lumio/commit/673e7333cd2dd0028a9c254ef1fc3c3de08af5ae))
* **integrations:** scope S3, WebDAV, IMAP and service settings to the request ([79fede6](https://github.com/symonbaikov/lumio/commit/79fede6e2993d1e559e94be8dfd3183d2852129b))
* integrity, security and race-condition hardening across the stack ([6c66a5e](https://github.com/symonbaikov/lumio/commit/6c66a5eff26f1d60872fcd699d0947fcd307d8ef))
* issues the UI walkthrough of the ledger gaps turned up ([2478152](https://github.com/symonbaikov/lumio/commit/2478152446a04f42be81abf90e9fbb98958ef287))
* **lint:** clear Biome 2.5 errors blocking CI ([c77ba38](https://github.com/symonbaikov/lumio/commit/c77ba387b5b89498452e0810a2f467da3bb9287b))
* **lint:** restore main's biome config and clean up merge leftovers ([f2f5561](https://github.com/symonbaikov/lumio/commit/f2f55612c22922f876fd6491d72a27245f01aa52))
* **lint:** restore noExcessiveCognitiveComplexity threshold to 15 ([aea86be](https://github.com/symonbaikov/lumio/commit/aea86be171ad8539508354c4bc97d91c91a138b9))
* **mobile:** cap DrawerShell width to viewport on small screens ([f3ed632](https://github.com/symonbaikov/lumio/commit/f3ed63260c340065e3f7e97e273c07f748d54461))
* **mobile:** convert Sections button to icon-only circle ([383d719](https://github.com/symonbaikov/lumio/commit/383d7194076ec7d7f2ef8e02b87cc7d2836b4706))
* **mobile:** correct FAB action hrefs to open expense drawer ([d34363b](https://github.com/symonbaikov/lumio/commit/d34363bdb5e6ef590d5828441230db211975048c))
* **mobile:** force override hamburger button size with !important ([46b8d51](https://github.com/symonbaikov/lumio/commit/46b8d512c504e8d5e964d9bffb7d62f6635c3e3c))
* **mobile:** hide bottom bar on auth/onboarding pages ([1b2d928](https://github.com/symonbaikov/lumio/commit/1b2d928a31c9d9911de9d1377e6c04dbcdf8b2d7))
* **mobile:** hide floating FABs on mobile, replaced by bottom bar ([6a9408f](https://github.com/symonbaikov/lumio/commit/6a9408f9a692af617476464d2b5e665a7d78720a))
* **mobile:** hide Menu text label, show only hamburger icon ([023133f](https://github.com/symonbaikov/lumio/commit/023133faaa6a6f595a1aaf2002e645b9523b2fb3))
* **mobile:** hide user menu button, push icons right in TopBar ([1c5c1fe](https://github.com/symonbaikov/lumio/commit/1c5c1fe745f302654082d4572ef032b977467b67))
* **mobile:** make TopBar logo a link to dashboard ([5216aa5](https://github.com/symonbaikov/lumio/commit/5216aa543411c913004d8a3b6dce2139906759b5))
* **mobile:** remove floating side panel open button ([3c28458](https://github.com/symonbaikov/lumio/commit/3c28458831785c3806a07667d11704739b122b06))
* **mobile:** replace hamburger with Sections icon in TopBar ([9e3a728](https://github.com/symonbaikov/lumio/commit/9e3a728af4a2d9b0faf12670606461d9b8cd59c1))
* **mobile:** responsive reports page layout and history table ([1da153d](https://github.com/symonbaikov/lumio/commit/1da153d6357c4e5592444dfc7503810bd3b35699))
* **mobile:** show only hamburger icon in user menu, hide text label ([6678d3b](https://github.com/symonbaikov/lumio/commit/6678d3bf5cc15e9edc245541663e39429725b02f))
* **mobile:** strip container from hamburger, plain icon button ([6cc9889](https://github.com/symonbaikov/lumio/commit/6cc9889b91691711be39f641a60f0cfadaa37461))
* **nav:** import ShellSidePanel, style the invoice line-item editor ([93e9b8e](https://github.com/symonbaikov/lumio/commit/93e9b8eb6eca4984bd2df44aa6788182e967e7bf))
* **parsing:** real-world statement support — DOCX parser, header scan, money-path fixes ([fa7cc3c](https://github.com/symonbaikov/lumio/commit/fa7cc3c7f0c024a47ad0246474e94875646cb897))
* **parsing:** real-world statement support — DOCX parser, header scan, money-path fixes ([5e971e8](https://github.com/symonbaikov/lumio/commit/5e971e84a414de3b958ec3a2a414e81a5cacc3da))
* **parsing:** resolve CodeQL alerts in DOCX text extraction ([6c25447](https://github.com/symonbaikov/lumio/commit/6c254477dd8b885258b081fbf2bd3616e511aaa2))
* **payables:** move the cash fields onto the shared Select ([8181050](https://github.com/symonbaikov/lumio/commit/8181050d5078d82ad4a63831f55fcc901adfa910))
* **plugins:** remove dashed border box around empty-state illustration ([#120](https://github.com/symonbaikov/lumio/issues/120)) ([5379799](https://github.com/symonbaikov/lumio/commit/53797997bf4cee3a181f3e813d25b881bdc1ee9f))
* polish workspace card UI ([f962f96](https://github.com/symonbaikov/lumio/commit/f962f96cc0dc9d1b90d89d3827f9bc6773ab3760))
* polish workspace card UI ([7923e42](https://github.com/symonbaikov/lumio/commit/7923e42e537392a769a29d27685dc21b7dabb926))
* **receipts:** accurate category detection and localized category labels ([#116](https://github.com/symonbaikov/lumio/issues/116)) ([030241c](https://github.com/symonbaikov/lumio/commit/030241ce073fd2bd6b1f5d28fec40a0faea74482))
* **receipts:** backfill and attach transaction categories to scanned receipts ([e1df76f](https://github.com/symonbaikov/lumio/commit/e1df76fec1cfbf4822a97d63b7adabce3e30ff9b))
* **receipts:** show needs_review receipts without parsed amount on submit page ([8973657](https://github.com/symonbaikov/lumio/commit/8973657595fbe9433f0584a23ff0a2025c8095a1))
* **reconcile:** fit the page on a phone and space the ageing table ([126b135](https://github.com/symonbaikov/lumio/commit/126b13535cadb4d41fa69bc8755a2fc0f3a947c7))
* **reports:** balanced cash-flow sankey with readable labels ([3347969](https://github.com/symonbaikov/lumio/commit/33479697d58a56c8d9f26a428a855fca4203c8ba))
* resolve stash conflicts and sync tests with current service implementations ([54eb763](https://github.com/symonbaikov/lumio/commit/54eb76381e85b044e9b134fe34f145ef9aa7bc07))
* **review:** render the inbox after mount so dark mode is not lost ([9843d47](https://github.com/symonbaikov/lumio/commit/9843d479341132d3246e9c6574de705dc3391230))
* **roi:** use workspace currency instead of hardcoded KZT ([#122](https://github.com/symonbaikov/lumio/issues/122)) ([68861d9](https://github.com/symonbaikov/lumio/commit/68861d9cf90ecf458937939d1619c706f40acce2))
* scope Gmail receipts and storage to the current workspace ([c8daebc](https://github.com/symonbaikov/lumio/commit/c8daebc29bcc8737a7060c34f7975e4df6824dd6))
* **settings:** readable exchange rates and a labelled rate field ([9d4e5d4](https://github.com/symonbaikov/lumio/commit/9d4e5d46c75de0531cbc7a85c369d03efed1a16e))
* **settings:** remove the content-background photo feature ([da83cce](https://github.com/symonbaikov/lumio/commit/da83ccef038eb04887786ee50cb40584ba6b86c6))
* **smb:** offer a bank row as payment only near the bill's due date ([e51079e](https://github.com/symonbaikov/lumio/commit/e51079ed951eddb0c1a67ebf895614c3bc0028a7))
* statement date metadata, deterministic status filter test, validated fetch URL ([bf2f638](https://github.com/symonbaikov/lumio/commit/bf2f6385ec01ab76e6bef1bfc8f53899127fadba))
* **statements:** improve receipt upload feedback ([6871e74](https://github.com/symonbaikov/lumio/commit/6871e743a2adb4840ef76512a0594231eea4ece4))
* **statements:** keep one upload skeleton per file until its row arrives ([ef4ca77](https://github.com/symonbaikov/lumio/commit/ef4ca779b55fbf505b67f51b2b5e7b61b00f1c2d))
* **statements:** keep one upload skeleton per file until its row arrives ([f1dbaf7](https://github.com/symonbaikov/lumio/commit/f1dbaf7a364a2950703587c0bf092aee4aea0ce8))
* **statements:** PUT only changed fields when saving an inline transaction edit ([04a227d](https://github.com/symonbaikov/lumio/commit/04a227deb532429386fff0bcfb2eae3fe4f754c8))
* **statements:** PUT only changed fields when saving an inline transaction edit ([289622b](https://github.com/symonbaikov/lumio/commit/289622bf43c05188df8fce605e97d62b41a333e1))
* **statements:** use commonjs archiver import ([382b835](https://github.com/symonbaikov/lumio/commit/382b83506482d60a08b097b98c31887c514bf994))
* **statements:** use commonjs archiver import ([f911b2e](https://github.com/symonbaikov/lumio/commit/f911b2eb52946edcf7837ae6a79f42b3e5f106d7))
* **storage:** list files and folders of the current workspace ([144b273](https://github.com/symonbaikov/lumio/commit/144b2737b53a9fa1494a174ac124ede229bba4e9))
* **subscriptions:** actually delete subscription on DELETE /subscriptions/:id ([#121](https://github.com/symonbaikov/lumio/issues/121)) ([9f659b1](https://github.com/symonbaikov/lumio/commit/9f659b16dee53ced8945b04b5a2cc83a9add9bba))
* **subscriptions:** use workspace currency instead of hardcoded KZT ([7c664ca](https://github.com/symonbaikov/lumio/commit/7c664cab75f7ae7f9f5c2a5b5d0ff65b42d15b3a))
* **telegram:** answer for the workspace the chat was connected in ([1c4625e](https://github.com/symonbaikov/lumio/commit/1c4625e40d7f6bd64bacc318f7e82bae3bc1d3a9))
* **telegram:** book a redelivered update only once ([f610bd0](https://github.com/symonbaikov/lumio/commit/f610bd0358d759d7293033d7693b8963178a840b))
* **telegram:** trim merchant separators without a backtracking regex ([407867a](https://github.com/symonbaikov/lumio/commit/407867a669cfd184e7562f2b6dbf3ff761f08125))
* **tutorial:** focus, RTL and name handling; test the dialog itself ([2714d97](https://github.com/symonbaikov/lumio/commit/2714d97a2b402b52b8ffa5c4e5286b6422879b81))
* **ui:** mobile layout fixes from the 390/360px audit ([133c933](https://github.com/symonbaikov/lumio/commit/133c9332301f67815449d50b306a52d9c3edbc9f))
* **ui:** mobile layout fixes from the 390/360px audit ([8e3023f](https://github.com/symonbaikov/lumio/commit/8e3023f93acaea906f312320ececeec19d79688e))
* **ui:** one sidebar at a time, one currency picker everywhere ([6f4c80a](https://github.com/symonbaikov/lumio/commit/6f4c80ad60adf6a59af12ea4c027e028b6877acf))
* **ui:** one sidebar at a time, one currency picker everywhere ([e01b3b6](https://github.com/symonbaikov/lumio/commit/e01b3b65dc38932fec90e02b4547681542a01d68))
* **users:** mark the welcome tutorial seen with one conditional update ([d3bd716](https://github.com/symonbaikov/lumio/commit/d3bd716dcbb9374ad9a468fc7418bdd4e70a49c4))
* **webhooks:** add error handling to WebhookEventsListener handlers ([0746de4](https://github.com/symonbaikov/lumio/commit/0746de493f14d005e7c891a2a800976d9acc2865))
* **webhooks:** fix inbound service issues (unused repo, mime type, size limit, cleanup) ([f3420d0](https://github.com/symonbaikov/lumio/commit/f3420d091a8d28a03f744b11c25bf6331a4bfa10))
* **webhooks:** fix processor runtime issues and stale lock recovery ([d2a1086](https://github.com/symonbaikov/lumio/commit/d2a108691d897e0f8c57b7c48bc77850b10fb906))
* **webhooks:** fix token leak in update, add scope check in retry, remove any cast ([3e5ece3](https://github.com/symonbaikov/lumio/commit/3e5ece37f10bf44196472a66b53a9df8d4d17a58))
* **webhooks:** use @nestjs/swagger PartialType and add Swagger decorators to payload DTOs ([d044dc4](https://github.com/symonbaikov/lumio/commit/d044dc440c2d2914c8f7516cc3f1ebf8860b556c))
* **webhooks:** use emitAsync with error logging and add bulkApprove event emission ([8812cc1](https://github.com/symonbaikov/lumio/commit/8812cc1267cc1e56fe1df6eb13ab7171bddb2a40))
* **webhooks:** use entity property names in QueryBuilder (workspaceId, isActive) ([1c61df6](https://github.com/symonbaikov/lumio/commit/1c61df60811b395bf95ea60fb5ea9179ec39ac21))


### Performance Improvements

* **hooks:** optimize pre-push hook to skip empty frontend tests ([e33682c](https://github.com/symonbaikov/lumio/commit/e33682c1f393f0b9184aafbc99d06acac9f70b7e))

## [Unreleased]

### Added

#### Bank sync through your own SimpleFIN account (2026-10-01)

- **Integrations → Bank sync via SimpleFIN**: paste the setup token from your own SimpleFIN Bridge
  account; Lumio exchanges it once (`POST /integrations/simplefin/connect`), keeps the access
  credential encrypted, lists the accounts and pulls them (`POST /integrations/simplefin/sync`) on
  demand or every six hours. Per-account *Pull* switch and target wallet
  (`POST /integrations/simplefin/settings`), *Refresh accounts*, disconnect deletes the credential.
- Each pull becomes an **OFX statement through the regular import**: dedupe, rules, review inbox
  and audit are the same as for an uploaded file. Provider transaction ids are document numbers, so
  nothing is imported twice; the first pull covers 90 days, later ones overlap by a week; pending
  rows wait until they post. A rejected credential flips the integration to *Needs a new token*.
- README positioning: Lumio holds no bank integration of its own; you may connect your own
  provider account. Enable Banking is not wired (needs an application registered with them).

#### Multi-currency: no silent 1.0, manual rates (2026-10-01)

- A missing exchange rate is now said out loud: `GET /exchange-rates` answers `missing: true`, the
  dashboard snapshot lists `missingRates` and shows a banner, Settings → Data → **Exchange rates**
  lists every currency in the workspace's rows with the rate used (or "no rate") and a field to
  **set a rate by hand** (`POST /exchange-rates/manual`; it wins over the provider for that day).
- The transaction drawer shows the amount **in the workspace currency** with the rate and its date,
  or that no rate exists and the row counts at face value in totals.

#### Import formats: OFX/QFX, QIF, camt.053, MT940, bank CSV presets, mailbox (2026-10-01)

- **Four more statement formats**: OFX/QFX (SGML and XML), QIF (date order inferred from the whole
  file), ISO 20022 camt.053 and SWIFT MT940 (structured `:86:` details). Recognised by extension and
  content, whatever MIME type the browser sends; a file that only has the extension is refused.
- **CSV presets for 22 bank layouts** (Revolut, Wise, N26, Monzo, Starling, Chase, Bank of America,
  Capital One, American Express, Wells Fargo, PayPal, ING, Rabobank, Sparkasse/DKB, Commerzbank,
  Nordea, Santander, Barclays, HSBC, Lloyds, Tinkoff): matched by the header row, columns mapped
  exactly instead of guessed, signed amounts and card-style charges handled per bank.
- **Forward a statement to the mailbox**: an export attached to an email in the IMAP inbox goes
  through statement import instead of the receipt pile (PDFs stay receipts).

#### Mobile layer: offline entries and web push (2026-10-01)

- **Works without a network**: a service worker caches the app shell and serves an offline page;
  a manual expense or a receipt photo added while offline is kept on the device (IndexedDB) and
  sent as soon as the connection is back, with an idempotency key so a retry cannot double-book.
  A strip at the top shows "Offline" or "N waiting to send" with a *Send now* button.
- **Web push**: a new *Push* column in notification settings and *Push on this device* to subscribe
  the browser or installed app; budget alerts, subscription price changes, "N waiting for review"
  and the rest reach the phone with the app closed. Digests go as one push. Needs VAPID keys on
  the server (`npx web-push generate-vapid-keys` → `WEB_PUSH_VAPID_*`); without them the channel
  says it is off. Dead subscriptions are dropped on the next send.
- **Home-screen shortcuts**: *Add expense* and *Scan receipt* on a long-press of the app icon.

#### Small-business pack (2026-10-01)

- **Bank reconciliation** (`/statements/reconcile`, linked from Payables): open bills and
  receivables next to the bank rows that look like their payment (same amount and currency, the
  vendor in the row's text, a date near the due date), one row per bill, confidence shown. *Confirm*
  links the row and settles the bill through the existing mark-as-paid path.
- **AR/AP ageing**: open amounts per direction in current / 1–30 / 31–60 / 61–90 / 90+ days past
  due, with the largest counterparties.
- **Duplicate bills**: open bills with the same counterparty, amount and currency due within a week.
- **Dunning reminders**: *Send reminder* on a sent or overdue invoice emails the client (EN/RU) and
  counts it on the invoice; needs SMTP and a client email, and says so otherwise.
- **Owners report** for business subscriptions: every active subscription with owner, monthly cost in
  the workspace currency, next charge and last review, totals per owner, CSV download
  (`GET /subscriptions/business-report?format=csv`).

#### MCP and AI as a trusted agent (2026-10-01)

- **Scoped API keys**: a key names what it may do (the same strings as the permissions the routes
  check), with *Read only* / *Read and write* / hand-picked presets in the MCP panel. A key is never
  wider than its owner's role; managing keys, people, workspace settings or integrations is never
  granted to a key. `GET /api-keys/scopes`; new keys require `scopes`. Keys made before scopes keep
  their owner's full reach (`scopes: null`).
- **Every agent write is on the record and undoable**: requests authenticated with an API key are
  audited as the actor *Integration* with the key's name and prefix; the in-app assistant's writes
  carry `X-Lumio-Actor: ai-chat` and are audited as the new actor *AI assistant*. Both record whom
  they acted for and are undoable wherever rollback knows the entity. The activity log filters by
  *AI assistant*.
- The assistant is told that every number in a reply comes from a tool result, never from an estimate.
- Docs: *MCP and API keys* (Claude Code / Claude Desktop setup, scopes) and *Security posture*
  (threat model, what is encrypted, what leaves the server and when, how to switch AI off entirely).

#### Reports: cash-flow map (2026-10-01)

- **Cash flow** tab on the reports page: a Sankey of income sources → income → categories →
  subcategories, a treemap of spending by size (click a category for its subcategories), and a
  by-category table with the period before and the change.
- Period presets or custom dates, a **"compare with the period before"** switch, an **"include
  transfers and investments"** switch (off by default: they are not spending), category chips
  with All / None, and a CSV export of the table.
- `GET /reports/cash-flow-map?dateFrom&dateTo&compare&includeTransfers&categories&format=csv`.

#### Investments v1 (2026-10-01)

- **Investment and retirement accounts** under the balance sheet's Investments section, with
  holdings entered by hand (ticker, class, quantity, price). The account's value is written as
  today's balance snapshot on every change, so the balance sheet and net worth read the same number.
- **Prices by ticker** from Stooq (free, no key; `AAPL` → `AAPL.US`, `VWCE.DE`), crypto from
  CoinGecko; cached fifteen minutes, egress-guarded. A price that cannot be fetched is simply kept.
- **Contributions count as transfers**: "Mark as a contribution" on an expense in the transaction
  drawer turns it into a one-leg transfer of kind `investment`. It leaves every spending aggregate;
  the account shows contributed, value and gain.
- **Net worth**: ranges 1M / 3M / 6M / 1Y / 3Y / 5Y / All, the all-time high with its date, and an
  allocation by asset class (stocks, ETFs, funds, bonds, crypto, cash, real estate, other).
- Endpoints under `/investments` (accounts, holdings, `refresh-prices`, `contributions`).

#### Cash-flow forecast (2026-10-01)

- **`/forecast`**: the balance 30, 90 or 365 days ahead, day by day, from unpaid bills, active
  subscriptions, sent invoices, dated goals (what each needs per month), paydays detected from
  history and the everyday spending average of the last three months. The low point and its day,
  the first day the balance goes negative, the closing balance.
- **Safe to spend** until the next payday (committed items only, never below zero) for a home
  workspace; **runway** in months at the current burn for a business one.
- **Scenarios**: untick any item ("what if I cancel Netflix"), scale income (50–150%) and spending
  (50–150%). `GET /forecast?days=&exclude=&incomeFactor=&expenseFactor=`.
- The dashboard's cash runway card now opens the forecast.

#### Workspace profile: Home or Business (2026-10-01)

- A workspace now says what it is for. **Home** hides invoices, the ledger, the tax declaration and
  custom tables from the menu (and from the welcome tutorial); nothing is deleted and every page
  still opens by link. **Business** is the default and is how every workspace behaved before.
- Chosen when creating a workspace (first step) and changed any time in Settings → Data →
  Workspace profile (`PATCH /workspaces/:id { profile }`, stored in `settings.profile`).

#### Budget mechanics (2026-10-01)

- **Rollover**: a budget now says what happens to unspent money. *Resets* is the old behaviour;
  *Carries over* moves leftover and overspend whole into the next period (the envelope for
  irregular costs); *Refills to the limit* tops the budget back up but never above it, and still
  deducts an overspend. The card shows the amount available this period and what was carried in.
- **Parent-category budgets**: a budget on "Food" counts "Groceries" and "Restaurants" too, and
  a spend in a subcategory is checked against every budget up the tree.
- **"What would this do"** under the category field of a manual expense: which budgets it pushes over
  (and by how much), and whether it takes the default account below zero. Advice, never a gate
  (`GET /budgets/impact`).

#### Subscriptions 2.0 (2026-10-01)

- **Price change with the yearly effect**: when the last two charges of a known subscription settle
  on a new price (more than 5% off the old one), the row is flagged, the delta per charge and per
  year is shown on the card, and the workspace gets a notification saying both numbers. A change is
  announced once; "Keep" clears the flag.
- **Possible duplicates**: two active or detected rows of one service (same domain, or the same
  name without plan words such as Premium/Basic) are grouped under `GET /subscriptions/duplicates`,
  counted on the page and marked on the row.
- **Cost per use**: a "Used it" tap on the card counts a use; the card then shows the price per use
  since the first tap, so "is Netflix worth it" has a number.
- **Set aside for annual and quarterly bills**: the card offers the monthly amount that covers the
  next charge by its date; one tap creates a savings goal linked to the subscription
  (`POST /subscriptions/:id/sinking-fund`, idempotent; `GET /subscriptions/sinking-funds` lists them).
- **Bills and invoices in the charge calendar**: open payables appear next to subscriptions with a
  "bill" label; sent invoices appear as money coming in and stay out of the month totals.
- **Switch for "is this a subscription?" prompts** in Settings → Notifications (`subscriptionPrompts`).

#### Telegram inbound (2026-10-01)

- **Send the bot a photo of a receipt** (or an image as a file): it goes through the same scan
  pipeline as the in-app camera, lands in the review inbox, and the bot answers with the vendor,
  the amount and a delete button. PDFs still go to statement import.
- **Type an expense**: "coffee 4.50", "taxi 15 EUR", "такси 1500 тг" books a manual expense dated
  today, unreviewed and uncategorised on purpose, so the category is picked in the review inbox.
  The reply carries a delete button. `/help` explains both.

#### Receipts meet bank rows (2026-10-01)

- **Receipt → transaction match:** after parsing, a receipt is matched to the bank row it documents
  (same money, same direction, within three days, the name agrees; exactly one plausible row) or to
  the several charges of one order (Amazon bills per shipment). Approving attaches the receipt to
  that row and copies its image as a transaction attachment instead of booking the expense a second
  time; `POST /receipts/:id/approve` takes `{transactionId}` to pick another row or `null` to book
  a new one, `GET /receipts/:id/transaction-matches` lists the candidates.
- **Split by line items:** `GET /receipts/:id/split-suggestion` categorises each line (keywords,
  then the model) and groups them into parts that add up to the transaction; `POST /receipts/:id/split`
  applies it through the ordinary split. Line categories are remembered on the receipt.
- **Receipts in the email body:** order confirmations without an attachment now get their line items
  (and a total when the amount scan found none) from the stripped text, and a `YYYY-MM-DD` date
  instead of the raw header.

#### Review inbox (2026-10-01)

- **One queue for everything that needs a decision** at `/review` (`GET /review-inbox`,
  `GET /review-inbox/counts`): transactions nobody categorised or the model categorised, receipts
  without an amount, suspected duplicates, detected subscriptions. Read from the existing rows,
  so an item leaves the queue the moment it is resolved anywhere.
- Keyboard-first on desktop (`j`/`k`, `x`, `a`, `c`, `Esc`), group by payee with one-click group
  selection, a date range for "everything from the trip → Vacation", approve with a category or as
  is (`POST /review-inbox/transactions/approve`, which records a manual pick and learns from it),
  keep or confirm a duplicate (`POST /review-inbox/duplicates/:id/resolve`), approve receipts,
  confirm or dismiss subscriptions. On mobile, swipe right approves and left skips.
- Settings → Processing: "Trust AI picks" keeps the model's categories out of the queue.
- A weekly notification "N items are waiting for review" (Monday morning, through the existing
  "uncategorised items" preference and digest mode).

#### Data you can trust: transfers, reimbursements, category provenance (2026-10-01)

- **Transfers between your own accounts** are paired automatically after every statement import
  (same money, different account, within three days, exactly one counterpart) and by hand
  (`POST /transactions/:id/link-transfer`, `unlink-transfer`, `transfer-candidates`,
  `POST /transactions/transfers/detect`). Paired rows keep their direction but no longer count as
  spend or income anywhere: dashboard, reports, budgets, goals, insights, subscriptions, tax drafts.
  The list filter `type=transfer` shows them; unlinked pairs are never re-paired automatically.
- **Reimbursements:** an incoming row can be linked to the expense it pays back
  (`link-reimbursement`, `unlink-reimbursement`, `reimbursement-candidates`). A full repayment
  becomes a `reimbursement` pair and leaves the aggregates; a partial one keeps the link and still
  counts gross.
- **Category provenance:** every transaction records which step set its category (`manual`, `rule`,
  `keyword`, `learned`, `history`, `ai`, `default`) and why (the rule name, the learned payee, the
  keyword, the model's confidence). The details drawer shows it. The order is fixed and stated in
  Settings → Processing: your pick → rules → keywords → your corrections → payee history → AI →
  "Uncategorised". A hand-picked category is sticky and bulk re-classification skips it.
- **Switches** in Settings → Processing: AI categorisation (off means no model calls and no reuse of
  what the model taught), AI merchant names, and learning from corrections.
- **Learning guard:** one correction does not replace a payee's established category; the second
  one does, and what you taught outranks what the model taught at any confidence.

### Changed

- Cross-statement duplicate detection no longer matches rows from two different accounts: the same
  coffee on two cards is two coffees. Overlapping re-imports of one account are still caught.
- The AI result is applied only where rules, keywords and your corrections found nothing; the
  statement import and the custom-table conversion now agree on that order.

### Fixed

- Changing a transaction's category through `PUT /transactions/:id` or `bulk-update` answered with
  the new category but wrote the old one back to the database (TypeORM preferred the loaded
  relation over the changed id). Category, branch and wallet changes now persist.

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
