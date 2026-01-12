# Гайдлайн по созданию фронтенд страниц

Этот документ описывает стандарты и паттерны для создания новых страниц в приложении, основанные на архитектуре `course-editor`.

## 📋 Содержание

1. [Структура файлов](#структура-файлов)
2. [Архитектура компонентов](#архитектура-компонентов)
3. [Стили и UI](#стили-и-ui)
4. [Работа с API](#работа-с-api)
5. [Управление состоянием](#управление-состоянием)
6. [Обработка ошибок](#обработка-ошибок)
7. [Адаптивность](#адаптивность)
8. [TypeScript](#typescript)
9. [Чеклист для создания новой страницы](#чеклист)

---

## Структура файлов

### Организация файлов

```
webapp/frontend/
├── app/
│   └── [feature-name]/          # Директория фичи
│       ├── page.tsx             # Главная страница фичи
│       ├── [id]/                # Динамический роут
│       │   └── page.tsx         # Страница с параметром
│       └── layout.tsx           # Layout для фичи (опционально)
├── components/
│   └── [feature-name]/          # Компоненты фичи
│       └── FeatureName.tsx      # Основной компонент
├── lib/
│   └── [feature-name]/          # Утилиты и сервисы
│       └── [service].ts
└── app/api/
    └── [feature-name]/          # API routes
        └── [endpoints]/
            └── route.ts
```

### Примеры

**Course Editor:**
- `app/course-editor/page.tsx` - главная страница
- `app/course-editor/[courseId]/page.tsx` - страница с ID курса
- `app/course-editor/layout.tsx` - layout с провайдерами
- `components/course-editor/CourseEditor.tsx` - основной компонент
- `app/api/course-editor/courses/[id]/route.ts` - API endpoint

---

## Архитектура компонентов

### 1. Страница (Page Component)

**Паттерн:** Тонкая обертка над основным компонентом

```tsx
// app/[feature-name]/page.tsx
import { FeatureComponent } from "@/components/[feature-name]/FeatureComponent";

export default function FeaturePage() {
  return <FeatureComponent />;
}
```

**С динамическими параметрами:**

```tsx
// app/[feature-name]/[id]/page.tsx
import { FeatureComponent } from "@/components/[feature-name]/FeatureComponent";

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FeatureComponent id={id} />;
}
```

### 2. Основной компонент (Main Component)

**Паттерн:** Client Component с полной логикой

```tsx
// components/[feature-name]/FeatureComponent.tsx
"use client"

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
// ... другие импорты

interface FeatureComponentProps {
  id?: string;
}

export function FeatureComponent({ id }: FeatureComponentProps) {
  const { toast } = useToast();
  
  // Состояния
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType | null>(null);
  
  // Загрузка данных
  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);
  
  // Обработчики
  const loadData = async (id: string) => {
    // ...
  };
  
  const handleSave = async () => {
    // ...
  };
  
  // Рендер
  return (
    <div className="editor-root">
      {/* Контент */}
    </div>
  );
}
```

### 3. Layout (если нужен)

**Паттерн:** Провайдеры и обертка

```tsx
// app/[feature-name]/layout.tsx
"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toaster"

export default function FeatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <Toaster />
      <div className="feature-wrapper">
        {children}
      </div>
    </TooltipProvider>
  )
}
```

---

## Стили и UI

### 1. Использование CSS переменных

Все цвета и стили должны использовать CSS переменные из `globals.css`:

```css
/* Используйте переменные */
background: hsl(var(--background));
color: hsl(var(--foreground));
border-color: hsl(var(--border));
```

### 2. Tailwind классы

Используйте Tailwind классы с переменными:

```tsx
<div className="bg-card border border-border rounded-lg p-4">
  <h2 className="text-foreground font-semibold">Заголовок</h2>
  <p className="text-muted-foreground text-sm">Описание</p>
</div>
```

### 3. UI компоненты из shadcn/ui

Используйте готовые компоненты:
- `Button` - кнопки
- `Card` - карточки
- `Input` - поля ввода
- `toast` - уведомления
- `tooltip` - подсказки

**Пример:**

```tsx
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
```

### 4. Утилита `cn()` для классов

Используйте `cn()` для условных классов:

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
)}>
```

### 5. Адаптивные классы

Используйте Tailwind breakpoints:

```tsx
<div className="
  w-full 
  md:w-1/2 
  lg:w-1/3
  p-4 
  md:p-6 
  lg:p-8
">
```

---

## Работа с API

### 1. Структура API Route

```tsx
// app/api/[feature]/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Валидация
    // Логика
    // Возврат данных
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // ...
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ...
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ...
}
```

### 2. Вызовы API из компонента

```tsx
const loadData = async (id: string) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch(`/api/[feature]/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 404) {
        setError(`Ресурс "${id}" не найден`);
      } else {
        setError(errorData.message || `Ошибка: ${response.status}`);
      }
      setLoading(false);
      return;
    }
    
    const data = await response.json();
    setData(data);
    
    toast({
      title: "Данные загружены",
      description: `Ресурс "${id}" успешно загружен`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Неизвестная ошибка";
    setError(`Ошибка загрузки: ${errorMessage}`);
    toast({
      title: "Ошибка загрузки",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

const handleSave = async () => {
  setSaving(true);
  setError(null);
  
  try {
    const url = isNew 
      ? "/api/[feature]"
      : `/api/[feature]/${id}`;
    
    const method = isNew ? "POST" : "PUT";
    
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Ошибка сохранения: ${response.status}`);
    }
    
    const result = await response.json();
    
    toast({
      title: "Сохранено",
      description: "Данные успешно сохранены",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Неизвестная ошибка";
    setError(`Ошибка сохранения: ${errorMessage}`);
    toast({
      title: "Ошибка сохранения",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setSaving(false);
  }
};
```

---

## Управление состоянием

### 1. Базовые состояния

Всегда включайте эти состояния:

```tsx
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType | null>(null);
const [isNew, setIsNew] = useState(!id);
```

### 2. Состояния UI

Для модальных окон, меню и т.д.:

```tsx
const [showModal, setShowModal] = useState(false);
const [showMenu, setShowMenu] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
```

### 3. Refs для DOM элементов

```tsx
const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
```

### 4. useEffect для загрузки

```tsx
useEffect(() => {
  if (id) {
    loadData(id);
  } else {
    // Инициализация для нового ресурса
    setData(null);
    setIsNew(true);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [id]);
```

---

## Обработка ошибок

### 1. Валидация данных

Создайте функцию валидации:

```tsx
const validateData = (): string[] => {
  const errors: string[] = [];
  
  if (!data.field1 || data.field1.trim() === "") {
    errors.push("Поле 'field1' обязательно");
  }
  
  // Другие проверки
  
  return errors;
};
```

### 2. Отображение ошибок

```tsx
const validationErrors = validateData();
if (validationErrors.length > 0) {
  toast({
    title: "Ошибки валидации",
    description: (
      <div>
        <p className="font-semibold mb-2">Исправьте следующие ошибки:</p>
        <ul className="list-disc list-inside space-y-1">
          {validationErrors.map((error, index) => (
            <li key={index} className="text-sm">{error}</li>
          ))}
        </ul>
      </div>
    ),
    variant: "destructive",
  });
  return;
}
```

### 3. Обработка ошибок API

```tsx
try {
  // API call
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : "Неизвестная ошибка";
  setError(`Ошибка: ${errorMessage}`);
  toast({
    title: "Ошибка",
    description: errorMessage,
    variant: "destructive",
  });
}
```

---

## Адаптивность

### 1. Использование CSS классов из globals.css

В `globals.css` уже определены классы для адаптивности:

```css
/* Large Desktop (≥1200px) - Three-column layout */
@media (min-width: 1200px) {
  .editor-structure-sidebar {
    width: 260px;
  }
}

/* Tablet/Laptop (768-1199px) - Two columns */
@media (min-width: 768px) and (max-width: 1199px) {
  /* ... */
}

/* Mobile (<768px) - Single column */
@media (max-width: 767px) {
  /* ... */
}
```

### 2. Tailwind responsive классы

```tsx
<div className="
  flex flex-col
  md:flex-row
  lg:flex-row
  gap-4
  p-4
  md:p-6
  lg:p-8
">
```

### 3. Условный рендеринг для мобильных

```tsx
const { isMobile } = useMobile(); // если используете хук

{isMobile ? (
  <MobileLayout />
) : (
  <DesktopLayout />
)}
```

---

## TypeScript

### 1. Интерфейсы для данных

```tsx
interface DataType {
  id: string;
  title: string;
  description?: string;
  // ...
}

interface ComponentProps {
  id?: string;
  onSave?: (data: DataType) => void;
}
```

### 2. Типы для состояний

```tsx
type LoadingState = "idle" | "loading" | "success" | "error";

const [state, setState] = useState<LoadingState>("idle");
```

### 3. Типы для событий

```tsx
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ...
};
```

---

## Уведомления (Toast)

### 1. Использование useToast

```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Успех
toast({
  title: "Успешно",
  description: "Операция выполнена успешно",
});

// Ошибка
toast({
  title: "Ошибка",
  description: "Что-то пошло не так",
  variant: "destructive",
});

// С кастомным контентом
toast({
  title: "Валидация",
  description: (
    <div>
      <p>Список ошибок:</p>
      <ul>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  ),
  variant: "destructive",
});
```

### 2. Провайдер Toaster

Убедитесь, что `Toaster` добавлен в layout:

```tsx
import { Toaster } from "@/components/ui/toaster";

export default function Layout({ children }) {
  return (
    <>
      <Toaster />
      {children}
    </>
  );
}
```

---

## Иконки

### Использование lucide-react

```tsx
import {
  Save,
  Plus,
  Trash2,
  Edit,
  Eye,
  // ...
} from "lucide-react";

<Button>
  <Save className="w-4 h-4 mr-2" />
  Сохранить
</Button>
```

---

## Чеклист для создания новой страницы

### Подготовка

- [ ] Определить структуру данных (интерфейсы TypeScript)
- [ ] Определить API endpoints
- [ ] Определить структуру компонентов

### Файлы

- [ ] Создать `app/[feature-name]/page.tsx`
- [ ] Создать `app/[feature-name]/[id]/page.tsx` (если нужен динамический роут)
- [ ] Создать `app/[feature-name]/layout.tsx` (если нужен)
- [ ] Создать `components/[feature-name]/FeatureComponent.tsx`
- [ ] Создать `app/api/[feature-name]/[endpoint]/route.ts`

### Компонент

- [ ] Добавить `"use client"` директиву
- [ ] Импортировать необходимые хуки (`useToast`, `useState`, `useEffect`)
- [ ] Определить интерфейсы для props и данных
- [ ] Добавить базовые состояния (`loading`, `saving`, `error`, `data`, `isNew`)
- [ ] Реализовать функцию загрузки данных (`loadData`)
- [ ] Реализовать функцию сохранения (`handleSave`)
- [ ] Реализовать функцию валидации (`validateData`)
- [ ] Добавить обработчики событий
- [ ] Добавить `useEffect` для загрузки при монтировании

### API

- [ ] Реализовать GET endpoint
- [ ] Реализовать POST endpoint (для создания)
- [ ] Реализовать PUT endpoint (для обновления)
- [ ] Реализовать DELETE endpoint (если нужен)
- [ ] Добавить обработку ошибок (404, 409, 500)
- [ ] Добавить валидацию входных данных

### UI

- [ ] Использовать CSS переменные из `globals.css`
- [ ] Использовать компоненты из `shadcn/ui`
- [ ] Добавить адаптивные классы
- [ ] Добавить состояния загрузки (spinner, disabled)
- [ ] Добавить отображение ошибок
- [ ] Добавить toast уведомления
- [ ] Добавить иконки из `lucide-react`

### Стили

- [ ] Проверить адаптивность на мобильных устройствах
- [ ] Проверить адаптивность на планшетах
- [ ] Проверить адаптивность на десктопе
- [ ] Использовать класс `scrollbar-thin` для скроллируемых областей

### Тестирование

- [ ] Проверить загрузку данных
- [ ] Проверить создание нового ресурса
- [ ] Проверить обновление существующего ресурса
- [ ] Проверить валидацию
- [ ] Проверить обработку ошибок
- [ ] Проверить адаптивность
- [ ] Проверить toast уведомления

---

## Примеры из course-editor

### Структура компонента

Смотрите `components/course-editor/CourseEditor.tsx` для полного примера:
- Управление состоянием
- Загрузка и сохранение через API
- Валидация данных
- Drag & Drop
- Модальные окна
- Адаптивный дизайн

### Структура API

Смотрите `app/api/course-editor/courses/[id]/route.ts` для примера:
- Обработка GET, PUT, DELETE
- Валидация параметров
- Обработка ошибок
- Возврат структурированных ответов

### Структура страниц

Смотрите:
- `app/course-editor/page.tsx` - простая страница
- `app/course-editor/[courseId]/page.tsx` - страница с параметром
- `app/course-editor/layout.tsx` - layout с провайдерами

---

## Дополнительные рекомендации

1. **Именование:** Используйте понятные имена в стиле camelCase для переменных и PascalCase для компонентов
2. **Комментарии:** Добавляйте комментарии для сложной логики
3. **Разделение ответственности:** Выносите сложную логику в отдельные функции или хуки
4. **Производительность:** Используйте `useMemo` и `useCallback` для оптимизации при необходимости
5. **Доступность:** Добавляйте `aria-label` и семантические HTML теги
6. **Тестирование:** Добавляйте `data-testid` атрибуты для тестирования

---

## Вопросы и помощь

При создании новой страницы обращайтесь к примерам из `course-editor`:
- `components/course-editor/CourseEditor.tsx` - основной компонент
- `app/course-editor/` - структура страниц
- `app/api/course-editor/` - структура API
