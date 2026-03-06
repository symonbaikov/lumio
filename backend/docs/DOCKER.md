# Docker инструкции для Lumio

## Быстрый запуск в Docker

### 1. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
# JWT Secrets (обязательно измените!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Опционально
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 2. Запуск всех сервисов

```bash
# Сборка и запуск всех контейнеров
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### 3. Доступ к приложению

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Режимы запуска

### Production режим

```bash
docker-compose up -d --build
```

### Development режим (с hot-reload)

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

В development режиме изменения в коде автоматически применяются без пересборки контейнеров.

## Управление контейнерами

### Просмотр статуса

```bash
docker-compose ps
```

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Перезапуск сервиса

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Остановка и удаление

```bash
# Остановка
docker-compose stop

# Остановка и удаление контейнеров
docker-compose down

# Остановка и удаление с volumes (удалит данные БД!)
docker-compose down -v
```

## Работа с базой данных

### Подключение к PostgreSQL

```bash
docker exec -it lumio-postgres psql -U lumio -d lumio
```

### Выполнение миграций

Миграции выполняются автоматически при запуске backend, но их можно прогнать вручную при необходимости:

```bash
# В контейнере backend
docker exec -it lumio-backend npm run migration:run
```

### Бэкап базы данных

```bash
docker exec lumio-postgres pg_dump -U lumio lumio > backup.sql
```

### Восстановление базы данных

```bash
docker exec -i lumio-postgres psql -U lumio lumio < backup.sql
```

## Пересборка контейнеров

```bash
# Пересборка всех сервисов
docker-compose build --no-cache

# Пересборка конкретного сервиса
docker-compose build --no-cache backend
docker-compose build --no-cache frontend

# Пересборка и перезапуск
docker-compose up -d --build
```

## Переменные окружения

Переменные окружения можно задать:

1. **Через .env файл** (рекомендуется):
   ```bash
   # Создайте .env в корне проекта
   JWT_SECRET=your-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

2. **Через docker-compose.yml**:
   ```yaml
   environment:
     - JWT_SECRET=${JWT_SECRET}
   ```

3. **Через командную строку**:
   ```bash
   JWT_SECRET=secret docker-compose up
   ```

## Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Проверьте логи
docker-compose logs backend

# Проверьте статус
docker-compose ps

# Пересоберите контейнер
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Проблема: База данных не подключается

```bash
# Проверьте, что PostgreSQL запущен
docker-compose ps postgres

# Проверьте логи PostgreSQL
docker-compose logs postgres

# Проверьте подключение
docker exec -it lumio-postgres psql -U lumio -d lumio -c "SELECT 1;"
```

### Проблема: Порты заняты

Измените порты в `docker-compose.yml`:

```yaml
ports:
  - '3002:3001'  # Внешний:Внутренний
```

### Проблема: Изменения в коде не применяются

В production режиме нужно пересобрать контейнер:

```bash
docker-compose up -d --build
```

В development режиме изменения применяются автоматически.

### Очистка Docker

```bash
# Удалить все остановленные контейнеры
docker container prune

# Удалить неиспользуемые образы
docker image prune

# Полная очистка (осторожно!)
docker system prune -a --volumes
```

## Production развёртывание

Для production:

1. Используйте production образы
2. Настройте HTTPS через reverse proxy (nginx)
3. Используйте внешнюю БД (не в Docker)
4. Настройте мониторинг
5. Используйте секреты из secure vault

Пример с nginx:

```nginx
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://backend;
    }

    location / {
        proxy_pass http://frontend;
    }
}
```

## Health Checks

Все сервисы имеют health checks:

```bash
# Проверка health
curl http://localhost:3001/api/v1/health
curl http://localhost:3000
```

## Volumes

Данные сохраняются в volumes:

- `postgres_data` - данные PostgreSQL
- `redis_data` - данные Redis
- `backend_uploads` - загруженные файлы

Для просмотра volumes:

```bash
docker volume ls
docker volume inspect parse-ledger_postgres_data
```







