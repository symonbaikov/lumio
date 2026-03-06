# Lumio Frontend

Frontend приложение для системы обработки банковских выписок на базе Next.js.

## Установка

```bash
npm install
```

## Настройка окружения

Создайте файл `.env.local` на основе `.env.local.example`:

```bash
cp .env.local.example .env.local
```

## Запуск приложения

### Development

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

### Production

```bash
npm run build
npm run start
```

## Структура проекта

```
app/
├── components/      # React компоненты
├── hooks/           # Custom hooks
├── lib/             # Утилиты и библиотеки (API клиент)
├── store/           # State management
├── utils/           # Вспомогательные функции
├── layout.tsx       # Root layout
└── page.tsx         # Главная страница
```
