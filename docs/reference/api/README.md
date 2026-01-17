# API Reference

Справочник всех API endpoints.

## Документы

- [Аутентификация](authentication.md) — API аутентификации
- [Курсы](courses.md) — API курсов
- [Уроки](lessons.md) — API уроков
- [Чат](chat.md) — API чата и диалогов
- [Квизы](quiz.md) — API квизов

## Версионирование

- `/api/v1/` — стабильная версия с аутентификацией
- `/api/mvp/` — MVP эндпоинты без аутентификации

## Базовый URL

- Development: `http://localhost:8000`
- Production: определяется через `FRONTEND_URL`

## Формат ответов

**Успешный ответ:**
```json
{
  "data": { ... }
}
```

**Ошибка:**
```json
{
  "detail": "Error message",
  "status_code": 400
}
```
