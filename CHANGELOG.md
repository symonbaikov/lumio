# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-10-23)


### ⚠ BREAKING CHANGES

* **frontend:** remove Gmail, Google Drive and Dropbox; self-host fonts
* **backend:** /integrations/gmail, /integrations/google-drive and /integrations/dropbox are gone; Gmail-imported receipts are deleted.

### Features

* **ai-assistant:** richer prompts and goals/subscriptions cards ([a376de9](https://github.com/symonbaikov/seneca/commit/a376de9aafc38d63c937098a7d54741b63d5e2c2))
* **ai-assistant:** richer prompts and goals/subscriptions cards ([19f4bc8](https://github.com/symonbaikov/seneca/commit/19f4bc8380dd23d5bdc10a52abae44ccb7e2dacc))
* **ai:** abort timed-out AI requests and retry a busy endpoint ([a26db43](https://github.com/symonbaikov/seneca/commit/a26db430fef3a22b6bb5fad0f7a77a054352ede1))
* **analytics:** compare with the period a person would pick ([6e163ec](https://github.com/symonbaikov/seneca/commit/6e163ece4be26a314889135722088de9232a0ff8))
* **analytics:** compare with the period a person would pick ([dd3726d](https://github.com/symonbaikov/seneca/commit/dd3726d43646bd60d558ec074feb9cf72ba45550))
* app shell contracts; /auth/me without bookkeeping columns ([a6ee082](https://github.com/symonbaikov/seneca/commit/a6ee082fb6c3417b28d790bf7cd846f4088876f2))
* **backend:** icons, geocoding and goal covers on the Effect HTTP client ([115e585](https://github.com/symonbaikov/seneca/commit/115e5857c946814fce24f4cb59222d49aea17360))
* **backend:** map tiles and the Telegram token check on the Effect HTTP client ([e2fa8ad](https://github.com/symonbaikov/seneca/commit/e2fa8ad79eea4f6b0750f3829343b3d8c9b9619f))
* **backend:** optional body fields accept null, as @IsOptional did ([11b90e3](https://github.com/symonbaikov/seneca/commit/11b90e3e8b4b17c7575637b0c41d43fdce8fdae6))
* **backend:** remove Gmail, Google Drive and Dropbox ([13dd6d5](https://github.com/symonbaikov/seneca/commit/13dd6d56618e0580697004e4b9663ed70dedc4ef))
* **backend:** request bodies on contract schemas ([c5edd53](https://github.com/symonbaikov/seneca/commit/c5edd53655a06e18be486676301200c2c979ec93))
* **bank-sync:** SimpleFIN account listing on effect's HttpClient ([030cce3](https://github.com/symonbaikov/seneca/commit/030cce38274cf9baac4c8b9936478f29bb88644c))
* budget and goal contracts; the budget form saves an untouched limit ([b514a28](https://github.com/symonbaikov/seneca/commit/b514a289fa32b13dec61e3417df7074e525bf9fe))
* **categories:** one CategoryPickerField for every category choice ([4b27cde](https://github.com/symonbaikov/seneca/commit/4b27cde8e695b49a8caef955b3fbb943a2dec681))
* **categories:** one CategoryPickerField for every category choice ([3b2d9f9](https://github.com/symonbaikov/seneca/commit/3b2d9f9392bb5b8772d43b2978374dff819bf98c))
* **categories:** shared category dialog and category icons on receipts and tax year ([917637c](https://github.com/symonbaikov/seneca/commit/917637cbacd37e6f07c718c7e816a08d3e4fe398))
* **categories:** shared category dialog and category icons on receipts and tax year ([cdd0ac4](https://github.com/symonbaikov/seneca/commit/cdd0ac4386e1f29764da6cda5ca9264af7064664))
* category and wallet contracts; wire-format test fixtures ([7459ead](https://github.com/symonbaikov/seneca/commit/7459ead2985c224e4a69821ca4cffcda340f5410))
* **classification:** learn categories from payee history, never guess from text ([1748155](https://github.com/symonbaikov/seneca/commit/174815556ed52363a202d6e073b6186471522568))
* **classification:** learn categories from payee history, never guess from text ([0e48a19](https://github.com/symonbaikov/seneca/commit/0e48a19d8ba90dc3898fb715420640d15fff4a03))
* contract for the statements list ([5c08d63](https://github.com/symonbaikov/seneca/commit/5c08d63995eb472ee80b6903b32fe0973369a604))
* contract for the transactions list, read on the statement edit page ([6beeced](https://github.com/symonbaikov/seneca/commit/6beeced7a22c088f160c36cda8d4f0d6c2a64b34))
* contracts for chats, notes, activity, reports, webhooks and other reads ([cb7ac24](https://github.com/symonbaikov/seneca/commit/cb7ac2447bd65072f80f49db23e637f8a1a42c19))
* contracts for custom tables and their public share ([c6216a3](https://github.com/symonbaikov/seneca/commit/c6216a3fc5e6e184b29c9461603cb105ce14ed84))
* contracts for settings and account reads, and every read of a contracted route ([bdd72a5](https://github.com/symonbaikov/seneca/commit/bdd72a5fd0a5d861bf754e4c373395790382996b))
* contracts for storage, receipts, statement detail and transaction files ([7867be9](https://github.com/symonbaikov/seneca/commit/7867be9c5d5e3794e40e9468f0ab8e2cb724c469))
* contracts for the action responses the app shows ([1f04add](https://github.com/symonbaikov/seneca/commit/1f04add7cc29fe5603a04801bb05dcd839303bcb))
* contracts for the last reads: reports, search, impact, duplicates ([7edb8a2](https://github.com/symonbaikov/seneca/commit/7edb8a299573d789930e33556c5cd37475c44cc9))
* contracts for the ledger and SMB reconciliation reads ([3c90f59](https://github.com/symonbaikov/seneca/commit/3c90f595422d9ef00bb39fb66eebd56048c52a30))
* contracts for the tax and income-tax reads ([c7b671c](https://github.com/symonbaikov/seneca/commit/c7b671c44a631c9d612aac2c3223c8b126a7b25a))
* **contracts:** a strict api client, every answer read through a contract ([4716178](https://github.com/symonbaikov/seneca/commit/471617885420a89002dcce6849e260a2a0c35335))
* **contracts:** query strings and route params decoded by contracts ([6eafa07](https://github.com/symonbaikov/seneca/commit/6eafa07c97046fc8652722864d7c38e7688e5f5c))
* **contracts:** query strings and route params decoded by contracts ([5f47a68](https://github.com/symonbaikov/seneca/commit/5f47a68dd412517fd4fb49798bd92471de487dc6))
* **contracts:** strict api client, every answer through a contract; backup restore and storage fixes ([27faaa0](https://github.com/symonbaikov/seneca/commit/27faaa0011322b03dfa4342892771dc07754f2d7))
* crypto portfolio on the balance sheet, and precious metals ([add5939](https://github.com/symonbaikov/seneca/commit/add59395aa1f051e1281662ffffb7cb1dfe8c71b))
* crypto portfolio on the balance sheet, and precious metals ([f046002](https://github.com/symonbaikov/seneca/commit/f046002c45a9fbc105073eea44f3448bc7f1917f))
* **crypto:** one Effect for the provider retry policy, with timeouts ([37ac523](https://github.com/symonbaikov/seneca/commit/37ac5233909ed314e30065add22c62cc2073e05f))
* **custom-tables:** balance under the title, view panel and fullscreen ([261be20](https://github.com/symonbaikov/seneca/commit/261be209e9853a6879bf8159a71595732b49eefa))
* **custom-tables:** balance under the title, view panel and fullscreen ([cd3d4f1](https://github.com/symonbaikov/seneca/commit/cd3d4f1519f01d8c69313787ebfa4fbab9c6d8db))
* **custom-tables:** currency filter options and source view defaults ([3eb6db4](https://github.com/symonbaikov/seneca/commit/3eb6db442a0a1ba0aab890f3275cb77c04f56344))
* **custom-tables:** currency filter options and source view defaults ([11dc5e5](https://github.com/symonbaikov/seneca/commit/11dc5e508b150edad8ce9874f9971afab6b6ab91))
* **custom-tables:** edits in a source table write back to the app record ([18743ab](https://github.com/symonbaikov/seneca/commit/18743ab622c4b9d13a9fb11fee80553a25b0e4ea))
* **custom-tables:** edits in a source table write back to the app record ([6eada6b](https://github.com/symonbaikov/seneca/commit/6eada6bcd9a2a23f7743a97999b0b9eb0b3c401e))
* dashboard contracts as the single source of the dashboard types ([884fc8f](https://github.com/symonbaikov/seneca/commit/884fc8fa6f7d9181589aab39e1b48359f3aea609))
* **dashboard:** cash flow by entries, subscriptions this month, chart drill-down ([bca81a9](https://github.com/symonbaikov/seneca/commit/bca81a9720586e6eee53d143490324a0efb89ee6))
* **dashboard:** cash flow by entries, subscriptions this month, chart drill-down ([88373df](https://github.com/symonbaikov/seneca/commit/88373df00e955c490d890a3934f42f5c22f56861))
* **dashboard:** faint line icons on KPI cards ([7f4ec2a](https://github.com/symonbaikov/seneca/commit/7f4ec2a80084f98359b13bd63957fbbc9f55178a))
* **dashboard:** faint line icons on KPI cards ([e40d33e](https://github.com/symonbaikov/seneca/commit/e40d33e9a3cc07d4c20b8d4da317f3c77193666c))
* **dashboard:** getting started checklist on the Overview tab ([2dc0e9d](https://github.com/symonbaikov/seneca/commit/2dc0e9de8b61aceb777c7cdf2eff4cb16bbe78e5))
* **dashboard:** getting started checklist on the Overview tab ([595df64](https://github.com/symonbaikov/seneca/commit/595df64cd1cd12b8df53622d9395435b7709e9a7))
* **dashboard:** net worth card and movable Overview sections ([5e8cd27](https://github.com/symonbaikov/seneca/commit/5e8cd27ea233dd9c977d3fb7af6362deee6dcf1a))
* **dashboard:** net worth card and movable Overview sections ([0243d80](https://github.com/symonbaikov/seneca/commit/0243d800cc73452ae7027c6e0e18c6cc9b272e19))
* **dashboard:** Overview only, cash flow and month close as widgets ([2c54128](https://github.com/symonbaikov/seneca/commit/2c5412836465d282cd901c0f6808f231304618c2))
* **dashboard:** Overview only, cash flow and month close as widgets ([fcd1ee7](https://github.com/symonbaikov/seneca/commit/fcd1ee79cefa590e063e08f8f11dcdd2e395845f))
* **dashboard:** pick Overview widgets and show the month in view truthfully ([5f341df](https://github.com/symonbaikov/seneca/commit/5f341df6f33101661f519d8e83ac989a5fc3f05d))
* **dashboard:** pick Overview widgets and show the month in view truthfully ([9576376](https://github.com/symonbaikov/seneca/commit/95763766e0c76e23fd9bc13a9647ed80b37d1110))
* **dashboard:** Review counts from the queue itself, wide cards, category donut ([242aca0](https://github.com/symonbaikov/seneca/commit/242aca085aaebdcce520de8ba4a123ebecf3faf1))
* **dashboard:** Review counts from the queue itself, wide cards, category donut ([7d5a9fe](https://github.com/symonbaikov/seneca/commit/7d5a9fef87224acd5bd2b80d40737e927de64e10))
* **dashboard:** say under the savings rate that the month is not over ([3d95588](https://github.com/symonbaikov/seneca/commit/3d95588d16b0324df1533aea101031027334a38c))
* **dashboard:** Trends pass and month-close Finance ops / Data quality tabs ([7b47a4b](https://github.com/symonbaikov/seneca/commit/7b47a4b78d0ebceac333a387af836d9546bd0d91))
* **documents:** operations open the document behind them; scans open their receipt ([b89f4d2](https://github.com/symonbaikov/seneca/commit/b89f4d29d98ba127b9c8be671c29c4f072a63376))
* **documents:** operations open the document behind them; scans open their receipt ([2ac055d](https://github.com/symonbaikov/seneca/commit/2ac055d14a2defc3543abdc632a34458b3c64350))
* **documents:** search, rows under their document, open from search, fresher lists ([127d6d8](https://github.com/symonbaikov/seneca/commit/127d6d852747d3cf1be47aa9b649f93f630136d4))
* **documents:** search, rows under their document, open from search, fresher lists ([6f6b9b7](https://github.com/symonbaikov/seneca/commit/6f6b9b73b66a8b0f8fd70a29716f0fb75daa4d3d))
* Effect runtime, shared API contracts and first pilots ([0038bed](https://github.com/symonbaikov/seneca/commit/0038bed9ef16b90e83fa97ce77adc2d45e54cffb))
* forecast contract ([ddd15ad](https://github.com/symonbaikov/seneca/commit/ddd15ade15c5555f097c5ae70181c51017587d33))
* **frontend:** check API contracts outside production only ([d83391e](https://github.com/symonbaikov/seneca/commit/d83391e156ab41554a6ff51f5efbe5cdbfeea614))
* **frontend:** remove Gmail, Google Drive and Dropbox; self-host fonts ([e04128f](https://github.com/symonbaikov/seneca/commit/e04128ff57f82ec4b62c08063d8d142da86bf296))
* **frontend:** request bodies typed by their contracts ([280462d](https://github.com/symonbaikov/seneca/commit/280462d62e25e55fb013ed63b84b360533cee403))
* **frontend:** Review is the only queue; Statements = Documents | Pay | Receive ([6ef501d](https://github.com/symonbaikov/seneca/commit/6ef501d00ab663087adb90466972e29152a79f2a))
* **frontend:** the remaining request bodies checked against their contracts ([e0d4d20](https://github.com/symonbaikov/seneca/commit/e0d4d200bf4f3e248dd1c7e3cf1f159ad2a7b884))
* **goals:** calmer goal detail page, explained plan figures ([837878d](https://github.com/symonbaikov/seneca/commit/837878d7f265a387160bcfb573abecfd2c53fde3))
* **goals:** calmer goal detail page, explained plan figures ([4aee9fc](https://github.com/symonbaikov/seneca/commit/4aee9fcd0385055a4b4ffb1916da65ccfcac75a6))
* **goals:** cover presets ([b2c5784](https://github.com/symonbaikov/seneca/commit/b2c57844fb6463182f6b4b142690602e7b809110))
* **guide:** first visits open the guide's page, full-screen guide ([14f1b0b](https://github.com/symonbaikov/seneca/commit/14f1b0b449872bc18b5a2dc962481d14d2f89fb6))
* **guide:** one large picture per page beside the words, no numbered marks ([36915ec](https://github.com/symonbaikov/seneca/commit/36915ec7c3ec10af1997deaa9c91234c5ac84d0f))
* **guide:** one large readable picture per page, demo marked, roles translated ([c63d048](https://github.com/symonbaikov/seneca/commit/c63d048693d08c9fd7a19614e4cda5b85802ea7c))
* **guide:** one large, legible picture per guide page ([e525318](https://github.com/symonbaikov/seneca/commit/e525318abe13e533ae514e5fe50d1eefeaee7efc))
* **guide:** over the whole screen, no sidebar highlight ([3104069](https://github.com/symonbaikov/seneca/commit/310406919438e2586bff2789fbb84fa205dc0295))
* **guide:** regenerate the guide's screenshots in CI from the demo workspace ([0736251](https://github.com/symonbaikov/seneca/commit/0736251379216a44e388fd1dea8b35d5514e04c5))
* **guide:** turn the welcome tutorial into an on-demand guide in the Nordic style ([7ff663e](https://github.com/symonbaikov/seneca/commit/7ff663e01047297435a60dc277207b8038e2eed7))
* household collaboration — permissions, owners, privacy, notes, activity ([c4f48c6](https://github.com/symonbaikov/seneca/commit/c4f48c6a852885cacee040e1b37dcfa5bc0051c1))
* household collaboration — permissions, owners, privacy, notes, activity ([7b773b4](https://github.com/symonbaikov/seneca/commit/7b773b4b8722cee6bf6cfd4ad66236db4c032d5a))
* **income-tax:** NBP and Banca d'Italia rates on the shared getJson ([c9ae582](https://github.com/symonbaikov/seneca/commit/c9ae582a087061d4dda41d4a9bac3aa18326d8d6))
* **insights:** one quiet strip of things to do instead of five yellow banners ([8bd690b](https://github.com/symonbaikov/seneca/commit/8bd690b5ef901cfe5cfa27741fc5c9e77c309060))
* **insights:** one quiet strip of things to do, observations to Advice ([ba8232e](https://github.com/symonbaikov/seneca/commit/ba8232e7f26212ffa5a20c4d7b5589b800f59dfb))
* invoice, client and credit note contracts; writes read the invoice back ([7d13a0b](https://github.com/symonbaikov/seneca/commit/7d13a0b410f8177579509f8f4351c64126a0e985))
* **invoices:** send and receive invoices over Peppol ([3d7afe7](https://github.com/symonbaikov/seneca/commit/3d7afe7c7da8d56ba46455956bd073d2238ee555))
* **invoices:** send and receive invoices over Peppol ([9234046](https://github.com/symonbaikov/seneca/commit/923404609b1d80b998aeb9a1469c02c3e93e661e))
* **invoices:** step-by-step wizard for new and draft invoices ([670a5ef](https://github.com/symonbaikov/seneca/commit/670a5ef3b41100ccdcd9b1dd74f31b3e9855dd7c))
* **invoices:** step-by-step wizard for new and draft invoices ([1576b84](https://github.com/symonbaikov/seneca/commit/1576b8445fd3e75642e59efc89f08697b3f6ef74))
* **keyboard:** Documents selection keys, palette pickers and hold-Space preview ([448f416](https://github.com/symonbaikov/seneca/commit/448f416f19690dbc012ef14f477702341fcac024))
* **keyboard:** Documents selection keys, palette pickers and hold-Space preview ([4311fcf](https://github.com/symonbaikov/seneca/commit/4311fcff5772b3b2b4f1047160db926e85e1b305))
* **mcp:** MCP endpoint in the backend, behind API keys and the MCP switch ([1811f24](https://github.com/symonbaikov/seneca/commit/1811f24a914a62a10d33bcc83fdf862dbd394357))
* **mcp:** MCP endpoint in the backend, behind API keys and the MCP switch ([4742c1b](https://github.com/symonbaikov/seneca/commit/4742c1bf2adf59be6467c124708ccd86b8426ecc))
* **mcp:** tools for the rest of the app ([3ea5b35](https://github.com/symonbaikov/seneca/commit/3ea5b353fbe0a73af292fe24450c34a309070ab8))
* **mcp:** tools for the rest of the app ([52ce2e7](https://github.com/symonbaikov/seneca/commit/52ce2e722fc8279824aae33ceef736970004e30f))
* **members:** explain the chosen role in the invite form, lighter member list ([504d06a](https://github.com/symonbaikov/seneca/commit/504d06a0cc083125fe4ffb3e485d51ad632680bd))
* **members:** explain the chosen role in the invite form, lighter member list ([de00729](https://github.com/symonbaikov/seneca/commit/de007296935f36947e201c66d0b1b45d0de2cd00))
* **mobile:** page actions under the bottom bar and full-screen dialogs ([bdcb10c](https://github.com/symonbaikov/seneca/commit/bdcb10c6ee0f04820d0cb8164f016a9fc986489d))
* **mobile:** page actions under the bottom bar and full-screen dialogs ([f09261e](https://github.com/symonbaikov/seneca/commit/f09261ec2f10bc143028af38ae0c6237dcc63e74))
* mutation responses checked against contracts, and made consistent ([ec49b3b](https://github.com/symonbaikov/seneca/commit/ec49b3b5bab494890f45fd081c157717106085c2))
* **navigation:** reorder the sidebar by everyday use ([003f8a0](https://github.com/symonbaikov/seneca/commit/003f8a0616c71c46ec397a5d609f01437ee85f6d))
* **navigation:** reorder the sidebar by everyday use ([3a444b1](https://github.com/symonbaikov/seneca/commit/3a444b1ce3aaf9c252f8c7d910a30225b6f91342))
* **navigation:** transactions group, all-transactions page and page headings ([4e073fd](https://github.com/symonbaikov/seneca/commit/4e073fd8872bfe368e02d6eefe7c05da7935dc0b))
* **navigation:** transactions group, all-transactions page and page headings ([98446aa](https://github.com/symonbaikov/seneca/commit/98446aa198fbe36af35b28b249efe5a8b5cccb5d))
* net worth, investments, metals, balance sheet and crypto contracts ([2da1328](https://github.com/symonbaikov/seneca/commit/2da13280993580c483bf0e2aecc31d154972d9b2))
* **notifications:** grouped panel and notifications that read like sentences ([89f4581](https://github.com/symonbaikov/seneca/commit/89f458177f0f5ddf00788e37e6caa09dd60e524f))
* **notifications:** grouped panel and notifications that read like sentences ([47896e4](https://github.com/symonbaikov/seneca/commit/47896e45eb32c9fb001a0998c193be86a3852598))
* onboarding split — welcome window, page hints, demo workspace, guide with CI screenshots ([1267fcf](https://github.com/symonbaikov/seneca/commit/1267fcf7ca7dd2ec6ed099a715576add156c17c5))
* **onboarding:** full-screen onboarding that asks for tax residence and profile ([964944f](https://github.com/symonbaikov/seneca/commit/964944f8596efab30a623e1a96864331d208dd98))
* **onboarding:** full-screen onboarding that asks for tax residence and profile ([4eafc74](https://github.com/symonbaikov/seneca/commit/4eafc7424d42f062988723282ba583e6e6e13274))
* **onboarding:** language and country pickers in side drawers ([6635453](https://github.com/symonbaikov/seneca/commit/6635453cd4d63596897175cd2ce138f9bd896aa3))
* **onboarding:** language and country pickers in side drawers ([e29b175](https://github.com/symonbaikov/seneca/commit/e29b17526127f1633f860ea1906fe3d21588f7ea))
* **ops:** make upgrade and in-app updates from Settings ([29f3e7f](https://github.com/symonbaikov/seneca/commit/29f3e7f417fd1750951949b8c7e98b3470743b99))
* **ops:** make upgrade and in-app updates from Settings ([f83286b](https://github.com/symonbaikov/seneca/commit/f83286bde1b8200b88424d87c5f38a577cfbbe7e))
* payable contracts ([f8b9c4b](https://github.com/symonbaikov/seneca/commit/f8b9c4bd2182d5620a6ada82f73979029b79a93d))
* **payables:** book unbooked payments and quiet Pay/Receive lists ([09cb74b](https://github.com/symonbaikov/seneca/commit/09cb74b3bbc33fa5090d10810ba1c02c417e994e))
* **payees:** manage a payee from the transaction drawer, drop the Payees tab ([a79fb19](https://github.com/symonbaikov/seneca/commit/a79fb198a1caf2a7a928a52becf00c047878b8f0))
* **payees:** manage a payee from the transaction drawer, drop the Payees tab ([5ecadec](https://github.com/symonbaikov/seneca/commit/5ecadecde8106f6e5583f7408ccdd9e62d5e869f))
* **payees:** payees with aliases, categorization by payee history, AI categorization off by default ([7d0ca67](https://github.com/symonbaikov/seneca/commit/7d0ca67f295bfa306585e1f9fd455a098a73bd6c))
* **payees:** payees, categorization by payee history, AI categorization off by default ([aeddd49](https://github.com/symonbaikov/seneca/commit/aeddd494113d2dd6f051dc92acfda294849fe3ec))
* **plugins:** plugin switches are per-workspace settings that gate the plugin ([c51bafb](https://github.com/symonbaikov/seneca/commit/c51bafbef19c78284453f42f59c029090a3324d6))
* **plugins:** plugin switches are per-workspace settings that gate the plugin ([2bf3776](https://github.com/symonbaikov/seneca/commit/2bf37764daefcee728280c284bbc6e3551386968))
* **privacy:** privacy mode that scribbles amounts until hovered ([c8da87d](https://github.com/symonbaikov/seneca/commit/c8da87d440ec345787a6207bdd54107830518f98))
* **privacy:** privacy mode that scribbles amounts until hovered ([d73ad71](https://github.com/symonbaikov/seneca/commit/d73ad71118a2b22197595cf6499db8ebbff9d047))
* **receipts:** keep line items only when they add up, reviewed split with undo ([6c0c2bd](https://github.com/symonbaikov/seneca/commit/6c0c2bda79d453b66f6e151d3ae06ae00c7fd405))
* **receipts:** keep line items only when they add up, reviewed split with undo ([e7c2825](https://github.com/symonbaikov/seneca/commit/e7c28255b6e5af368d6eb4d6b18a7971625e3ce5))
* **receipts:** pick the tax rate on a receipt ([7e01f72](https://github.com/symonbaikov/seneca/commit/7e01f728d5faaf819e5f66e9a310efad10e2ed9a))
* **receipts:** pick the tax rate on a receipt ([b3e326c](https://github.com/symonbaikov/seneca/commit/b3e326c24cbbb0cf6ba65c6400f1a3af2a9d4697))
* **reports:** categories by month, budget vs actual and investment holdings templates ([51c1fd0](https://github.com/symonbaikov/seneca/commit/51c1fd0a17f594a93bfd3693c6a7b86f5e34aa1b))
* **reports:** remember "include transfers", icons on cash flow and subscription tiles ([a552470](https://github.com/symonbaikov/seneca/commit/a552470cf4906f451356ee6d14a5d514d4cd0dd1))
* **reports:** remember include-transfers, icons on cash flow and subscription tiles ([feeedef](https://github.com/symonbaikov/seneca/commit/feeedeff4e949565309378a783b28237e75fab13))
* review inbox and payee contracts ([b39d946](https://github.com/symonbaikov/seneca/commit/b39d946b714d45c3266f88760691e33b51e9e8a4))
* **review:** Review rows look like Documents rows, with a document preview and a no-category mark ([9795292](https://github.com/symonbaikov/seneca/commit/979529222928a3ff3427ccdeae0400304c512302))
* **review:** Review rows look like Documents rows, with a document preview and a no-category mark ([7a80591](https://github.com/symonbaikov/seneca/commit/7a8059167bd9ab9e1363cd73eeabca8f34667489))
* **security:** answers leave only what their contract declares ([102bdc2](https://github.com/symonbaikov/seneca/commit/102bdc228ebc0972d5b3d86f25562297a0863250))
* **security:** answers leave only what their contract declares; audit, file and privacy leaks closed ([080c970](https://github.com/symonbaikov/seneca/commit/080c970ecf51c64c004eee78f8098bbb61b9d799))
* **security:** TRUST_PROXY setting for which peers may set the client IP ([84c1f24](https://github.com/symonbaikov/seneca/commit/84c1f245c87cb2292c77ff6b4af414f7301d56cf))
* **shortcuts:** make global shortcuts work from every page and add new ones ([5b41eb4](https://github.com/symonbaikov/seneca/commit/5b41eb4e6cbdcdabc9394a3b3be63cf4fe17252f))
* **shortcuts:** make global shortcuts work from every page and add new ones ([15d3a72](https://github.com/symonbaikov/seneca/commit/15d3a72b077a05b64f0fc60b87e0f2db5011d7f9))
* subscription contracts; the owner column names the owner ([c4d78bd](https://github.com/symonbaikov/seneca/commit/c4d78bdb1349c4645a3f8cd29235c946fc5d52e1))
* **subscriptions:** details drawer refresh, vendor domain from URL ([040c4a3](https://github.com/symonbaikov/seneca/commit/040c4a33210f9fcb905ac79471aca408c2d5a704))
* **subscriptions:** details drawer refresh, vendor domain from URL, single-letter vendor initial ([7a5a3d0](https://github.com/symonbaikov/seneca/commit/7a5a3d0d730b448808447637d4e7f0101dc2f6df))
* **subscriptions:** payments, auto-linked payees and a budget to pay from ([74423b3](https://github.com/symonbaikov/seneca/commit/74423b391f3403a04f17b4267171bb0e30068954))
* **subscriptions:** payments, auto-linked payees and a budget to pay from ([5d069f4](https://github.com/symonbaikov/seneca/commit/5d069f45d705c1172854ef2b45d6bf2127302474))
* **tax:** tax engine screens read and write through contracts ([cc4c555](https://github.com/symonbaikov/seneca/commit/cc4c55581114338bbb7b3adc81e0c2ddda67e4df))
* **tax:** VAT status, tax pack, reserve, deadlines, DATEV, reference data, UStVA, e-invoices ([76f2342](https://github.com/symonbaikov/seneca/commit/76f23424a6c887604da656a70b8674bfe68fb183))
* **tax:** VAT status, tax pack, reserve, deadlines, DATEV, reference data, UStVA, e-invoices ([37d684d](https://github.com/symonbaikov/seneca/commit/37d684d827ecf677241167e1883a63aa74944032))
* **telegram:** connect a chat in one click ([4a72a07](https://github.com/symonbaikov/seneca/commit/4a72a07d08375c5f3f384e90622481065c812e09))
* **telegram:** connect a chat in one click ([cf2d252](https://github.com/symonbaikov/seneca/commit/cf2d252d66e3c318e999c43c0dceeeb8a9bb0441))
* **telegram:** shared server bot, no token form for members, checklist step ([61f114a](https://github.com/symonbaikov/seneca/commit/61f114ab5d37cb4bd78ff3a38bd6af7b287912b6))
* **telegram:** the webhook body is decoded by a schema ([84ecc60](https://github.com/symonbaikov/seneca/commit/84ecc6069f21ac2e615a5134dcf71a9a9b61b33d))
* **ui:** a leading plus icon on every "New …" button ([0e473a3](https://github.com/symonbaikov/seneca/commit/0e473a313680576c8ada5ecd884f22353152d997))
* **ui:** a leading plus icon on every "New …" button ([57e88ba](https://github.com/symonbaikov/seneca/commit/57e88ba5979652b6bfde9c851438cb615091a823))
* **ui:** calm Nordic light theme, line-icon empty states and page refresh ([bc2c23b](https://github.com/symonbaikov/seneca/commit/bc2c23be8c9b7edde8fd50807c11b2b9f5d4b9d5))
* **ui:** calm Nordic light theme, line-icon empty states and page refresh ([d4c24b6](https://github.com/symonbaikov/seneca/commit/d4c24b618f3e3d110b5aeeea6b6fbde0603ae403))
* **ui:** new empty-state illustrations with light and dark variants ([f0f9587](https://github.com/symonbaikov/seneca/commit/f0f95872395a4720adbd3fa9a26ef9a539cbf7e6))
* **ui:** new empty-state illustrations with light and dark variants ([b16b310](https://github.com/symonbaikov/seneca/commit/b16b31023e30b9bca7c06fadc0d17584cdb27991))
* **ui:** Review dot in the sidebar; receipt currency picker uses the shared drawer ([126d914](https://github.com/symonbaikov/seneca/commit/126d914ee2d767219f33b598d7dc089e7315e4c3))
* **versions:** nightly and manual snapshots of a workspace ([51d9eb4](https://github.com/symonbaikov/seneca/commit/51d9eb42277fb20046d2bbf8ecfa798a7b2a35c5))
* **versions:** open a version read only, save it as a copy ([9b20ff1](https://github.com/symonbaikov/seneca/commit/9b20ff1e172eadac012394d979a535f932a7fa03))
* **versions:** Settings → Versions — the app as it was on a past day ([b5f34f4](https://github.com/symonbaikov/seneca/commit/b5f34f4fa4fec67de68cae587ce43f61c6defc69))
* **versions:** the Versions tab and the read-only app ([6f1aa38](https://github.com/symonbaikov/seneca/commit/6f1aa3843b821de9c65ad7763482c7b6db256f4f))
* **webhooks:** events for what happens in the app, not three of it ([cd43886](https://github.com/symonbaikov/seneca/commit/cd43886baa85f3fea157a3d3a4501814511148ba))
* **webhooks:** events for what happens in the app, not three of it ([c78697f](https://github.com/symonbaikov/seneca/commit/c78697f17470573b442cde15effce23f21722e87))
* **webhooks:** the drawer shows every event, the upload URLs and the delivery log ([f9410ff](https://github.com/symonbaikov/seneca/commit/f9410ff109d243caf4da605e6c0d93ea3755a102))
* **webhooks:** the drawer shows every event, the upload URLs and the delivery log ([b56bbda](https://github.com/symonbaikov/seneca/commit/b56bbda904b320d69730f5a42850b82c8633273f))
* welcome window and per-page first-visit hints ([79d4560](https://github.com/symonbaikov/seneca/commit/79d45607adca7f69763f061fb1980369c11ac17d))
* **workspaces:** demo workspace with a year of fixed sample data ([717b17b](https://github.com/symonbaikov/seneca/commit/717b17babfdf4d60b6b26a114442b979a6d09bc1))
* **workspaces:** find a workspace background through Openverse ([17dbe0d](https://github.com/symonbaikov/seneca/commit/17dbe0d28bcca03ced91ff63af7f4381a7768a11))
* **workspaces:** find a workspace background through Openverse ([d4af555](https://github.com/symonbaikov/seneca/commit/d4af555dbc9538408c02b087e3824bb17da714d3))
* **workspaces:** read-only version workspaces, skipped by every background job ([14d8074](https://github.com/symonbaikov/seneca/commit/14d8074b7b9bd8a2b285f4d8520270df890ef22a))
* **workspaces:** read-only version workspaces, skipped by every background job ([855e71c](https://github.com/symonbaikov/seneca/commit/855e71ccba71f52f277f908f069b5cb0cd1c1326))


### Bug Fixes

* **a11y:** switches carry their accessible name again ([01e75c3](https://github.com/symonbaikov/seneca/commit/01e75c3edf079a407ed647174de358795ec4d98e))
* **a11y:** switches carry their accessible name again ([04b9879](https://github.com/symonbaikov/seneca/commit/04b98795b0af480bc76ad0251b6595b9e4abd54a))
* **api-keys:** keep scoped keys off routes without declared permissions ([ecc4a31](https://github.com/symonbaikov/seneca/commit/ecc4a319edc58b23e09b1018e5ad2ad67d6b9285))
* **api:** input a handler cannot use answers 4xx, not 500 ([a843daf](https://github.com/symonbaikov/seneca/commit/a843dafb3372f0d147dac65b075040467cb942c1))
* **authz:** close read-only gaps on integration and settings routes ([5fd493a](https://github.com/symonbaikov/seneca/commit/5fd493a2487005649fae523327b6abd8c09e5dd0))
* **authz:** enforce API-key scopes on entity imports and search ([0abc141](https://github.com/symonbaikov/seneca/commit/0abc141fa453481248d652be621b874fbd34704d))
* **authz:** gate balance-sheet, investment and metals writes on wallet permissions ([a033b6d](https://github.com/symonbaikov/seneca/commit/a033b6d3db8ccc52bbf494c9f0b9e62fb8f05122))
* **backups:** a restored invoice keeps its PDF; round trip proven on Postgres ([84abe6d](https://github.com/symonbaikov/seneca/commit/84abe6d74c663eeccb015e9aa3c8d54f611a50be))
* **backups:** a restored invoice keeps its PDF; round trip proven on Postgres ([c3cd78e](https://github.com/symonbaikov/seneca/commit/c3cd78e7d4276a889cf1878abf6293a387c31ef2))
* **backups:** cap what an uploaded archive may unpack and throttle imports ([6355cc3](https://github.com/symonbaikov/seneca/commit/6355cc391cd7c767298ff2a1dfb72b7f9e8d3a49))
* **backups:** restore a workspace that has a ledger, invoices and tags ([aa52c3a](https://github.com/symonbaikov/seneca/commit/aa52c3aabe427e725f531c5a09a8ecc77c671486))
* **backups:** restore only workspace tables and cut references outside the archive ([f8aa41b](https://github.com/symonbaikov/seneca/commit/f8aa41be12c74dfb08b7c2029927db907fb118d7))
* **budgets:** show the start date and the spending it leaves out ([ecbcbf2](https://github.com/symonbaikov/seneca/commit/ecbcbf27a24dc0ad1f14828150022f658bce0d38))
* **budgets:** show the start date and the spending it leaves out ([7c29523](https://github.com/symonbaikov/seneca/commit/7c2952348e60ad2db8b325c7f953bcc0cbf3b580))
* **classification:** keep categorization rule targets in the rule's workspace ([3ccc3cb](https://github.com/symonbaikov/seneca/commit/3ccc3cb043137ff8710c6d5f75293c7076519022))
* **classification:** require TRANSACTION_EDIT and keep manual categories ([1f746e9](https://github.com/symonbaikov/seneca/commit/1f746e9d142e8a8ef8d477116303d6778b7d873e))
* **currency:** budgets, goals and insights convert currencies ([47f5b28](https://github.com/symonbaikov/seneca/commit/47f5b2816b38fca47850be93c2b302add8112794))
* **custom-tables:** deleting draft rows, single focus border on the table name ([f772e93](https://github.com/symonbaikov/seneca/commit/f772e93e06cc2cf7dffd98e25712aed50173d9b6))
* **custom-tables:** deleting draft rows, single focus border on the table name ([f861d93](https://github.com/symonbaikov/seneca/commit/f861d93cbc04cc2b03c478ff6dcf611e8c3d6c62))
* **custom-tables:** name scheduled export files from fixed parts ([f9c0e67](https://github.com/symonbaikov/seneca/commit/f9c0e67e414d3b67c3414c84a3abf971e8a0e604))
* **dashboard:** a hand-entered transaction in Recent transactions is not a link ([8878258](https://github.com/symonbaikov/seneca/commit/88782584e1e40d10e688811c551c7f734e0217a0))
* **dashboard:** a hand-entered transaction in Recent transactions is not a link ([6cb9c08](https://github.com/symonbaikov/seneca/commit/6cb9c085877678b94872ba5a778f5f6ff8ef9481))
* dates and category names in the reader's language, Approved filter follows the column ([9e990e7](https://github.com/symonbaikov/seneca/commit/9e990e75dd60842f51a1371c539eeb483ad54ddb))
* **dates:** format dates in the interface language, not the sign-up locale ([f6f02d1](https://github.com/symonbaikov/seneca/commit/f6f02d14fac0c01cf81196b3c830a3c3b752b41d))
* **deps:** bump follow-redirects, launch-editor and vitest's vite past new advisories ([5e0b421](https://github.com/symonbaikov/seneca/commit/5e0b42118c02e6439082333449d40f0da6751d5e))
* **deps:** bump follow-redirects, launch-editor and vitest's vite past new advisories ([2d33b8e](https://github.com/symonbaikov/seneca/commit/2d33b8e45e4f6df1400c0db5e29a36dd39562e00))
* **deps:** bump ip-address and next for new advisories ([c1864d3](https://github.com/symonbaikov/seneca/commit/c1864d342c97a84389b0c02a15512d09d9298dcc))
* **deps:** bump ip-address to 10.7.4 in the backend ([a4225a2](https://github.com/symonbaikov/seneca/commit/a4225a221a10e8847e644786ae18ce7801e82377))
* **deps:** bump next to 16.4.3 ([2877494](https://github.com/symonbaikov/seneca/commit/287749449b8d871a63bddecbc743ef2c379ca772))
* **deps:** override shell-quote and Docusaurus tinypool/source-map-js to patched versions ([1e46b40](https://github.com/symonbaikov/seneca/commit/1e46b406088b36b97afe2f0d3f6f52327aa7514a))
* **docker:** copy the locale-packs script before the frontend install ([2fa201e](https://github.com/symonbaikov/seneca/commit/2fa201e05c251555bfccf30a8892b9204c084c97))
* **docs:** build the site on Node 22, show the README screenshots ([4969d22](https://github.com/symonbaikov/seneca/commit/4969d2217f9291478e30a3bf48000888e1d60397))
* **docs:** build the site on Node 22, show the README screenshots ([184882e](https://github.com/symonbaikov/seneca/commit/184882e52f8bf15a1e7cec736ba5b149c74cce95))
* **documents, budgets:** real Approved column, category names in the reader's language ([e25da8a](https://github.com/symonbaikov/seneca/commit/e25da8a69a64f76c8f0f61d68a0a955470e0edae))
* **documents, budgets:** real Approved column, category names in the reader's language ([6f543b2](https://github.com/symonbaikov/seneca/commit/6f543b20c113b34ed19a3d43b4aa02ec3333d904))
* **documents:** the Approved filter follows the Approved column ([63be370](https://github.com/symonbaikov/seneca/commit/63be3704dca8762898035c8494eeeb4eb16e14e3))
* drop AI switches from the processing test, decode stripHtml entities once ([38de8af](https://github.com/symonbaikov/seneca/commit/38de8af17d20a22e0e6e7279936ffd36e706779d))
* **egress:** block NAT64/6to4/site-local IPv6, drop credentials on cross-origin redirects ([5c852d2](https://github.com/symonbaikov/seneca/commit/5c852d2f1c65c8a9845637de0681c9f0d282741a))
* **entity-imports:** let scoped API keys reach the import routes that check scopes ([ec6a154](https://github.com/symonbaikov/seneca/commit/ec6a154a5aa78770a35291b3d451eec9206975e1))
* **exports:** neutralise spreadsheet formulas in remaining exports ([598a4b3](https://github.com/symonbaikov/seneca/commit/598a4b367a903a8c1245c364c452f85e3dffd6e2))
* **figures:** edits in Documents reach every figure ([6c6602b](https://github.com/symonbaikov/seneca/commit/6c6602b8e804c6cc6841c79a6ddf0edc17516442))
* **figures:** one counted-flows rule for every income and spending figure ([b713b11](https://github.com/symonbaikov/seneca/commit/b713b1117720d0761237c071ac38cdb629e88124))
* **forecast:** irregular income, no double counting, receivables, steadier runway ([20ce5e6](https://github.com/symonbaikov/seneca/commit/20ce5e6a89a1c32f57a548d7082dad2c4e8e638d))
* **forecast:** report zero runway when the projection falls from an empty balance ([06bbd50](https://github.com/symonbaikov/seneca/commit/06bbd509a1b7fda20b453ab37de56bb7868fb9ce))
* **forecast:** zero runway when the projection falls from an empty balance ([a8a752d](https://github.com/symonbaikov/seneca/commit/a8a752d0d5613ffb1a9c68fea9da8b987ce5142c))
* **frontend:** ship every font subset the app's languages need ([f252530](https://github.com/symonbaikov/seneca/commit/f2525302a8840b42e8f98ff1e550a0668d538aba))
* **frontend:** ship every font subset the app's languages need ([e29f935](https://github.com/symonbaikov/seneca/commit/e29f93559632a75f654a434a02c3e7659f5b6f81))
* **frontend:** workspace-keyed queries wait for the workspace ([7ce835a](https://github.com/symonbaikov/seneca/commit/7ce835ae435889b139409ac504d98130682ba4a4))
* **gmail:** send the receipt xlsx export in the response ([da40374](https://github.com/symonbaikov/seneca/commit/da40374464367959f631e091fb15622b59df16c0))
* **goals:** currency from the currency drawer, localized date pickers ([c23a71c](https://github.com/symonbaikov/seneca/commit/c23a71c78bf5313514799fe4504b999133d1ec42))
* **goals:** currency from the currency drawer, localized date pickers ([9f4cea8](https://github.com/symonbaikov/seneca/commit/9f4cea8472e5c3f963758bfab80a2b6d233636a6))
* **guide,insights:** Demo label beside the picture, roles translated, concurrent refresh ([a6104e8](https://github.com/symonbaikov/seneca/commit/a6104e86df15ca33b280ca11b93148535d76d6b5))
* **i18n:** advice names system categories in the reader's language ([80d7842](https://github.com/symonbaikov/seneca/commit/80d7842bc9355c322297a8691ee5ba69fe5baa6f))
* **i18n:** balance account names in every language ([83f0a24](https://github.com/symonbaikov/seneca/commit/83f0a24849fbd72970b5802269b54d7a32264c6e))
* **i18n:** dates and numbers follow every interface language ([edb838a](https://github.com/symonbaikov/seneca/commit/edb838aa6b7677608b5653a4ea3d3a4aca6cf90e))
* **i18n:** net caption read like the savings rate in 15 languages ([144797b](https://github.com/symonbaikov/seneca/commit/144797bcab36e739dd455a0bd8d3faea95ac0b47))
* **i18n:** show system category names in the reader's language everywhere ([6d6ba1c](https://github.com/symonbaikov/seneca/commit/6d6ba1c945e1908917347146a2a07bf7b6268c9c))
* **insights:** rising category needs a rise of at least 50 USD in money ([858290d](https://github.com/symonbaikov/seneca/commit/858290db0c88bab257465d650ff5a2d1a314f352))
* **integrations:** probe a new S3 endpoint through the pinned-lookup agents ([84b9edd](https://github.com/symonbaikov/seneca/commit/84b9eddeba88b724e0ceddb5e96737d4741db547))
* **invoices,metals,webhooks:** scope line categories, lot owners and endpoint defaults ([e01992a](https://github.com/symonbaikov/seneca/commit/e01992ad858989f711b95553769feefac5b0a3cd))
* **invoices:** show a skeleton instead of a dash while loading ([d73a525](https://github.com/symonbaikov/seneca/commit/d73a525c5dfb17414402d328f64f7f8cf816f603))
* **invoices:** show a skeleton instead of a dash while loading ([16e0eef](https://github.com/symonbaikov/seneca/commit/16e0eef7599417769f8e4dabd511d39d881e144c))
* **mail:** send workspace mail through that workspace's SMTP, never the home one ([9cbf5a0](https://github.com/symonbaikov/seneca/commit/9cbf5a027e91d554e9db2b710dd496f9de05ec52))
* **notifications:** mark all as read sends no body ([69f84b5](https://github.com/symonbaikov/seneca/commit/69f84b525b6a974c9991832c5179ede9417999e9))
* **notifications:** no more "not found" from notification links ([1b9711f](https://github.com/symonbaikov/seneca/commit/1b9711fe24085419edbd2bf3c748d5fd7950f2ab))
* **notifications:** no more "not found" from notification links ([df87fae](https://github.com/symonbaikov/seneca/commit/df87fae92d2da407721bf43aca3fc7db597f9807))
* **onboarding:** fixes from the live check ([7545a27](https://github.com/symonbaikov/seneca/commit/7545a27b18457fcc3d478a7924f84b071704999a))
* **onboarding:** no technical name in the checklist, budget names follow the locale ([57fde5c](https://github.com/symonbaikov/seneca/commit/57fde5c228b84e5b8b2a7eae79f9cee0b255a278))
* **parsing:** debug scripts read rowSets instead of the removed rows field ([a29b842](https://github.com/symonbaikov/seneca/commit/a29b8425faf670d8712b414b1d43e00fc9a428a6))
* **parsing:** debug scripts read rowSets instead of the removed rows field ([e73cd16](https://github.com/symonbaikov/seneca/commit/e73cd16036b7f8772d32c53d606ba260406ce050))
* **parsing:** debug scripts read rowSets instead of the removed rows field ([4194a5b](https://github.com/symonbaikov/seneca/commit/4194a5b68bbdb5d3d82b27f3f2e32caf006ad621))
* **parsing:** debug scripts read rowSets instead of the removed rows field ([ae06acd](https://github.com/symonbaikov/seneca/commit/ae06acdf21fb0e2c6d8be362f6bc3e1f81105803))
* **parsing:** debug scripts read rowSets instead of the removed rows field ([dfe8de1](https://github.com/symonbaikov/seneca/commit/dfe8de1e6f8706bcc9c41e24acc23b2766568eb9))
* **parsing:** debug scripts read rowSets instead of the removed rows field ([5c6bfe9](https://github.com/symonbaikov/seneca/commit/5c6bfe9d7c568ba3dddf4a860a8f34f1fc5cd66c))
* **parsing:** give pdf-parse a plain Uint8Array, not a Buffer ([158ce4c](https://github.com/symonbaikov/seneca/commit/158ce4c4265197770d968742be6d54c52634aecb))
* **parsing:** hand pdf-parse a buffer that owns its memory (Node 24) ([dfa136a](https://github.com/symonbaikov/seneca/commit/dfa136a2401fd1ab2027671d0c5ec761ce3acaf1))
* **parsing:** reconcile Kaspi/Bereke extractors, anonymized golden corpus, CSV header/date order ([879722f](https://github.com/symonbaikov/seneca/commit/879722f4e684bd7da5b5b9211984d4e1f847bec9))
* **parsing:** reconcile Kaspi/Bereke extractors, anonymized golden corpus, CSV header/date order ([0691a47](https://github.com/symonbaikov/seneca/commit/0691a47d86771854b7f1114b05d408c32c3a2fb2))
* **parsing:** stop retrying statements no attempt can parse, notify once ([a91d7bc](https://github.com/symonbaikov/seneca/commit/a91d7bc7838aa3b52478a71e6a85a0587c7d8a8e))
* **payables:** unique export file and formula-safe cells ([e24d7b6](https://github.com/symonbaikov/seneca/commit/e24d7b625974a73b1e60b5bfa4eef0b27635f343))
* **privacy:** custom-table fill, statement CSV export and private-row notes ([0f51067](https://github.com/symonbaikov/seneca/commit/0f51067680d815c381b1662b9fd6f027d4c4c0e6))
* **privacy:** dashboard, reports and forecast name no one else's private rows ([453061e](https://github.com/symonbaikov/seneca/commit/453061e134e38fc3ad505195cf14cfa303c8c193))
* **privacy:** keep private merchants out of merchant-keyed aggregates ([1b34c8b](https://github.com/symonbaikov/seneca/commit/1b34c8bdb419d10b152969fa0fb7cad572c8e264))
* **privacy:** private transactions stay hidden in file details, the statement and shared links ([9881ef2](https://github.com/symonbaikov/seneca/commit/9881ef2df6a1ff2b10e423fa7cac2fc84f7ef1dc))
* **privacy:** search, receipt picker, documents list and bill matching ([a209743](https://github.com/symonbaikov/seneca/commit/a209743cd62b4d3bd6fa72d95a47b4941b5535c3))
* **push:** egress-check push endpoints and stop endpoint takeover ([b782754](https://github.com/symonbaikov/seneca/commit/b7827549fc0d769f0e13cc31526811b2973adf83))
* **pwa:** bump service worker cache version, remove dead logo assets ([e05ed13](https://github.com/symonbaikov/seneca/commit/e05ed13062497e09bee739f504a0575a2f9491b8))
* **receipts:** edits to a draft scan reach the row Review shows ([5d4715d](https://github.com/symonbaikov/seneca/commit/5d4715d2bb96f0d5c34f8d0fb2fcc7667cdfcf4b))
* **receipts:** edits to a draft scan reach the row Review shows ([d28045c](https://github.com/symonbaikov/seneca/commit/d28045cc508232d005ba1265dd7b97f755598312))
* **receipts:** name thumbnail temp files server-side; deflake tamper test ([ddade95](https://github.com/symonbaikov/seneca/commit/ddade95d51ae675147331ed93679bfec2ccde6dd))
* **receipts:** only book receipts under the workspace's own categories ([daa544d](https://github.com/symonbaikov/seneca/commit/daa544d09362c84e2e518a3cbe47831c024fb50d))
* **receipts:** read the document date of scans and ask about each scan once ([ad85968](https://github.com/symonbaikov/seneca/commit/ad8596872b4955f1d1729e71ba5eb8b26fb9778e))
* **receipts:** read the document date of scans and ask about each scan once ([e83a6ed](https://github.com/symonbaikov/seneca/commit/e83a6ed58f8d168be32f29bd3c078cda58e00607))
* **reports:** documents read as printed, checked against real data ([8758ce6](https://github.com/symonbaikov/seneca/commit/8758ce6254f419052d550911b1f647e8a55e09a8))
* **reports:** honest rates, the reader's language and full rows in report templates ([d73a75c](https://github.com/symonbaikov/seneca/commit/d73a75ca315ec2d05403302aff9b64abcbbc015f))
* **reports:** keep generated report files per workspace ([2ad5818](https://github.com/symonbaikov/seneca/commit/2ad5818f07169922a576cdd771969446d80e384d))
* **reports:** pause schedules whose creator can no longer export ([0f2c1dd](https://github.com/symonbaikov/seneca/commit/0f2c1dd02ac8c5365b1af9c1d639dae0acdb6502))
* **review:** month-close steps count what Review lists ([9de2483](https://github.com/symonbaikov/seneca/commit/9de2483f33b59471631d2d23f9fa83b4716b482b))
* **security:** audit events show their actor as the person, not the account row ([589360a](https://github.com/symonbaikov/seneca/commit/589360a50dc1484f75e9846dbd02c8b610dfcc32))
* **security:** bound stored file paths to uploads, validate tax return queries ([aaa389e](https://github.com/symonbaikov/seneca/commit/aaa389e5cdf03d9838cf0c7224e03f12625c0da3))
* **security:** close CodeQL/Dependabot/Scorecard high alerts ([df376c1](https://github.com/symonbaikov/seneca/commit/df376c1c673d982bd3eab59e41d52baa83000f58))
* **security:** ids from a request are looked up in the caller's workspace ([5877064](https://github.com/symonbaikov/seneca/commit/58770642e42d85d893858927ce026bcbde3bdd77))
* **security:** inline the uploads bound in calculateFileHash so CodeQL sees it ([2d9b054](https://github.com/symonbaikov/seneca/commit/2d9b054f94a7ec7b244e21792dd89d6842250a64))
* **security:** statements, storage and report history stop handing out account rows and server paths ([20a4ae1](https://github.com/symonbaikov/seneca/commit/20a4ae13fa8d20859b254647b3332b9b53aaa179))
* **security:** stop handing out account rows and server paths on statements, storage and report history ([e9eb700](https://github.com/symonbaikov/seneca/commit/e9eb7009370b94523384a3891b083f54130bd311))
* **security:** tenant isolation and authorization fixes for GHSA-mqh6-5gc7-7rm2 ([d628905](https://github.com/symonbaikov/seneca/commit/d6289053d363b21f614d9b0040442051d7c57fd3))
* **settings:** refuse a local model path from the API, model upload instance-admin only ([0ee7639](https://github.com/symonbaikov/seneca/commit/0ee7639294b8eaeec866cce9f3d25ce6562b1d66))
* **shortcuts:** palette keeps focus and clicks, shortcuts close open drawers ([35959b5](https://github.com/symonbaikov/seneca/commit/35959b5bc42d52041b90a8514d79d391f1b6de93))
* **shortcuts:** palette keeps focus and clicks, shortcuts close open drawers ([69cf477](https://github.com/symonbaikov/seneca/commit/69cf4772d4f189c1f29bde0c138ce3edcd18ccf4))
* **statements:** check ids when converting a dropped sample ([c3bc18e](https://github.com/symonbaikov/seneca/commit/c3bc18e7acddb55e6ab7fae2935b4a43cbf3cfde))
* **statements:** strip NUL characters Postgres refuses ([cd3622f](https://github.com/symonbaikov/seneca/commit/cd3622f4a1406e82fc38d4db14a8bffc7e3f0d29))
* **statements:** strip NUL characters Postgres refuses ([680ac97](https://github.com/symonbaikov/seneca/commit/680ac97e604aeebf0449172c50c778358bc3f39e))
* **storage:** answer a file's category change without the statement row ([766d1ec](https://github.com/symonbaikov/seneca/commit/766d1ecba0bb22e4e0cc7a43294c2dbc83092854))
* **storage:** drop removed uploaders and send bulk delete through the trash ([9f0db61](https://github.com/symonbaikov/seneca/commit/9f0db61340520be624b49a3e7ce49ae792ff6ccd))
* **tax:** no private counterparties in returns, USt-VA, income tax, DATEV counts ([8dfb368](https://github.com/symonbaikov/seneca/commit/8dfb368d2fcb9adfd2fa00a7f42417078576103f))
* **tax:** threshold and settings answers in their contracts ([baaccab](https://github.com/symonbaikov/seneca/commit/baaccabbd3b825d4cb922bc3b2918608da0acd23))
* **telegram:** act for a chat only on the bot that serves its workspace ([bb06931](https://github.com/symonbaikov/seneca/commit/bb0693148004537ed22ce31ca33ccf83c2d37f22))
* **telegram:** send-report only to the caller's own connected chat ([03e05ea](https://github.com/symonbaikov/seneca/commit/03e05eafa1c26c39f69f9ce7a0bf3f4df4b25490))
* **telegram:** time out file lookups, downloads and callback answers ([55ee1ef](https://github.com/symonbaikov/seneca/commit/55ee1efb77fe232fab01c1e3163f7895c4a90263))
* **transactions:** redact private rows on every route that hands one back ([e6a0d3b](https://github.com/symonbaikov/seneca/commit/e6a0d3b25be979d8aa2a68d33279e53829e9040e))
* **ui:** dropdown menus fit their field, workspaces list scrolls, subscription dashes ([89ba1bc](https://github.com/symonbaikov/seneca/commit/89ba1bccda901fdcfa3e343e6faff86bcb908a01))
* **ui:** form control heights, cash-flow category filter dropdown, dark borders ([cc56cb4](https://github.com/symonbaikov/seneca/commit/cc56cb47263d0f42a1fdc16f00bc7403914cbea1))
* **users:** PUT /users/:id no longer changes the e-mail address ([904869b](https://github.com/symonbaikov/seneca/commit/904869b614f31bb7fca60453dfd48fc17dbb18e4))
* **webhooks:** an invoice closed by a credit note is announced as paid ([c3aa64a](https://github.com/symonbaikov/seneca/commit/c3aa64afefdbcca21776f64f07fe2103852d7ec6))
* **webhooks:** require INTEGRATION_MANAGE to manage subscriptions and endpoints ([38ee085](https://github.com/symonbaikov/seneca/commit/38ee08539e3a895a1960d2341f3150b96c07ee4e))
* **workspaces:** close owner-role invites, invitation replay and token exposure ([df8ece1](https://github.com/symonbaikov/seneca/commit/df8ece183cc39f1f8c84f8b3c026b067ba9833c0))
* **workspaces:** remember searched background photos and serve small previews ([0c7f786](https://github.com/symonbaikov/seneca/commit/0c7f786cec60d21ca078afd3c7ef3b06c25bc35b))
* **workspaces:** remember searched background photos and serve small previews ([1830c2d](https://github.com/symonbaikov/seneca/commit/1830c2ddcb370853dc21f76eac91962fc304f895))


### Performance Improvements

* **i18n:** ship only the current language's dictionaries to the browser ([8f66ae0](https://github.com/symonbaikov/seneca/commit/8f66ae0275a3ff87e48c9f2d84737f0a23833606))
* **i18n:** ship only the current language's dictionaries to the browser ([2fb1568](https://github.com/symonbaikov/seneca/commit/2fb1568ccbe6c404dcf955e9e86fabad19274a5e))

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
