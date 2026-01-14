# Требования к изменению страниц после миграции на модель Групп

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Требования к реализации  
**Основано на:** `groups_model.md`, `database_schema_saas.md`, `saas_pages_list.md`

---

## Обзор

Данный документ описывает требования к изменению существующих страниц веб-приложения после миграции базы данных на модель Групп. Все страницы, работающие с развертываниями курсов (`CourseDeployment`) и токенами приглашений (`EnrollmentToken`), должны быть обновлены для работы с группами (`Group`) и пригласительными ссылками (`InviteLink`).

**Ключевые изменения:**
- `CourseDeployment` → `Group` (группы)
- `EnrollmentToken` → `InviteLink` (пригласительные ссылки)
- Добавление управления расписанием (`Schedule`)
- Изменение формата deep links: `cd_<deployment_id>_<token>` → `group_<group_id>_<token>`

---

## 0. Текущее состояние проекта

### 0.1. Существующие страницы

**✅ Существуют:**
- `/deployments` → `app/deployments/page.tsx`
- `/deployments/[deploymentId]` → `app/deployments/[deploymentId]/page.tsx`
- `/courses` → `app/courses/page.tsx`
- `/courses/[courseId]` → `app/courses/[courseId]/page.tsx`
- `/course-editor` → `app/course-editor/page.tsx`
- `/course-editor/[courseId]` → `app/course-editor/[courseId]/page.tsx`
- `/bots` → `app/bots/page.tsx`
- `/bots/[botId]` → `app/bots/[botId]/page.tsx`
- `/course/[courseId]` → `app/course/[courseId]/page.tsx` (страница прохождения курса для студентов)

**❌ Не существуют (требуют создания):**
- `/groups` → `app/groups/page.tsx`
- `/groups/[groupId]` → `app/groups/[groupId]/page.tsx`
- `/groups/[groupId]/invites` → `app/groups/[groupId]/invites/page.tsx` (опционально)
- `/groups/[groupId]/schedule` → `app/groups/[groupId]/schedule/page.tsx` (опционально)

### 0.2. Существующие компоненты

**✅ Существуют:**
- `components/deployments/DeploymentsList.tsx`
- `components/deployments/DeploymentDetailView.tsx`
- `components/courses/CoursesList.tsx`
- `components/course-editor/CourseEditor.tsx`
- `components/course-editor/CourseListEditor.tsx`
- `components/bots/BotManagement.tsx`
- `components/bots/BotEditPage.tsx`
- `components/bots/ConnectedCoursesSection.tsx`

**❌ Не существуют (требуют создания):**
- `components/groups/GroupsList.tsx`
- `components/groups/GroupDetailView.tsx`
- `components/groups/InviteLinksManager.tsx`
- `components/groups/ScheduleManager.tsx`

### 0.3. Существующие API endpoints

**✅ Существуют:**
- `GET/POST /api/deployments` → `app/api/deployments/route.ts`
- `GET/PUT/DELETE /api/deployments/[deploymentId]` → `app/api/deployments/[deploymentId]/route.ts`
- `GET/POST /api/deployments/[deploymentId]/invite` → `app/api/deployments/[deploymentId]/invite/route.ts`
- `GET /api/deployments/[deploymentId]/runs` → `app/api/deployments/[deploymentId]/runs/route.ts`
- `GET/POST /api/bots/[botId]/courses` → `app/api/bots/[botId]/courses/route.ts` (использует `course_deployment`)
- `GET/POST /api/courses` → `app/api/courses/route.ts`
- `GET/PUT/DELETE /api/v1/courses/[courseId]` → `app/api/v1/courses/[courseId]/route.ts`

**❌ Не существуют (требуют создания):**
- `GET/POST /api/groups` → `app/api/groups/route.ts`
- `GET/PUT/DELETE /api/groups/[groupId]` → `app/api/groups/[groupId]/route.ts`
- `GET/POST /api/groups/[groupId]/invites` → `app/api/groups/[groupId]/invites/route.ts`
- `GET/PUT/DELETE /api/groups/[groupId]/invites/[inviteLinkId]` → `app/api/groups/[groupId]/invites/[inviteLinkId]/route.ts`
- `GET/POST/DELETE /api/groups/[groupId]/schedule` → `app/api/groups/[groupId]/schedule/route.ts`
- `GET /api/groups/[groupId]/runs` → `app/api/groups/[groupId]/runs/route.ts`

### 0.4. Навигация

**Текущее состояние:**
- ✅ `AppSidebar.tsx` — пункт "Groups" существует, но `disabled: true` и `future: true`
- ✅ `Header.tsx` — ссылка "Deployments" существует с `href="/deployments"`

**Требуемые изменения:**
- Активировать пункт "Groups" в `AppSidebar.tsx`
- Заменить ссылку "Deployments" на "Groups" в `Header.tsx`

### 0.5. Дополнительные файлы для проверки

**Файлы с упоминаниями "deployment" или "Deployment":**
- ✅ `components/bots/BotEditPage.tsx` — упоминание "course deployments" (строка 447)
- ✅ `components/bots/BotManagement.tsx` — упоминание "course deployments" (строка 564)
- ✅ `app/api/bots/[botId]/courses/route.ts` — использует таблицу `course_deployment` (строки 52-64, 197-225)

**Требуемые изменения:**
- Обновить все упоминания "deployment" / "Deployment" на "group" / "Group"
- Обновить SQL запросы для использования таблицы `group` вместо `course_deployment`
- Обновить текстовые сообщения в UI

---

## 1. Изменения в навигации и маршрутах

### 1.1. Переименование маршрутов

**Существующие маршруты (требуют замены):**
- ✅ `/deployments` (существует: `app/deployments/page.tsx`) → `/groups`
- ✅ `/deployments/[deploymentId]` (существует: `app/deployments/[deploymentId]/page.tsx`) → `/groups/[groupId]`

**Новые маршруты (требуют создания):**
- ❌ `/groups` — список групп (создать новый файл)
- ❌ `/groups/[groupId]` — детали группы (создать новый файл)
- ❌ `/groups/[groupId]/invites` — управление пригласительными ссылками (создать новый файл, опционально - может быть секцией на странице группы)
- ❌ `/groups/[groupId]/schedule` — управление расписанием группы (создать новый файл, опционально - может быть секцией на странице группы)

**Примечание:** Страницы `/groups/[groupId]/invites` и `/groups/[groupId]/schedule` могут быть реализованы как секции на странице деталей группы, а не как отдельные страницы.

### 1.2. Обновление навигации

**Файл:** `webapp/frontend/components/layout/AppSidebar.tsx`

**Текущее состояние:**
- ✅ Пункт меню "Groups" уже существует, но `disabled: true` и `future: true`
- ✅ Иконка `Users` уже используется

**Изменения:**
- Убрать `disabled: true` и `future: true` у пункта "Groups"
- Обновить `href` с `#` на `/groups`
- Удалить или обновить пункт "Invites" (может быть подгруппой Groups или удален, если управление ссылками будет на странице группы)

**Файл:** `webapp/frontend/components/layout/Header.tsx`

**Текущее состояние:**
- ✅ Ссылка "Deployments" существует с `href="/deployments"`

**Изменения:**
- Заменить текст ссылки "Deployments" на "Groups"
- Обновить `href` с `/deployments` на `/groups`

---

## 2. Изменения в типах TypeScript

### 2.1. Обновление типов

**Файл:** `webapp/frontend/lib/types/types.ts` (существует, строки 132-172)

**Текущие типы (требуют замены):**
```typescript
// Строки 132-158
export interface Deployment {
  deployment_id: number;
  course_id: string;  // После миграции 0004 должен быть number
  account_id: number;
  bot_id: number;
  name?: string;
  environment?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
  // ...
}

// Строки 160-172
export interface EnrollmentToken {
  token_id: number;
  deployment_id: number;
  token: string;
  token_type: 'public' | 'group' | 'personal' | 'external';
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  created_at: string;
  created_by?: number;
  is_active: boolean;
  metadata?: Record<string, any>;
}

// Строки 174-191 - также требует обновления
export interface Run {
  run_id: number;
  deployment_id: number;  // → group_id
  // ...
  token_id?: number;  // → invite_link_id
}
```

**Действия:**
- Заменить `Deployment` на `Group`
- Заменить `EnrollmentToken` на `InviteLink`
- Обновить `Run`: `deployment_id` → `group_id`, `token_id` → `invite_link_id`
- Добавить новый тип `Schedule`

**Добавить (после удаления старых типов):**
```typescript
export interface Group {
  group_id: number;
  account_id: number;
  bot_id: number;
  course_id: number; // INT после миграции 0004
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
  // Joined fields (from API)
  course?: {
    course_id: number;
    course_code: string;
    title: string;
  };
  bot?: {
    bot_id: number;
    bot_name: string;
    display_name?: string;
  };
  schedule?: Schedule;
  // Statistics
  stats?: {
    active_runs: number;
    completed_runs: number;
    total_students: number;
    active_invite_links: number;
  };
}

export interface InviteLink {
  invite_link_id: number;
  group_id: number;
  token: string;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  created_at: string;
  created_by?: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  // Joined fields
  group?: Group;
  // Computed fields
  invite_url?: string; // Полная ссылка для приглашения
}

export interface Schedule {
  schedule_id: number;
  group_id: number;
  schedule_type: 'weekly' | 'daily' | 'custom';
  schedule_config: {
    // Для weekly
    day_of_week?: number; // 0-6 (0 = воскресенье)
    time?: string; // HH:MM
    timezone?: string;
    // Для daily
    // time?: string;
    // timezone?: string;
    // Для custom
    dates?: string[]; // ISO date strings
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Обновить существующий тип `Run`:**
```typescript
export interface Run {
  run_id: number;
  group_id: number;  // Было: deployment_id
  account_id: number;
  bot_id: number;
  chat_id: number;
  username?: string;
  course_id: number;  // Теперь INT после миграции 0004
  invite_link_id?: number;  // Было: token_id
  date_inserted: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  is_ended?: boolean;
  is_active: boolean;
  ended_at?: string;
  metadata?: Record<string, any>;
}
```

---

## 3. Изменения в API endpoints

### 3.1. Переименование и обновление endpoints

**Существующие endpoints (требуют замены):**
- ✅ `GET /api/deployments` (существует: `app/api/deployments/route.ts`) → `GET /api/groups`
- ✅ `POST /api/deployments` (существует: `app/api/deployments/route.ts`) → `POST /api/groups`
- ✅ `GET /api/deployments/[deploymentId]` (существует: `app/api/deployments/[deploymentId]/route.ts`) → `GET /api/groups/[groupId]`
- ✅ `PUT /api/deployments/[deploymentId]` (существует: `app/api/deployments/[deploymentId]/route.ts`) → `PUT /api/groups/[groupId]`
- ✅ `DELETE /api/deployments/[deploymentId]` (существует: `app/api/deployments/[deploymentId]/route.ts`) → `DELETE /api/groups/[groupId]`
- ✅ `GET /api/deployments/[deploymentId]/invite` (существует: `app/api/deployments/[deploymentId]/invite/route.ts`) → `GET /api/groups/[groupId]/invites`
- ✅ `POST /api/deployments/[deploymentId]/invite` (существует: `app/api/deployments/[deploymentId]/invite/route.ts`) → `POST /api/groups/[groupId]/invites`
- ✅ `GET /api/deployments/[deploymentId]/runs` (существует: `app/api/deployments/[deploymentId]/runs/route.ts`) → `GET /api/groups/[groupId]/runs`

**Новые endpoints (требуют создания):**
- ❌ `GET /api/groups` — список групп (создать: `app/api/groups/route.ts`)
- ❌ `POST /api/groups` — создать группу (создать: `app/api/groups/route.ts`)
- ❌ `GET /api/groups/[groupId]` — получить детали группы (создать: `app/api/groups/[groupId]/route.ts`)
- ❌ `PUT /api/groups/[groupId]` — обновить группу (создать: `app/api/groups/[groupId]/route.ts`)
- ❌ `DELETE /api/groups/[groupId]` — удалить группу (создать: `app/api/groups/[groupId]/route.ts`)
- ❌ `GET /api/groups/[groupId]/invites` — список пригласительных ссылок (создать: `app/api/groups/[groupId]/invites/route.ts`)
- ❌ `POST /api/groups/[groupId]/invites` — создать пригласительную ссылку (создать: `app/api/groups/[groupId]/invites/route.ts`)
- ❌ `GET /api/groups/[groupId]/invites/[inviteLinkId]` — получить детали пригласительной ссылки (создать: `app/api/groups/[groupId]/invites/[inviteLinkId]/route.ts`)
- ❌ `PUT /api/groups/[groupId]/invites/[inviteLinkId]` — обновить пригласительную ссылку (создать: `app/api/groups/[groupId]/invites/[inviteLinkId]/route.ts`)
- ❌ `DELETE /api/groups/[groupId]/invites/[inviteLinkId]` — удалить пригласительную ссылку (создать: `app/api/groups/[groupId]/invites/[inviteLinkId]/route.ts`)
- ❌ `GET /api/groups/[groupId]/schedule` — получить расписание группы (создать: `app/api/groups/[groupId]/schedule/route.ts`)
- ❌ `POST /api/groups/[groupId]/schedule` — создать/обновить расписание (создать: `app/api/groups/[groupId]/schedule/route.ts`)
- ❌ `DELETE /api/groups/[groupId]/schedule` — удалить расписание (создать: `app/api/groups/[groupId]/schedule/route.ts`)
- ❌ `GET /api/groups/[groupId]/runs` — список сессий группы (создать: `app/api/groups/[groupId]/runs/route.ts`)

### 3.2. Изменения в структуре данных API

**GET /api/groups**

**Параметры запроса:**
- `course_id` (number) — фильтр по курсу
- `bot_id` (number) — фильтр по боту
- `status` ('all' | 'active' | 'archived') — фильтр по статусу
- `search` (string) — поиск по названию группы

**Ответ:**
```json
{
  "groups": [
    {
      "group_id": 1,
      "name": "Python Basics - Group A",
      "description": "Группа для изучения основ Python",
      "course_id": 1,
      "bot_id": 1,
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "course": {
        "course_id": 1,
        "course_code": "python_basics",
        "title": "Python Basics"
      },
      "bot": {
        "bot_id": 1,
        "bot_name": "learnbot",
        "display_name": "Learning Bot"
      },
      "schedule": {
        "schedule_id": 1,
        "schedule_type": "weekly",
        "schedule_config": {
          "day_of_week": 1,
          "time": "09:00",
          "timezone": "UTC"
        },
        "is_active": true
      },
      "stats": {
        "active_runs": 5,
        "completed_runs": 12,
        "total_students": 17,
        "active_invite_links": 2
      }
    }
  ],
  "total": 1
}
```

**POST /api/groups**

**Тело запроса:**
```json
{
  "bot_id": 1,
  "course_id": 1,
  "name": "Python Basics - Group A",
  "description": "Группа для изучения основ Python",
  "create_default_invite": true,
  "schedule": {
    "type": "weekly",
    "config": {
      "day_of_week": 1,
      "time": "09:00",
      "timezone": "UTC"
    }
  }
}
```

**Ответ:**
```json
{
  "group": {
    "group_id": 1,
    // ... все поля группы
  },
  "invite_link": {
    "invite_link_id": 1,
    "token": "abc123",
    "invite_url": "https://t.me/learnbot?start=group_1_abc123"
  },
  "message": "Group created successfully"
}
```

**GET /api/groups/[groupId]/invites**

**Ответ:**
```json
{
  "invite_links": [
    {
      "invite_link_id": 1,
      "token": "abc123",
      "max_uses": 50,
      "current_uses": 12,
      "expires_at": null,
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "invite_url": "https://t.me/learnbot?start=group_1_abc123"
    }
  ],
  "total": 1
}
```

**POST /api/groups/[groupId]/invites**

**Тело запроса:**
```json
{
  "max_uses": 50,
  "expires_at": "2024-12-31T23:59:59Z",
  "metadata": {
    "utm_source": "email",
    "utm_campaign": "winter2024"
  }
}
```

**Ответ:**
```json
{
  "invite_link": {
    "invite_link_id": 2,
    "token": "xyz789",
    "invite_url": "https://t.me/learnbot?start=group_1_xyz789"
  },
  "message": "Invite link created successfully"
}
```

---

## 4. Изменения в страницах

### 4.1. Страница списка групп (бывшая Deployments)

**Текущий файл:** `webapp/frontend/app/deployments/page.tsx` (существует)
- Использует компонент `DeploymentsList` из `components/deployments/DeploymentsList.tsx`

**Новый файл:** `webapp/frontend/app/groups/page.tsx` (создать новый файл)

**Изменения:**
- Создать новый файл `app/groups/page.tsx`
- Использовать компонент `GroupsList` (создать новый: `components/groups/GroupsList.tsx`)
- Обновить все ссылки с `/deployments` на `/groups`
- Изменить терминологию: "развертывание" → "группа"
- Добавить колонку "Расписание" (если есть)
- Обновить фильтры: убрать `environment`, добавить фильтр по наличию расписания

**Примечание:** Старый файл `/deployments/page.tsx` можно удалить после успешной миграции.

**Функционал:**
- Отображение списка групп с информацией:
  - Название группы
  - Курс (ссылка на редактирование)
  - Бот
  - Расписание (если есть)
  - Количество активных студентов
  - Количество пригласительных ссылок
  - Статус (активна/неактивна)
- Фильтрация:
  - По курсу
  - По боту
  - По статусу
  - По наличию расписания
- Поиск по названию группы
- Быстрые действия:
  - Просмотр деталей
  - Редактирование
  - Управление пригласительными ссылками
  - Управление расписанием
  - Деактивация/активация
  - Удаление

**UI элементы:**
- Таблица или карточки со списком групп
- Поисковая строка
- Фильтры
- Кнопка "Создать группу"
- Действия для каждой группы

---

### 4.2. Страница деталей группы

**Текущий файл:** `webapp/frontend/app/deployments/[deploymentId]/page.tsx` (существует)
- Использует компонент `DeploymentDetailView` из `components/deployments/DeploymentDetailView.tsx`

**Новый файл:** `webapp/frontend/app/groups/[groupId]/page.tsx` (создать новый файл)

**Изменения:**
- Создать новый файл `app/groups/[groupId]/page.tsx`
- Использовать компонент `GroupDetailView` (создать новый: `components/groups/GroupDetailView.tsx`)
- Обновить все ссылки и API вызовы
- Добавить секцию управления расписанием
- Изменить секцию управления токенами на управление пригласительными ссылками

**Примечание:** Старый файл `/deployments/[deploymentId]/page.tsx` можно удалить после успешной миграции.

**Функционал:**
- Информация о группе:
  - Название и описание
  - Курс (ссылка на редактирование)
  - Бот (ссылка на редактирование)
  - Статус активности
  - Дата создания и обновления
- Управление расписанием:
  - Просмотр текущего расписания (если есть)
  - Создание расписания
  - Редактирование расписания
  - Удаление расписания
  - Предпросмотр расписания (календарь)
- Управление пригласительными ссылками:
  - Список всех пригласительных ссылок
  - Создание новой ссылки
  - Редактирование существующей ссылки
  - Копирование ссылки приглашения
  - Деактивация/удаление ссылки
- Статистика:
  - Количество активных студентов
  - Количество завершенных курсов
  - Количество использований пригласительных ссылок
- Действия:
  - Сохранение изменений
  - Деактивация/активация группы
  - Удаление группы (с проверкой зависимостей)

**UI элементы:**
- Форма редактирования группы
- Секция расписания с календарем/предпросмотром
- Таблица пригласительных ссылок
- Кнопка "Создать пригласительную ссылку"
- Статистика
- Кнопки действий

---

### 4.3. Страница управления пригласительными ссылками

**Файл:** `webapp/frontend/app/groups/[groupId]/invites/page.tsx` (новый файл, опционально)

**Описание:** Страница управления всеми пригласительными ссылками группы.

**Варианты реализации:**
1. **Отдельная страница** (если нужна полная функциональность)
2. **Секция на странице группы** (рекомендуется для упрощения навигации)

**Если реализуется как отдельная страница:**
- Создать файл `app/groups/[groupId]/invites/page.tsx`
- Использовать компонент `InviteLinksManager` (создать: `components/groups/InviteLinksManager.tsx`)

**Если реализуется как секция:**
- Добавить вкладку/секцию "Пригласительные ссылки" в `GroupDetailView`
- Использовать компонент `InviteLinksManager` внутри `GroupDetailView`

**Функционал:**
- Список всех пригласительных ссылок группы
- Создание новой ссылки
- Редактирование существующей ссылки
- Копирование ссылки приглашения
- Просмотр статистики использования
- Деактивация/удаление ссылки

**UI элементы:**
- Таблица пригласительных ссылок
- Кнопка "Создать ссылку"
- Модальное окно создания/редактирования
- Кнопка копирования ссылки
- Статистика использования

---

### 4.4. Страница управления расписанием

**Файл:** `webapp/frontend/app/groups/[groupId]/schedule/page.tsx` (новый файл, опционально)

**Описание:** Страница управления расписанием группы.

**Варианты реализации:**
1. **Отдельная страница** (если нужна полная функциональность)
2. **Секция на странице группы** (рекомендуется для упрощения навигации)

**Если реализуется как отдельная страница:**
- Создать файл `app/groups/[groupId]/schedule/page.tsx`
- Использовать компонент `ScheduleManager` (создать: `components/groups/ScheduleManager.tsx`)

**Если реализуется как секция:**
- Добавить вкладку/секцию "Расписание" в `GroupDetailView`
- Использовать компонент `ScheduleManager` внутри `GroupDetailView`

**Функционал:**
- Просмотр текущего расписания
- Создание расписания:
  - Выбор типа (еженедельное, ежедневное, кастомное)
  - Настройка параметров расписания
  - Предпросмотр расписания
- Редактирование существующего расписания
- Удаление расписания
- Визуализация расписания (календарь)

**UI элементы:**
- Форма создания/редактирования расписания
- Выбор типа расписания (radio buttons или tabs)
- Поля для настройки параметров
- Календарь/визуализация расписания
- Кнопки сохранения/удаления

---

### 4.5. Страница списка курсов

**Текущие файлы:**
- ✅ `webapp/frontend/app/courses/page.tsx` (существует)
- ✅ `webapp/frontend/components/courses/CoursesList.tsx` (существует)

**Изменения:**
- Обновить компонент `CoursesList.tsx`:
  - Обновить колонку "Подключенные боты":
    - Вместо "развертывания" показывать "группы"
    - Отображать список ботов, на которых курс развернут через группы
    - Формат: badges/tags со ссылками на группы
  - Обновить проверку зависимостей при удалении:
    - Проверять наличие групп вместо развертываний
    - Текст ошибки: "Cannot delete course. This course is connected to one or more groups. Please remove all groups before deleting the course."
- Обновить API вызовы:
  - Изменить запросы с `/api/deployments` на `/api/groups` где необходимо

**API изменения:**
- Обновить `GET /api/v1/courses` для включения информации о группах
- Добавить поле `groups` в ответ API:
```json
{
  "courses": [
    {
      "course_id": 1,
      "title": "Python Basics",
      "groups": [
        {
          "group_id": 1,
          "name": "Python Basics - Group A",
          "bot": {
            "bot_id": 1,
            "bot_name": "learnbot"
          }
        }
      ]
    }
  ]
}
```

---

### 4.6. Страница редактирования курса

**Текущий файл:**
- ✅ `webapp/frontend/app/course-editor/[courseId]/page.tsx` (существует)
- ✅ Использует компонент `CourseEditor` из `components/course-editor/CourseEditor.tsx`

**Изменения:**
- Обновить компонент `CourseEditor.tsx`:
  - Добавить секцию "Группы" для отображения групп этого курса
  - Показывать список групп с ссылками на страницы групп
  - Добавить кнопку "Создать группу" для этого курса

**Функционал:**
- Просмотр связанных групп:
  - Список групп с названием и ботом
  - Ссылки на страницы групп
  - Статистика по группам
- Быстрое создание группы:
  - Кнопка "Создать группу"
  - Модальное окно с формой создания
  - Выбор бота (если не указан в контексте)

---

### 4.7. Страница редактирования бота

**Текущие файлы:**
- ✅ `webapp/frontend/app/bots/[botId]/page.tsx` (существует)
- ✅ Использует компонент `BotEditPage` из `components/bots/BotEditPage.tsx`
- ✅ Использует компонент `ConnectedCoursesSection` из `components/bots/ConnectedCoursesSection.tsx`
- ✅ API endpoint: `/api/bots/[botId]/courses/route.ts` (существует, использует `course_deployment`)

**Изменения:**

**1. Компонент `BotEditPage.tsx`:**
- Обновить текст: "course deployments" → "groups"
- Обновить сообщение при удалении: "all associated course deployments" → "all associated groups"

**2. Компонент `ConnectedCoursesSection.tsx`:**
- Обновить логику: вместо отображения развертываний показывать группы
- Обновить API вызовы: `/api/bots/[botId]/courses` должен возвращать группы вместо развертываний

**3. API endpoint `/api/bots/[botId]/courses/route.ts`:**
- Обновить SQL запросы: использовать таблицу `group` вместо `course_deployment`
- Изменить структуру ответа: возвращать группы вместо развертываний
- Обновить POST метод: создавать группы вместо развертываний

**Функционал:**
- Просмотр связанных групп:
  - Список групп с названием и курсом
  - Ссылки на страницы групп
  - Статистика по группам
- Быстрое создание группы:
  - Кнопка "Создать группу"
  - Модальное окно с формой создания
  - Выбор курса

---

## 5. Изменения в компонентах

### 5.1. Компонент списка групп

**Текущий файл:**
- ✅ `webapp/frontend/components/deployments/DeploymentsList.tsx` (существует)

**Новый файл:**
- ❌ `webapp/frontend/components/groups/GroupsList.tsx` (создать новый файл)

**Изменения:**
- Создать новый компонент `GroupsList.tsx` на основе `DeploymentsList.tsx`
- Переименовать все переменные и функции:
  - `deployments` → `groups`
  - `Deployment` → `Group`
  - `deploymentId` → `groupId`
- Обновить API вызовы с `/api/deployments` на `/api/groups`
- Обновить типы с `Deployment` на `Group`
- Добавить отображение расписания (колонка или badge)
- Обновить фильтры: убрать `environment`, добавить фильтр по наличию расписания

**Ключевые изменения:**
```typescript
// Было:
const [deployments, setDeployments] = useState<Deployment[]>([]);
fetch('/api/deployments')

// Стало:
const [groups, setGroups] = useState<Group[]>([]);
fetch('/api/groups')
```

**Примечание:** Старый компонент `DeploymentsList.tsx` можно удалить после успешной миграции.

---

### 5.2. Компонент деталей группы

**Текущий файл:**
- ✅ `webapp/frontend/components/deployments/DeploymentDetailView.tsx` (существует)

**Новый файл:**
- ❌ `webapp/frontend/components/groups/GroupDetailView.tsx` (создать новый файл)

**Изменения:**
- Создать новый компонент `GroupDetailView.tsx` на основе `DeploymentDetailView.tsx`
- Переименовать все переменные и функции:
  - `deployment` → `group`
  - `deploymentId` → `groupId`
  - `Deployment` → `Group`
- Обновить API вызовы:
  - `/api/deployments/[deploymentId]` → `/api/groups/[groupId]`
  - `/api/deployments/[deploymentId]/invite` → `/api/groups/[groupId]/invites`
- Добавить секцию управления расписанием (вкладка или секция)
- Заменить секцию управления токенами на управление пригласительными ссылками
- Обновить формат ссылок приглашения

**Ключевые изменения:**
- Формат ссылки: `https://t.me/<bot_username>?start=group_<group_id>_<token>`
- Управление расписанием вместо окружения (environment)
- Пригласительные ссылки вместо токенов
- Убрать поле `environment`, добавить секцию `schedule`

**Примечание:** Старый компонент `DeploymentDetailView.tsx` можно удалить после успешной миграции.

---

### 5.3. Компонент управления пригласительными ссылками

**Файл:** `webapp/frontend/components/groups/InviteLinksManager.tsx` (новый файл)

**Описание:** Компонент для управления пригласительными ссылками группы.

**Функционал:**
- Список пригласительных ссылок
- Создание новой ссылки
- Редактирование существующей ссылки
- Копирование ссылки
- Деактивация/удаление ссылки
- Просмотр статистики использования

**UI элементы:**
- Таблица пригласительных ссылок
- Модальное окно создания/редактирования
- Кнопка копирования ссылки
- Индикаторы использования (current_uses / max_uses)

---

### 5.4. Компонент управления расписанием

**Файл:** `webapp/frontend/components/groups/ScheduleManager.tsx` (новый файл)

**Описание:** Компонент для управления расписанием группы.

**Функционал:**
- Просмотр текущего расписания
- Создание расписания (выбор типа и настройка параметров)
- Редактирование расписания
- Удаление расписания
- Визуализация расписания

**UI элементы:**
- Форма выбора типа расписания
- Поля для настройки параметров
- Календарь/визуализация
- Кнопки сохранения/удаления

---

## 6. Изменения в backend API

### 6.1. Обновление API routes

**Frontend API routes (Next.js API routes):**

**Файлы для создания:**
- ❌ `webapp/frontend/app/api/groups/route.ts` (создать новый файл)
- ❌ `webapp/frontend/app/api/groups/[groupId]/route.ts` (создать новый файл)
- ❌ `webapp/frontend/app/api/groups/[groupId]/invites/route.ts` (создать новый файл)
- ❌ `webapp/frontend/app/api/groups/[groupId]/invites/[inviteLinkId]/route.ts` (создать новый файл)
- ❌ `webapp/frontend/app/api/groups/[groupId]/schedule/route.ts` (создать новый файл)
- ❌ `webapp/frontend/app/api/groups/[groupId]/runs/route.ts` (создать новый файл)

**Файлы для обновления:**
- ✅ `webapp/frontend/app/api/bots/[botId]/courses/route.ts` (существует, обновить для работы с группами)

**Файлы для удаления/замены:**
- ✅ `webapp/frontend/app/api/deployments/route.ts` (существует, удалить после миграции)
- ✅ `webapp/frontend/app/api/deployments/[deploymentId]/route.ts` (существует, удалить после миграции)
- ✅ `webapp/frontend/app/api/deployments/[deploymentId]/invite/route.ts` (существует, удалить после миграции)
- ✅ `webapp/frontend/app/api/deployments/[deploymentId]/runs/route.ts` (существует, удалить после миграции)

**Backend API routes (FastAPI, если используется):**

**Файлы для создания/обновления:**
- `webapp/backend/app/api/groups.py` (новый файл или обновить существующий)
- `webapp/backend/app/api/invite_links.py` (новый файл)
- `webapp/backend/app/api/schedules.py` (новый файл)

**Файлы для удаления/замены:**
- `webapp/backend/app/api/deployments.py` → удалить или заменить на `groups.py`
- `webapp/backend/app/api/enrollment_tokens.py` → удалить или заменить на `invite_links.py`

### 6.2. Обновление моделей SQLAlchemy

**Файлы для создания:**
- `webapp/backend/app/models/group_db.py` (новый файл)
- `webapp/backend/app/models/invite_link_db.py` (новый файл)
- `webapp/backend/app/models/schedule_db.py` (новый файл)

**Файлы для обновления:**
- `webapp/backend/app/models/run_db.py` — обновить связи с группой вместо развертывания

### 6.3. Изменения в логике

**Обработка команды `/start`:**
- Старый формат: `/start cd_<deployment_id>_<token>`
- Новый формат: `/start group_<group_id>_<token>`

**Файлы для обновления:**
- `main.py` или соответствующий обработчик команд Telegram бота (в корне проекта или `webapp/backend/`)
- Обновить парсинг команды `/start`
- Обновить валидацию пригласительной ссылки
- Обновить создание сессии (`run`) с привязкой к группе вместо развертывания

**Примечание:** Обработчик команды `/start` находится в основном боте (не в веб-приложении), но изменения в логике должны быть синхронизированы с изменениями в веб-приложении.

---

## 7. Изменения в формате deep links

### 7.1. Старый формат (устаревший)
```
https://t.me/<bot_username>?start=cd_<deployment_id>_<token>
```

### 7.2. Новый формат
```
https://t.me/<bot_username>?start=group_<group_id>_<token>
```

### 7.3. Обратная совместимость

**Требование:** Поддержать старый формат в течение переходного периода.

**Реализация:**
- Обработчик команды `/start` должен проверять оба формата
- Если формат `cd_<deployment_id>_<token>`, найти соответствующую группу через миграцию данных
- Если формат `group_<group_id>_<token>`, использовать напрямую
- После переходного периода удалить поддержку старого формата

---

## 8. Приоритеты реализации

### Phase 1: Критические изменения (высокий приоритет)

1. **Обновление типов TypeScript**
   - Создать новые типы `Group`, `InviteLink`, `Schedule`
   - Удалить старые типы `Deployment`, `EnrollmentToken`

2. **Обновление API endpoints**
   - Создать `/api/groups` endpoints
   - Создать `/api/groups/[groupId]/invites` endpoints
   - Создать `/api/groups/[groupId]/schedule` endpoints

3. **Обновление страницы списка групп**
   - Переименовать `/deployments` → `/groups`
   - Обновить компонент `GroupsList`
   - Обновить навигацию

4. **Обновление страницы деталей группы**
   - Переименовать `/deployments/[deploymentId]` → `/groups/[groupId]`
   - Обновить компонент `GroupDetailView`
   - Добавить секцию управления расписанием

### Phase 2: Управление пригласительными ссылками (высокий приоритет)

1. **Создание компонента управления пригласительными ссылками**
   - Компонент `InviteLinksManager`
   - Страница `/groups/[groupId]/invites`

2. **Обновление формата deep links**
   - Обновить генерацию ссылок приглашения
   - Обновить обработчик команды `/start` в боте

### Phase 3: Управление расписанием (средний приоритет)

1. **Создание компонента управления расписанием**
   - Компонент `ScheduleManager`
   - Страница `/groups/[groupId]/schedule`

2. **Интеграция с планировщиком**
   - Обновить логику отправки задач по расписанию
   - Интеграция с APScheduler

### Phase 4: Обновление связанных страниц (средний приоритет)

1. **Обновление страницы курсов**
   - Показывать группы вместо развертываний
   - Обновить проверку зависимостей при удалении

2. **Обновление страницы ботов**
   - Показывать группы вместо развертываний
   - Обновить API вызовы

3. **Обновление страницы редактирования курса**
   - Добавить секцию "Группы"
   - Добавить кнопку создания группы

### Phase 5: Очистка (низкий приоритет)

1. **Удаление старых файлов**
   - Удалить компоненты `DeploymentsList`, `DeploymentDetailView`
   - Удалить старые API endpoints
   - Удалить старые типы

2. **Обновление документации**
   - Обновить README
   - Обновить комментарии в коде

---

## 9. Детальные требования к компонентам

### 9.1. Компонент GroupsList

**Функционал:**
- Загрузка списка групп через `GET /api/groups`
- Фильтрация по курсу, боту, статусу, наличию расписания
- Поиск по названию группы
- Отображение информации:
  - Название группы
  - Курс (ссылка)
  - Бот
  - Расписание (если есть)
  - Количество студентов
  - Количество пригласительных ссылок
  - Статус
- Действия:
  - Просмотр деталей
  - Редактирование
  - Управление пригласительными ссылками
  - Управление расписанием
  - Деактивация/активация
  - Удаление

**UI требования:**
- Таблица или карточки
- Поисковая строка
- Фильтры (dropdown или chips)
- Кнопка "Создать группу"
- Индикаторы загрузки и ошибок

---

### 9.2. Компонент GroupDetailView

**Функционал:**
- Загрузка деталей группы через `GET /api/groups/[groupId]`
- Редактирование информации о группе
- Управление расписанием (встроенное или ссылка на отдельную страницу)
- Управление пригласительными ссылками (встроенное или ссылка на отдельную страницу)
- Просмотр статистики
- Действия: сохранение, деактивация, удаление

**UI требования:**
- Форма редактирования
- Секции: Информация, Расписание, Пригласительные ссылки, Статистика
- Вкладки или аккордеон для организации секций
- Кнопки действий

---

### 9.3. Компонент InviteLinksManager

**Функционал:**
- Загрузка списка пригласительных ссылок через `GET /api/groups/[groupId]/invites`
- Создание новой ссылки через `POST /api/groups/[groupId]/invites`
- Редактирование ссылки через `PUT /api/groups/[groupId]/invites/[inviteLinkId]`
- Удаление ссылки через `DELETE /api/groups/[groupId]/invites/[inviteLinkId]`
- Копирование ссылки приглашения в буфер обмена
- Просмотр статистики использования

**UI требования:**
- Таблица пригласительных ссылок
- Модальное окно создания/редактирования
- Поля формы:
  - Максимальное количество использований (опционально)
  - Срок действия (опционально)
  - Метаданные (JSON редактор, опционально)
- Кнопка копирования ссылки
- Индикаторы использования (progress bar или badge)

---

### 9.4. Компонент ScheduleManager

**Функционал:**
- Загрузка расписания через `GET /api/groups/[groupId]/schedule`
- Создание расписания через `POST /api/groups/[groupId]/schedule`
- Обновление расписания через `PUT /api/groups/[groupId]/schedule`
- Удаление расписания через `DELETE /api/groups/[groupId]/schedule`
- Визуализация расписания

**UI требования:**
- Форма выбора типа расписания (radio buttons или tabs)
- Поля для настройки параметров в зависимости от типа:
  - Еженедельное: день недели, время, часовой пояс
  - Ежедневное: время, часовой пояс
  - Кастомное: список дат
- Календарь/визуализация расписания
- Кнопки сохранения/удаления

---

## 10. Миграция данных в UI

### 10.1. Обратная совместимость

**Требование:** Поддержать отображение старых данных (развертываний) в течение переходного периода.

**Реализация:**
- Если в БД еще есть `course_deployment`, показывать их как группы (через маппинг)
- Автоматически преобразовывать старые данные при отображении
- После полной миграции данных удалить поддержку старых форматов

### 10.2. Миграция существующих компонентов

**Стратегия:**
1. Создать новые компоненты параллельно со старыми
2. Обновить маршруты для использования новых компонентов
3. Протестировать новые компоненты
4. Удалить старые компоненты после успешного тестирования

---

## 11. Тестирование

### 11.1. Unit тесты

**Требования:**
- Тесты для всех новых компонентов
- Тесты для обновленных компонентов
- Тесты для API endpoints

### 11.2. Integration тесты

**Требования:**
- Тесты для создания группы
- Тесты для создания пригласительной ссылки
- Тесты для создания расписания
- Тесты для начала курса через пригласительную ссылку

### 11.3. E2E тесты

**Требования:**
- Тест создания группы и пригласительной ссылки
- Тест начала курса через пригласительную ссылку
- Тест управления расписанием

---

## 12. Документация

### 12.1. Обновление документации

**Файлы для обновления:**
- `README.md` — обновить описание архитектуры
- Комментарии в коде — обновить примеры использования
- API документация — обновить endpoints

### 12.2. Создание руководств

**Руководства для создания:**
- Руководство по созданию группы
- Руководство по созданию пригласительной ссылки
- Руководство по настройке расписания

---

## 13. Чеклист миграции

### Подготовка
- [ ] Создать новые типы TypeScript (`Group`, `InviteLink`, `Schedule`) в `lib/types/types.ts`
- [ ] Удалить старые типы (`Deployment`, `EnrollmentToken`) из `lib/types/types.ts`
- [ ] Создать новые модели SQLAlchemy (если используется backend на Python)
- [ ] Обновить backend логику обработки команд `/start` в основном боте

### Frontend API endpoints
- [ ] Создать `app/api/groups/route.ts` (GET, POST)
- [ ] Создать `app/api/groups/[groupId]/route.ts` (GET, PUT, DELETE)
- [ ] Создать `app/api/groups/[groupId]/invites/route.ts` (GET, POST)
- [ ] Создать `app/api/groups/[groupId]/invites/[inviteLinkId]/route.ts` (GET, PUT, DELETE)
- [ ] Создать `app/api/groups/[groupId]/schedule/route.ts` (GET, POST, DELETE)
- [ ] Создать `app/api/groups/[groupId]/runs/route.ts` (GET)
- [ ] Обновить `app/api/bots/[botId]/courses/route.ts` (использовать группы вместо развертываний)

### Frontend компоненты
- [ ] Создать `components/groups/GroupsList.tsx` (на основе `DeploymentsList.tsx`)
- [ ] Создать `components/groups/GroupDetailView.tsx` (на основе `DeploymentDetailView.tsx`)
- [ ] Создать `components/groups/InviteLinksManager.tsx` (новый компонент)
- [ ] Создать `components/groups/ScheduleManager.tsx` (новый компонент)
- [ ] Обновить `components/courses/CoursesList.tsx` (показывать группы вместо развертываний)
- [ ] Обновить `components/course-editor/CourseEditor.tsx` (добавить секцию групп)
- [ ] Обновить `components/bots/BotEditPage.tsx` (обновить текст и логику)
- [ ] Обновить `components/bots/ConnectedCoursesSection.tsx` (использовать группы)
- [ ] Обновить `components/bots/BotManagement.tsx` (обновить текст)

### Страницы
- [ ] Создать `app/groups/page.tsx` (новый файл)
- [ ] Создать `app/groups/[groupId]/page.tsx` (новый файл)
- [ ] Создать `app/groups/[groupId]/invites/page.tsx` (опционально, может быть секцией)
- [ ] Создать `app/groups/[groupId]/schedule/page.tsx` (опционально, может быть секцией)
- [ ] Обновить `app/courses/page.tsx` (обновить компонент `CoursesList`)
- [ ] Обновить `app/course-editor/[courseId]/page.tsx` (обновить компонент `CourseEditor`)
- [ ] Обновить `app/bots/[botId]/page.tsx` (обновить компоненты бота)

### Навигация
- [ ] Обновить `components/layout/AppSidebar.tsx` (активировать пункт "Groups")
- [ ] Обновить `components/layout/Header.tsx` (заменить "Deployments" на "Groups")
- [ ] Обновить breadcrumbs (если используется компонент `Breadcrumbs.tsx`)

### Тестирование
- [ ] Unit тесты для новых компонентов (`GroupsList`, `GroupDetailView`, `InviteLinksManager`, `ScheduleManager`)
- [ ] Unit тесты для обновленных компонентов (`CoursesList`, `CourseEditor`, `BotEditPage`)
- [ ] Integration тесты для новых API endpoints
- [ ] E2E тесты для основных сценариев (создание группы, создание ссылки, начало курса)

### Очистка (после успешной миграции)
- [ ] Удалить `app/deployments/page.tsx`
- [ ] Удалить `app/deployments/[deploymentId]/page.tsx`
- [ ] Удалить `components/deployments/DeploymentsList.tsx`
- [ ] Удалить `components/deployments/DeploymentDetailView.tsx`
- [ ] Удалить `app/api/deployments/route.ts`
- [ ] Удалить `app/api/deployments/[deploymentId]/route.ts`
- [ ] Удалить `app/api/deployments/[deploymentId]/invite/route.ts`
- [ ] Удалить `app/api/deployments/[deploymentId]/runs/route.ts`
- [ ] Удалить старые типы из `lib/types/types.ts`
- [ ] Обновить документацию (README, комментарии в коде)

---

## 14. Примеры кода

### 14.1. Создание группы

```typescript
// Компонент создания группы
const createGroup = async (data: {
  bot_id: number;
  course_id: number;
  name: string;
  description?: string;
  create_default_invite?: boolean;
  schedule?: {
    type: 'weekly' | 'daily' | 'custom';
    config: any;
  };
}) => {
  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create group');
  }
  
  return response.json();
};
```

### 14.2. Создание пригласительной ссылки

```typescript
// Компонент создания пригласительной ссылки
const createInviteLink = async (
  groupId: number,
  data: {
    max_uses?: number;
    expires_at?: string;
    metadata?: Record<string, any>;
  }
) => {
  const response = await fetch(`/api/groups/${groupId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create invite link');
  }
  
  const result = await response.json();
  // result.invite_link.invite_url содержит полную ссылку
  return result.invite_link;
};
```

### 14.3. Создание расписания

```typescript
// Компонент создания расписания
const createSchedule = async (
  groupId: number,
  data: {
    schedule_type: 'weekly' | 'daily' | 'custom';
    schedule_config: {
      day_of_week?: number;
      time?: string;
      timezone?: string;
      dates?: string[];
    };
  }
) => {
  const response = await fetch(`/api/groups/${groupId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create schedule');
  }
  
  return response.json();
};
```

---

## 15. Примечания

1. **Обратная совместимость:** Во время переходного периода необходимо поддерживать оба формата (старый и новый) для плавной миграции.

2. **Миграция данных:** Перед обновлением UI необходимо убедиться, что данные в БД мигрированы (существующие развертывания преобразованы в группы).

3. **Тестирование:** Все изменения должны быть протестированы на тестовой среде перед развертыванием в production.

4. **Документация:** Обновить всю документацию, включая README, API документацию и комментарии в коде.

5. **Производительность:** Убедиться, что новые запросы оптимизированы и используют правильные индексы БД.

---

---

## 16. Резюме проверки

### Проверенные файлы

**Страницы:**
- ✅ `/deployments` — существует (`app/deployments/page.tsx`)
- ✅ `/deployments/[deploymentId]` — существует (`app/deployments/[deploymentId]/page.tsx`)
- ✅ `/courses` — существует (`app/courses/page.tsx`)
- ✅ `/course-editor/[courseId]` — существует (`app/course-editor/[courseId]/page.tsx`)
- ✅ `/bots/[botId]` — существует (`app/bots/[botId]/page.tsx`)

**Компоненты:**
- ✅ `DeploymentsList.tsx` — существует (`components/deployments/DeploymentsList.tsx`)
- ✅ `DeploymentDetailView.tsx` — существует (`components/deployments/DeploymentDetailView.tsx`)
- ✅ `CoursesList.tsx` — существует (`components/courses/CoursesList.tsx`)
- ✅ `BotEditPage.tsx` — существует (`components/bots/BotEditPage.tsx`)
- ✅ `ConnectedCoursesSection.tsx` — существует (`components/bots/ConnectedCoursesSection.tsx`)

**API endpoints:**
- ✅ `/api/deployments` — существует (`app/api/deployments/route.ts`)
- ✅ `/api/deployments/[deploymentId]` — существует (`app/api/deployments/[deploymentId]/route.ts`)
- ✅ `/api/deployments/[deploymentId]/invite` — существует (`app/api/deployments/[deploymentId]/invite/route.ts`)
- ✅ `/api/deployments/[deploymentId]/runs` — существует (`app/api/deployments/[deploymentId]/runs/route.ts`)
- ✅ `/api/bots/[botId]/courses` — существует (`app/api/bots/[botId]/courses/route.ts`, использует `course_deployment`)

**Типы:**
- ✅ `Deployment` — существует в `lib/types/types.ts` (строки 132-158)
- ✅ `EnrollmentToken` — существует в `lib/types/types.ts` (строки 160-172)
- ✅ `Run` — существует в `lib/types/types.ts` (строки 174-191), требует обновления

**Навигация:**
- ✅ `AppSidebar.tsx` — пункт "Groups" существует, но disabled
- ✅ `Header.tsx` — ссылка "Deployments" существует

### Исправления в документе

1. ✅ Добавлена секция "0. Текущее состояние проекта" с проверкой всех существующих файлов
2. ✅ Обновлены все ссылки на файлы с указанием их реального существования
3. ✅ Уточнены требования к созданию новых файлов vs обновлению существующих
4. ✅ Добавлена информация о компонентах ботов, которые требуют обновления
5. ✅ Обновлен чеклист миграции с точными путями к файлам
6. ✅ Добавлена информация о необходимости обновления API endpoint `/api/bots/[botId]/courses`

---

**Дата создания:** 2024  
**Дата обновления:** 2024 (проверка существующих файлов)  
**Статус:** Требования готовы к реализации  
**Следующие шаги:**
1. Создание новых типов TypeScript (`Group`, `InviteLink`, `Schedule`)
2. Создание новых API endpoints (`/api/groups/*`)
3. Создание новых компонентов (`GroupsList`, `GroupDetailView`, и т.д.)
4. Обновление существующих страниц и компонентов
5. Обновление API endpoint `/api/bots/[botId]/courses` для работы с группами
6. Тестирование всех изменений
