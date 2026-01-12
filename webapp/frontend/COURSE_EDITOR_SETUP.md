# Course Editor - Инструкция по установке

Редактор курсов был перенесен из Vite-прототипа в Next.js приложение.

## Установка зависимостей

Перед запуском необходимо установить недостающие зависимости:

```bash
cd webapp/frontend
npm install @tanstack/react-query lucide-react tailwind-merge clsx class-variance-authority @radix-ui/react-slot @radix-ui/react-toast @radix-ui/react-tooltip
```

## Структура переноса

### Компоненты
- `components/course-editor/CourseEditor.tsx` - Основной компонент редактора
- `components/ui/toast.tsx`, `toaster.tsx`, `tooltip.tsx` - UI компоненты из прототипа

### Логика
- `lib/course-editor/ai-service.ts` - AI сервис (stub-реализация)
- `lib/course-editor/queryClient.ts` - React Query клиент
- `lib/utils.ts` - Утилита `cn()` для объединения классов
- `hooks/use-mobile.tsx` - Хук для определения мобильного устройства
- `hooks/use-toast.ts` - Хук для работы с уведомлениями

### Страницы
- `app/course-editor/page.tsx` - Страница редактора
- `app/course-editor/layout.tsx` - Layout с провайдерами (QueryClient, Tooltip, Toaster)

### API Routes (заготовки)
- `app/api/course-editor/route.ts` - Основной endpoint
- `app/api/course-editor/courses/route.ts` - CRUD для курсов
- `app/api/course-editor/courses/[id]/route.ts` - Операции с конкретным курсом

### Стили
- `app/globals.css` - Обновлен с CSS переменными и стилями редактора
- `tailwind.config.js` - Обновлен с цветовой схемой редактора

## Использование

После установки зависимостей запустите приложение:

```bash
npm run dev
```

Откройте редактор по адресу: `http://localhost:3000/course-editor`

## Особенности переноса

1. **UI компоненты**: Перенесены только необходимые компоненты (toast, toaster, tooltip). Остальные компоненты из прототипа можно перенести по мере необходимости.

2. **React Query**: Настроен отдельный QueryClient для редактора. Если в приложении уже есть React Query, можно использовать общий провайдер.

3. **Стили**: Стили редактора добавлены в `globals.css` с использованием CSS переменных. Существующие стили приложения не изменены.

4. **Layout**: Редактор использует отдельный layout без Header/Footer для полноэкранного режима.

5. **AI сервис**: Реализован как stub. Для реальной работы нужно подключить LLM API.

## TODO: Backend интеграция

API routes созданы как заготовки. Для полноценной работы нужно:

1. Подключить базу данных (PostgreSQL + Drizzle ORM)
2. Реализовать CRUD операции для курсов и блоков
3. Добавить валидацию (Zod схемы)
4. Добавить аутентификацию/авторизацию
5. Подключить реальный AI сервис

## Улучшения для будущего

1. **Модульность**: Вынести редактор в отдельный пакет/модуль
2. **Типы**: Вынести общие типы в shared-модуль
3. **Backend**: Перенести логику из `server/` прототипа в Next.js API routes
4. **Тестирование**: Добавить тесты для компонентов редактора
