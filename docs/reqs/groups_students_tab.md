# Требования к вкладке Students в странице /groups

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Требования к реализации  
**Основано на:** `groups_model.md`, `course_participants_invite_link_relation.md`, `frontend_page_guidelines.md`

---

## Обзор

Вкладка **Students** в странице `/groups/[groupId]` позволяет управлять участниками группы курса. Вкладка отображает список всех участников группы, информацию о пригласительных ссылках, через которые они присоединились, и предоставляет возможности для управления участниками.

### Назначение

- Просмотр списка участников группы
- Отслеживание источника присоединения (через какую invite link)
- Добавление участников вручную
- Удаление участников из группы
- Перенос участников между группами
- Просмотр статистики по invite links

---

## Структура данных

### Данные участника группы

Участники загружаются из таблицы `courseparticipants` с дополнительной информацией:

```typescript
interface GroupParticipant {
  courseparticipant_id: number;
  course_id: number;
  course_group_id: number;
  invite_link_id: number | null;
  account_id: number;
  chat_id: number | null;
  username: string | null;
  added_at: string;  // ISO 8601 timestamp
  added_by: number | null;
  invite_link?: {
    invite_link_id: number;
    token: string;
    created_at: string;
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
  } | null;
}
```

### Данные invite link

Информация о пригласительных ссылках группы:

```typescript
interface InviteLink {
  invite_link_id: number;
  group_id: number;
  token: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  created_at: string;
  created_by: number | null;
  is_active: boolean;
  metadata: Record<string, any> | null;
  invite_url: string;  // Полная ссылка для Telegram
}
```

---

## Логика загрузки данных

### Шаг 1: Загрузка участников группы

При заходе на вкладку Students:

1. Получить `groupId` из URL параметров
2. Загрузить участников через API `/api/groups/[groupId]/participants`
3. API возвращает список участников с информацией о invite links
4. Отсортировать участников по дате добавления (новые первыми)

**Формат запроса:**
```typescript
GET /api/groups/[groupId]/participants
```

**Ответ:**
```json
{
  "participants": [
    {
      "courseparticipant_id": 1,
      "course_id": 5,
      "course_group_id": 10,
      "invite_link_id": 3,
      "account_id": 1,
      "chat_id": 123456789,
      "username": "john_doe",
      "added_at": "2024-01-15T10:30:00Z",
      "added_by": null,
      "invite_link": {
        "invite_link_id": 3,
        "token": "abc123xyz",
        "created_at": "2024-01-10T08:00:00Z",
        "max_uses": 100,
        "current_uses": 45,
        "is_active": true
      }
    }
  ],
  "total": 1
}
```

### Шаг 2: Загрузка invite links группы

1. Загрузить invite links через API `/api/groups/[groupId]/invites`
2. Использовать для отображения статистики и фильтрации участников по ссылкам

---

## Структура таблицы участников

### Колонки таблицы

1. **Select** (checkbox, опционально)
   - Для выбора участников для массовых операций (удаление, перенос)

2. **Username** (обязательно)
   - Telegram username участника
   - Если username отсутствует, показывать `chat_id` или "Unknown"
   - Формат: `@username` или `Chat ID: 123456789`

3. **Chat ID** (обязательно)
   - Telegram chat ID участника
   - Отображается как число или "N/A" если отсутствует

4. **Invite Link** (обязательно)
   - Токен invite link, через которую присоединился участник
   - Если `invite_link_id` равен `null`, показывать "Manual" или "Added manually"
   - При клике можно показать детали invite link (модальное окно)

5. **Added At** (обязательно)
   - Дата и время добавления участника
   - Формат: `"DD.MM.YYYY HH:mm"` (локальное время пользователя)
   - Или относительное время: "2 days ago", "1 week ago"

6. **Added By** (опционально)
   - Telegram user ID пользователя, добавившего участника
   - Если `added_by` равен `null`, показывать "System" или "Auto"

7. **Actions** (обязательно)
   - Кнопки действий: "Edit", "Remove", "Transfer"
   - Или выпадающее меню с действиями

### Порядок строк

- По умолчанию: сортировка по `added_at` DESC (новые первыми)
- Возможность сортировки по любой колонке (клик на заголовок)
- Поддержка фильтрации по invite link (выпадающий список)

---

## CRUD-операции

### Create (Добавление участника)

**UX:**
- Кнопка "Add Student" вверху таблицы
- Модальное окно с формой добавления:
  - Поле "Chat ID" (обязательно) или "Username" (опционально)
  - Выбор invite link (опционально, для отслеживания источника)
  - Кнопки "Add" и "Cancel"

**Реализация:**
- Отправка POST запроса на `/api/groups/[groupId]/participants`
- Валидация: chat_id или username должны быть заполнены
- После успешного добавления обновить список участников

**Формат запроса:**
```typescript
POST /api/groups/[groupId]/participants
{
  chat_id?: number;
  username?: string;
  invite_link_id?: number | null;
}
```

**Ответ:**
```json
{
  "participant": {
    "courseparticipant_id": 2,
    "course_id": 5,
    "course_group_id": 10,
    "invite_link_id": null,
    "account_id": 1,
    "chat_id": 987654321,
    "username": "jane_doe",
    "added_at": "2024-01-20T14:00:00Z",
    "added_by": null
  },
  "message": "Participant added successfully"
}
```

### Read (Просмотр участников)

**UX:**
- Таблица с участниками группы
- Поиск по username или chat_id
- Фильтрация по invite link
- Пагинация (если участников много, например, 50 на страницу)

**Реализация:**
- Загрузка данных при открытии вкладки
- Обновление данных при изменении (после добавления/удаления)
- Индикатор загрузки во время запроса

### Update (Редактирование участника)

**UX:**
- Кнопка "Edit" в колонке Actions
- Модальное окно с формой редактирования:
  - Поле "Chat ID" (редактируемое)
  - Поле "Username" (редактируемое)
  - Выбор invite link (можно изменить)
  - Кнопки "Save" и "Cancel"

**Реализация:**
- Отправка PATCH запроса на `/api/groups/[groupId]/participants/[participantId]`
- Валидация данных перед отправкой
- Обновление строки в таблице после успешного сохранения

**Формат запроса:**
```typescript
PATCH /api/groups/[groupId]/participants/[participantId]
{
  chat_id?: number;
  username?: string;
  invite_link_id?: number | null;
}
```

### Delete (Удаление участника)

**UX:**
- Кнопка "Remove" в колонке Actions
- Подтверждение удаления (модальное окно или toast с подтверждением)
- Возможность массового удаления (через checkbox)

**Реализация:**
- Отправка DELETE запроса на `/api/groups/[groupId]/participants/[participantId]`
- После успешного удаления убрать строку из таблицы
- Показать toast уведомление об успехе

**Формат запроса:**
```typescript
DELETE /api/groups/[groupId]/participants/[participantId]
```

**Ответ:**
```json
{
  "message": "Participant removed successfully"
}
```

### Transfer (Перенос участника между группами)

**UX:**
- Кнопка "Transfer" в колонке Actions
- Модальное окно с формой переноса:
  - Выбор целевой группы (выпадающий список)
  - Выбор invite link в целевой группе (опционально)
  - Кнопки "Transfer" и "Cancel"

**Реализация:**
- Отправка POST запроса на `/api/groups/[groupId]/participants/[participantId]/transfer`
- Валидация: целевая группа должна существовать и быть доступна
- После успешного переноса удалить участника из текущей группы и добавить в целевую
- Обновить список участников

**Формат запроса:**
```typescript
POST /api/groups/[groupId]/participants/[participantId]/transfer
{
  target_group_id: number;
  invite_link_id?: number | null;
}
```

**Ответ:**
```json
{
  "participant": {
    "courseparticipant_id": 1,
    "course_id": 5,
    "course_group_id": 11,  // Новая группа
    "invite_link_id": null,
    "account_id": 1,
    "chat_id": 123456789,
    "username": "john_doe",
    "added_at": "2024-01-15T10:30:00Z",
    "added_by": null
  },
  "message": "Participant transferred successfully"
}
```

---

## API изменения

### Новый endpoint: GET /api/groups/[groupId]/participants

**Назначение:** Получить список участников группы

**Параметры:**
- `groupId` — ID группы (число)

**Query параметры (опционально):**
- `invite_link_id` — фильтр по invite link
- `page` — номер страницы (для пагинации)
- `limit` — количество записей на странице (по умолчанию 50)
- `search` — поиск по username или chat_id

**Реализация:**
- Использует таблицу `courseparticipants`
- JOIN с `invite_link` для получения информации о ссылке
- Фильтрация по `course_group_id = groupId`
- Поддержка поиска и пагинации

**Ответ:**
```json
{
  "participants": [
    {
      "courseparticipant_id": 1,
      "course_id": 5,
      "course_group_id": 10,
      "invite_link_id": 3,
      "account_id": 1,
      "chat_id": 123456789,
      "username": "john_doe",
      "added_at": "2024-01-15T10:30:00Z",
      "added_by": null,
      "invite_link": {
        "invite_link_id": 3,
        "token": "abc123xyz",
        "created_at": "2024-01-10T08:00:00Z",
        "max_uses": 100,
        "current_uses": 45,
        "is_active": true
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

**Ошибки:**
- 404 — группа не найдена
- 500 — ошибка базы данных

### Новый endpoint: POST /api/groups/[groupId]/participants

**Назначение:** Добавить участника в группу

**Параметры:**
- `groupId` — ID группы (число)

**Тело запроса:**
```json
{
  "chat_id": 123456789,
  "username": "john_doe",
  "invite_link_id": 3
}
```

**Реализация:**
- Проверка существования группы
- Проверка уникальности участника (по chat_id или username в рамках группы)
- Создание записи в `courseparticipants`
- Если указан `invite_link_id`, проверка что ссылка принадлежит группе
- Автоматическое определение `course_id` из группы

**Ответ:**
```json
{
  "participant": {
    "courseparticipant_id": 2,
    "course_id": 5,
    "course_group_id": 10,
    "invite_link_id": 3,
    "account_id": 1,
    "chat_id": 123456789,
    "username": "john_doe",
    "added_at": "2024-01-20T14:00:00Z",
    "added_by": null
  },
  "message": "Participant added successfully"
}
```

**Ошибки:**
- 400 — неверные данные (chat_id и username оба пустые)
- 404 — группа не найдена
- 409 — участник уже существует в группе
- 500 — ошибка базы данных

### Новый endpoint: PATCH /api/groups/[groupId]/participants/[participantId]

**Назначение:** Обновить данные участника

**Параметры:**
- `groupId` — ID группы (число)
- `participantId` — ID участника (число)

**Тело запроса:**
```json
{
  "chat_id": 987654321,
  "username": "jane_doe",
  "invite_link_id": 4
}
```

**Реализация:**
- Проверка существования участника и группы
- Обновление полей в `courseparticipants`
- Если указан `invite_link_id`, проверка что ссылка принадлежит группе

**Ответ:**
```json
{
  "participant": {
    "courseparticipant_id": 1,
    "course_id": 5,
    "course_group_id": 10,
    "invite_link_id": 4,
    "account_id": 1,
    "chat_id": 987654321,
    "username": "jane_doe",
    "added_at": "2024-01-15T10:30:00Z",
    "added_by": null
  },
  "message": "Participant updated successfully"
}
```

**Ошибки:**
- 404 — участник или группа не найдены
- 500 — ошибка базы данных

### Новый endpoint: DELETE /api/groups/[groupId]/participants/[participantId]

**Назначение:** Удалить участника из группы

**Параметры:**
- `groupId` — ID группы (число)
- `participantId` — ID участника (число)

**Реализация:**
- Проверка существования участника и группы
- Удаление записи из `courseparticipants`
- CASCADE удаление через foreign key (если настроено)

**Ответ:**
```json
{
  "message": "Participant removed successfully"
}
```

**Ошибки:**
- 404 — участник или группа не найдены
- 500 — ошибка базы данных

### Новый endpoint: POST /api/groups/[groupId]/participants/[participantId]/transfer

**Назначение:** Перенести участника в другую группу

**Параметры:**
- `groupId` — ID текущей группы (число)
- `participantId` — ID участника (число)

**Тело запроса:**
```json
{
  "target_group_id": 11,
  "invite_link_id": 5
}
```

**Реализация:**
- Проверка существования участника и обеих групп
- Проверка что группы принадлежат одному аккаунту
- Обновление `course_group_id` в `courseparticipants`
- Обновление `course_id` из новой группы
- Если указан `invite_link_id`, проверка что ссылка принадлежит целевой группе
- Обновление `invite_link_id` если указан

**Ответ:**
```json
{
  "participant": {
    "courseparticipant_id": 1,
    "course_id": 5,
    "course_group_id": 11,
    "invite_link_id": 5,
    "account_id": 1,
    "chat_id": 123456789,
    "username": "john_doe",
    "added_at": "2024-01-15T10:30:00Z",
    "added_by": null
  },
  "message": "Participant transferred successfully"
}
```

**Ошибки:**
- 400 — неверные данные (целевая группа не указана)
- 404 — участник или группа не найдены
- 409 — участник уже существует в целевой группе
- 500 — ошибка базы данных

---

## UI/UX требования

### Визуальное оформление

1. **Таблица участников:**
   - Современный дизайн в стиле course_editor
   - Использует стандартные классы: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`
   - Адаптивная верстка (responsive)
   - Hover эффекты: `hover:bg-muted/30`
   - Чередование цветов строк (zebra striping) для лучшей читаемости

2. **Кнопки действий:**
   - Primary button для "Add Student"
   - Secondary buttons для действий в таблице
   - Иконки для визуального различения действий
   - Disabled состояние при загрузке

3. **Модальные окна:**
   - Центрированные модальные окна
   - Затемнение фона (backdrop)
   - Кнопки закрытия (X в углу)
   - Валидация полей с отображением ошибок

4. **Индикаторы состояния:**
   - Loading: иконка `RefreshCw` с `animate-spin` и текст "Loading participants..."
   - Empty state: сообщение "No participants yet" с кнопкой "Add Student"
   - Toast уведомления для успеха/ошибки (на английском)

### Обработка ошибок

1. **Ошибка загрузки участников:**
   - Показать сообщение: "Error loading participants" / "Failed to load group participants"
   - Кнопка "Try again" для повторной попытки
   - Отображается в блоке с иконкой `AlertCircle` и красным цветом

2. **Ошибка добавления участника:**
   - Показать ошибку валидации в модальном окне
   - Toast с ошибкой: "Error" / "Failed to add participant"
   - Сохранить введенные данные в форме

3. **Ошибка удаления:**
   - Toast с ошибкой: "Error" / "Failed to remove participant"
   - Участник остается в таблице

4. **Ошибка переноса:**
   - Toast с ошибкой: "Error" / "Failed to transfer participant"
   - Участник остается в исходной группе

5. **Валидация:**
   - Chat ID должен быть числом (если указан)
   - Username должен быть строкой (если указан)
   - Хотя бы одно из полей (chat_id или username) должно быть заполнено
   - Invite link должен принадлежать группе

### Фильтрация и поиск

1. **Поиск:**
   - Поле поиска вверху таблицы
   - Поиск по username или chat_id
   - Результаты обновляются при вводе (debounce)

2. **Фильтр по invite link:**
   - Выпадающий список с invite links группы
   - Опция "All" для показа всех участников
   - Опция "Manual" для участников без invite link

3. **Сортировка:**
   - Клик на заголовок колонки для сортировки
   - Индикатор направления сортировки (стрелка вверх/вниз)
   - Сохранение сортировки при обновлении данных

---

## Примеры использования

### Пример 1: Просмотр участников группы

1. Пользователь открывает страницу `/groups/10`
2. Переходит на вкладку "Students"
3. Видит таблицу с участниками группы
4. Видит информацию о invite links для каждого участника
5. Может отсортировать по любой колонке

### Пример 2: Добавление участника вручную

1. Пользователь нажимает кнопку "Add Student"
2. Открывается модальное окно с формой
3. Вводит Chat ID: `123456789`
4. Опционально выбирает invite link (или оставляет пустым)
5. Нажимает "Add"
6. Участник добавляется в таблицу
7. Показывается toast "Participant added successfully"

### Пример 3: Удаление участника

1. Пользователь нажимает кнопку "Remove" в строке участника
2. Появляется подтверждение: "Are you sure you want to remove this participant?"
3. Нажимает "Confirm"
4. Участник удаляется из таблицы
5. Показывается toast "Participant removed successfully"

### Пример 4: Перенос участника между группами

1. Пользователь нажимает кнопку "Transfer" в строке участника
2. Открывается модальное окно с формой переноса
3. Выбирает целевую группу из выпадающего списка
4. Опционально выбирает invite link в целевой группе
5. Нажимает "Transfer"
6. Участник удаляется из текущей группы и добавляется в целевую
7. Показывается toast "Participant transferred successfully"

### Пример 5: Фильтрация по invite link

1. Пользователь выбирает invite link из фильтра
2. Таблица обновляется, показывая только участников, присоединившихся через эту ссылку
3. Видит статистику: сколько участников присоединилось через эту ссылку

---

## Технические детали

### Компоненты

1. **StudentsTab.tsx** — основной компонент вкладки
   - Загружает участников группы
   - Управляет состоянием таблицы
   - Обрабатывает CRUD операции

2. **ParticipantsTable.tsx** — таблица с участниками
   - Отображает список участников
   - Поддерживает сортировку и фильтрацию
   - Обрабатывает действия над участниками

3. **ParticipantRow.tsx** — строка таблицы (для каждого участника)
   - Отображает данные участника
   - Кнопки действий (Edit, Remove, Transfer)

4. **AddParticipantModal.tsx** — модальное окно добавления участника
   - Форма с полями chat_id, username, invite_link_id
   - Валидация и отправка данных

5. **EditParticipantModal.tsx** — модальное окно редактирования участника
   - Форма с редактируемыми полями
   - Валидация и отправка данных

6. **TransferParticipantModal.tsx** — модальное окно переноса участника
   - Выбор целевой группы
   - Выбор invite link в целевой группе
   - Отправка запроса на перенос

### Состояние

```typescript
interface StudentsTabState {
  participants: GroupParticipant[];
  inviteLinks: InviteLink[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  searchQuery: string;
  selectedInviteLink: number | null;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  page: number;
  limit: number;
  total: number;
}
```

### Хуки

- `useGroupParticipants(groupId)` — загрузка участников группы
- `useAddParticipant(groupId)` — добавление участника
- `useUpdateParticipant(groupId, participantId)` — обновление участника
- `useDeleteParticipant(groupId, participantId)` — удаление участника
- `useTransferParticipant(groupId, participantId)` — перенос участника

---

## Чеклист реализации

- [ ] API endpoint для получения участников группы (`GET /api/groups/[groupId]/participants`)
- [ ] API endpoint для добавления участника (`POST /api/groups/[groupId]/participants`)
- [ ] API endpoint для обновления участника (`PATCH /api/groups/[groupId]/participants/[participantId]`)
- [ ] API endpoint для удаления участника (`DELETE /api/groups/[groupId]/participants/[participantId]`)
- [ ] API endpoint для переноса участника (`POST /api/groups/[groupId]/participants/[participantId]/transfer`)
- [ ] Компонент StudentsTab
- [ ] Компонент ParticipantsTable
- [ ] Компонент ParticipantRow
- [ ] Компонент AddParticipantModal
- [ ] Компонент EditParticipantModal
- [ ] Компонент TransferParticipantModal
- [ ] Поиск по username и chat_id
- [ ] Фильтрация по invite link
- [ ] Сортировка по колонкам
- [ ] Пагинация (если нужно)
- [ ] Обработка ошибок
- [ ] Toast уведомления (на английском)
- [ ] Адаптивная верстка
- [ ] Интеграция в GroupDetailsPanel и GroupDetailView
- [ ] Тесты компонентов
- [ ] Тесты API endpoints

---

## Связанные документы

- [Groups Model](groups_model.md) — модель данных групп
- [Course Participants Invite Link Relation](course_participants_invite_link_relation.md) — связь участников с invite links
- [Frontend Page Guidelines](frontend_page_guidelines.md) — стандарты создания страниц
- [Groups Schedule Tab](groups_schedule_tab.md) — требования к вкладке Schedule (для референса)

---

## Важные замечания по реализации

### База данных

- Используется таблица `courseparticipants` с полями `invite_link_id` и `course_group_id`
- При добавлении участника автоматически определяется `course_id` из группы
- При переносе участника обновляются `course_group_id` и `course_id`

### API параметры

- Все endpoints используют `groupId` из URL параметров
- `participantId` передается в URL для операций над конкретным участником
- Query параметры для фильтрации и пагинации

### Интерфейс

- Все тексты на английском языке
- Стили соответствуют course_editor
- Формат даты/времени: en-US (например, "01/15/2024, 12:00 PM")
- Используются стандартные компоненты UI (кнопки, модальные окна, таблицы)

### Интеграция

- Вкладка добавлена в `GroupDetailsPanel` (используется на `/groups`)
- Вкладка добавлена в `GroupDetailView` (используется на `/groups/[groupId]`)
- Оба компонента используют систему вкладок с переключением между "Overview", "Schedule" и "Students"

### Безопасность

- Проверка прав доступа к группе (только участники аккаунта могут управлять группой)
- Валидация данных на сервере
- Защита от SQL инъекций через параметризованные запросы

---

**Дата создания:** 2024  
**Статус:** Требования к реализации  
**Следующие шаги:**
1. Обсуждение требований с командой
2. Создание API endpoints
3. Реализация компонентов фронтенда
4. Тестирование всех сценариев использования
5. Добавление unit тестов для компонентов
6. Добавление интеграционных тестов для API endpoints
