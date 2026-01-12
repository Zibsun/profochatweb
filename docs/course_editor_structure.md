# Структура папки course_editor

Документ описывает структуру папки `docs/prototypes/course_editor`.

## Общая структура

```
course_editor/
├── client/                    # Клиентская часть приложения
│   ├── index.html            # Главный HTML файл
│   ├── public/               # Публичные статические файлы
│   │   ├── favicon.png
│   │   └── opengraph.jpg
│   └── src/                  # Исходный код клиента
│       ├── App.tsx           # Главный компонент приложения
│       ├── main.tsx          # Точка входа клиентского приложения
│       ├── index.css         # Глобальные стили
│       ├── components/       # React компоненты
│       │   └── ui/           # UI компоненты (библиотека компонентов)
│       │       ├── accordion.tsx
│       │       ├── alert-dialog.tsx
│       │       ├── alert.tsx
│       │       ├── aspect-ratio.tsx
│       │       ├── avatar.tsx
│       │       ├── badge.tsx
│       │       ├── breadcrumb.tsx
│       │       ├── button-group.tsx
│       │       ├── button.tsx
│       │       ├── calendar.tsx
│       │       ├── card.tsx
│       │       ├── carousel.tsx
│       │       ├── chart.tsx
│       │       ├── checkbox.tsx
│       │       ├── collapsible.tsx
│       │       ├── command.tsx
│       │       ├── context-menu.tsx
│       │       ├── dialog.tsx
│       │       ├── drawer.tsx
│       │       ├── dropdown-menu.tsx
│       │       ├── empty.tsx
│       │       ├── field.tsx
│       │       ├── form.tsx
│       │       ├── hover-card.tsx
│       │       ├── input-group.tsx
│       │       ├── input-otp.tsx
│       │       ├── input.tsx
│       │       ├── item.tsx
│       │       ├── kbd.tsx
│       │       ├── label.tsx
│       │       ├── menubar.tsx
│       │       ├── navigation-menu.tsx
│       │       ├── pagination.tsx
│       │       ├── popover.tsx
│       │       ├── progress.tsx
│       │       ├── radio-group.tsx
│       │       ├── resizable.tsx
│       │       ├── scroll-area.tsx
│       │       ├── select.tsx
│       │       ├── separator.tsx
│       │       ├── sheet.tsx
│       │       ├── sidebar.tsx
│       │       ├── skeleton.tsx
│       │       ├── slider.tsx
│       │       ├── sonner.tsx
│       │       ├── spinner.tsx
│       │       ├── switch.tsx
│       │       ├── table.tsx
│       │       ├── tabs.tsx
│       │       ├── textarea.tsx
│       │       ├── toast.tsx
│       │       ├── toaster.tsx
│       │       ├── toggle-group.tsx
│       │       ├── toggle.tsx
│       │       └── tooltip.tsx
│       ├── hooks/            # Пользовательские React хуки
│       │   ├── use-mobile.tsx
│       │   └── use-toast.ts
│       ├── lib/              # Библиотеки и утилиты
│       │   ├── ai-service.ts      # Сервис для работы с AI
│       │   ├── queryClient.ts     # Настройка React Query клиента
│       │   └── utils.ts           # Вспомогательные функции
│       └── pages/            # Страницы приложения
│           ├── course-editor.tsx   # Страница редактора курсов
│           └── not-found.tsx      # Страница 404
│
├── server/                   # Серверная часть приложения
│   ├── index.ts             # Точка входа сервера
│   ├── routes.ts            # Определение маршрутов API
│   ├── static.ts            # Обработка статических файлов
│   ├── storage.ts           # Работа с хранилищем данных
│   └── vite.ts              # Интеграция с Vite для разработки
│
├── shared/                   # Общий код между клиентом и сервером
│   └── schema.ts            # Общие схемы данных (вероятно, Drizzle ORM схемы)
│
├── script/                   # Скрипты сборки и утилиты
│   └── build.ts             # Скрипт сборки проекта
│
├── components.json           # Конфигурация компонентов (shadcn/ui)
├── drizzle.config.ts        # Конфигурация Drizzle ORM
├── package.json             # Зависимости проекта
├── package-lock.json        # Зафиксированные версии зависимостей
├── postcss.config.js        # Конфигурация PostCSS
├── tsconfig.json            # Конфигурация TypeScript
├── vite.config.ts           # Конфигурация Vite
└── vite-plugin-meta-images.ts  # Плагин Vite для мета-изображений
```

## Описание основных директорий

### `client/`
Клиентская часть приложения на React с TypeScript. Использует Vite как сборщик.

**Основные поддиректории:**
- `src/components/ui/` - Библиотека UI компонентов (похоже на shadcn/ui), содержит более 50 компонентов
- `src/pages/` - Страницы приложения
- `src/lib/` - Утилиты и сервисы (AI сервис, React Query клиент)
- `src/hooks/` - Пользовательские React хуки

### `server/`
Серверная часть приложения, вероятно на Node.js/Express или аналогичном фреймворке.

**Основные файлы:**
- `index.ts` - Точка входа сервера
- `routes.ts` - API маршруты
- `storage.ts` - Работа с данными
- `vite.ts` - Интеграция Vite для разработки (HMR)

### `shared/`
Общий код, используемый и на клиенте, и на сервере (например, схемы данных Drizzle ORM).

### `script/`
Вспомогательные скрипты для сборки и развертывания.

## Технологический стек

Судя по структуре проекта, используются следующие технологии:

- **Frontend:**
  - React + TypeScript
  - Vite (сборщик)
  - React Query (для работы с данными)
  - shadcn/ui (библиотека UI компонентов)
  - Tailwind CSS (через PostCSS)

- **Backend:**
  - Node.js/TypeScript
  - Express или аналогичный фреймворк

- **Database:**
  - Drizzle ORM (судя по `drizzle.config.ts` и `shared/schema.ts`)

- **Build Tools:**
  - Vite
  - TypeScript
  - PostCSS

## Статистика

- **Всего файлов:** ~81 файл
- **UI компонентов:** 60+ компонентов в `client/src/components/ui/`
- **Страниц:** 2 страницы (course-editor, not-found)
- **Хуков:** 2 пользовательских хука
- **Серверных модулей:** 5 файлов
