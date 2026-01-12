# Transition to SaaS Architecture for ProfoChatBot
**Design & Transition Document — Draft v0.9**
# 1. Background & Current State
ProfoChatBot сегодня — это монолитное Telegram-приложение, в котором:
* контент курсов задаётся через YAML/Google Sheets,
* курс выполняется на одном конкретном Telegram-боте,
* прогресс хранится в PostgreSQL (run, conversation, waiting, banned, participants),
* есть элементы message|quiz|input|dialog|miniapptest|delay|test|revision|end,
* есть начальный bootstrap для creator UX (/create, /edit),
* есть web-отчёты (Flask) и REST API (FastAPI).

⠀Текущая модель **не multi-tenant**, т.е.:
* нет разделения по клиентам/акаунтам,
* курсы и боты завязаны друг на друга напрямую,
* не существует понятия «пользователь панели» vs. «студент»,
* деплой курсов неотделим от ботов,
* нет механики приглашения конечных пользователей в закрытые курсы.

⠀
# 2. Future State Vision (Target SaaS Model)
Платформа должна позволять:
1 Создавать **аккаунты** (tenants) для организаций.
2 Подключать **Telegram-ботов** на уровне аккаунта (множество).
3 Создавать **курсы** на уровне аккаунта (контент и логика).
**4** **Развёртывать курс** на бота в разных окружениях (prod/test).
5 Управлять доступом студентов через **приглашения/токены**.
6 Вести **аналитику**, **историю прохождения**, **UTM**, **ограничения**.
7 Работать через **Telegram-авторизацию** для панели.
8 Поддерживать 1 активный курс per student per bot в момент времени.

⠀
# 3. Key Model & Entity Changes
### 3.1. New Entities
| **Entity** | **Purpose** |
|:-:|:-:|
| Account | организация/тенант |
| AccountMember | создатели/админы аккаунта |
| Bot | Telegram-бот (с token, username, settings) |
| Course | логический курс (контент) |
| CourseElement | структура курса (контент) |
| CourseDeployment | курс на конкретном боте (prod/test) |
| EnrollmentToken | способ приглашения конечных пользователей |
| Run | сессия прохождения для конкретного студента |
| Conversation | история взаимодействий |
| WaitingElement, Banned, Restricted | механики прохождения |
### 3.2. Revised Relations
### Account
###  ├─ Bots
###  ├─ Courses
###  │   └─ CourseElements
###  │   └─ CourseDeployments
###  │        └─ EnrollmentTokens
###  │        └─ Runs
###  │             └─ Conversation
### 3.3. Student Constraint
Один конечный пользователь может в момент времени проходить **только один курс на конкретном боте**
Имплементируется в Run:
### UNIQUE (bot_id, chat_id) WHERE is_active = TRUE

# 4. Telegram Authorization Model
### 4.1. For Admin/Creators (Web Panel)
* авторизация через Telegram Login Widget,
* telegram_user_id + username → AccountMember.

⠀4.2. For Students (Chat)
* авторизация implicit через Telegram (chat_id, user_id, username).

⠀
# 5. Enrollment / Access Control
### 5.1.EnrollmentToken Concept
Tokens define **how** student joins:
| **Type** | **Behavior** |
|:-:|:-:|
| public | открытая ссылка, без ограничений |
| group | групповая ссылка, max_uses |
| personal | одноразовая или персональная |
| (optional) external | интеграция с LMS/CRM/SSO |
### 5.2. Invite Link Format
Deep link:
### https://t.me/<bot>?start=cd_<deploymentId>_<token>
Абстракция: payload хранится в БД, бот валидирует.
### 5.3. Restricted Courses
Допслой courseparticipants остаётся опциональным.

# 6. Deployment Architecture (Content vs Execution)
### 6.1. Separation of Concern
| **Layer** | **Responsibility** |
|:-:|:-:|
| **Course Engine** | выполнение логики курса, состояния, scoring |
| **Telegram Adapter** | обработка апдейтов, маппинг на Engine |
| **Storage Layer** | DB (runs, conversation, tokens, deployments) |
| **Panel / API** | управление контентом и развертываниями |
### 6.2. Multi-Bot Support
Варианты запуска:
| **Mode** | **Pros** | **Cons** |
|:-:|:-:|:-:|
| Single Process Multi-Bot | дешевле инфраструктурно | сложнее обработка конкурентности |
| Per Bot Process | проще SLA | чуть дороже |
| Kubernetes Per Bot | масштабируемо | сложнее DevOps |
MVP: Single Process Multi-Bot.

# 7. Migration Plan (Phased Transition)
### Phase 0 — Preparatory (No Behavior Change)
* ввести account_id столбец в run, conversation, waiting, banned, course, course_element,
* default = 1 (текущий монолит),
* code path всегда подставляет account_id=1.

⠀Phase 1 — Introduce Accounts & Panel Auth
* сущности: Account, AccountMember,
* авторизация через Telegram Web Login,
* UI: список курсов и ботов,
* всё ещё один бот на аккаунт (BOT_NAME старый).

⠀Phase 2 — Decouple Courses from Bots
* ввод сущности Course и CourseDeployment,
* CourseElement перепривязать к Course,
* YAML → import/export в Course,
* CourseDeployment создаётся на панеле.

⠀Phase 3 — Enrollment Tokens
* ввод EnrollmentToken,
* новый deep link формат /start=cd_<deployment>_<token>,
* валидация перед созданием Run.

⠀Phase 4 — Multi-Bot Per Account
* ввод Bot и bot_id,
* Run → enforce UNIQUE (bot_id, chat_id).

⠀Phase 5 — Analytics & Reporting
* панель: runs, cohorts, tokens, funnels, UTM.

⠀Phase 6 — Public SaaS
* регистрация аккаунтов,
* биллинг,
* тарифы,
* SLA.

⠀
# 8. Minimal Viable SaaS (MVP Scope)
MVP состоит из:
1 Account + AccountMember.
2 Course + CourseElement (YAML import).
3 CourseDeployment (test/prod).
4 EnrollmentToken (public + group).
5 Single-Bot Multi-Tenant runtime.
6 Run + Conversation + Delay.
7 Basic analytics (list runs + status).
8 Panel auth via Telegram.

⠀Не входит в MVP:
* платежи,
* ролевая модель >2 ролей,
* SSO интеграции,
* email уведомления,
* кастомные домены.

⠀
# 9. Compatibility & Backward Behavior
| **Feature** | **Status** |
|:-:|:-:|
| YAML-based creation | сохраняется |
| /start <course> | обновляется на /start=cd_<deployment>_<token> |
| Restricted courses | реализуется через tokens + optional participants |
| Dialog elements | без изменений |
| Miniapp | без изменений |
| DB | расширяется, не ломается |

# 10. Risk Analysis & Mitigation
| **Risk** | **Impact** | **Mitigation** |
|:-:|:-:|:-:|
| Миграция БД | High | фазирование + дефолты |
| Multi-Bot concurrency | Medium | sequential rollout |
| Enrollment abuse | Medium | token types + max_uses |
| SLA для тест/прод окружений | Medium | deployments |
| UX панели | Medium | MVP + iteration |
| LMS/B2B интеграции | Low | отдельный этап |
| Биллинг | Medium/High | отложить |

# 11. Open Questions
1 Нужна ли поддержка «несколько deployment’ов на один bot одновременно» без UI-конфликтов?
2 Нужны ли персональные invites в MVP?
3 Как будут применяться environment-overrides на уровне deployment?
4 Нужно ли разрешать одному токену запускать несколько runs в разные даты (cohort vs evergreen)?
5 Сбор email перед стартом курса — нужен ли?

⠀
# 12. Conclusion
Переход в SaaS-архитектуру выполним без переписывания ядра. Требуется:
* tenant-модель,
* decoupling курсов от ботов,
* deployments + tokens,
* panel auth,
* phased migration.

⠀Это позволяет:
* заводить один курс на нескольких ботах (test/prod),
* запускать корпоративные/закрытые программы,
* добавлять тарифы и биллинг в будущем,
* поддерживать масштабирование.
