# Как работает страница /groups

Документ описывает фактическое поведение текущей реализации страницы `GET /groups` во фронтенде (`webapp/frontend`) и связанных API роутов Next.js (`webapp/frontend/app/api/...`).

## Назначение страницы
Страница **Groups** — это консоль управления группами курсов:
- список групп аккаунта;
- просмотр и редактирование деталей выбранной группы;
- управление активностью группы;
- управление invite‑ссылками (создание, копирование, деактивация);
- создание новой группы через `/groups/new`.

## URL и навигация
- Основная страница: `GET /groups`
- Выбор группы фиксируется query‑параметром: `GET /groups?groupId=<id>`
- Страница создания: `GET /groups/new`
- Роут `GET /groups/[groupId]` существует, но **основной интерфейс** — это master‑detail на `/groups`.

## Layout страницы (UI структура)
Страница собрана компонентом `GroupsManagement` (`webapp/frontend/components/groups/GroupsManagement.tsx`) и визуально состоит из 2 колонок:
- **Слева** — список групп (`GroupsSidebar`) + кнопка **Create group**
- **Справа** — панель деталей выбранной группы (`GroupDetailsPanel`)

Если группа не выбрана — справа показывается placeholder “Select a group”.

## Источник данных
Данные берутся из таблиц Postgres:
- `public.course_group`
- `public.bot`
- `public.course`
- `public.invite_link`

Фильтр по аккаунту: `account_id = 1` (жёстко через `getAccountId`).

### Список групп
`GET /api/groups` возвращает список с JOIN‑ами:
- `course_group JOIN bot JOIN course`
Сортировка: `created_at DESC`.

### Детали группы
`GET /api/groups/{id}` возвращает:
- данные группы (`course_group`)
- joined поля бота и курса
- список invite‑ссылок через `invite_link` по `course_group_id`

## Сценарии и поведение

### 1) Загрузка списка групп
При открытии `/groups`:
1. UI показывает левую панель со списком.
2. Запрос: `GET /api/groups`
3. Если есть `groupId` в URL и он существует — выбирается он, иначе — первая группа.
4. Если групп нет — показывается пустое состояние “No groups yet”.

### 2) Выбор группы
При клике на группу:
- обновляется `selectedGroupId`;
- URL обновляется на `/groups?groupId=<id>`;
- загружаются детали: `GET /api/groups/{id}`.

### 3) Редактирование бота и курса
В правой панели есть селекты **Bot** и **Course** и кнопка **Save** (в стиле course‑editor):
- Save вызывает `PATCH /api/groups/{id}` с `{ bot_id, course_id }`
- после сохранения обновляются детали и список.

### 4) Активность группы
Переключатель Active/Inactive вызывает:
- `PATCH /api/groups/{id}` с `{ is_active: boolean }`

Обновление выполняется оптимистично, с откатом при ошибке.

### 5) Invite Links
Внизу правой панели:
- список invite‑ссылок (token, uses, expires, is_active)
- кнопка **Copy** для копирования ссылки
- кнопка **Deactivate** для деактивации invite

Формат ссылки:
```
https://t.me/<bot_name>?start=grp_<course_group_id>_<token>
```

#### Создание invite
Кнопка **Add invite link** открывает модалку с полями:
- `max_uses` (int)
- `expires_at` (timestamp, nullable)
- `is_active` (bool)

После submit:
- `POST /api/groups/{id}/invites`
- создаётся invite в `public.invite_link`
- `token` генерируется автоматически
- `current_uses = 0`
- `created_by = null`

#### Деактивация invite
Кнопка **Deactivate** вызывает:
- `PATCH /api/invites/{id}` с `{ is_active: false }`

### 6) Создание новой группы
`GET /groups/new` — форма создания группы:
- поля `name`, `description`, `bot`, `course`, `is_active`
- список ботов и курсов берётся из `GET /api/bots` и `GET /api/courses`
- создание: `POST /api/groups`
- после создания редирект на `/groups?groupId=<id>`

## Список задействованных API endpoints
- `GET /api/groups` — список групп (course_group + bot + course)
- `GET /api/groups/{id}` — детали группы + invite_links
- `PATCH /api/groups/{id}` — обновление `bot_id`, `course_id`, `name`, `description`, `is_active`
- `POST /api/groups` — создание группы
- `GET /api/groups/{id}/invites` — список invite‑ссылок
- `POST /api/groups/{id}/invites` — создание invite‑ссылки
- `PATCH /api/invites/{id}` — деактивация invite
- `GET /api/bots` — список ботов (для формы создания/редактирования)
- `GET /api/courses` — список курсов (для формы создания/редактирования)

## Связанные файлы реализации
- `webapp/frontend/app/groups/page.tsx`
- `webapp/frontend/components/groups/GroupsManagement.tsx`
- `webapp/frontend/components/groups/GroupsSidebar.tsx`
- `webapp/frontend/components/groups/GroupDetailsPanel.tsx`
- `webapp/frontend/components/groups/AddInviteLinkModal.tsx`
- `webapp/frontend/app/groups/new/page.tsx`
- `webapp/frontend/app/api/groups/route.ts`
- `webapp/frontend/app/api/groups/[groupId]/route.ts`
- `webapp/frontend/app/api/groups/[groupId]/invites/route.ts`
- `webapp/frontend/app/api/invites/[inviteId]/route.ts`
