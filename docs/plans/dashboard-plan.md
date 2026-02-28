Ниже план реализации Dashboard как первого экрана. Я пишу так, чтобы ты мог сразу раздать таски себе или разработчику.

0) Цель и правило Dashboard

Цель: за 10 секунд ответить пользователю:
	•	что происходит
	•	что требует действий
	•	куда проваливаемся кликом

Правило: каждая карточка и блок ведёт в конкретный экран с фильтром.

⸻

1) Определить “источники правды” (данные)

Сейчас у тебя есть сущности типа:
	•	Statements (выписки/PDF)
	•	Receipts (чеки из Gmail + pdf/attachments)
	•	Operations/Transactions (строки операций)
	•	Work queue statuses (Submit / Approve / Pay)
	•	Categories / Merchants / Counterparties
	•	Tables (export tables)
	•	Payments (если делаешь Pay как отдельную сущность)

Нужно утвердить: какие KPI считаются по “transactions”, а какие по “documents”.

⸻

2) Состав Dashboard: блоки и метрики

A) Верхний ряд: Summary cards (4–6 штук)

Минимальный набор:
	1.	Total expense (за период)
	2.	Total income (за период)
	3.	Net flow (income - expense)
	4.	Transactions count
	5.	Unapproved cash count
	6.	Pay: pending / overdue count (если Pay включен)

Период: переключатель 7d / 30d / 90d (как в Reports).

Клики:
	•	Expense → Spend over time с фильтром type=Expense + период
	•	Unapproved cash → Unapproved cash
	•	Pay pending → Pay (status=pending)
	•	Overdue → Pay (status=overdue)

⸻

B) Action required (самый важный блок)

Список “что сделать”, максимум 5 строк:
	•	N statements need review (есть parsing warnings / flagged rows)
	•	N receipts missing category
	•	N duplicates found (если есть логика дублей)
	•	N unapproved cash items
	•	N pay items overdue / due soon

Каждая строка = ссылка на экран с готовым фильтром.

⸻

C) Cash flow график

Простой график по дням/неделям:
	•	income line
	•	expense line
Опционально: stacked bars по категориям, но позже.

Клик по точке/бару → список операций в этот день с фильтром.

⸻

D) Top blocks (2 колонки)
	1.	Top spenders (top 5) за период
	2.	Top categories (top 5) за период

Каждый элемент кликабельный → Statements/Operations список с фильтром merchant/category.

⸻

E) Recent activity (лента)

Последние 10 событий:
	•	uploaded statement
	•	parsed completed
	•	export table created
	•	category changed
	•	payment created/paid

Это можно брать из audit log, но в “человеческом” виде.

⸻

3) Логика периодов и таймзоны
	•	Везде единая таймзона: workspace timezone (или user).
	•	Период считаем по transaction date, не upload date (кроме блока “uploads trend”).

⸻

4) Backend: 1 агрегирующий endpoint

Сделай один endpoint, который отдаёт всё для Dashboard за выбранный период.

Пример:
GET /api/dashboard?workspaceId=...&range=30d

Ответ:
	•	summary: totals, counts
	•	actions: array {type, count, linkParams}
	•	timeseries: [{date, income, expense}]
	•	topMerchants: [{id, name, amount}]
	•	topCategories: [{id, name, amount}]
	•	recentActivity: [{type, title, ts, meta}]

Плюс: кеширование на 30–60 секунд или по key (workspace + range).

⸻

5) SQL/вычисления (что посчитать)

Summary
	•	sum(expense), sum(income) по transactions
	•	count(transactions)
	•	count(unapproved_cash)
	•	count(payments pending/overdue)

Actions
	•	statements_with_warnings: count(statement where parsingWarnings>0 and status in reviewable)
	•	transactions_without_category: count(transactions where category_id is null)
	•	duplicates: count(duplicate groups) или count(items flagged duplicate)
	•	unapproved_cash: count
	•	pay_overdue: count(payments where dueDate < today and status != paid)
	•	pay_due_soon: count(payments where dueDate between today..today+7)

Timeseries

group by day (если 7/30) или week (если 90)
	•	income sum
	•	expense sum

Top

group by merchant_id / category_id order by sum desc limit 5

Activity

Если есть audit log: нормализовать события в “feed”
Если нет: собрать из последних изменений в statement/receipt/transaction/payment.

⸻

6) Frontend: компоненты и UX

Layout
	•	Header: range switch + workspace selector (если нужно)
	•	Grid:
	•	Row1: SummaryCards
	•	Row2: ActionRequired (left) + QuickActions (right)
	•	Row3: Chart (full)
	•	Row4: TopMerchants + TopCategories
	•	Row5: RecentActivity

Loading states
	•	skeleton на cards
	•	chart placeholder
	•	empty state (“Upload your first statement”)

Empty state (важно)

Если данных нет:
	•	большой CTA “Upload statement”
	•	маленькие пункты “Connect Gmail”, “Connect Google Drive”
	•	показать “как это работает” 3 шага

⸻

7) Навигация и фильтры (чтобы всё вело куда надо)

Определи единый формат query params:
	•	type=expense|income
	•	range=30d
	•	categoryId=...
	•	merchantId=...
	•	status=...
	•	needsReview=true
	•	missingCategory=true

Dashboard формирует ссылки через эти параметры.

⸻

8) Роли (если планируешь)

MVP можно без ролей, но заложи:
	•	owner: видеть всё
	•	accountant: видеть review/approve/pay
	•	member: только submit

⸻

9) План работ по этапам (по-честному MVP)

Этап 1 (быстро, 2–4 дня)
	•	summary cards
	•	action required
	•	timeseries chart
	•	backend endpoint

Этап 2
	•	top merchants/categories
	•	recent activity
	•	нормальные empty states

Этап 3
	•	“Due soon / overdue” если Pay готов
	•	smart insights (аномалии, всплески)

⸻

10) Тест-кейсы
	•	пустой workspace
	•	только statements без categories
	•	multi-currency (если есть)
	•	timezone edge (переход дня)
	•	большое количество операций (пагинация не ломает агрегаты)
	•	дедупы (если включены)