# Gmail Receipts Parity with Statements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Привести Gmail-чеки к полной визуальной и функциональной идентичности с выписками в `Statements` (thumbnail, View flow, фильтры, merchant-поле, стабильные статусы без вечного `Processing...`).

**Architecture:** Делаем единый flow в `StatementsListView`: Gmail-чеки рендерятся тем же `StatementsListItem`, получают thumbnail через новый backend endpoint, открываются через тот же UX-паттерн детального просмотра, участвуют в фильтрах как first-class source с Gmail-иконкой, и используют merchant-first отображение.

**Tech Stack:** NestJS (backend), Next.js 14 + React + TypeScript (frontend), Tailwind, existing `generate-thumbnail.py` pipeline.

---

## Контекст проблемы

- В списке `Statements` Gmail-чеки отображаются не как выписки: нет настоящего thumbnail, другой клик-flow и деградирующий merchant-лейбл.
- В `merchant` колонке часто показывается длинный текст письма или `Page 1 of 1`, а не компания-списатель.
- `Processing...` может висеть бесконечно, т.к. сейчас признак обработки привязан к отсутствию `parsedData.vendor`, а не к реальному жизненному циклу статусов.
- Gmail-чеки выведены из общей фильтрации (частично исключаются из `applyStatementsFilters`).
- В фильтре `From` нет явного Gmail source с иконкой Gmail.

---

## Task 1: Backend endpoint для thumbnail Gmail-чеков

**Files:**
- Modify: `backend/src/modules/gmail/gmail.controller.ts`
- Modify: `backend/src/modules/gmail/gmail.module.ts` (если нужен импорт `CacheModule`/провайдеров)

**Step 1: Добавить endpoint `GET /integrations/gmail/receipts/:id/thumbnail`**

- Проверяет receipt по `id + userId`.
- Ищет первый PDF в `receipt.attachmentPaths`.
- Генерирует thumbnail тем же скриптом, что выписки (`backend/scripts/generate-thumbnail.py`, width=200).
- Возвращает `image/png`.
- Ошибки: `404` если receipt/PDF не найден, `503` при ошибке генерации.

**Step 2: Кэширование**

- Cache key: `receipts:thumbnail:{id}`.
- TTL успеха: 7 дней.
- TTL негативного ответа: 60 сек (чтобы не долбить генерацию).

**Step 3: Совместимость/безопасность**

- Никаких публичных URL, только через JWT guard текущего контроллера.
- Не использовать данные чужого пользователя.

**Step 4: Проверка вручную**

- `GET /integrations/gmail/receipts/:id/thumbnail` для receipt с PDF -> `200 image/png`.
- Для receipt без PDF -> `404`.

**Step 5: Commit**

```bash
git add backend/src/modules/gmail/gmail.controller.ts backend/src/modules/gmail/gmail.module.ts
git commit -m "feat(gmail): add receipt thumbnail endpoint"
```

---

## Task 2: Подключить thumbnail в общем списке Statements для Gmail

**Files:**
- Modify: `frontend/app/components/PDFThumbnail.tsx`
- Modify: `frontend/app/components/DocumentTypeIcon.tsx`
- Modify: `frontend/app/(main)/statements/components/StatementsListItem.tsx`

**Step 1: Расширить `PDFThumbnail` source-aware логикой**

- Добавить prop `source?: 'statement' | 'gmail'`.
- URL выбирать по source:
  - statement: `/statements/{id}/thumbnail`
  - gmail: `/integrations/gmail/receipts/{id}/thumbnail`

**Step 2: Прокинуть `source` в `DocumentTypeIcon`**

- Добавить prop `source`.
- При PDF передавать `source` в `PDFThumbnail`.

**Step 3: Убрать ветку без `fileId` для Gmail в `StatementsListItem`**

- Для Gmail тоже передавать `fileId={statement.id}`.
- Для Gmail нормализовать `fileType` к `pdf`, чтобы срабатывал thumbnail path.

**Step 4: Проверка вручную**

- В submit-списке Gmail-чеки показывают реальные миниатюры PDF, как выписки.
- При ошибке endpoint виден корректный fallback-иконка PDF.

**Step 5: Commit**

```bash
git add frontend/app/components/PDFThumbnail.tsx frontend/app/components/DocumentTypeIcon.tsx frontend/app/(main)/statements/components/StatementsListItem.tsx
git commit -m "feat(gmail): show pdf thumbnails in statements list"
```

---

## Task 3: Merchant-first отображение вместо длинного subject/snippet

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`

**Step 1: Обновить fallback-цепочку merchant для Gmail**

- Приоритет:
  1) `parsedData.vendor`
  2) sender display name (до `<...>`)
  3) сокращенный subject
  4) `'Gmail Receipt'`

**Step 2: Не показывать длинный текст письма в merchant колонке**

- Убедиться, что merchant-колонка не строится от full `subject/snippet` без тримминга.

**Step 3: Выравнивание визуала**

- Структура как у выписок: иконка + merchant label.

**Step 4: Проверка вручную**

- Для GitHub receipt отображается `GitHub` (или sender display name), а не длинный текст благодарности.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListView.tsx
git commit -m "fix(gmail): prioritize merchant name over long receipt description"
```

---

## Task 4: Убрать бесконечный `Processing...`

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts`

**Step 1: Исправить `isGmailReceiptProcessing` на статусную модель**

- Не опираться только на `!parsedData.vendor`.
- Считать processing только для реально незавершенных статусов (например `new`), а для `parsed/draft/needs_review/approved/rejected/failed` показывать финальный label.

**Step 2: Улучшить vendor extraction в parser**

- Исключить мусорные first-line паттерны (`Page 1 of 1`, `Receipt`, и т.п.).
- Добавить fallback на sender display name, если PDF-текст не дал merchant.

**Step 3: Проверка вручную**

- Старые чеки без vendor больше не зависают в `Processing...`.
- Новые чеки быстрее переходят к читаемому merchant label.

**Step 4: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListView.tsx backend/src/modules/gmail/services/gmail-receipt-parser.service.ts
git commit -m "fix(gmail): resolve stuck processing state for receipts"
```

---

## Task 5: Полная интеграция Gmail в фильтры + иконка Gmail

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Modify: `frontend/app/(main)/statements/components/filters/statement-filters.ts`
- Modify: `frontend/app/(main)/statements/components/filters/FromFilterDropdown.tsx`
- Modify: `frontend/app/(main)/statements/components/filters/FilterAvatarRow.tsx`

**Step 1: Type filter**

- Добавить опцию `gmail` в `typeOptions`.
- Убедиться, что Gmail entries имеют `fileType: 'gmail'` для корректного match.

**Step 2: From filter**

- Добавить source-опцию `Gmail` в `fromOptions`.
- В `FilterAvatarRow` добавить поддержку `iconUrl` для отображения `/icons/gmail.png`.

**Step 3: Убрать исключение Gmail из `displayStatements` фильтрации**

- Применять `applyStatementsFilters` к полному массиву `stagedStatements`.

**Step 4: Проверка вручную**

- `Type = Gmail` показывает только Gmail-чеки.
- `From = Gmail` работает и отображает Gmail-иконку.
- Комбинированные фильтры применяются к Gmail и обычным выпискам одинаково.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListView.tsx frontend/app/(main)/statements/components/filters/statement-filters.ts frontend/app/(main)/statements/components/filters/FromFilterDropdown.tsx frontend/app/(main)/statements/components/filters/FilterAvatarRow.tsx
git commit -m "feat(filters): include gmail receipts with gmail icon"
```

---

## Task 6: Идентичный `View` flow с выписками

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`
- Reuse: `frontend/app/storage/gmail-receipts/components/ReceiptDetailDrawer.tsx`

**Step 1: Вместо перехода на отдельную страницу открывать detail drawer из списка**

- В `handleView` для `source === 'gmail'` открывать drawer (локальный state `selectedReceiptId`).
- Не делать `router.push('/storage/gmail-receipts')`.

**Step 2: Клик по thumbnail/icon тоже открывает этот же drawer**

- Поведение должно быть консистентно с выписками: из списка пользователь получает immediate preview/details.

**Step 3: Красивый просмотр деталей парсинга**

- Использовать существующие табы `Overview / Parsed Data / History`.
- Проверить, что drawer после изменений выглядит аккуратно в desktop/mobile и не ломает layout.

**Step 4: Проверка вручную**

- Нажатие `View` на Gmail-чеках открывает детали без редиректа на отдельный broken-page сценарий.

**Step 5: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListView.tsx
git commit -m "feat(gmail): open receipt details inline from statements list"
```

---

## Task 7: UX полировка и единообразие row-layout

**Files:**
- Modify: `frontend/app/(main)/statements/components/StatementsListItem.tsx`
- Modify: `frontend/app/(main)/statements/components/StatementsListView.tsx`

**Step 1: Иконка Gmail в merchant колонке**

- Для Gmail использовать визуально сопоставимую аватарку/иконку (20px) рядом с merchant name.

**Step 2: Проверка columns alignment**

- Receipt / Type / Date / Merchant / Amount / Action должны быть по тем же width/spacing, что у выписок.

**Step 3: Проверка selection UX**

- Если продуктово нужно: включить одинаковый selection flow.
- Если Gmail intentionally non-selectable, оставить disabled, но визуально не ломать строку.

**Step 4: Commit**

```bash
git add frontend/app/(main)/statements/components/StatementsListItem.tsx frontend/app/(main)/statements/components/StatementsListView.tsx
git commit -m "style(gmail): align receipt row layout with statements"
```

---

## Тестирование и верификация

### Backend

- Проверить новый endpoint thumbnail (успех/404/503 сценарии).
- Проверить, что кэш работает (повторные запросы быстрее, без regen).

### Frontend

- `Submit` stage: Gmail-чеки рендерятся с thumbnail, merchant, amount, date в том же формате.
- `View` -> корректный detail drawer, tab navigation, preview attachment.
- Фильтры: `Type=Gmail`, `From=Gmail`, date, amount, keywords.
- Нет бесконечного `Processing...` на исторических данных.

### Команды

```bash
make lint
make test-frontend
make test-backend
```

---

## Acceptance Criteria

- Gmail-чеки в `Statements` визуально идентичны выпискам по структуре row и действиям.
- Thumbnail Gmail PDF доступен и кликабелен по тому же UX-паттерну.
- Нажатие `View` открывает стабильные детали парсинга без broken-page поведения.
- В merchant колонке отображается компания (vendor), а не длинное описание чека.
- Gmail появляется и корректно фильтруется в фильтрах (`Type`, `From`) с Gmail-иконкой.
- Проблема бесконечного `Processing...` устранена.

---

## Риски и mitigation

- **Риск:** attachment path отсутствует для старых receipts.  
  **Mitigation:** graceful 404 fallback + PDF icon fallback на фронте.

- **Риск:** `generate-thumbnail.py` недоступен в окружении.  
  **Mitigation:** 503 + короткий retry cache, логирование в controller.

- **Риск:** Изменение фильтрации затронет текущие пользовательские сохраненные фильтры.  
  **Mitigation:** не менять storage schema фильтров; только добавить новые значения.
