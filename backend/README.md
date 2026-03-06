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

Для отправки email-приглашений в рабочие пространства добавьте:

- `APP_URL` — базовый URL фронтенда (используется в ссылках приглашений)
- `RESEND_API_KEY` — API ключ Resend
- `RESEND_FROM` — From адрес, например `"Lumio <noreply@your-domain.com>"`
- `RESEND_REPLY_TO` — опционально, Reply-To адрес

Если `RESEND_API_KEY` или `RESEND_FROM` не заданы, ссылка всё равно вернётся в ответе API, но письмо отправлено не будет.

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



