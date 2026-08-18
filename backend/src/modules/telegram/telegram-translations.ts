/**
 * Message templates the Telegram bot sends, keyed by intent rather than
 * hardcoded per language. Mirrors insight-translations.ts /
 * notification-translations.ts: a key plus params, rendered in the
 * recipient's locale at send time.
 *
 * The recipient's locale comes from `User.locale` (their in-app language
 * choice) whenever a connected user is known. Before that — the very first
 * /start from someone we haven't matched to an account yet — there is no
 * stored preference, so callers fall back to Telegram's own
 * `message.from.language_code` and finally to 'ru'.
 */
export type TelegramMessageKey =
  | 'connected'
  | 'start_greeting'
  | 'unknown_command'
  | 'telegram_id_unknown'
  | 'user_not_connected'
  | 'report_failed'
  | 'document_telegram_id_unknown'
  | 'document_user_not_connected'
  | 'document_pdf_only'
  | 'document_received'
  | 'document_processed'
  | 'document_failed'
  | 'help'
  | 'daily_header'
  | 'income_line'
  | 'expense_line'
  | 'daily_total'
  | 'top_income_header'
  | 'top_expense_header'
  | 'list_item'
  | 'monthly_header'
  | 'monthly_income'
  | 'monthly_expense'
  | 'monthly_diff'
  | 'top_categories_header'
  | 'category_item'
  | 'top_counterparties_header'
  | 'counterparty_item'
  | 'goals_header'
  | 'goals_empty'
  | 'goal_item'
  | 'networth_header'
  | 'networth_change_up'
  | 'networth_change_down'
  | 'networth_change_no_percent'
  | 'networth_risky_warning'
  | 'insight_digest_header';

type TranslationMap = Record<TelegramMessageKey, string>;

const ru: TranslationMap = {
  connected: '✅ Telegram подключен. Мы будем отправлять отчёты в этот чат.',
  start_greeting:
    '👋 Привет! Твой Telegram ID: {{telegramId}}. Добавь его в настройках профиля, чтобы получать отчёты.',
  unknown_command: 'Неизвестная команда. Используйте /help для списка команд.',
  telegram_id_unknown: 'Не удалось определить ваш Telegram ID. Попробуйте позже.',
  user_not_connected:
    'Пользователь с Telegram ID {{telegramId}} не подключён. Укажите этот ID в настройках аккаунта.',
  report_failed: 'Не удалось отправить отчёт. Попробуйте позже.',
  document_telegram_id_unknown:
    '⚠️ Не удалось определить ваш Telegram ID. Отправьте /start и повторите.',
  document_user_not_connected:
    'Пользователь с Telegram ID {{telegramId}} не подключён. Укажите ID и chatId в настройках или вызовите /start, чтобы увидеть свой ID.',
  document_pdf_only: 'Поддерживаются только PDF-файлы выписок.',
  document_received: '📥 Файл получен, начинаем обработку...',
  document_processed:
    '✅ Файл принят и отправлен в обработку. Статус: {{status}}. Проверить результат можно в веб-интерфейсе Lumio.',
  document_failed:
    'Не удалось обработать файл. Попробуйте позже или загрузите через веб-интерфейс.',
  help: 'Доступные команды:\n/start — показать ваш Telegram ID и приветствие\n/help — эта подсказка\n/report — ежедневный отчёт за сегодня\n/report YYYY-MM-DD — отчёт за указанную дату\n/report monthly — отчёт за текущий месяц\n/goals — прогресс по целям накоплений\n/networth — текущие чистые активы',
  daily_header: '📅 Ежедневный отчёт — {{date}}',
  income_line: '➕ Приход: {{amount}} ({{count}})',
  expense_line: '➖ Расход: {{amount}} ({{count}})',
  daily_total: '📊 Итог дня: {{amount}}',
  top_income_header: 'Топ контрагентов по приходу:',
  top_expense_header: 'Топ категорий по расходу:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Отчёт за {{period}}',
  monthly_income: '➕ Приход: {{amount}}',
  monthly_expense: '➖ Расход: {{amount}}',
  monthly_diff: '📊 Разница: {{amount}} (операций: {{count}})',
  top_categories_header: 'Топ категорий расходов:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Топ контрагентов:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Цели накоплений',
  goals_empty: 'Целей пока нет. Создайте цель в веб-интерфейсе Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Чистые активы: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) за период',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) за период',
  networth_change_no_percent: 'Изменение за период: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% активов в среднем/высоком риске — выше порога {{threshold}}%',
  insight_digest_header: '🔔 Новое уведомление Lumio',
};

const en: TranslationMap = {
  connected: "✅ Telegram connected. We'll send reports to this chat.",
  start_greeting:
    '👋 Hi! Your Telegram ID: {{telegramId}}. Add it in your profile settings to start receiving reports.',
  unknown_command: 'Unknown command. Use /help to see the list of commands.',
  telegram_id_unknown: 'Could not determine your Telegram ID. Please try again later.',
  user_not_connected:
    'No account is connected to Telegram ID {{telegramId}}. Add this ID in your account settings.',
  report_failed: 'Could not send the report. Please try again later.',
  document_telegram_id_unknown:
    '⚠️ Could not determine your Telegram ID. Send /start and try again.',
  document_user_not_connected:
    'No account is connected to Telegram ID {{telegramId}}. Add the ID and chat ID in your settings, or send /start to see your ID.',
  document_pdf_only: 'Only PDF statement files are supported.',
  document_received: '📥 File received, processing has started...',
  document_processed:
    '✅ File accepted and queued for processing. Status: {{status}}. Check the result in the Lumio web app.',
  document_failed:
    'Could not process the file. Please try again later or upload it through the web app.',
  help: "Available commands:\n/start — show your Telegram ID and a welcome message\n/help — this help message\n/report — today's daily report\n/report YYYY-MM-DD — report for a specific date\n/report monthly — report for the current month\n/goals — progress on your savings goals\n/networth — your current net worth",
  daily_header: '📅 Daily report — {{date}}',
  income_line: '➕ Income: {{amount}} ({{count}})',
  expense_line: '➖ Expense: {{amount}} ({{count}})',
  daily_total: '📊 Day total: {{amount}}',
  top_income_header: 'Top counterparties by income:',
  top_expense_header: 'Top expense categories:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Report for {{period}}',
  monthly_income: '➕ Income: {{amount}}',
  monthly_expense: '➖ Expense: {{amount}}',
  monthly_diff: '📊 Difference: {{amount}} ({{count}} transactions)',
  top_categories_header: 'Top expense categories:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Top counterparties:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Savings goals',
  goals_empty: 'No goals yet. Create one in the Lumio web app.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Net worth: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) over the period',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) over the period',
  networth_change_no_percent: 'Change over the period: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% of assets are at medium/high risk — above the {{threshold}}% threshold',
  insight_digest_header: '🔔 New Lumio alert',
};

const kk: TranslationMap = {
  connected: '✅ Telegram қосылды. Осы чатқа есептер жібереміз.',
  start_greeting:
    '👋 Сәлем! Telegram ID-ің: {{telegramId}}. Есептерді алу үшін оны профиль баптауларында көрсет.',
  unknown_command: 'Белгісіз команда. Командалар тізімі үшін /help пайдаланыңыз.',
  telegram_id_unknown: 'Telegram ID-іңізді анықтау мүмкін болмады. Кейінірек қайталап көріңіз.',
  user_not_connected:
    'Telegram ID {{telegramId}} қосылған пайдаланушы жоқ. Бұл ID-ды тіркелгі баптауларында көрсетіңіз.',
  report_failed: 'Есепті жіберу мүмкін болмады. Кейінірек қайталап көріңіз.',
  document_telegram_id_unknown:
    '⚠️ Telegram ID-іңізді анықтау мүмкін болмады. /start жіберіп, қайталаңыз.',
  document_user_not_connected:
    'Telegram ID {{telegramId}} қосылған пайдаланушы жоқ. ID мен chatId-ды баптауларда көрсетіңіз немесе /start жіберіп ID-ыңызды көріңіз.',
  document_pdf_only: 'Тек PDF үзінді файлдары қолдау көрсетіледі.',
  document_received: '📥 Файл алынды, өңдеу басталды...',
  document_processed:
    '✅ Файл қабылданды және өңдеуге жіберілді. Күйі: {{status}}. Нәтижені Lumio веб-нұсқасында тексеруге болады.',
  document_failed:
    'Файлды өңдеу мүмкін болмады. Кейінірек қайталаңыз немесе веб-нұсқа арқылы жүктеңіз.',
  help: 'Қолжетімді командалар:\n/start — Telegram ID-іңізді және сәлемдесуді көрсету\n/help — осы анықтама\n/report — бүгінгі күндік есеп\n/report YYYY-MM-DD — көрсетілген күнгі есеп\n/report monthly — ағымдағы айдың есебі\n/goals — жинақтау мақсаттары бойынша прогресс\n/networth — ағымдағы таза активтер',
  daily_header: '📅 Күндік есеп — {{date}}',
  income_line: '➕ Кіріс: {{amount}} ({{count}})',
  expense_line: '➖ Шығыс: {{amount}} ({{count}})',
  daily_total: '📊 Күн қорытындысы: {{amount}}',
  top_income_header: 'Кіріс бойынша топ контрагенттер:',
  top_expense_header: 'Шығыс бойынша топ санаттар:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ {{period}} есебі',
  monthly_income: '➕ Кіріс: {{amount}}',
  monthly_expense: '➖ Шығыс: {{amount}}',
  monthly_diff: '📊 Айырма: {{amount}} (операциялар: {{count}})',
  top_categories_header: 'Шығыс санаттарының тізімі:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Топ контрагенттер:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Жинақтау мақсаттары',
  goals_empty: 'Әзірге мақсат жоқ. Lumio веб-нұсқасында мақсат жасаңыз.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Таза активтер: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) кезең ішінде',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) кезең ішінде',
  networth_change_no_percent: 'Кезең ішіндегі өзгеріс: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ Активтердің {{percent}}%-ы орташа/жоғары тәуекелде — {{threshold}}% шегінен жоғары',
  insight_digest_header: '🔔 Жаңа Lumio хабарламасы',
};

const de: TranslationMap = {
  connected: '✅ Telegram verbunden. Wir senden Berichte an diesen Chat.',
  start_greeting:
    '👋 Hallo! Deine Telegram-ID: {{telegramId}}. Trage sie in den Profileinstellungen ein, um Berichte zu erhalten.',
  unknown_command: 'Unbekannter Befehl. Verwende /help für die Befehlsliste.',
  telegram_id_unknown:
    'Deine Telegram-ID konnte nicht ermittelt werden. Bitte versuche es später erneut.',
  user_not_connected:
    'Kein Konto mit der Telegram-ID {{telegramId}} verbunden. Trage diese ID in den Kontoeinstellungen ein.',
  report_failed: 'Der Bericht konnte nicht gesendet werden. Bitte versuche es später erneut.',
  document_telegram_id_unknown:
    '⚠️ Deine Telegram-ID konnte nicht ermittelt werden. Sende /start und versuche es erneut.',
  document_user_not_connected:
    'Kein Konto mit der Telegram-ID {{telegramId}} verbunden. Trage ID und Chat-ID in den Einstellungen ein oder sende /start, um deine ID zu sehen.',
  document_pdf_only: 'Es werden nur PDF-Kontoauszüge unterstützt.',
  document_received: '📥 Datei empfangen, Verarbeitung hat begonnen...',
  document_processed:
    '✅ Datei akzeptiert und zur Verarbeitung eingereiht. Status: {{status}}. Das Ergebnis siehst du in der Lumio-Web-App.',
  document_failed:
    'Die Datei konnte nicht verarbeitet werden. Versuche es später erneut oder lade sie über die Web-App hoch.',
  help: 'Verfügbare Befehle:\n/start — zeigt deine Telegram-ID und eine Begrüßung\n/help — diese Hilfe\n/report — Tagesbericht für heute\n/report YYYY-MM-DD — Bericht für ein bestimmtes Datum\n/report monthly — Bericht für den aktuellen Monat\n/goals — Fortschritt deiner Sparziele\n/networth — dein aktuelles Nettovermögen',
  daily_header: '📅 Tagesbericht — {{date}}',
  income_line: '➕ Eingang: {{amount}} ({{count}})',
  expense_line: '➖ Ausgang: {{amount}} ({{count}})',
  daily_total: '📊 Tagesbilanz: {{amount}}',
  top_income_header: 'Top-Kontrahenten nach Eingang:',
  top_expense_header: 'Top-Ausgabenkategorien:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Bericht für {{period}}',
  monthly_income: '➕ Eingang: {{amount}}',
  monthly_expense: '➖ Ausgang: {{amount}}',
  monthly_diff: '📊 Differenz: {{amount}} ({{count}} Transaktionen)',
  top_categories_header: 'Top-Ausgabenkategorien:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Top-Kontrahenten:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Sparziele',
  goals_empty: 'Noch keine Ziele. Lege eines in der Lumio-Web-App an.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Nettovermögen: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) im Zeitraum',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) im Zeitraum',
  networth_change_no_percent: 'Änderung im Zeitraum: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% der Vermögenswerte sind mittleres/hohes Risiko — über der Grenze von {{threshold}}%',
  insight_digest_header: '🔔 Neuer Lumio-Hinweis',
};

const fr: TranslationMap = {
  connected: '✅ Telegram connecté. Nous enverrons les rapports dans ce chat.',
  start_greeting:
    '👋 Salut ! Votre ID Telegram : {{telegramId}}. Ajoutez-le dans les paramètres du profil pour recevoir des rapports.',
  unknown_command: 'Commande inconnue. Utilisez /help pour voir la liste des commandes.',
  telegram_id_unknown: 'Impossible de déterminer votre ID Telegram. Réessayez plus tard.',
  user_not_connected:
    "Aucun compte n'est lié à l'ID Telegram {{telegramId}}. Ajoutez cet ID dans les paramètres du compte.",
  report_failed: "Impossible d'envoyer le rapport. Réessayez plus tard.",
  document_telegram_id_unknown:
    '⚠️ Impossible de déterminer votre ID Telegram. Envoyez /start et réessayez.',
  document_user_not_connected:
    "Aucun compte n'est lié à l'ID Telegram {{telegramId}}. Ajoutez l'ID et le chat ID dans les paramètres, ou envoyez /start pour voir votre ID.",
  document_pdf_only: 'Seuls les fichiers de relevé PDF sont pris en charge.',
  document_received: '📥 Fichier reçu, le traitement a commencé...',
  document_processed:
    "✅ Fichier accepté et mis en file d'attente. Statut : {{status}}. Consultez le résultat dans l'application web Lumio.",
  document_failed:
    "Impossible de traiter le fichier. Réessayez plus tard ou téléversez-le via l'application web.",
  help: "Commandes disponibles :\n/start — affiche votre ID Telegram et un message de bienvenue\n/help — cette aide\n/report — rapport quotidien du jour\n/report YYYY-MM-DD — rapport pour une date précise\n/report monthly — rapport du mois en cours\n/goals — progression de vos objectifs d'épargne\n/networth — votre valeur nette actuelle",
  daily_header: '📅 Rapport quotidien — {{date}}',
  income_line: '➕ Entrées : {{amount}} ({{count}})',
  expense_line: '➖ Sorties : {{amount}} ({{count}})',
  daily_total: '📊 Total du jour : {{amount}}',
  top_income_header: 'Meilleurs contreparties par entrées :',
  top_expense_header: 'Principales catégories de dépenses :',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Rapport pour {{period}}',
  monthly_income: '➕ Entrées : {{amount}}',
  monthly_expense: '➖ Sorties : {{amount}}',
  monthly_diff: '📊 Différence : {{amount}} ({{count}} opérations)',
  top_categories_header: 'Principales catégories de dépenses :',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}} %)',
  top_counterparties_header: 'Meilleures contreparties :',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}} %)',
  goals_header: "🎯 Objectifs d'épargne",
  goals_empty: "Aucun objectif pour l'instant. Créez-en un dans l'application web Lumio.",
  goal_item: '{{name}} : {{current}} / {{target}} {{currency}} ({{percent}} %)',
  networth_header: '📈 Valeur nette : {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}} %) sur la période',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}} %) sur la période',
  networth_change_no_percent: 'Variation sur la période : {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% des actifs sont à risque moyen/élevé — au-delà du seuil de {{threshold}}%',
  insight_digest_header: '🔔 Nouvelle alerte Lumio',
};

const es: TranslationMap = {
  connected: '✅ Telegram conectado. Enviaremos los informes a este chat.',
  start_greeting:
    '👋 ¡Hola! Tu ID de Telegram: {{telegramId}}. Añádelo en la configuración del perfil para recibir informes.',
  unknown_command: 'Comando desconocido. Usa /help para ver la lista de comandos.',
  telegram_id_unknown: 'No se pudo determinar tu ID de Telegram. Inténtalo de nuevo más tarde.',
  user_not_connected:
    'Ninguna cuenta está conectada al ID de Telegram {{telegramId}}. Añade este ID en la configuración de la cuenta.',
  report_failed: 'No se pudo enviar el informe. Inténtalo de nuevo más tarde.',
  document_telegram_id_unknown:
    '⚠️ No se pudo determinar tu ID de Telegram. Envía /start e inténtalo de nuevo.',
  document_user_not_connected:
    'Ninguna cuenta está conectada al ID de Telegram {{telegramId}}. Añade el ID y el chat ID en la configuración, o envía /start para ver tu ID.',
  document_pdf_only: 'Solo se admiten archivos de extracto en PDF.',
  document_received: '📥 Archivo recibido, el procesamiento ha comenzado...',
  document_processed:
    '✅ Archivo aceptado y en cola de procesamiento. Estado: {{status}}. Revisa el resultado en la aplicación web de Lumio.',
  document_failed:
    'No se pudo procesar el archivo. Inténtalo de nuevo más tarde o súbelo desde la aplicación web.',
  help: 'Comandos disponibles:\n/start — muestra tu ID de Telegram y un mensaje de bienvenida\n/help — esta ayuda\n/report — informe diario de hoy\n/report YYYY-MM-DD — informe de una fecha concreta\n/report monthly — informe del mes actual\n/goals — progreso de tus metas de ahorro\n/networth — tu patrimonio neto actual',
  daily_header: '📅 Informe diario — {{date}}',
  income_line: '➕ Ingresos: {{amount}} ({{count}})',
  expense_line: '➖ Gastos: {{amount}} ({{count}})',
  daily_total: '📊 Total del día: {{amount}}',
  top_income_header: 'Principales contrapartes por ingresos:',
  top_expense_header: 'Principales categorías de gasto:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Informe de {{period}}',
  monthly_income: '➕ Ingresos: {{amount}}',
  monthly_expense: '➖ Gastos: {{amount}}',
  monthly_diff: '📊 Diferencia: {{amount}} ({{count}} operaciones)',
  top_categories_header: 'Principales categorías de gasto:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Principales contrapartes:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Metas de ahorro',
  goals_empty: 'Aún no hay metas. Crea una en la aplicación web de Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Patrimonio neto: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) en el periodo',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) en el periodo',
  networth_change_no_percent: 'Cambio en el periodo: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ El {{percent}}% de los activos está en riesgo medio/alto — por encima del umbral del {{threshold}}%',
  insight_digest_header: '🔔 Nueva alerta de Lumio',
};

const pt: TranslationMap = {
  connected: '✅ Telegram conectado. Enviaremos os relatórios para este chat.',
  start_greeting:
    '👋 Olá! O seu ID do Telegram: {{telegramId}}. Adicione-o nas definições do perfil para receber relatórios.',
  unknown_command: 'Comando desconhecido. Use /help para ver a lista de comandos.',
  telegram_id_unknown:
    'Não foi possível determinar o seu ID do Telegram. Tente novamente mais tarde.',
  user_not_connected:
    'Nenhuma conta está ligada ao ID do Telegram {{telegramId}}. Adicione este ID nas definições da conta.',
  report_failed: 'Não foi possível enviar o relatório. Tente novamente mais tarde.',
  document_telegram_id_unknown:
    '⚠️ Não foi possível determinar o seu ID do Telegram. Envie /start e tente novamente.',
  document_user_not_connected:
    'Nenhuma conta está ligada ao ID do Telegram {{telegramId}}. Adicione o ID e o chat ID nas definições, ou envie /start para ver o seu ID.',
  document_pdf_only: 'Apenas ficheiros PDF de extrato são suportados.',
  document_received: '📥 Ficheiro recebido, o processamento começou...',
  document_processed:
    '✅ Ficheiro aceite e na fila de processamento. Estado: {{status}}. Verifique o resultado na aplicação web do Lumio.',
  document_failed:
    'Não foi possível processar o ficheiro. Tente novamente mais tarde ou carregue-o através da aplicação web.',
  help: 'Comandos disponíveis:\n/start — mostra o seu ID do Telegram e uma mensagem de boas-vindas\n/help — esta ajuda\n/report — relatório diário de hoje\n/report YYYY-MM-DD — relatório de uma data específica\n/report monthly — relatório do mês atual\n/goals — progresso das suas metas de poupança\n/networth — o seu património líquido atual',
  daily_header: '📅 Relatório diário — {{date}}',
  income_line: '➕ Receitas: {{amount}} ({{count}})',
  expense_line: '➖ Despesas: {{amount}} ({{count}})',
  daily_total: '📊 Total do dia: {{amount}}',
  top_income_header: 'Principais contrapartes por receita:',
  top_expense_header: 'Principais categorias de despesa:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Relatório de {{period}}',
  monthly_income: '➕ Receitas: {{amount}}',
  monthly_expense: '➖ Despesas: {{amount}}',
  monthly_diff: '📊 Diferença: {{amount}} ({{count}} operações)',
  top_categories_header: 'Principais categorias de despesa:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Principais contrapartes:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Objetivos de poupança',
  goals_empty: 'Ainda sem objetivos. Crie um na aplicação web do Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Património líquido: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) no período',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) no período',
  networth_change_no_percent: 'Variação no período: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% dos ativos estão em risco médio/alto — acima do limite de {{threshold}}%',
  insight_digest_header: '🔔 Novo alerta do Lumio',
};

const tr: TranslationMap = {
  connected: '✅ Telegram bağlandı. Raporları bu sohbete göndereceğiz.',
  start_greeting:
    "👋 Merhaba! Telegram ID'niz: {{telegramId}}. Rapor almak için bunu profil ayarlarına ekleyin.",
  unknown_command: 'Bilinmeyen komut. Komut listesi için /help kullanın.',
  telegram_id_unknown: "Telegram ID'niz belirlenemedi. Lütfen daha sonra tekrar deneyin.",
  user_not_connected:
    "Telegram ID {{telegramId}} ile bağlı bir hesap yok. Bu ID'yi hesap ayarlarına ekleyin.",
  report_failed: 'Rapor gönderilemedi. Lütfen daha sonra tekrar deneyin.',
  document_telegram_id_unknown: "⚠️ Telegram ID'niz belirlenemedi. /start gönderip tekrar deneyin.",
  document_user_not_connected:
    "Telegram ID {{telegramId}} ile bağlı bir hesap yok. ID ve sohbet ID'sini ayarlara ekleyin veya ID'nizi görmek için /start gönderin.",
  document_pdf_only: 'Yalnızca PDF ekstre dosyaları desteklenir.',
  document_received: '📥 Dosya alındı, işleme başladı...',
  document_processed:
    '✅ Dosya kabul edildi ve işleme alındı. Durum: {{status}}. Sonucu Lumio web uygulamasında kontrol edebilirsiniz.',
  document_failed:
    'Dosya işlenemedi. Lütfen daha sonra tekrar deneyin veya web uygulamasından yükleyin.',
  help: "Kullanılabilir komutlar:\n/start — Telegram ID'nizi ve bir karşılama mesajı gösterir\n/help — bu yardım\n/report — bugünün günlük raporu\n/report YYYY-MM-DD — belirli bir tarihin raporu\n/report monthly — geçerli ayın raporu\n/goals — birikim hedeflerinizdeki ilerleme\n/networth — güncel net değeriniz",
  daily_header: '📅 Günlük rapor — {{date}}',
  income_line: '➕ Gelir: {{amount}} ({{count}})',
  expense_line: '➖ Gider: {{amount}} ({{count}})',
  daily_total: '📊 Gün toplamı: {{amount}}',
  top_income_header: 'Gelire göre en iyi karşı taraflar:',
  top_expense_header: 'En yüksek gider kategorileri:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ {{period}} raporu',
  monthly_income: '➕ Gelir: {{amount}}',
  monthly_expense: '➖ Gider: {{amount}}',
  monthly_diff: '📊 Fark: {{amount}} ({{count}} işlem)',
  top_categories_header: 'En yüksek gider kategorileri:',
  category_item: '{{index}}. {{name}} — {{amount}} (%{{percent}})',
  top_counterparties_header: 'En iyi karşı taraflar:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} (%{{percent}})',
  goals_header: '🎯 Birikim hedefleri',
  goals_empty: 'Henüz hedef yok. Lumio web uygulamasında bir tane oluşturun.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} (%{{percent}})',
  networth_header: '📈 Net değer: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+%{{percent}}) dönem içinde',
  networth_change_down: '▼ {{amount}} {{currency}} (%{{percent}}) dönem içinde',
  networth_change_no_percent: 'Dönem içindeki değişim: {{amount}} {{currency}}',
  networth_risky_warning:
    "⚠️ Varlıkların %{{percent}}'i orta/yüksek riskte — %{{threshold}} eşiğinin üzerinde",
  insight_digest_header: '🔔 Yeni Lumio uyarısı',
};

const uk: TranslationMap = {
  connected: '✅ Telegram підключено. Надсилатимемо звіти в цей чат.',
  start_greeting:
    '👋 Привіт! Твій Telegram ID: {{telegramId}}. Додай його в налаштуваннях профілю, щоб отримувати звіти.',
  unknown_command: 'Невідома команда. Використайте /help для списку команд.',
  telegram_id_unknown: 'Не вдалося визначити ваш Telegram ID. Спробуйте пізніше.',
  user_not_connected:
    'Немає акаунта, підключеного до Telegram ID {{telegramId}}. Додайте цей ID у налаштуваннях акаунта.',
  report_failed: 'Не вдалося надіслати звіт. Спробуйте пізніше.',
  document_telegram_id_unknown:
    '⚠️ Не вдалося визначити ваш Telegram ID. Надішліть /start і спробуйте ще раз.',
  document_user_not_connected:
    'Немає акаунта, підключеного до Telegram ID {{telegramId}}. Додайте ID і chatId у налаштуваннях або надішліть /start, щоб побачити свій ID.',
  document_pdf_only: 'Підтримуються лише PDF-файли виписок.',
  document_received: '📥 Файл отримано, обробку розпочато...',
  document_processed:
    '✅ Файл прийнято та надіслано на обробку. Статус: {{status}}. Перевірити результат можна у веб-додатку Lumio.',
  document_failed: 'Не вдалося обробити файл. Спробуйте пізніше або завантажте через веб-додаток.',
  help: 'Доступні команди:\n/start — показати ваш Telegram ID і привітання\n/help — ця довідка\n/report — щоденний звіт за сьогодні\n/report YYYY-MM-DD — звіт за вказану дату\n/report monthly — звіт за поточний місяць\n/goals — прогрес за цілями накопичень\n/networth — поточні чисті активи',
  daily_header: '📅 Щоденний звіт — {{date}}',
  income_line: '➕ Надходження: {{amount}} ({{count}})',
  expense_line: '➖ Витрати: {{amount}} ({{count}})',
  daily_total: '📊 Підсумок дня: {{amount}}',
  top_income_header: 'Топ контрагентів за надходженнями:',
  top_expense_header: 'Топ категорій витрат:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Звіт за {{period}}',
  monthly_income: '➕ Надходження: {{amount}}',
  monthly_expense: '➖ Витрати: {{amount}}',
  monthly_diff: '📊 Різниця: {{amount}} (операцій: {{count}})',
  top_categories_header: 'Топ категорій витрат:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Топ контрагентів:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Цілі накопичень',
  goals_empty: 'Цілей поки немає. Створіть ціль у веб-додатку Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Чисті активи: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) за період',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) за період',
  networth_change_no_percent: 'Зміна за період: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% активів у середньому/високому ризику — понад поріг {{threshold}}%',
  insight_digest_header: '🔔 Нове сповіщення Lumio',
};

const zh: TranslationMap = {
  connected: '✅ Telegram 已连接。我们会将报告发送到此聊天。',
  start_greeting: '👋 你好！你的 Telegram ID：{{telegramId}}。请在个人资料设置中添加它以接收报告。',
  unknown_command: '未知命令。使用 /help 查看命令列表。',
  telegram_id_unknown: '无法确定你的 Telegram ID。请稍后再试。',
  user_not_connected: '没有账号关联到 Telegram ID {{telegramId}}。请在账号设置中添加此 ID。',
  report_failed: '无法发送报告。请稍后再试。',
  document_telegram_id_unknown: '⚠️ 无法确定你的 Telegram ID。请发送 /start 后重试。',
  document_user_not_connected:
    '没有账号关联到 Telegram ID {{telegramId}}。请在设置中添加 ID 和 chat ID，或发送 /start 查看你的 ID。',
  document_pdf_only: '仅支持 PDF 格式的对账单文件。',
  document_received: '📥 已收到文件，正在开始处理……',
  document_processed:
    '✅ 文件已接受并加入处理队列。状态：{{status}}。可在 Lumio 网页应用中查看结果。',
  document_failed: '无法处理该文件。请稍后重试，或通过网页应用上传。',
  help: '可用命令：\n/start — 显示你的 Telegram ID 和欢迎语\n/help — 本帮助信息\n/report — 今日的每日报告\n/report YYYY-MM-DD — 指定日期的报告\n/report monthly — 本月报告\n/goals — 储蓄目标进度\n/networth — 当前净资产',
  daily_header: '📅 每日报告 — {{date}}',
  income_line: '➕ 收入：{{amount}}（{{count}}）',
  expense_line: '➖ 支出：{{amount}}（{{count}}）',
  daily_total: '📊 当日合计：{{amount}}',
  top_income_header: '按收入排名的主要往来方：',
  top_expense_header: '主要支出类别：',
  list_item: '{{index}}. {{name}} — {{amount}}（{{count}}）',
  monthly_header: '🗓️ {{period}} 报告',
  monthly_income: '➕ 收入：{{amount}}',
  monthly_expense: '➖ 支出：{{amount}}',
  monthly_diff: '📊 差额：{{amount}}（{{count}} 笔交易）',
  top_categories_header: '支出类别排行：',
  category_item: '{{index}}. {{name}} — {{amount}}（{{percent}}%）',
  top_counterparties_header: '主要往来方：',
  counterparty_item: '{{index}}. {{name}} — {{amount}}（{{percent}}%）',
  goals_header: '🎯 储蓄目标',
  goals_empty: '还没有目标。请在 Lumio 网页应用中创建一个。',
  goal_item: '{{name}}：{{current}} / {{target}} {{currency}}（{{percent}}%）',
  networth_header: '📈 净资产：{{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}}（+{{percent}}%）本期',
  networth_change_down: '▼ {{amount}} {{currency}}（{{percent}}%）本期',
  networth_change_no_percent: '本期变化：{{amount}} {{currency}}',
  networth_risky_warning: '⚠️ {{percent}}% 的资产处于中/高风险 — 超过 {{threshold}}% 的阈值',
  insight_digest_header: '🔔 Lumio 新提醒',
};

const ar: TranslationMap = {
  connected: '✅ تم ربط Telegram. سنرسل التقارير إلى هذه المحادثة.',
  start_greeting:
    '👋 مرحبًا! معرّف Telegram الخاص بك: {{telegramId}}. أضفه في إعدادات الملف الشخصي لتلقي التقارير.',
  unknown_command: 'أمر غير معروف. استخدم /help لعرض قائمة الأوامر.',
  telegram_id_unknown: 'تعذّر تحديد معرّف Telegram الخاص بك. حاول مرة أخرى لاحقًا.',
  user_not_connected:
    'لا يوجد حساب مرتبط بمعرّف Telegram {{telegramId}}. أضف هذا المعرّف في إعدادات الحساب.',
  report_failed: 'تعذّر إرسال التقرير. حاول مرة أخرى لاحقًا.',
  document_telegram_id_unknown: '⚠️ تعذّر تحديد معرّف Telegram الخاص بك. أرسل /start وحاول مرة أخرى.',
  document_user_not_connected:
    'لا يوجد حساب مرتبط بمعرّف Telegram {{telegramId}}. أضف المعرّف ومعرّف المحادثة في الإعدادات، أو أرسل /start لرؤية معرّفك.',
  document_pdf_only: 'يتم دعم ملفات كشف الحساب بصيغة PDF فقط.',
  document_received: '📥 تم استلام الملف، بدأت المعالجة...',
  document_processed:
    '✅ تم قبول الملف وإدراجه في قائمة المعالجة. الحالة: {{status}}. تحقق من النتيجة في تطبيق Lumio على الويب.',
  document_failed: 'تعذّرت معالجة الملف. حاول مرة أخرى لاحقًا أو ارفعه عبر تطبيق الويب.',
  help: 'الأوامر المتاحة:\n/start — إظهار معرّف Telegram الخاص بك ورسالة ترحيب\n/help — هذه المساعدة\n/report — التقرير اليومي لليوم\n/report YYYY-MM-DD — تقرير لتاريخ محدد\n/report monthly — تقرير الشهر الحالي\n/goals — تقدّم أهداف الادخار\n/networth — صافي ثروتك الحالي',
  daily_header: '📅 التقرير اليومي — {{date}}',
  income_line: '➕ الدخل: {{amount}} ({{count}})',
  expense_line: '➖ المصروفات: {{amount}} ({{count}})',
  daily_total: '📊 إجمالي اليوم: {{amount}}',
  top_income_header: 'أفضل الأطراف المقابلة حسب الدخل:',
  top_expense_header: 'أعلى فئات المصروفات:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ تقرير {{period}}',
  monthly_income: '➕ الدخل: {{amount}}',
  monthly_expense: '➖ المصروفات: {{amount}}',
  monthly_diff: '📊 الفرق: {{amount}} ({{count}} معاملة)',
  top_categories_header: 'أعلى فئات المصروفات:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'أفضل الأطراف المقابلة:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 أهداف الادخار',
  goals_empty: 'لا توجد أهداف بعد. أنشئ هدفًا في تطبيق Lumio على الويب.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 صافي الثروة: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) خلال الفترة',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) خلال الفترة',
  networth_change_no_percent: 'التغيّر خلال الفترة: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% من الأصول في مخاطرة متوسطة/عالية — أعلى من حد {{threshold}}%',
  insight_digest_header: '🔔 تنبيه Lumio جديد',
};

const pl: TranslationMap = {
  connected: '✅ Telegram połączony. Będziemy wysyłać raporty na ten czat.',
  start_greeting:
    '👋 Cześć! Twój Telegram ID: {{telegramId}}. Dodaj go w ustawieniach profilu, aby otrzymywać raporty.',
  unknown_command: 'Nieznane polecenie. Użyj /help, aby zobaczyć listę poleceń.',
  telegram_id_unknown: 'Nie udało się ustalić Twojego Telegram ID. Spróbuj ponownie później.',
  user_not_connected:
    'Żadne konto nie jest połączone z Telegram ID {{telegramId}}. Dodaj ten ID w ustawieniach konta.',
  report_failed: 'Nie udało się wysłać raportu. Spróbuj ponownie później.',
  document_telegram_id_unknown:
    '⚠️ Nie udało się ustalić Twojego Telegram ID. Wyślij /start i spróbuj ponownie.',
  document_user_not_connected:
    'Żadne konto nie jest połączone z Telegram ID {{telegramId}}. Dodaj ID i chat ID w ustawieniach lub wyślij /start, aby zobaczyć swój ID.',
  document_pdf_only: 'Obsługiwane są tylko pliki wyciągów w formacie PDF.',
  document_received: '📥 Plik otrzymany, rozpoczęto przetwarzanie...',
  document_processed:
    '✅ Plik zaakceptowany i skierowany do przetwarzania. Status: {{status}}. Wynik sprawdzisz w aplikacji webowej Lumio.',
  document_failed:
    'Nie udało się przetworzyć pliku. Spróbuj ponownie później lub prześlij go przez aplikację webową.',
  help: 'Dostępne polecenia:\n/start — pokaż Twój Telegram ID i powitanie\n/help — ta pomoc\n/report — dzienny raport na dziś\n/report YYYY-MM-DD — raport za wskazaną datę\n/report monthly — raport za bieżący miesiąc\n/goals — postęp celów oszczędnościowych\n/networth — Twoja aktualna wartość netto',
  daily_header: '📅 Raport dzienny — {{date}}',
  income_line: '➕ Przychód: {{amount}} ({{count}})',
  expense_line: '➖ Wydatki: {{amount}} ({{count}})',
  daily_total: '📊 Podsumowanie dnia: {{amount}}',
  top_income_header: 'Najlepsi kontrahenci wg przychodu:',
  top_expense_header: 'Najlepsze kategorie wydatków:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Raport za {{period}}',
  monthly_income: '➕ Przychód: {{amount}}',
  monthly_expense: '➖ Wydatki: {{amount}}',
  monthly_diff: '📊 Różnica: {{amount}} ({{count}} operacji)',
  top_categories_header: 'Najlepsze kategorie wydatków:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Najlepsi kontrahenci:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Cele oszczędnościowe',
  goals_empty: 'Brak celów. Utwórz jeden w aplikacji webowej Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Wartość netto: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) w tym okresie',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) w tym okresie',
  networth_change_no_percent: 'Zmiana w okresie: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% aktywów jest w średnim/wysokim ryzyku — powyżej progu {{threshold}}%',
  insight_digest_header: '🔔 Nowy alert Lumio',
};

const it: TranslationMap = {
  connected: '✅ Telegram collegato. Invieremo i report in questa chat.',
  start_greeting:
    '👋 Ciao! Il tuo ID Telegram: {{telegramId}}. Aggiungilo nelle impostazioni del profilo per ricevere i report.',
  unknown_command: "Comando sconosciuto. Usa /help per l'elenco dei comandi.",
  telegram_id_unknown: 'Impossibile determinare il tuo ID Telegram. Riprova più tardi.',
  user_not_connected:
    "Nessun account è collegato all'ID Telegram {{telegramId}}. Aggiungi questo ID nelle impostazioni dell'account.",
  report_failed: 'Impossibile inviare il report. Riprova più tardi.',
  document_telegram_id_unknown:
    '⚠️ Impossibile determinare il tuo ID Telegram. Invia /start e riprova.',
  document_user_not_connected:
    "Nessun account è collegato all'ID Telegram {{telegramId}}. Aggiungi ID e chat ID nelle impostazioni, oppure invia /start per vedere il tuo ID.",
  document_pdf_only: 'Sono supportati solo i file PDF degli estratti conto.',
  document_received: '📥 File ricevuto, elaborazione avviata...',
  document_processed:
    "✅ File accettato e messo in coda per l'elaborazione. Stato: {{status}}. Controlla il risultato nell'app web di Lumio.",
  document_failed:
    "Impossibile elaborare il file. Riprova più tardi oppure caricalo tramite l'app web.",
  help: 'Comandi disponibili:\n/start — mostra il tuo ID Telegram e un messaggio di benvenuto\n/help — questo aiuto\n/report — report giornaliero di oggi\n/report YYYY-MM-DD — report per una data specifica\n/report monthly — report del mese corrente\n/goals — avanzamento dei tuoi obiettivi di risparmio\n/networth — il tuo patrimonio netto attuale',
  daily_header: '📅 Report giornaliero — {{date}}',
  income_line: '➕ Entrate: {{amount}} ({{count}})',
  expense_line: '➖ Uscite: {{amount}} ({{count}})',
  daily_total: '📊 Totale giornaliero: {{amount}}',
  top_income_header: 'Migliori controparti per entrate:',
  top_expense_header: 'Principali categorie di spesa:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Report di {{period}}',
  monthly_income: '➕ Entrate: {{amount}}',
  monthly_expense: '➖ Uscite: {{amount}}',
  monthly_diff: '📊 Differenza: {{amount}} ({{count}} operazioni)',
  top_categories_header: 'Principali categorie di spesa:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Migliori controparti:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Obiettivi di risparmio',
  goals_empty: "Nessun obiettivo ancora. Creane uno nell'app web di Lumio.",
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Patrimonio netto: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) nel periodo',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) nel periodo',
  networth_change_no_percent: 'Variazione nel periodo: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ Il {{percent}}% degli attivi è a rischio medio/alto — oltre la soglia del {{threshold}}%',
  insight_digest_header: '🔔 Nuovo avviso Lumio',
};

const sk: TranslationMap = {
  connected: '✅ Telegram pripojený. Správy budeme posielať do tohto chatu.',
  start_greeting:
    '👋 Ahoj! Tvoje Telegram ID: {{telegramId}}. Pridaj ho v nastaveniach profilu, aby si dostával správy.',
  unknown_command: 'Neznámy príkaz. Použi /help pre zoznam príkazov.',
  telegram_id_unknown: 'Nepodarilo sa zistiť tvoje Telegram ID. Skús to neskôr.',
  user_not_connected:
    'Žiadny účet nie je prepojený s Telegram ID {{telegramId}}. Pridaj toto ID v nastaveniach účtu.',
  report_failed: 'Správu sa nepodarilo odoslať. Skús to neskôr.',
  document_telegram_id_unknown:
    '⚠️ Nepodarilo sa zistiť tvoje Telegram ID. Pošli /start a skús znova.',
  document_user_not_connected:
    'Žiadny účet nie je prepojený s Telegram ID {{telegramId}}. Pridaj ID a chat ID v nastaveniach, alebo pošli /start pre zobrazenie svojho ID.',
  document_pdf_only: 'Podporované sú iba PDF súbory výpisov.',
  document_received: '📥 Súbor prijatý, spracovanie sa začalo...',
  document_processed:
    '✅ Súbor prijatý a zaradený na spracovanie. Stav: {{status}}. Výsledok skontroluješ vo webovej aplikácii Lumio.',
  document_failed:
    'Súbor sa nepodarilo spracovať. Skús to neskôr, alebo ho nahraj cez webovú aplikáciu.',
  help: 'Dostupné príkazy:\n/start — zobrazí tvoje Telegram ID a uvítanie\n/help — táto pomoc\n/report — denná správa za dnešok\n/report YYYY-MM-DD — správa za zadaný dátum\n/report monthly — správa za aktuálny mesiac\n/goals — pokrok v sporiacich cieľoch\n/networth — tvoje aktuálne čisté imanie',
  daily_header: '📅 Denná správa — {{date}}',
  income_line: '➕ Príjem: {{amount}} ({{count}})',
  expense_line: '➖ Výdavok: {{amount}} ({{count}})',
  daily_total: '📊 Súhrn dňa: {{amount}}',
  top_income_header: 'Najlepší partneri podľa príjmu:',
  top_expense_header: 'Najvyššie kategórie výdavkov:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Správa za {{period}}',
  monthly_income: '➕ Príjem: {{amount}}',
  monthly_expense: '➖ Výdavok: {{amount}}',
  monthly_diff: '📊 Rozdiel: {{amount}} ({{count}} operácií)',
  top_categories_header: 'Najvyššie kategórie výdavkov:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}} %)',
  top_counterparties_header: 'Najlepší partneri:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}} %)',
  goals_header: '🎯 Sporiace ciele',
  goals_empty: 'Zatiaľ žiadne ciele. Vytvor jeden vo webovej aplikácii Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}} %)',
  networth_header: '📈 Čisté imanie: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}} %) za obdobie',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}} %) za obdobie',
  networth_change_no_percent: 'Zmena za obdobie: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% aktív je v strednom/vysokom riziku — nad hranicou {{threshold}}%',
  insight_digest_header: '🔔 Nové upozornenie Lumio',
};

const ja: TranslationMap = {
  connected: '✅ Telegramが接続されました。このチャットにレポートを送信します。',
  start_greeting:
    '👋 こんにちは！あなたのTelegram ID：{{telegramId}}。レポートを受け取るにはプロフィール設定に追加してください。',
  unknown_command: '不明なコマンドです。コマンド一覧は/helpをご利用ください。',
  telegram_id_unknown:
    'Telegram IDを確認できませんでした。しばらくしてからもう一度お試しください。',
  user_not_connected:
    'Telegram ID {{telegramId}} に紐づくアカウントがありません。アカウント設定でこのIDを追加してください。',
  report_failed: 'レポートを送信できませんでした。しばらくしてからもう一度お試しください。',
  document_telegram_id_unknown:
    '⚠️ Telegram IDを確認できませんでした。/start を送信してからもう一度お試しください。',
  document_user_not_connected:
    'Telegram ID {{telegramId}} に紐づくアカウントがありません。設定でIDとチャットIDを追加するか、/start を送信してIDを確認してください。',
  document_pdf_only: '対応しているのはPDF形式の明細書ファイルのみです。',
  document_received: '📥 ファイルを受信しました。処理を開始しています…',
  document_processed:
    '✅ ファイルを受け付け、処理キューに追加しました。ステータス：{{status}}。結果はLumioのWebアプリでご確認ください。',
  document_failed:
    'ファイルを処理できませんでした。しばらくしてから再試行するか、Webアプリからアップロードしてください。',
  help: '利用可能なコマンド:\n/start — あなたのTelegram IDと挨拶を表示\n/help — このヘルプ\n/report — 本日の日次レポート\n/report YYYY-MM-DD — 指定日のレポート\n/report monthly — 今月のレポート\n/goals — 貯蓄目標の進捗\n/networth — 現在の純資産',
  daily_header: '📅 日次レポート — {{date}}',
  income_line: '➕ 収入：{{amount}}（{{count}}件）',
  expense_line: '➖ 支出：{{amount}}（{{count}}件）',
  daily_total: '📊 本日の合計：{{amount}}',
  top_income_header: '収入トップの取引先:',
  top_expense_header: '支出トップのカテゴリ:',
  list_item: '{{index}}. {{name}} — {{amount}}（{{count}}件）',
  monthly_header: '🗓️ {{period}} のレポート',
  monthly_income: '➕ 収入：{{amount}}',
  monthly_expense: '➖ 支出：{{amount}}',
  monthly_diff: '📊 差額：{{amount}}（取引数：{{count}}）',
  top_categories_header: '支出カテゴリのトップ:',
  category_item: '{{index}}. {{name}} — {{amount}}（{{percent}}%）',
  top_counterparties_header: '取引先トップ:',
  counterparty_item: '{{index}}. {{name}} — {{amount}}（{{percent}}%）',
  goals_header: '🎯 貯蓄目標',
  goals_empty: 'まだ目標がありません。LumioのWebアプリで作成してください。',
  goal_item: '{{name}}：{{current}} / {{target}} {{currency}}（{{percent}}%）',
  networth_header: '📈 純資産：{{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}}（+{{percent}}%）期間中',
  networth_change_down: '▼ {{amount}} {{currency}}（{{percent}}%）期間中',
  networth_change_no_percent: '期間中の変化：{{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ 資産の{{percent}}%が中〜高リスクです — 閾値{{threshold}}%を超えています',
  insight_digest_header: '🔔 Lumioからの新しい通知',
};

const ko: TranslationMap = {
  connected: '✅ Telegram이 연결되었습니다. 이 채팅으로 리포트를 보내드립니다.',
  start_greeting:
    '👋 안녕하세요! 회원님의 Telegram ID: {{telegramId}}. 리포트를 받으려면 프로필 설정에 추가하세요.',
  unknown_command: '알 수 없는 명령입니다. 명령 목록은 /help를 사용하세요.',
  telegram_id_unknown: 'Telegram ID를 확인할 수 없습니다. 나중에 다시 시도해 주세요.',
  user_not_connected:
    'Telegram ID {{telegramId}}에 연결된 계정이 없습니다. 계정 설정에서 이 ID를 추가하세요.',
  report_failed: '리포트를 보낼 수 없습니다. 나중에 다시 시도해 주세요.',
  document_telegram_id_unknown:
    '⚠️ Telegram ID를 확인할 수 없습니다. /start를 보낸 후 다시 시도해 주세요.',
  document_user_not_connected:
    'Telegram ID {{telegramId}}에 연결된 계정이 없습니다. 설정에서 ID와 채팅 ID를 추가하거나 /start를 보내 ID를 확인하세요.',
  document_pdf_only: 'PDF 명세서 파일만 지원됩니다.',
  document_received: '📥 파일을 받았습니다. 처리를 시작합니다...',
  document_processed:
    '✅ 파일이 접수되어 처리 대기열에 추가되었습니다. 상태: {{status}}. 결과는 Lumio 웹 앱에서 확인하세요.',
  document_failed:
    '파일을 처리할 수 없습니다. 나중에 다시 시도하거나 웹 앱을 통해 업로드해 주세요.',
  help: '사용 가능한 명령:\n/start — Telegram ID와 환영 메시지 표시\n/help — 이 도움말\n/report — 오늘의 일일 리포트\n/report YYYY-MM-DD — 지정한 날짜의 리포트\n/report monthly — 이번 달 리포트\n/goals — 저축 목표 진행 상황\n/networth — 현재 순자산',
  daily_header: '📅 일일 리포트 — {{date}}',
  income_line: '➕ 수입: {{amount}} ({{count}}건)',
  expense_line: '➖ 지출: {{amount}} ({{count}}건)',
  daily_total: '📊 오늘의 합계: {{amount}}',
  top_income_header: '수입 기준 상위 거래처:',
  top_expense_header: '지출 상위 카테고리:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}}건)',
  monthly_header: '🗓️ {{period}} 리포트',
  monthly_income: '➕ 수입: {{amount}}',
  monthly_expense: '➖ 지출: {{amount}}',
  monthly_diff: '📊 차액: {{amount}} (거래 {{count}}건)',
  top_categories_header: '지출 카테고리 상위 목록:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: '상위 거래처:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 저축 목표',
  goals_empty: '아직 목표가 없습니다. Lumio 웹 앱에서 만들어 보세요.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 순자산: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) 기간 동안',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) 기간 동안',
  networth_change_no_percent: '기간 동안 변화: {{amount}} {{currency}}',
  networth_risky_warning: '⚠️ 자산의 {{percent}}%가 중/고위험입니다 — {{threshold}}% 임계값을 초과',
  insight_digest_header: '🔔 새로운 Lumio 알림',
};

const hi: TranslationMap = {
  connected: '✅ Telegram जुड़ गया। हम इस चैट में रिपोर्ट भेजेंगे।',
  start_greeting:
    '👋 नमस्ते! आपका Telegram ID: {{telegramId}}. रिपोर्ट पाने के लिए इसे प्रोफ़ाइल सेटिंग्स में जोड़ें।',
  unknown_command: 'अज्ञात कमांड। कमांड सूची के लिए /help का उपयोग करें।',
  telegram_id_unknown: 'आपका Telegram ID पता नहीं चल सका। बाद में पुनः प्रयास करें।',
  user_not_connected: 'Telegram ID {{telegramId}} से कोई खाता जुड़ा नहीं है। इसे खाता सेटिंग्स में जोड़ें।',
  report_failed: 'रिपोर्ट भेजी नहीं जा सकी। बाद में पुनः प्रयास करें।',
  document_telegram_id_unknown: '⚠️ आपका Telegram ID पता नहीं चल सका। /start भेजें और पुनः प्रयास करें।',
  document_user_not_connected:
    'Telegram ID {{telegramId}} से कोई खाता जुड़ा नहीं है। सेटिंग्स में ID और chatId जोड़ें, या अपना ID देखने के लिए /start भेजें।',
  document_pdf_only: 'केवल PDF स्टेटमेंट फ़ाइलें समर्थित हैं।',
  document_received: '📥 फ़ाइल प्राप्त हुई, प्रोसेसिंग शुरू हो गई है...',
  document_processed:
    '✅ फ़ाइल स्वीकार कर ली गई और प्रोसेसिंग में डाल दी गई। स्थिति: {{status}}। परिणाम Lumio वेब ऐप में देखें।',
  document_failed: 'फ़ाइल प्रोसेस नहीं हो सकी। बाद में पुनः प्रयास करें या वेब ऐप से अपलोड करें।',
  help: 'उपलब्ध कमांड:\n/start — आपका Telegram ID और स्वागत संदेश दिखाएँ\n/help — यह सहायता\n/report — आज की दैनिक रिपोर्ट\n/report YYYY-MM-DD — निर्दिष्ट तिथि की रिपोर्ट\n/report monthly — चालू माह की रिपोर्ट\n/goals — बचत लक्ष्यों की प्रगति\n/networth — आपकी वर्तमान निवल संपत्ति',
  daily_header: '📅 दैनिक रिपोर्ट — {{date}}',
  income_line: '➕ आय: {{amount}} ({{count}})',
  expense_line: '➖ व्यय: {{amount}} ({{count}})',
  daily_total: '📊 दिन का योग: {{amount}}',
  top_income_header: 'आय के अनुसार शीर्ष प्रतिपक्ष:',
  top_expense_header: 'शीर्ष व्यय श्रेणियाँ:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ {{period}} की रिपोर्ट',
  monthly_income: '➕ आय: {{amount}}',
  monthly_expense: '➖ व्यय: {{amount}}',
  monthly_diff: '📊 अंतर: {{amount}} (लेनदेन: {{count}})',
  top_categories_header: 'शीर्ष व्यय श्रेणियाँ:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'शीर्ष प्रतिपक्ष:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 बचत लक्ष्य',
  goals_empty: 'अभी कोई लक्ष्य नहीं है। Lumio वेब ऐप में एक बनाएँ।',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 निवल संपत्ति: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) अवधि में',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) अवधि में',
  networth_change_no_percent: 'अवधि में परिवर्तन: {{amount}} {{currency}}',
  networth_risky_warning: '⚠️ {{percent}}% संपत्ति मध्यम/उच्च जोखिम में है — {{threshold}}% सीमा से अधिक',
  insight_digest_header: '🔔 नई Lumio अलर्ट',
};

const nl: TranslationMap = {
  connected: '✅ Telegram verbonden. We sturen rapporten naar deze chat.',
  start_greeting:
    '👋 Hoi! Je Telegram-ID: {{telegramId}}. Voeg dit toe in je profielinstellingen om rapporten te ontvangen.',
  unknown_command: "Onbekend commando. Gebruik /help voor de lijst met commando's.",
  telegram_id_unknown: 'Kon je Telegram-ID niet vaststellen. Probeer het later opnieuw.',
  user_not_connected:
    'Er is geen account gekoppeld aan Telegram-ID {{telegramId}}. Voeg deze ID toe in je accountinstellingen.',
  report_failed: 'Kon het rapport niet versturen. Probeer het later opnieuw.',
  document_telegram_id_unknown:
    '⚠️ Kon je Telegram-ID niet vaststellen. Stuur /start en probeer het opnieuw.',
  document_user_not_connected:
    'Er is geen account gekoppeld aan Telegram-ID {{telegramId}}. Voeg de ID en chat-ID toe in je instellingen, of stuur /start om je ID te zien.',
  document_pdf_only: 'Alleen PDF-afschriften worden ondersteund.',
  document_received: '📥 Bestand ontvangen, verwerking is gestart...',
  document_processed:
    '✅ Bestand geaccepteerd en in de wachtrij voor verwerking gezet. Status: {{status}}. Bekijk het resultaat in de Lumio-webapp.',
  document_failed:
    'Kon het bestand niet verwerken. Probeer het later opnieuw of upload het via de webapp.',
  help: "Beschikbare commando's:\n/start — toont je Telegram-ID en een welkomstbericht\n/help — deze hulp\n/report — dagrapport van vandaag\n/report YYYY-MM-DD — rapport voor een specifieke datum\n/report monthly — rapport van de huidige maand\n/goals — voortgang van je spaardoelen\n/networth — je huidige nettovermogen",
  daily_header: '📅 Dagrapport — {{date}}',
  income_line: '➕ Inkomsten: {{amount}} ({{count}})',
  expense_line: '➖ Uitgaven: {{amount}} ({{count}})',
  daily_total: '📊 Dagtotaal: {{amount}}',
  top_income_header: 'Topcontacten naar inkomsten:',
  top_expense_header: 'Topuitgavecategorieën:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Rapport voor {{period}}',
  monthly_income: '➕ Inkomsten: {{amount}}',
  monthly_expense: '➖ Uitgaven: {{amount}}',
  monthly_diff: '📊 Verschil: {{amount}} ({{count}} transacties)',
  top_categories_header: 'Topuitgavecategorieën:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Topcontacten:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Spaardoelen',
  goals_empty: 'Nog geen doelen. Maak er een aan in de Lumio-webapp.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Nettovermogen: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) over de periode',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) over de periode',
  networth_change_no_percent: 'Verandering over de periode: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% van de activa loopt een gemiddeld/hoog risico — boven de grens van {{threshold}}%',
  insight_digest_header: '🔔 Nieuwe Lumio-melding',
};

const sv: TranslationMap = {
  connected: '✅ Telegram anslutet. Vi skickar rapporter till den här chatten.',
  start_greeting:
    '👋 Hej! Ditt Telegram-ID: {{telegramId}}. Lägg till det i profilinställningarna för att få rapporter.',
  unknown_command: 'Okänt kommando. Använd /help för listan över kommandon.',
  telegram_id_unknown: 'Kunde inte fastställa ditt Telegram-ID. Försök igen senare.',
  user_not_connected:
    'Inget konto är kopplat till Telegram-ID {{telegramId}}. Lägg till detta ID i kontoinställningarna.',
  report_failed: 'Kunde inte skicka rapporten. Försök igen senare.',
  document_telegram_id_unknown:
    '⚠️ Kunde inte fastställa ditt Telegram-ID. Skicka /start och försök igen.',
  document_user_not_connected:
    'Inget konto är kopplat till Telegram-ID {{telegramId}}. Lägg till ID och chatt-ID i inställningarna, eller skicka /start för att se ditt ID.',
  document_pdf_only: 'Endast PDF-kontoutdrag stöds.',
  document_received: '📥 Fil mottagen, bearbetning har startat...',
  document_processed:
    '✅ Filen har accepterats och köats för bearbetning. Status: {{status}}. Se resultatet i Lumios webbapp.',
  document_failed:
    'Kunde inte bearbeta filen. Försök igen senare eller ladda upp den via webbappen.',
  help: 'Tillgängliga kommandon:\n/start — visar ditt Telegram-ID och ett välkomstmeddelande\n/help — den här hjälpen\n/report — dagens rapport\n/report YYYY-MM-DD — rapport för ett visst datum\n/report monthly — rapport för aktuell månad\n/goals — framsteg för dina sparmål\n/networth — din aktuella nettoförmögenhet',
  daily_header: '📅 Dagsrapport — {{date}}',
  income_line: '➕ Inkomst: {{amount}} ({{count}})',
  expense_line: '➖ Utgift: {{amount}} ({{count}})',
  daily_total: '📊 Dagens totalt: {{amount}}',
  top_income_header: 'Toppmotparter efter inkomst:',
  top_expense_header: 'Toppkategorier för utgifter:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Rapport för {{period}}',
  monthly_income: '➕ Inkomst: {{amount}}',
  monthly_expense: '➖ Utgift: {{amount}}',
  monthly_diff: '📊 Skillnad: {{amount}} ({{count}} transaktioner)',
  top_categories_header: 'Toppkategorier för utgifter:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}} %)',
  top_counterparties_header: 'Toppmotparter:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}} %)',
  goals_header: '🎯 Sparmål',
  goals_empty: 'Inga mål ännu. Skapa ett i Lumios webbapp.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}} %)',
  networth_header: '📈 Nettoförmögenhet: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}} %) under perioden',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}} %) under perioden',
  networth_change_no_percent: 'Förändring under perioden: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% av tillgångarna har medel-/hög risk — över gränsen på {{threshold}}%',
  insight_digest_header: '🔔 Ny Lumio-avisering',
};

const vi: TranslationMap = {
  connected: '✅ Đã kết nối Telegram. Chúng tôi sẽ gửi báo cáo vào cuộc trò chuyện này.',
  start_greeting:
    '👋 Chào bạn! ID Telegram của bạn: {{telegramId}}. Thêm ID này vào cài đặt hồ sơ để nhận báo cáo.',
  unknown_command: 'Lệnh không xác định. Dùng /help để xem danh sách lệnh.',
  telegram_id_unknown: 'Không thể xác định ID Telegram của bạn. Vui lòng thử lại sau.',
  user_not_connected:
    'Không có tài khoản nào được liên kết với ID Telegram {{telegramId}}. Hãy thêm ID này trong cài đặt tài khoản.',
  report_failed: 'Không thể gửi báo cáo. Vui lòng thử lại sau.',
  document_telegram_id_unknown: '⚠️ Không thể xác định ID Telegram của bạn. Gửi /start rồi thử lại.',
  document_user_not_connected:
    'Không có tài khoản nào được liên kết với ID Telegram {{telegramId}}. Thêm ID và chat ID trong cài đặt, hoặc gửi /start để xem ID của bạn.',
  document_pdf_only: 'Chỉ hỗ trợ tệp sao kê định dạng PDF.',
  document_received: '📥 Đã nhận tệp, bắt đầu xử lý...',
  document_processed:
    '✅ Đã nhận tệp và đưa vào hàng đợi xử lý. Trạng thái: {{status}}. Xem kết quả trong ứng dụng web Lumio.',
  document_failed: 'Không thể xử lý tệp. Vui lòng thử lại sau hoặc tải lên qua ứng dụng web.',
  help: 'Các lệnh khả dụng:\n/start — hiển thị ID Telegram và lời chào\n/help — trợ giúp này\n/report — báo cáo hằng ngày của hôm nay\n/report YYYY-MM-DD — báo cáo cho một ngày cụ thể\n/report monthly — báo cáo của tháng hiện tại\n/goals — tiến độ mục tiêu tiết kiệm\n/networth — giá trị ròng hiện tại của bạn',
  daily_header: '📅 Báo cáo hằng ngày — {{date}}',
  income_line: '➕ Thu: {{amount}} ({{count}})',
  expense_line: '➖ Chi: {{amount}} ({{count}})',
  daily_total: '📊 Tổng trong ngày: {{amount}}',
  top_income_header: 'Đối tác hàng đầu theo khoản thu:',
  top_expense_header: 'Danh mục chi hàng đầu:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Báo cáo tháng {{period}}',
  monthly_income: '➕ Thu: {{amount}}',
  monthly_expense: '➖ Chi: {{amount}}',
  monthly_diff: '📊 Chênh lệch: {{amount}} ({{count}} giao dịch)',
  top_categories_header: 'Danh mục chi tiêu hàng đầu:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Đối tác hàng đầu:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Mục tiêu tiết kiệm',
  goals_empty: 'Chưa có mục tiêu. Hãy tạo một mục tiêu trong ứng dụng web Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Giá trị ròng: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) trong kỳ',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) trong kỳ',
  networth_change_no_percent: 'Thay đổi trong kỳ: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% tài sản ở mức rủi ro trung bình/cao — vượt ngưỡng {{threshold}}%',
  insight_digest_header: '🔔 Cảnh báo mới từ Lumio',
};

const id: TranslationMap = {
  connected: '✅ Telegram terhubung. Kami akan mengirim laporan ke chat ini.',
  start_greeting:
    '👋 Hai! ID Telegram Anda: {{telegramId}}. Tambahkan di pengaturan profil untuk mulai menerima laporan.',
  unknown_command: 'Perintah tidak dikenal. Gunakan /help untuk melihat daftar perintah.',
  telegram_id_unknown: 'Tidak dapat menentukan ID Telegram Anda. Coba lagi nanti.',
  user_not_connected:
    'Tidak ada akun yang terhubung ke ID Telegram {{telegramId}}. Tambahkan ID ini di pengaturan akun.',
  report_failed: 'Tidak dapat mengirim laporan. Coba lagi nanti.',
  document_telegram_id_unknown:
    '⚠️ Tidak dapat menentukan ID Telegram Anda. Kirim /start lalu coba lagi.',
  document_user_not_connected:
    'Tidak ada akun yang terhubung ke ID Telegram {{telegramId}}. Tambahkan ID dan chat ID di pengaturan, atau kirim /start untuk melihat ID Anda.',
  document_pdf_only: 'Hanya file laporan PDF yang didukung.',
  document_received: '📥 File diterima, pemrosesan dimulai...',
  document_processed:
    '✅ File diterima dan masuk antrean pemrosesan. Status: {{status}}. Periksa hasilnya di aplikasi web Lumio.',
  document_failed: 'Tidak dapat memproses file. Coba lagi nanti atau unggah melalui aplikasi web.',
  help: 'Perintah yang tersedia:\n/start — menampilkan ID Telegram Anda dan pesan sambutan\n/help — bantuan ini\n/report — laporan harian hari ini\n/report YYYY-MM-DD — laporan untuk tanggal tertentu\n/report monthly — laporan bulan berjalan\n/goals — progres target tabungan Anda\n/networth — kekayaan bersih Anda saat ini',
  daily_header: '📅 Laporan harian — {{date}}',
  income_line: '➕ Pemasukan: {{amount}} ({{count}})',
  expense_line: '➖ Pengeluaran: {{amount}} ({{count}})',
  daily_total: '📊 Total hari ini: {{amount}}',
  top_income_header: 'Mitra teratas berdasarkan pemasukan:',
  top_expense_header: 'Kategori pengeluaran teratas:',
  list_item: '{{index}}. {{name}} — {{amount}} ({{count}})',
  monthly_header: '🗓️ Laporan untuk {{period}}',
  monthly_income: '➕ Pemasukan: {{amount}}',
  monthly_expense: '➖ Pengeluaran: {{amount}}',
  monthly_diff: '📊 Selisih: {{amount}} ({{count}} transaksi)',
  top_categories_header: 'Kategori pengeluaran teratas:',
  category_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  top_counterparties_header: 'Mitra teratas:',
  counterparty_item: '{{index}}. {{name}} — {{amount}} ({{percent}}%)',
  goals_header: '🎯 Target tabungan',
  goals_empty: 'Belum ada target. Buat satu di aplikasi web Lumio.',
  goal_item: '{{name}}: {{current}} / {{target}} {{currency}} ({{percent}}%)',
  networth_header: '📈 Kekayaan bersih: {{value}} {{currency}}',
  networth_change_up: '▲ +{{amount}} {{currency}} (+{{percent}}%) selama periode',
  networth_change_down: '▼ {{amount}} {{currency}} ({{percent}}%) selama periode',
  networth_change_no_percent: 'Perubahan selama periode: {{amount}} {{currency}}',
  networth_risky_warning:
    '⚠️ {{percent}}% aset berisiko menengah/tinggi — di atas ambang {{threshold}}%',
  insight_digest_header: '🔔 Peringatan Lumio baru',
};

export const TELEGRAM_TRANSLATIONS: Record<string, TranslationMap> = {
  ru,
  en,
  kk,
  de,
  fr,
  es,
  pt,
  tr,
  uk,
  zh,
  ar,
  pl,
  it,
  sk,
  ja,
  ko,
  hi,
  nl,
  sv,
  vi,
  id,
};

/** Telegram's own per-user language_code, mapped down to a locale we ship. */
export function resolveTelegramLocale(languageCode?: string | null): string {
  const normalized = (languageCode ?? '').slice(0, 2).toLowerCase();
  return normalized in TELEGRAM_TRANSLATIONS ? normalized : 'ru';
}

export function renderTelegramMessage(
  locale: string,
  key: TelegramMessageKey,
  params: Record<string, string | number> = {},
): string {
  const translations = TELEGRAM_TRANSLATIONS[locale] ?? TELEGRAM_TRANSLATIONS.ru;
  const template = translations[key];
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ''));
}
