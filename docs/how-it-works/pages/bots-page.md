# Как работает страница Bots

Документ описывает фактическое поведение текущей реализации страницы `Bots` во фронтенде (`webapp/frontend`) и связанных API роутов Next.js (`webapp/frontend/app/api/...`).

## Назначение страницы
Страница `Bots` — это консоль для управления Telegram‑ботами внутри аккаунта:
- подключить нового бота по токену BotFather;
- посмотреть базовую информацию о боте;
- управлять активностью (active/inactive);
- проверить соединение с Telegram (Bot API + webhook);
- подключать/отключать курсы к боту (через `course_deployment`);
- удалить бота.

## URL и навигация
- Основная страница: `GET /bots`
- Выбор бота фиксируется в query‑параметре: `GET /bots?botId=<id>`
- Роут `GET /bots/[botId]` **не имеет отдельной страницы редактирования** — он просто делает redirect на `/bots?botId=<id>` (см. `webapp/frontend/app/bots/[botId]/page.tsx`).

## Layout страницы (UI структура)
Страница собрана компонентом `BotManagement` (`webapp/frontend/components/bots/BotManagement.tsx`) и визуально состоит из 3 колонок:
- **Слева** — список ботов (`BotsList`) + кнопка **Add Bot**
- **По центру** — “инспектор” выбранного бота (`BotInspector`) с секциями:
  - Telegram info
  - API / Status
  - Connected Courses
- **Справа** — пока пустая панель (заглушка `aside`)

## Инициализация и выбор бота
При загрузке страницы:
1. Фронтенд делает `GET /api/bots` и получает список ботов аккаунта.
2. Выбор бота определяется так:
   - если в URL есть `botId` и такой бот есть в списке — выбирается он;
   - иначе выбирается первый бот из списка;
   - если ботов нет — выбранный бот отсутствует, инспектор просит “Select a bot…”.
3. При клике по боту в списке:
   - обновляется `selectedBotId`;
   - в адресной строке обновляется `botId` (через `router.push("/bots?botId=...")`).

## Загрузка деталей выбранного бота
Когда выбран `botId`, фронтенд загружает:
- `GET /api/bots/:botId` — базовые данные бота (токен в ответе **замаскирован**).
- `GET /api/bots/:botId/courses` — список курсов, “подключённых” к боту.

Важно:
- “Telegram info” в UI **собирается из данных БД** (`bot_name`, `display_name`, `description`). Команды/аватар/short_about пока не подгружаются с Telegram напрямую (в коде помечено `TODO`).

## Добавление бота (Add Bot)
Кнопка **Add Bot** открывает модалку `AddBotModal`.

### Шаг 1 — ввод токена
Пользователь вставляет токен вида `123456789:ABCDEF...`. Есть базовая проверка формата.

### Шаг 2 — валидация токена (Telegram getMe)
Фронтенд вызывает `POST /api/telegram/getMe` с `{ token }`.
Этот endpoint на сервере:
- вызывает Telegram Bot API `getMe`;
- опционально пытается получить фото бота (`getUserProfilePhotos` → `getFile`);
- возвращает `bot` (id, first_name, username, photo_url, …).

Если токен невалидный — показывается ошибка.
Если бот с таким username уже подключён (сравнение по `existingBots`) — показывается ошибка “already connected”.

### Шаг 3 — подтверждение подключения
После успешной валидации пользователь нажимает Confirm:
- фронтенд вызывает `POST /api/bots` и сохраняет бота в БД с полями:
  - `bot_token` — токен (хранится в БД как есть),
  - `bot_name` — username или fallback `bot_<id>`,
  - `display_name` — first_name из Telegram,
  - `description` — заглушка `Bot connected via Telegram API`,
  - `is_active: true`.
- затем перезагружает список ботов (`GET /api/bots`) и выбирает нового бота.

## API / Status секция
Секция реализована в `ApiStatusSection`.

### Показ/копирование токена
По умолчанию UI показывает токен замаскированным (`••••…`).
При первом переключении “показать токен” UI делает запрос:
- `GET /api/bots/:botId/token` → `{ token: "<реальный токен>" }`

Копирование токена:
- использует уже загруженный токен;
- если токен ещё не загружали — сначала вызывает `GET /api/bots/:botId/token`, затем копирует.

Примечание безопасности:
- серверный endpoint `/api/bots/:botId/token` содержит комментарий, что его нужно защищать авторизацией; сейчас он полагается на `accountId` из запроса (`getAccountId`).

### Активность бота (Active/Inactive)
Переключатель статуса вызывает:
- `PATCH /api/bots/:botId` с `{ is_active: boolean }`

UI обновляет состояние оптимистично и откатывает при ошибке.

### Test Connection
Кнопка **Test Connection** вызывает:
- `POST /api/bots/:botId/test-connection`

Сервер:
- берёт реальный `bot_token` из БД;
- вызывает Telegram:
  - `getMe` (Bot API доступность)
  - `getWebhookInfo` (наличие webhook URL)
- возвращает:
  - `botApi: "OK" | "ERROR"`
  - `webhook: "OK" | "ERROR"`
  - `errors` с текстом ошибок (если есть)

UI показывает статусы и детали ошибок.

## Удаление бота (Delete)
Кнопка **Delete Bot** открывает confirmation modal.
Подтверждение вызывает:
- `DELETE /api/bots/:botId`

Сервер:
- удаляет запись бота.

Фронтенд:
- удаляет бота из локального списка;
- выбирает следующий доступный бот (или очищает выбор и убирает `botId` из URL).

## Список задействованных API endpoints
- `GET /api/bots` — список ботов аккаунта (токен замаскирован)
- `POST /api/bots` — создать бота
- `GET /api/bots/:botId` — детали бота (токен замаскирован)
- `PATCH /api/bots/:botId` — обновление полей (используется для `is_active`)
- `DELETE /api/bots/:botId` — удалить бота
- `GET /api/bots/:botId/token` — получить реальный токен
- `POST /api/bots/:botId/test-connection` — тест Telegram Bot API и webhook
- `POST /api/telegram/getMe` — валидация токена и получение данных бота из Telegram

## Замечания / текущие ограничения (важно знать)
- `GET /api/bots/:botId/token` возвращает секрет (токен) и требует строгой авторизации (в коде есть `TODO`).

