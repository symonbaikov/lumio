# Lumio Backend

Backend приложение для системы обработки банковских выписок на базе NestJS.

## Установка

```bash
npm install
```

## Настройка окружения

Скопируйте `.env.example` в `.env` и заполните необходимые переменные:

```bash
cp .env.example .env
```

Пользовательские интеграции настраиваются через UI на уровне workspace:

- **Integrations → AI-compatible endpoint** для Ollama/LocalAI/vLLM.
- **Integrations → SMTP email** для email-приглашений.
- **Settings → Telegram** для bot token.
- **Integrations → S3-compatible/WebDAV/IMAP** для storage и receipt import.
- **Integrations → Application URL** для публичного URL ссылок.

Env оставлен для инфраструктуры и bootstrap/fallback: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY`, `FRONTEND_URL`/`APP_URL`. Если SMTP не задан ни в UI, ни через fallback env, ссылка приглашения всё равно вернётся в ответе API, но письмо отправлено не будет.

## Резервные копии workspace

Backups в **Settings → Sync** создают переносимый файл `.lumio-backup`: открытый манифест не содержит пользовательских данных, а JSON-данные и оригиналы документов зашифрованы AES-256-GCM. Пароль восстановления обязателен и не хранится в открытом виде. Без него копию восстановить невозможно.

Для ежедневных запусков задайте `BACKUP_MASTER_KEY` (отдельный стабильный секрет длиной не менее 32 байт) и, если используется серверная папка, `BACKUP_LOCAL_ROOT` — выделенную writable-директорию. В конфигурации разрешены только относительные имена папок внутри этого root, поэтому backup не может записать файл в произвольный путь на сервере. Для Nextcloud сначала подключите WebDAV-интеграцию с app password, затем выберите Nextcloud в настройках backups. Lumio публикует завершённый файл атомарно и хранит последние семь версий по умолчанию.

Импорт всегда создаёт новый workspace для текущего пользователя; merge и замена существующего workspace не выполняются. Пароли, сессии, OAuth/API-токены, участники, webhooks и история уведомлений не экспортируются.

## Запуск базы данных

Используйте Docker Compose для запуска PostgreSQL и Redis:

```bash
docker-compose up -d
```

## Миграции

Схема базы управляется миграциями (TypeORM synchronize отключён).

- По умолчанию миграции запускаются автоматически при старте приложения.
- Чтобы отключить автозапуск (например, в `production`), установите `RUN_MIGRATIONS=false` и применяйте миграции вручную.

```bash
npm run migration:run

# или внутри Docker-контейнера backend
docker exec -it lumio-backend npm run migration:run
```

## Запуск приложения

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

## Структура проекта

```
src/
├── common/          # Общие утилиты, фильтры, guards, interceptors
├── config/          # Конфигурации (БД, и т.д.)
├── entities/        # TypeORM сущности
├── modules/         # Модули приложения
├── migrations/      # Миграции БД
├── app.module.ts    # Корневой модуль
└── main.ts          # Точка входа
```

## API

API доступно по адресу: `http://localhost:3001/api/v1`

Health check: `GET /api/v1/health`
