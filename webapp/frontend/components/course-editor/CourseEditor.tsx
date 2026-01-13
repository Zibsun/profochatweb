"use client"

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  HelpCircle,
  TextCursorInput,
  Bot,
  Trash2,
  Plus,
  Save,
  Eye,
  Sparkles,
  X,
  Wand2,
  Loader2,
  Send,
  Maximize2,
  GripVertical,
  FolderOpen,
  ChevronDown,
  AlertCircle,
  Music,
  ClipboardCheck,
  ListChecks,
  RefreshCw,
  Split,
  Award,
  Flag,
  Download,
  Upload,
} from "lucide-react";
import { callAiAssistant, type Block, type BlockType } from "@/lib/course-editor/ai-service";
import { useToast } from "@/hooks/use-toast";
import { convertBlocksToYaml, convertYamlToBlocks } from "@/lib/course-editor/yaml-converter";
import yaml from "js-yaml";

interface Answer {
  text: string;
  correct: boolean;
}

const initialBlocks: Block[] = [
  {
    id: "section_1",
    type: "Section",
    title: "Введение",
    description: "Знакомство с греческим языком и основные приветствия",
    parseMode: "TEXT",
    linkPreview: false,
  },
  {
    id: "block_1",
    type: "Message",
    title: "Welcome",
    text: "Добро пожаловать в курс по греческому языку уровня A1! В этом курсе вы изучите основы греческого языка.",
    parseMode: "MARKDOWN",
    linkPreview: false,
  },
  {
    id: "block_2",
    type: "Quiz",
    question: "Как переводится слово Ο πατέρας?",
    answers: [
      { text: "отец", correct: true },
      { text: "мать", correct: false },
      { text: "брат", correct: false },
      { text: "дедушка", correct: false },
    ],
    parseMode: "TEXT",
    linkPreview: false,
  },
  {
    id: "section_2",
    type: "Section",
    title: "Практика",
    description: "Упражнения для закрепления материала",
    parseMode: "TEXT",
    linkPreview: false,
  },
  {
    id: "block_3",
    type: "Input",
    prompt: "Напишите по-гречески слово 'привет'",
    placeholder: "Γειά σου",
    normalization: "lowercase",
    parseMode: "TEXT",
    linkPreview: false,
  },
  {
    id: "block_4",
    type: "Dialog",
    dialogTitle: "Практика диалога",
    systemPrompt:
      "You are a friendly Greek language tutor helping a beginner practice basic greetings and introductions. Speak in simple Greek with translations.",
    temperature: 0.7,
    maxTokens: 150,
    parseMode: "TEXT",
    linkPreview: false,
  },
];

const blockTypeConfig: Record<
  BlockType,
  { icon: typeof MessageSquare; color: string; bgColor: string }
> = {
  Section: {
    icon: FolderOpen,
    color: "text-slate-700",
    bgColor: "bg-slate-100 border-slate-300",
  },
  Message: {
    icon: MessageSquare,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  Quiz: {
    icon: ClipboardCheck,
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200",
  },
  Question: {
    icon: HelpCircle,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  Audio: {
    icon: Music,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
  },
  MultiChoice: {
    icon: ListChecks,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  Input: {
    icon: TextCursorInput,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
  Dialog: {
    icon: Bot,
    color: "text-sky-600",
    bgColor: "bg-sky-50 border-sky-200",
  },
  Revision: {
    icon: RefreshCw,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  Jump: {
    icon: Split,
    color: "text-teal-600",
    bgColor: "bg-teal-50 border-teal-200",
  },
  Test: {
    icon: Award,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
  },
  End: {
    icon: Flag,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
};

function getBlockTitle(block: Block): string {
  switch (block.type) {
    case "Section":
      return block.title || "Section";
    case "Message":
      return block.title || block.text?.substring(0, 20) || "Message";
    case "Quiz":
      return block.question?.substring(0, 20) || "Quiz";
    case "Question":
      return block.question?.substring(0, 20) || "Question";
    case "Audio":
      return block.text?.substring(0, 20) || "Audio";
    case "MultiChoice":
      return block.question?.substring(0, 20) || "MultiChoice";
    case "Input":
      return block.prompt?.substring(0, 20) || "Input";
    case "Dialog":
      return block.text?.substring(0, 20) || "Dialog";
    case "Revision":
      return block.prefix ? `Revision: ${block.prefix}` : "Revision";
    case "Jump":
      return block.text?.substring(0, 20) || "Jump";
    case "Test":
      return block.prefix ? `Test: ${block.prefix}` : "Test";
    case "End":
      return block.text ? `End: ${block.text.substring(0, 15)}...` : "End";
    default:
      return block.type;
  }
}

function isUnderSection(blocks: Block[], index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type === "Section") return true;
  }
  return false;
}

interface CourseEditorProps {
  courseId?: string;
}

export function CourseEditor({ courseId }: CourseEditorProps) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiScope, setAiScope] = useState<"block" | "course">("course");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showInstructionExpand, setShowInstructionExpand] = useState(false);
  const [tempInstruction, setTempInstruction] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [structureExpanded, setStructureExpanded] = useState(false);
  
  // Состояния для работы с API
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewCourse, setIsNewCourse] = useState(!courseId);
  const [courseSource, setCourseSource] = useState<'database' | 'yaml' | 'database_old' | null>(null);
  const [courseMetadata, setCourseMetadata] = useState<{
    title?: string | null;
    description?: string | null;
    element?: string;
    restricted?: boolean | string;
    decline_text?: string;
    ban_enabled?: boolean | string;
    ban_text?: string;
  } | null>(null);

  // Refs для прокрутки к блокам в средней панели
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Загрузка курса из API
  const loadCourse = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/course-editor/courses/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setError(`Курс "${id}" не найден. Создайте новый курс или проверьте ID.`);
          setIsNewCourse(true);
        } else if (response.status === 409) {
          setError(`Курс "${id}" хранится в базе данных и не может быть отредактирован через редактор.`);
        } else {
          setError(errorData.message || `Ошибка загрузки курса: ${response.status}`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setBlocks(data.blocks || []);
      // Используем title из данных курса, если он есть, иначе используем course_id/course_code
      setCourseTitle(data.course?.title || data.course?.course_id || data.course?.course_code || id);
      setIsNewCourse(false);
      setCourseSource(data.source || 'yaml');
      setCourseMetadata({
        title: data.course?.title,
        description: data.course?.description,
        element: data.course?.element,
        restricted: data.course?.restricted,
        decline_text: data.course?.decline_text,
        ban_enabled: data.course?.ban_enabled,
        ban_text: data.course?.ban_text,
      });
      toast({
        title: "Курс загружен",
        description: `Курс "${id}" успешно загружен${data.source === 'database' ? ' из базы данных' : ''}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(`Ошибка загрузки курса: ${errorMessage}`);
      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Загрузка курса при монтировании, если courseId указан
  useEffect(() => {
    if (courseId) {
      loadCourse(courseId);
    } else {
      // Если courseId нет, показываем пустой редактор для создания нового курса
      setBlocks([]);
      setCourseTitle("");
      setIsNewCourse(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (blockId !== draggedBlockId) {
      setDragOverBlockId(blockId);
    }
  };

  const handleDragLeave = () => {
    setDragOverBlockId(null);
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    setBlocks(newBlocks);

    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleSelectBlock = (id: string) => {
    setSelectedBlockId(id);
    
    // Прокручиваем к выбранному блоку в средней панели
    const blockElement = blockRefs.current.get(id);
    if (blockElement) {
      blockElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  // Автоматическая прокрутка при изменении selectedBlockId
  useEffect(() => {
    if (selectedBlockId) {
      const blockElement = blockRefs.current.get(selectedBlockId);
      if (blockElement) {
        // Небольшая задержка для обеспечения рендеринга
        setTimeout(() => {
          blockElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 100);
      }
    }
  }, [selectedBlockId]);

  const handleDeleteBlock = (id: string) => {
    if (confirm("Are you sure you want to delete this block?")) {
      setBlocks(blocks.filter((b) => b.id !== id));
      if (selectedBlockId === id) {
        setSelectedBlockId(null);
      }
    }
  };

  const handleAddBlock = (type: BlockType) => {
    const newId = type === "Section" ? `section_${Date.now()}` : `block_${Date.now()}`;
    const newBlock: Block = {
      id: newId,
      type,
      parseMode: "TEXT",
      linkPreview: false,
      ...(type === "Section" && { title: "New Section" }),
      ...(type === "Message" && { title: "", text: "", button: "" }),
      ...(type === "Quiz" && {
        question: "",
        answers: [
          { text: "", correct: true },
          { text: "", correct: false },
        ],
      }),
      ...(type === "Question" && {
        question: "",
        answers: [
          { text: "" },
          { text: "" },
        ],
      }),
      ...(type === "Audio" && {
        text: "",
        media: [""],
      }),
      ...(type === "Revision" && {
        text: "",
        prefix: "",
        noMistakes: "",
        button: "",
      }),
      ...(type === "Jump" && {
        text: "",
        options: [],
      }),
      ...(type === "Test" && {
        text: "",
        prefix: "",
        score: {},
      }),
      ...(type === "End" && {
        text: "",
      }),
      ...(type === "MultiChoice" && {
        question: "",
        answers: [
          { text: "", correct: true },
          { text: "", correct: false },
        ],
        feedbackCorrect: "",
        feedbackPartial: "",
        feedbackIncorrect: "",
      }),
      ...(type === "Input" && {
        prompt: "",
        placeholder: "",
        normalization: "none",
      }),
      ...(type === "Dialog" && {
        text: "",
        systemPrompt: "",
        model: "",
        temperature: 0.7,
        maxTokens: 150,
        voiceResponse: false,
        autoStart: false,
        ttsVoice: "21m00Tcm4TlvDq8ikWAM",
        ttsModel: "eleven_multilingual_v2",
        ttsSpeed: 1.0,
      }),
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newId);
    setShowAddMenu(false);
  };

  const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
    // Если обновляется ID, нужно обновить selectedBlockId и пересоздать массив блоков
    if (updates.id && updates.id !== id) {
      const updatedBlocks = blocks.map((b) => {
        if (b.id === id) {
          return { ...b, ...updates };
        }
        return b;
      });
      setBlocks(updatedBlocks);
      setSelectedBlockId(updates.id);
    } else {
      setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    }
  };

  // Валидация блоков перед сохранением
  const validateBlocks = (): string[] => {
    const errors: string[] = [];

    // Проверка уникальности ID
    const idCounts = new Map<string, number>();
    for (const block of blocks) {
      idCounts.set(block.id, (idCounts.get(block.id) || 0) + 1);
    }
    for (const [id, count] of idCounts.entries()) {
      if (count > 1) {
        errors.push(`ID "${id}" используется ${count} раз(а). Все ID должны быть уникальными.`);
      }
      if (!id || id.trim() === "") {
        errors.push("Найден блок с пустым ID");
      }
      if (!/^[a-zA-Z0-9_]+$/.test(id)) {
        errors.push(`ID "${id}" содержит недопустимые символы. Разрешены только буквы, цифры и подчеркивания.`);
      }
    }

    for (const block of blocks) {
      switch (block.type) {
        case "Section":
          if (!block.title || block.title.trim() === "") {
            errors.push(`Section "${block.id}": заголовок обязателен`);
          }
          break;
        case "Message":
          if (!block.text || block.text.trim() === "") {
            errors.push(`Message "${block.id}": текст обязателен`);
          }
          break;
        case "Quiz":
          if (!block.question || block.question.trim() === "") {
            errors.push(`Quiz "${block.id}": вопрос обязателен`);
          }
          if (!block.answers || block.answers.length < 2) {
            errors.push(`Quiz "${block.id}": необходимо минимум 2 варианта ответа`);
          }
          if (block.answers && !block.answers.some(a => a.correct)) {
            errors.push(`Quiz "${block.id}": должен быть хотя бы один правильный ответ`);
          }
          break;
        case "Question":
          if (!block.question || block.question.trim() === "") {
            errors.push(`Question "${block.id}": вопрос обязателен`);
          }
          if (!block.answers || block.answers.length < 2) {
            errors.push(`Question "${block.id}": необходимо минимум 2 варианта ответа`);
          }
          break;
        case "Audio":
          if (!block.media || block.media.length === 0 || block.media.every(url => !url || url.trim() === "")) {
            errors.push(`Audio "${block.id}": необходим хотя бы один URL аудиофайла`);
          }
          break;
        case "Revision":
          if (!block.text || block.text.trim() === "") {
            errors.push(`Revision "${block.id}": текст обязателен`);
          }
          if (!block.prefix || block.prefix.trim() === "") {
            errors.push(`Revision "${block.id}": префикс обязателен`);
          }
          if (!block.noMistakes || block.noMistakes.trim() === "") {
            errors.push(`Revision "${block.id}": сообщение no_mistakes обязательно`);
          }
          break;
        case "Jump":
          if (!block.text || block.text.trim() === "") {
            errors.push(`Jump "${block.id}": текст обязателен`);
          }
          break;
        case "Test":
          if (!block.text || block.text.trim() === "") {
            errors.push(`Test "${block.id}": текст обязателен`);
          }
          if (!block.prefix || block.prefix.trim() === "") {
            errors.push(`Test "${block.id}": префикс обязателен`);
          }
          if (!block.score || Object.keys(block.score).length === 0) {
            errors.push(`Test "${block.id}": необходимо указать хотя бы одну оценку в score`);
          }
          break;
        case "MultiChoice":
          if (!block.question || block.question.trim() === "") {
            errors.push(`MultiChoice "${block.id}": вопрос обязателен`);
          }
          if (!block.answers || block.answers.length < 2) {
            errors.push(`MultiChoice "${block.id}": необходимо минимум 2 варианта ответа`);
          }
          if (!block.feedbackCorrect || block.feedbackCorrect.trim() === "") {
            errors.push(`MultiChoice "${block.id}": feedback_correct обязателен`);
          }
          if (!block.feedbackPartial || block.feedbackPartial.trim() === "") {
            errors.push(`MultiChoice "${block.id}": feedback_partial обязателен`);
          }
          if (!block.feedbackIncorrect || block.feedbackIncorrect.trim() === "") {
            errors.push(`MultiChoice "${block.id}": feedback_incorrect обязателен`);
          }
          break;
        case "Input":
          if (!block.prompt || block.prompt.trim() === "") {
            errors.push(`Input "${block.id}": текст вопроса обязателен`);
          }
          break;
        case "Dialog":
          if (!block.text || block.text.trim() === "") {
            errors.push(`Dialog "${block.id}": начальное сообщение (text) обязательно`);
          }
          if (!block.systemPrompt || block.systemPrompt.trim() === "") {
            errors.push(`Dialog "${block.id}": системный промпт обязателен`);
          }
          break;
      }
    }

    return errors;
  };

  // Сохранение курса через API
  const handleSave = async () => {
    // Валидация
    const validationErrors = validateBlocks();
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

    setSaving(true);
    setError(null);

    try {
      const url = isNewCourse 
        ? "/api/course-editor/courses"
        : `/api/course-editor/courses/${courseId}`;
      
      const method = isNewCourse ? "POST" : "PUT";
      
      // Генерируем course_id (course_code) из courseTitle, если нужно
      // Убираем все недопустимые символы и заменяем пробелы на подчеркивания
      const generateCourseCode = (title: string): string => {
        const code = title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_-]/g, '_')  // Заменяем недопустимые символы на подчеркивания
          .replace(/\s+/g, '_')  // Заменяем пробелы на подчеркивания
          .replace(/_+/g, '_')  // Убираем множественные подчеркивания
          .replace(/^_|_$/g, '');  // Убираем подчеркивания в начале и конце
        
        // Если после обработки получилась пустая строка, используем дефолтное значение
        return code || `course_${Date.now()}`;
      };

      const finalCourseId = courseId || (courseTitle ? generateCourseCode(courseTitle) : `course_${Date.now()}`);

      const body = {
        course_id: finalCourseId,
        blocks,
        settings: {
          title: courseTitle || courseMetadata?.title,  // Используем courseTitle из состояния
          description: courseMetadata?.description,
          element: courseMetadata?.element,
          restricted: courseMetadata?.restricted,
          decline_text: courseMetadata?.decline_text,
          ban_enabled: courseMetadata?.ban_enabled,
          ban_text: courseMetadata?.ban_text,
        },
        // Если курс из БД или новый курс, сохраняем в БД
        save_to_db: courseSource === 'database' || isNewCourse || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Ошибка сохранения: ${response.status}`);
      }

      const data = await response.json();
      
      // Обновляем источник курса
      if (data.source) {
        setCourseSource(data.source);
      }
      
      // Если это новый курс, обновляем URL
      if (isNewCourse && data.course_id) {
        window.history.replaceState(null, "", `/course-editor/${data.course_id}`);
        setIsNewCourse(false);
        setCourseSource('database'); // Новые курсы сохраняются в БД
      }

      toast({
        title: "Курс сохранен",
        description: data.source === 'database' 
          ? "Курс успешно сохранен в базу данных"
          : "Черновик успешно сохранен",
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

  const handlePreview = () => {
    console.log("Preview course:", { title: courseTitle, blocks });
    alert("Preview mode coming soon!");
  };

  const handleExportYaml = () => {
    try {
      // Конвертируем блоки в YAML структуру
      const yamlContent = convertBlocksToYaml(blocks);
      
      // Преобразуем в YAML строку
      const yamlString = yaml.dump(yamlContent, {
        indent: 2,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false,
      });

      // Создаем blob и скачиваем файл
      const blob = new Blob([yamlString], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Имя файла: course-slug.yml или course.yml
      const fileName = courseTitle || courseId || 'course';
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${sanitizedFileName}.yml`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Экспорт выполнен",
        description: `Курс экспортирован в файл ${sanitizedFileName}.yml`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      toast({
        title: "Ошибка экспорта",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleImportYaml = () => {
    // Создаем input элемент для выбора файла
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yml,.yaml';
    input.style.display = 'none';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Читаем файл
        const text = await file.text();
        
        // Парсим YAML
        const yamlContent = yaml.load(text) as Record<string, any>;
        
        if (!yamlContent || typeof yamlContent !== 'object') {
          throw new Error('Неверный формат YAML файла');
        }

        // Конвертируем YAML в блоки
        const importedBlocks = convertYamlToBlocks(yamlContent);
        
        // Заменяем текущие блоки
        setBlocks(importedBlocks);
        setSelectedBlockId(null);
        
        // Обновляем курс как новый (чтобы можно было сохранить под новым именем)
        setIsNewCourse(true);

        toast({
          title: "Импорт выполнен",
          description: `Импортировано ${importedBlocks.length} элементов из файла ${file.name}`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
        toast({
          title: "Ошибка импорта",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        // Удаляем input элемент
        document.body.removeChild(input);
      }
    };

    // Добавляем input в DOM и кликаем на него
    document.body.appendChild(input);
    input.click();
  };

  const handleAiSubmit = async () => {
    if (!aiInstruction.trim()) return;

    setAiLoading(true);
    setAiResponse(null);

    try {
      const result = await callAiAssistant({
        scope: aiScope,
        action: "custom_instruction",
        instruction: aiInstruction,
        block: aiScope === "block" ? selectedBlock : undefined,
        blocks: aiScope === "course" ? blocks : undefined,
      });

      if (result.updatedBlock && selectedBlock) {
        handleUpdateBlock(selectedBlock.id, result.updatedBlock);
      }
      if (result.updatedBlocks) {
        setBlocks(result.updatedBlocks);
      }
      setAiResponse(result.message || "AI has processed your request.");
    } catch (error) {
      setAiResponse("An error occurred while processing your request.");
    } finally {
      setAiLoading(false);
    }
  };

  // Показываем индикатор загрузки
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-background editor-root"
      data-testid="course-editor"
    >
      {/* Header */}
      <header className="editor-header h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="header-title-section flex items-center gap-3">
          <div className="logo w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <input
            type="text"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1"
            data-testid="input-course-title"
            placeholder={isNewCourse ? "Введите название курса" : ""}
            disabled={loading}
          />
          {courseSource && (
            <span className={`text-xs px-2 py-1 rounded ${
              courseSource === 'database' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : courseSource === 'database_old'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {courseSource === 'database' ? 'БД' : courseSource === 'database_old' ? 'БД (старая схема)' : 'YAML'}
            </span>
          )}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="header-buttons flex items-center gap-2">
          <button
            onClick={handleExportYaml}
            disabled={loading || blocks.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-export-yaml"
            title="Export YAML"
          >
            <Download className="w-4 h-4" />
            <span className="btn-text">Export YAML</span>
          </button>
          <button
            onClick={handleImportYaml}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-import-yaml"
            title="Import YAML"
          >
            <Upload className="w-4 h-4" />
            <span className="btn-text">Import YAML</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-save-draft"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="btn-text">Сохранение...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="btn-text">Save</span>
              </>
            )}
          </button>
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4" />
            <span className="btn-text">Preview course</span>
          </button>
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            data-testid="button-ai-assistant"
          >
            <Bot className="w-4 h-4" />
            <span className="btn-text">AI Assistant</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="editor-layout flex-1 flex overflow-hidden">
        {/* Left Sidebar - Structure */}
        <aside className="editor-structure-sidebar border-r border-border bg-card flex flex-col shrink-0">
          {/* Mobile toggle button */}
          <button
            className="structure-mobile-toggle"
            onClick={() => setStructureExpanded(!structureExpanded)}
            data-testid="button-toggle-structure"
          >
            <span>Structure ({blocks.length} blocks)</span>
            <ChevronDown className={`structure-toggle-icon w-4 h-4 ${structureExpanded ? 'expanded' : ''}`} />
          </button>
          
          {/* Desktop header */}
          <div className="px-3 py-2 border-b border-border hidden md:block">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Structure
            </h2>
          </div>
          
          <div className={`structure-panel flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5 ${structureExpanded ? 'expanded' : ''}`}>
            {blocks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Нет блоков. Добавьте первый блок, чтобы начать.</p>
              </div>
            ) : (
              blocks.map((block, index) => {
                const config = blockTypeConfig[block.type];
                const Icon = config.icon;
                const isSelected = selectedBlockId === block.id;
                const isSection = block.type === "Section";
                const indented = !isSection && isUnderSection(blocks, index);
                const isDraggingThis = draggedBlockId === block.id;
                const isDragOverThis = dragOverBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, block.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, block.id)}
                    onClick={() => handleSelectBlock(block.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer ${
                      indented ? "ml-3" : ""
                    } ${
                      isSection ? "mt-2 first:mt-0" : ""
                    } ${
                      isDraggingThis
                        ? "opacity-50 border border-dashed border-primary"
                        : isDragOverThis
                        ? "bg-primary/20 border border-dashed border-primary"
                        : isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    }`}
                    data-testid={`outline-block-${block.id}`}
                  >
                    <GripVertical className="w-3 h-3 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    {isSection ? (
                      <>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color}`} />
                        <span className="text-xs font-semibold truncate">
                          {getBlockTitle(block)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color}`} />
                        <span className="text-xs truncate">
                          {getBlockTitle(block)}
                        </span>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="structure-add-button p-2 border-t border-border relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              data-testid="button-add-block"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
            {showAddMenu && (
              <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-card border border-border rounded-md shadow-lg overflow-hidden z-10">
                {(
                  ["Section", "Message", "Quiz", "Question", "Audio", "MultiChoice", "Input", "Dialog", "Revision"] as BlockType[]
                ).map((type) => {
                  const config = blockTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => handleAddBlock(type)}
                      className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left text-sm ${
                        type === "Section" ? "border-b border-border" : ""
                      }`}
                      data-testid={`button-add-${type.toLowerCase()}`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Content Wrapper - Center + Properties */}
        <div className="content-wrapper">
          {/* Center - Block List */}
          <main className="editor-main-content flex-1 overflow-y-auto scrollbar-thin bg-muted/30 p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {blocks.map((block, index) => {
              const config = blockTypeConfig[block.type];
              const Icon = config.icon;
              const isSelected = selectedBlockId === block.id;

              const isDragging = draggedBlockId === block.id;
              const isDragOver = dragOverBlockId === block.id;

              if (block.type === "Section") {
                return (
                  <div
                    key={block.id}
                    ref={(el) => {
                      if (el) {
                        blockRefs.current.set(block.id, el);
                      } else {
                        blockRefs.current.delete(block.id);
                      }
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, block.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, block.id)}
                    onClick={() => handleSelectBlock(block.id)}
                    className={`group py-6 mt-4 first:mt-0 cursor-pointer transition-all ${
                      isDragging
                        ? "opacity-50"
                        : isDragOver
                        ? "bg-primary/5 rounded-lg"
                        : ""
                    }`}
                    data-testid={`block-card-${block.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <div
                        className={`flex items-center gap-2 px-4 py-1 rounded-full transition-colors ${
                          isSelected
                            ? "bg-primary/10 ring-2 ring-primary/30"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-base font-bold text-foreground">
                          {block.title || "Untitled Section"}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  ref={(el) => {
                    if (el) {
                      blockRefs.current.set(block.id, el);
                    } else {
                      blockRefs.current.delete(block.id);
                    }
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, block.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, block.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, block.id)}
                  onClick={() => handleSelectBlock(block.id)}
                  className={`group bg-card rounded-xl border-2 transition-all cursor-pointer ${
                    isDragging
                      ? "opacity-50 border-dashed border-primary"
                      : isDragOver
                      ? "border-primary border-dashed shadow-lg"
                      : isSelected
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-border hover:border-muted-foreground/30 hover:shadow-md"
                  }`}
                  data-testid={`block-card-${block.id}`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted text-muted-foreground"
                        onMouseDown={(e) => e.stopPropagation()}
                        data-testid={`drag-handle-${block.id}`}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                        {block.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
                        className="ml-auto p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        data-testid={`button-delete-${block.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mb-3">
                        {block.type === "Message" && (
                          <div>
                            {block.title && (
                              <h3 className="font-semibold mb-1">
                                {block.title}
                              </h3>
                            )}
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {block.text || "No content yet..."}
                            </p>
                            {block.media && block.media.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {block.media.map((url, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded"
                                    title={url}
                                  >
                                    <span className="truncate max-w-[120px]">
                                      Media {i + 1}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {block.button && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Button: {block.button}
                              </p>
                            )}
                            {block.options && block.options.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {block.options.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                                    title={`${opt.goto ? `goto: ${opt.goto}` : ''} ${opt.wait ? `wait: ${opt.wait}` : ''}`}
                                  >
                                    {opt.text || `Option ${i + 1}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {block.type === "Quiz" && (
                          <div>
                            {block.media && block.media.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1">
                                {block.media.map((url, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded"
                                    title={url}
                                  >
                                    <span className="truncate max-w-[120px]">
                                      Media {i + 1}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-muted-foreground text-sm mb-2">
                              {block.question || "No question yet..."}
                            </p>
                            <ul className="space-y-1">
                              {block.answers?.map((answer, i) => (
                                <li
                                  key={i}
                                  className={`text-sm flex items-center gap-2 ${
                                    answer.correct
                                      ? "text-emerald-600 font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      answer.correct
                                        ? "border-emerald-500 bg-emerald-500"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {answer.correct && (
                                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                    )}
                                  </span>
                                  {answer.text || `Option ${i + 1}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {block.type === "Question" && (
                          <div>
                            {block.media && block.media.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1">
                                {block.media.map((url, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded"
                                    title={url}
                                  >
                                    <span className="truncate max-w-[120px]">
                                      Media {i + 1}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-muted-foreground text-sm mb-2">
                              {block.question || "No question yet..."}
                            </p>
                            <ul className="space-y-1">
                              {block.answers?.map((answer, i) => (
                                <li
                                  key={i}
                                  className="text-sm flex items-center gap-2 text-muted-foreground"
                                >
                                  <span className="w-4 h-4 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50" />
                                  </span>
                                  {answer.text || `Option ${i + 1}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {block.type === "Audio" && (
                          <div>
                            {block.text && (
                              <p className="text-muted-foreground text-sm mb-2">
                                {block.text}
                              </p>
                            )}
                            {block.media && block.media.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {block.media.map((url, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-pink-100 text-pink-700 rounded"
                                    title={url}
                                  >
                                    <Music className="w-3 h-3" />
                                    <span className="truncate max-w-[120px]">
                                      Audio {i + 1}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {(!block.media || block.media.length === 0) && (
                              <p className="text-xs text-muted-foreground italic">
                                No audio URLs yet
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === "MultiChoice" && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-2">
                              {block.question || "No question yet..."}
                            </p>
                            <ul className="space-y-1">
                              {block.answers?.map((answer, i) => (
                                <li
                                  key={i}
                                  className={`text-sm flex items-center gap-2 ${
                                    answer.correct
                                      ? "text-purple-600 font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      answer.correct
                                        ? "border-purple-500 bg-purple-500"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {answer.correct && (
                                      <span className="w-1.5 h-1.5 bg-white" />
                                    )}
                                  </span>
                                  {answer.text || `Option ${i + 1}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {block.type === "Revision" && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">
                              {block.text || "No text yet..."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Prefix: <span className="font-mono">{block.prefix || "not set"}</span>
                            </p>
                            {block.button && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Button: {block.button}
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === "Jump" && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-2">
                              {block.text || "No text yet..."}
                            </p>
                            {block.options && block.options.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {block.options.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-teal-100 text-teal-700 rounded"
                                    title={`${opt.goto ? `goto: ${opt.goto}` : ''} ${opt.wait ? `wait: ${opt.wait}` : ''}`}
                                  >
                                    <Split className="w-3 h-3" />
                                    {opt.text || `Option ${i + 1}`}
                                  </span>
                                ))}
                              </div>
                            )}
                            {(!block.options || block.options.length === 0) && (
                              <p className="text-xs text-muted-foreground italic">
                                No options yet
                              </p>
                            )}
                            {block.button && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Button: {block.button}
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === "Test" && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-1">
                              {block.text || "No text yet..."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Prefix: <span className="font-mono">{block.prefix || "not set"}</span>
                            </p>
                            {block.score && Object.keys(block.score).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(block.score)
                                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                  .map(([percent, message]) => (
                                    <div key={percent} className="text-xs">
                                      <span className="font-mono text-yellow-600">≤{percent}%</span>: {message}
                                    </div>
                                  ))}
                              </div>
                            )}
                            {block.button && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Button: {block.button}
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === "End" && (
                          <div>
                            {block.text ? (
                              <p className="text-muted-foreground text-sm">
                                {block.text}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                Silent end (no message)
                              </p>
                            )}
                          </div>
                        )}

                        {block.type === "Input" && (
                          <div>
                            <p className="text-muted-foreground text-sm mb-2">
                              {block.prompt || "No prompt yet..."}
                            </p>
                            <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground italic">
                              {block.placeholder || "Student will type here..."}
                            </div>
                          </div>
                        )}

                        {block.type === "Dialog" && (
                          <div>
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {block.text || "No initial message yet..."}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Model: {block.model || "default"} | Temperature: {block.temperature ?? 0.7} | Max tokens: {block.maxTokens ?? 150}
                            </p>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
              );
            })}

            {blocks.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  No blocks yet. Add your first block to get started.
                </p>
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add block
                </button>
              </div>
            )}
          </div>
        </main>

          {/* Right Sidebar - Properties */}
          <aside className="editor-properties-sidebar border-l border-border bg-card flex flex-col shrink-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Properties
              </h2>
              {selectedBlock && (
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="p-1 rounded hover:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {selectedBlock ? (
                <BlockInspector
                  block={selectedBlock}
                  blocks={blocks}
                  onUpdate={(updates) =>
                    handleUpdateBlock(selectedBlock.id, updates)
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full p-6">
                  <p className="text-center text-muted-foreground text-sm">
                    Select a block to edit its properties
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAiModal(false)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold">AI Assistant for the course</h2>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded hover:bg-muted"
                data-testid="button-close-ai-modal"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Describe what you want to improve in the course. For example:
                "Make all texts simpler for A1 level" or "Suggest 3 course
                format variations."
              </p>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Scope
                </label>
                <select
                  value={aiScope}
                  onChange={(e) =>
                    setAiScope(e.target.value as "block" | "course")
                  }
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                  data-testid="select-ai-scope"
                >
                  <option value="course">Entire course</option>
                  <option value="block" disabled={!selectedBlock}>
                    Selected block{selectedBlock ? ` (${selectedBlock.type})` : " (none selected)"}
                  </option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Instruction
                  </label>
                  <button
                    onClick={() => {
                      setTempInstruction(aiInstruction);
                      setShowInstructionExpand(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid="button-expand-instruction"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Expand
                  </button>
                </div>
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="What would you like the AI to do?"
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                  data-testid="textarea-ai-instruction"
                />
              </div>

              {showInstructionExpand && (
                <div
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
                  onClick={() => setShowInstructionExpand(false)}
                >
                  <div
                    className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                      <h2 className="font-semibold">Edit Instruction</h2>
                      <button
                        onClick={() => setShowInstructionExpand(false)}
                        className="p-1 rounded hover:bg-muted"
                        data-testid="button-close-instruction-modal"
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                      <textarea
                        value={tempInstruction}
                        onChange={(e) => setTempInstruction(e.target.value)}
                        placeholder="What would you like the AI to do?"
                        className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                        data-testid="textarea-instruction-modal"
                        autoFocus
                      />
                    </div>
                    <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                      <button
                        onClick={() => setShowInstructionExpand(false)}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                        data-testid="button-cancel-instruction"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setAiInstruction(tempInstruction);
                          setShowInstructionExpand(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        data-testid="button-save-instruction"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {aiResponse && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    AI Response:
                  </p>
                  <p className="text-sm">{aiResponse}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setAiInstruction("");
                  setAiResponse(null);
                }}
                className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                data-testid="button-cancel-ai"
              >
                Cancel
              </button>
              <button
                onClick={handleAiSubmit}
                disabled={aiLoading || !aiInstruction.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-send-to-ai"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send to AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BlockInspectorProps {
  block: Block;
  blocks: Block[];
  onUpdate: (updates: Partial<Block>) => void;
}

function BlockInspector({ block, blocks, onUpdate }: BlockInspectorProps) {
  const config = blockTypeConfig[block.type];
  const Icon = config.icon;
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [tempPrompt, setTempPrompt] = useState("");
  const [showTextModal, setShowTextModal] = useState(false);
  const [tempText, setTempText] = useState("");
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [tempConversation, setTempConversation] = useState("");
  const [showFeedbackCorrectModal, setShowFeedbackCorrectModal] = useState(false);
  const [tempFeedbackCorrect, setTempFeedbackCorrect] = useState("");
  const [showFeedbackPartialModal, setShowFeedbackPartialModal] = useState(false);
  const [tempFeedbackPartial, setTempFeedbackPartial] = useState("");
  const [showFeedbackIncorrectModal, setShowFeedbackIncorrectModal] = useState(false);
  const [tempFeedbackIncorrect, setTempFeedbackIncorrect] = useState("");
  const [editingRevisionField, setEditingRevisionField] = useState<"text" | "noMistakes" | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [tempId, setTempId] = useState(block.id);
  const [draggedAnswerIndex, setDraggedAnswerIndex] = useState<number | null>(null);
  const [dragOverAnswerIndex, setDragOverAnswerIndex] = useState<number | null>(null);

  // Синхронизируем tempId при изменении block.id извне
  useEffect(() => {
    setTempId(block.id);
    setIdError(null);
  }, [block.id]);

  // Проверка уникальности ID
  const validateId = (newId: string): string | null => {
    if (!newId || newId.trim() === "") {
      return "ID не может быть пустым";
    }
    
    // Проверяем, что ID не содержит недопустимых символов для YAML ключей
    if (!/^[a-zA-Z0-9_]+$/.test(newId)) {
      return "ID может содержать только буквы, цифры и подчеркивания";
    }
    
    // Проверяем уникальность (исключая текущий блок)
    const isDuplicate = blocks.some(b => b.id === newId && b.id !== block.id);
    if (isDuplicate) {
      return `ID "${newId}" уже используется другим блоком`;
    }
    
    return null;
  };

  const handleIdChange = (newId: string) => {
    setTempId(newId);
    const error = validateId(newId);
    setIdError(error);
  };

  const handleIdBlur = () => {
    const error = validateId(tempId);
    if (!error && tempId !== block.id) {
      // Обновляем ID блока
      onUpdate({ id: tempId });
    } else if (error) {
      // Если есть ошибка, возвращаем старое значение
      setTempId(block.id);
      setIdError(null);
    }
  };

  const handleAddAnswer = () => {
    const newAnswers = [
      ...(block.answers || []),
      block.type === "Question" ? { text: "" } : { text: "", correct: false },
    ];
    onUpdate({ answers: newAnswers });
  };

  const handleRemoveAnswer = (index: number) => {
    if ((block.answers?.length || 0) <= 2) return;
    const newAnswers = block.answers?.filter((_, i) => i !== index);
    onUpdate({ answers: newAnswers });
  };

  const handleUpdateAnswer = (
    index: number,
    updates: Partial<Answer>
  ) => {
    const newAnswers = block.answers?.map((a, i) =>
      i === index ? { ...a, ...updates } : a
    );
    onUpdate({ answers: newAnswers });
  };

  const handleSetCorrectAnswer = (index: number) => {
    const newAnswers = block.answers?.map((a, i) => ({
      ...a,
      correct: i === index,
    }));
    onUpdate({ answers: newAnswers });
  };

  const handleToggleMultiChoiceAnswer = (index: number) => {
    const newAnswers = block.answers?.map((a, i) => ({
      ...a,
      correct: i === index ? !a.correct : a.correct,
    }));
    onUpdate({ answers: newAnswers });
  };

  // Drag and drop для вариантов ответов Quiz
  const handleAnswerDragStart = (e: React.DragEvent, index: number) => {
    setDraggedAnswerIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleAnswerDragEnd = () => {
    setDraggedAnswerIndex(null);
    setDragOverAnswerIndex(null);
  };

  const handleAnswerDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== draggedAnswerIndex) {
      setDragOverAnswerIndex(index);
    }
  };

  const handleAnswerDragLeave = () => {
    setDragOverAnswerIndex(null);
  };

  const handleAnswerDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedAnswerIndex === null || draggedAnswerIndex === targetIndex) return;

    const newAnswers = [...(block.answers || [])];
    const [draggedAnswer] = newAnswers.splice(draggedAnswerIndex, 1);
    newAnswers.splice(targetIndex, 0, draggedAnswer);
    
    onUpdate({ answers: newAnswers });
    setDraggedAnswerIndex(null);
    setDragOverAnswerIndex(null);
  };

  const handleAiAction = async (action: string) => {
    setAiLoading(action);
    try {
      const result = await callAiAssistant({
        scope: "block",
        action,
        block,
      });
      if (result.updatedBlock) {
        onUpdate(result.updatedBlock);
      }
    } catch (error) {
      console.error("AI action failed:", error);
    } finally {
      setAiLoading(null);
    }
  };

  const AiButton = ({
    action,
    label,
  }: {
    action: string;
    label: string;
  }) => (
    <button
      onClick={() => handleAiAction(action)}
      disabled={aiLoading !== null}
      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid={`button-ai-${action}`}
    >
      {aiLoading === action ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Thinking...
        </>
      ) : (
        <>
          <Wand2 className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </button>
  );

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor}`}
        >
          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
          {block.type}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            ID
          </label>
          <input
            type="text"
            value={tempId}
            onChange={(e) => handleIdChange(e.target.value)}
            onBlur={handleIdBlur}
            className={`w-full px-3 py-2 text-sm bg-background rounded-lg border font-mono transition-colors ${
              idError
                ? "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
                : "border-input focus:border-ring focus:ring-1 focus:ring-ring"
            } outline-none`}
            data-testid="input-block-id"
          />
          {idError && (
            <p className="text-xs text-destructive mt-1">{idError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Уникальный идентификатор блока (только буквы, цифры и подчеркивания)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Type
          </label>
          <select
            value={block.type}
            disabled
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border text-muted-foreground"
            data-testid="select-block-type"
          >
            <option>{block.type}</option>
          </select>
        </div>


        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Parse mode
          </label>
          <select
            value={block.parseMode}
            onChange={(e) => onUpdate({ parseMode: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
            data-testid="select-parse-mode"
          >
            <option value="TEXT">TEXT</option>
            <option value="MARKDOWN">MARKDOWN</option>
            <option value="HTML">HTML</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-border space-y-4">
        {block.type === "Section" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Section Title
              </label>
              <input
                type="text"
                value={block.title || ""}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Section name"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="input-section-title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Description
              </label>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Sections are meta-blocks for visual organization. They won't be executed during course runtime.
              </p>
            </div>
          </>
        )}

        {block.type === "Message" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Text
                </label>
                <button
                  onClick={() => {
                    setTempText(block.text || "");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-text"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Message content..."
                rows={5}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-message-text"
              />
            </div>

            {showTextModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowTextModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Text</h2>
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder="Message content..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-text-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ text: tempText });
                        setShowTextModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Media URLs
                </label>
                <button
                  onClick={() => {
                    const currentMedia = block.media || [];
                    onUpdate({ media: [...currentMedia, ""] });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-add-media"
                >
                  <Plus className="w-3 h-3" />
                  Add URL
                </button>
              </div>
              <div className="space-y-2">
                {(block.media || []).map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newMedia = [...(block.media || [])];
                        newMedia[index] = e.target.value;
                        onUpdate({ media: newMedia });
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid={`input-media-${index}`}
                    />
                    <button
                      onClick={() => {
                        const newMedia = [...(block.media || [])];
                        newMedia.splice(index, 1);
                        onUpdate({ media: newMedia.length > 0 ? newMedia : undefined });
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-remove-media-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!block.media || block.media.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No media URLs. Click "Add URL" to add images or videos.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Button (optional)
              </label>
              <input
                type="text"
                value={block.button || ""}
                onChange={(e) => onUpdate({ button: e.target.value })}
                placeholder="Continue"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="input-message-button"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Текст кнопки для продолжения. Если указан, элемент будет ждать нажатия кнопки перед переходом к следующему.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Options (inline buttons)
                </label>
                <button
                  onClick={() => {
                    const currentOptions = block.options || [];
                    onUpdate({ options: [...currentOptions, { text: "" }] });
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-add-option"
                >
                  <Plus className="w-3 h-3" />
                  Add option
                </button>
              </div>
              <div className="space-y-2">
                {(block.options || []).map((option, index) => (
                  <div key={index} className="p-3 border border-input rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Option {index + 1}</span>
                      <button
                        onClick={() => {
                          const newOptions = [...(block.options || [])];
                          newOptions.splice(index, 1);
                          onUpdate({ options: newOptions.length > 0 ? newOptions : undefined });
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-remove-option-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...(block.options || [])];
                        newOptions[index] = { ...newOptions[index], text: e.target.value };
                        onUpdate({ options: newOptions });
                      }}
                      placeholder="Button text *"
                      className="w-full px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid={`input-option-text-${index}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={option.goto || ""}
                        onChange={(e) => {
                          const newOptions = [...(block.options || [])];
                          newOptions[index] = { ...newOptions[index], goto: e.target.value || undefined };
                          onUpdate({ options: newOptions });
                        }}
                        placeholder="goto: element_id"
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                        data-testid={`input-option-goto-${index}`}
                      />
                      <input
                        type="text"
                        value={option.wait || ""}
                        onChange={(e) => {
                          const newOptions = [...(block.options || [])];
                          newOptions[index] = { ...newOptions[index], wait: e.target.value || undefined };
                          onUpdate({ options: newOptions });
                        }}
                        placeholder="wait: 1d:2h:3m:4s"
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                        data-testid={`input-option-wait-${index}`}
                      />
                    </div>
                    {option.wait && (
                      <input
                        type="text"
                        value={option.wait_text || ""}
                        onChange={(e) => {
                          const newOptions = [...(block.options || [])];
                          newOptions[index] = { ...newOptions[index], wait_text: e.target.value || undefined };
                          onUpdate({ options: newOptions });
                        }}
                        placeholder="wait_text: Message when wait is set"
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                        data-testid={`input-option-wait-text-${index}`}
                      />
                    )}
                  </div>
                ))}
                {(!block.options || block.options.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No inline buttons. Click "Add option" to add inline buttons for navigation.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input
                  type="checkbox"
                  checked={block.linkPreview}
                  onChange={(e) => onUpdate({ linkPreview: e.target.checked })}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                  data-testid="checkbox-link-preview-message"
                />
                <span className="text-sm font-medium text-muted-foreground">Link preview</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                Показывать ли превью ссылок в сообщении. Если включено, Telegram автоматически отображает картинку, заголовок и описание для ссылок в тексте.
              </p>
            </div>
          </>
        )}

        {block.type === "Quiz" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Question
              </label>
              <textarea
                value={block.question || ""}
                onChange={(e) => onUpdate({ question: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-quiz-question"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Answers
                </label>
                <button
                  onClick={handleAddAnswer}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-add-answer"
                >
                  <Plus className="w-3 h-3" />
                  Add answer
                </button>
              </div>
              <div className="space-y-2">
                {block.answers?.map((answer, index) => {
                  const isDragging = draggedAnswerIndex === index;
                  const isDragOver = dragOverAnswerIndex === index;
                  
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleAnswerDragStart(e, index)}
                      onDragEnd={handleAnswerDragEnd}
                      onDragOver={(e) => handleAnswerDragOver(e, index)}
                      onDragLeave={handleAnswerDragLeave}
                      onDrop={(e) => handleAnswerDrop(e, index)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isDragging
                          ? "opacity-50"
                          : isDragOver
                          ? "bg-primary/10 border-2 border-dashed border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`answer-item-${index}`}
                    >
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <button
                        onClick={() => handleSetCorrectAnswer(index)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          answer.correct
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-muted-foreground/30 hover:border-muted-foreground/50"
                        }`}
                        data-testid={`button-correct-${index}`}
                      >
                        {answer.correct && (
                          <span className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </button>
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) =>
                          handleUpdateAnswer(index, { text: e.target.value })
                        }
                        placeholder={`Answer ${index + 1}`}
                        className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                        data-testid={`input-answer-${index}`}
                      />
                      <button
                        onClick={() => handleRemoveAnswer(index)}
                        disabled={(block.answers?.length || 0) <= 2}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                        data-testid={`button-remove-answer-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Media URLs
                </label>
                <button
                  onClick={() => {
                    const currentMedia = block.media || [];
                    onUpdate({ media: [...currentMedia, ""] });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-add-media-quiz"
                >
                  <Plus className="w-3 h-3" />
                  Add URL
                </button>
              </div>
              <div className="space-y-2">
                {(block.media || []).map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newMedia = [...(block.media || [])];
                        newMedia[index] = e.target.value;
                        onUpdate({ media: newMedia });
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid={`input-media-quiz-${index}`}
                    />
                    <button
                      onClick={() => {
                        const newMedia = [...(block.media || [])];
                        newMedia.splice(index, 1);
                        onUpdate({ media: newMedia.length > 0 ? newMedia : undefined });
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-remove-media-quiz-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!block.media || block.media.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No media URLs. Click "Add URL" to add images (sent before quiz).
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input
                  type="checkbox"
                  checked={block.linkPreview}
                  onChange={(e) => onUpdate({ linkPreview: e.target.checked })}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                  data-testid="checkbox-link-preview-quiz"
                />
                <span className="text-sm font-medium text-muted-foreground">Link preview</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                Показывать ли превью ссылок в сообщении. Если включено, Telegram автоматически отображает картинку, заголовок и описание для ссылок в тексте.
              </p>
            </div>
          </>
        )}

        {block.type === "Question" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Question <span className="text-destructive">*</span>
              </label>
              <textarea
                value={block.question || ""}
                onChange={(e) => onUpdate({ question: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-question-question"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Answers
                </label>
                <button
                  onClick={handleAddAnswer}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-add-answer-question"
                >
                  <Plus className="w-3 h-3" />
                  Add answer
                </button>
              </div>
              <div className="space-y-2">
                {block.answers?.map((answer, index) => {
                  const isDragging = draggedAnswerIndex === index;
                  const isDragOver = dragOverAnswerIndex === index;
                  
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleAnswerDragStart(e, index)}
                      onDragEnd={handleAnswerDragEnd}
                      onDragOver={(e) => handleAnswerDragOver(e, index)}
                      onDragLeave={handleAnswerDragLeave}
                      onDrop={(e) => handleAnswerDrop(e, index)}
                      className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                        isDragging
                          ? "opacity-50"
                          : isDragOver
                          ? "bg-primary/10 border-2 border-dashed border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`answer-item-question-${index}`}
                    >
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground mt-1"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={answer.text}
                          onChange={(e) =>
                            handleUpdateAnswer(index, { text: e.target.value })
                          }
                          placeholder={`Answer ${index + 1}`}
                          className="w-full px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                          data-testid={`input-answer-question-${index}`}
                        />
                        <input
                          type="text"
                          value={answer.feedback || ""}
                          onChange={(e) =>
                            handleUpdateAnswer(index, { feedback: e.target.value })
                          }
                          placeholder={`Feedback for answer ${index + 1} (optional)`}
                          className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                          data-testid={`input-feedback-question-${index}`}
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveAnswer(index)}
                        disabled={(block.answers?.length || 0) <= 2}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed mt-1"
                        data-testid={`button-remove-answer-question-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Media URLs
                </label>
                <button
                  onClick={() => {
                    const currentMedia = block.media || [];
                    onUpdate({ media: [...currentMedia, ""] });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-add-media-question"
                >
                  <Plus className="w-3 h-3" />
                  Add URL
                </button>
              </div>
              <div className="space-y-2">
                {(block.media || []).map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newMedia = [...(block.media || [])];
                        newMedia[index] = e.target.value;
                        onUpdate({ media: newMedia });
                      }}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid={`input-media-question-${index}`}
                    />
                    <button
                      onClick={() => {
                        const newMedia = [...(block.media || [])];
                        newMedia.splice(index, 1);
                        onUpdate({ media: newMedia.length > 0 ? newMedia : undefined });
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-remove-media-question-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!block.media || block.media.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No media URLs. Click "Add URL" to add images (sent before question).
                  </p>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={block.linkPreview}
                onChange={(e) => onUpdate({ linkPreview: e.target.checked })}
                className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                data-testid="checkbox-link-preview-question"
              />
              <span className="text-sm font-medium text-muted-foreground">Link preview</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6">
              Показывать ли превью ссылок в сообщении. Если включено, Telegram автоматически отображает картинку, заголовок и описание для ссылок в тексте.
            </p>
          </>
        )}

        {block.type === "Audio" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Text (optional)
                </label>
                <button
                  onClick={() => {
                    setTempText(block.text || "");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-text-audio"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Text before or with audio (optional)..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-audio-text"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Media URLs <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    const currentMedia = block.media || [];
                    onUpdate({ media: [...currentMedia, ""] });
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-add-media-audio"
                >
                  <Plus className="w-3 h-3" />
                  Add URL
                </button>
              </div>
              <div className="space-y-2">
                {(block.media || []).map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const newMedia = [...(block.media || [])];
                        newMedia[index] = e.target.value;
                        onUpdate({ media: newMedia });
                      }}
                      placeholder="https://example.com/audio.mp3"
                      className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid={`input-media-audio-${index}`}
                    />
                    <button
                      onClick={() => {
                        const newMedia = [...(block.media || [])];
                        newMedia.splice(index, 1);
                        onUpdate({ media: newMedia.length > 0 ? newMedia : [""] });
                      }}
                      disabled={(block.media?.length || 0) <= 1}
                      className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      data-testid={`button-remove-media-audio-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!block.media || block.media.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    At least one audio URL is required. Supported formats: MP3, M4A, OGG.
                  </p>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={block.linkPreview}
                onChange={(e) => onUpdate({ linkPreview: e.target.checked })}
                className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                data-testid="checkbox-link-preview-audio"
              />
              <span className="text-sm font-medium text-muted-foreground">Link preview</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6">
              Показывать ли превью ссылок в сообщении. Если включено, Telegram автоматически отображает картинку, заголовок и описание для ссылок в тексте.
            </p>
          </>
        )}

        {block.type === "MultiChoice" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Question <span className="text-destructive">*</span>
              </label>
              <textarea
                value={block.question || ""}
                onChange={(e) => onUpdate({ question: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-multichoice-question"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Answers
                </label>
                <button
                  onClick={handleAddAnswer}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-add-answer-multichoice"
                >
                  <Plus className="w-3 h-3" />
                  Add answer
                </button>
              </div>
              <div className="space-y-2">
                {block.answers?.map((answer, index) => {
                  const isDragging = draggedAnswerIndex === index;
                  const isDragOver = dragOverAnswerIndex === index;
                  
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleAnswerDragStart(e, index)}
                      onDragEnd={handleAnswerDragEnd}
                      onDragOver={(e) => handleAnswerDragOver(e, index)}
                      onDragLeave={handleAnswerDragLeave}
                      onDrop={(e) => handleAnswerDrop(e, index)}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isDragging
                          ? "opacity-50"
                          : isDragOver
                          ? "bg-primary/10 border-2 border-dashed border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`answer-item-multichoice-${index}`}
                    >
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <button
                        onClick={() => handleToggleMultiChoiceAnswer(index)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          answer.correct
                            ? "border-purple-500 bg-purple-500"
                            : "border-muted-foreground/30 hover:border-muted-foreground/50"
                        }`}
                        data-testid={`button-correct-multichoice-${index}`}
                      >
                        {answer.correct && (
                          <span className="w-1.5 h-1.5 bg-white" />
                        )}
                      </button>
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) =>
                          handleUpdateAnswer(index, { text: e.target.value })
                        }
                        placeholder={`Answer ${index + 1}`}
                        className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                        data-testid={`input-answer-multichoice-${index}`}
                      />
                      <button
                        onClick={() => handleRemoveAnswer(index)}
                        disabled={(block.answers?.length || 0) <= 2}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                        data-testid={`button-remove-answer-multichoice-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Feedback (Correct) <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempFeedbackCorrect(block.feedbackCorrect || "");
                    setShowFeedbackCorrectModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-feedback-correct"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.feedbackCorrect || ""}
                onChange={(e) => onUpdate({ feedbackCorrect: e.target.value })}
                placeholder="Message when all correct answers are selected..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-feedback-correct"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Feedback (Partial) <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempFeedbackPartial(block.feedbackPartial || "");
                    setShowFeedbackPartialModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-feedback-partial"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.feedbackPartial || ""}
                onChange={(e) => onUpdate({ feedbackPartial: e.target.value })}
                placeholder="Message when partially correct..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-feedback-partial"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Feedback (Incorrect) <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempFeedbackIncorrect(block.feedbackIncorrect || "");
                    setShowFeedbackIncorrectModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-feedback-incorrect"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.feedbackIncorrect || ""}
                onChange={(e) => onUpdate({ feedbackIncorrect: e.target.value })}
                placeholder="Message when incorrect..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-feedback-incorrect"
              />
            </div>

            {showFeedbackCorrectModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowFeedbackCorrectModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Feedback (Correct)</h2>
                    <button
                      onClick={() => setShowFeedbackCorrectModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-feedback-correct-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempFeedbackCorrect}
                      onChange={(e) => setTempFeedbackCorrect(e.target.value)}
                      placeholder="Message when all correct answers are selected..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-feedback-correct-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowFeedbackCorrectModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-feedback-correct"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ feedbackCorrect: tempFeedbackCorrect });
                        setShowFeedbackCorrectModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-feedback-correct"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showFeedbackPartialModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowFeedbackPartialModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Feedback (Partial)</h2>
                    <button
                      onClick={() => setShowFeedbackPartialModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-feedback-partial-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempFeedbackPartial}
                      onChange={(e) => setTempFeedbackPartial(e.target.value)}
                      placeholder="Message when partially correct..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-feedback-partial-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowFeedbackPartialModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-feedback-partial"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ feedbackPartial: tempFeedbackPartial });
                        setShowFeedbackPartialModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-feedback-partial"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showFeedbackIncorrectModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowFeedbackIncorrectModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Feedback (Incorrect)</h2>
                    <button
                      onClick={() => setShowFeedbackIncorrectModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-feedback-incorrect-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempFeedbackIncorrect}
                      onChange={(e) => setTempFeedbackIncorrect(e.target.value)}
                      placeholder="Message when incorrect..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-feedback-incorrect-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowFeedbackIncorrectModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-feedback-incorrect"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ feedbackIncorrect: tempFeedbackIncorrect });
                        setShowFeedbackIncorrectModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-feedback-incorrect"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {block.type === "Input" && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Prompt
              </label>
              <textarea
                value={block.prompt || ""}
                onChange={(e) => onUpdate({ prompt: e.target.value })}
                placeholder="Question for the student..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-input-prompt"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Placeholder
              </label>
              <input
                type="text"
                value={block.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Example answer..."
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="input-placeholder"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Normalization
              </label>
              <select
                value={block.normalization || "none"}
                onChange={(e) => onUpdate({ normalization: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="select-normalization"
              >
                <option value="none">None</option>
                <option value="lowercase">Lowercase</option>
                <option value="trim">Trim</option>
              </select>
            </div>
          </>
        )}

        {block.type === "Dialog" && (
          <>
            {/* Basic Settings */}
            <div className="space-y-4 pb-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Settings
              </h3>
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Text <span className="text-destructive">*</span>
                  </label>
                  <button
                    onClick={() => {
                      setTempText(block.text || "");
                      setShowTextModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid="button-expand-text"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Expand
                  </button>
                </div>
                <textarea
                  value={block.text || ""}
                  onChange={(e) => onUpdate({ text: e.target.value })}
                  placeholder="Initial message to the user..."
                  rows={5}
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                  data-testid="textarea-dialog-text"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    System prompt <span className="text-destructive">*</span>
                  </label>
                  <button
                    onClick={() => {
                      setTempPrompt(block.systemPrompt || "");
                      setShowPromptModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid="button-expand-prompt"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Expand
                  </button>
                </div>
                <textarea
                  value={block.systemPrompt || ""}
                  onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
                  placeholder="Instructions for the AI..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                  data-testid="textarea-system-prompt"
                />
              </div>
            </div>

            {/* Model Settings */}
            <div className="space-y-4 pt-4 pb-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Model Settings
              </h3>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Model
                </label>
                <input
                  type="text"
                  value={block.model || ""}
                  onChange={(e) => onUpdate({ model: e.target.value })}
                  placeholder="gpt-4, o1, o3..."
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                  data-testid="input-model"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Model to use for AI responses (e.g., gpt-4, o1, o3)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Temperature
                  </label>
                  <input
                    type="number"
                    value={block.temperature ?? 0.7}
                    onChange={(e) =>
                      onUpdate({ temperature: parseFloat(e.target.value) || 0.7 })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                    data-testid="input-temperature"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Max tokens
                  </label>
                  <input
                    type="number"
                    value={block.maxTokens ?? 150}
                    onChange={(e) =>
                      onUpdate({ maxTokens: parseInt(e.target.value) || 150 })
                    }
                    min={1}
                    className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                    data-testid="input-max-tokens"
                  />
                </div>
              </div>

              {(block.model?.startsWith('o1') || block.model?.startsWith('o3')) && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Reasoning
                  </label>
                  <input
                    type="text"
                    value={block.reasoning || ""}
                    onChange={(e) => onUpdate({ reasoning: e.target.value })}
                    placeholder="low, medium, high"
                    className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                    data-testid="input-reasoning"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Reasoning effort level (only for reasoning models). Common values: low, medium, high
                  </p>
                </div>
              )}
            </div>

            {/* Voice Settings */}
            <div className="space-y-4 pt-4 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Voice Settings
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={block.voiceResponse || false}
                    onChange={(e) => onUpdate({ voiceResponse: e.target.checked })}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                    data-testid="checkbox-voice-response"
                  />
                  <span className="text-xs font-medium text-muted-foreground">Enable voice responses</span>
                </label>
              </div>

              {block.voiceResponse && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Transcription language
                    </label>
                    <input
                      type="text"
                      value={block.transcriptionLanguage || ""}
                      onChange={(e) => onUpdate({ transcriptionLanguage: e.target.value })}
                      placeholder="Auto-detect (leave empty)"
                      className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid="input-transcription-language"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Language for voice message transcription (ISO-639-1 code, e.g., el, en, ru). Leave empty for auto-detection.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      TTS Voice
                    </label>
                    <input
                      type="text"
                      value={block.ttsVoice || "21m00Tcm4TlvDq8ikWAM"}
                      onChange={(e) => onUpdate({ ttsVoice: e.target.value })}
                      placeholder="21m00Tcm4TlvDq8ikWAM"
                      className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                      data-testid="input-tts-voice"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Eleven Labs voice ID (default: 21m00Tcm4TlvDq8ikWAM)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      TTS Model
                    </label>
                    <select
                      value={block.ttsModel || "eleven_multilingual_v2"}
                      onChange={(e) => onUpdate({ ttsModel: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid="select-tts-model"
                    >
                      <option value="eleven_multilingual_v2">eleven_multilingual_v2</option>
                      <option value="eleven_turbo_v2">eleven_turbo_v2</option>
                      <option value="eleven_monolingual_v1">eleven_monolingual_v1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      TTS Speed
                    </label>
                    <input
                      type="number"
                      value={block.ttsSpeed ?? 1.0}
                      onChange={(e) =>
                        onUpdate({ ttsSpeed: parseFloat(e.target.value) || 1.0 })
                      }
                      min={0.25}
                      max={4.0}
                      step={0.05}
                      className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid="input-tts-speed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Speech speed multiplier (0.25-4.0, recommended: 0.8-0.9 for slower, clearer speech)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4 pt-4 pb-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Advanced Settings
              </h3>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={block.autoStart || false}
                  onChange={(e) => onUpdate({ autoStart: e.target.checked })}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                  data-testid="checkbox-auto-start"
                />
                <span className="text-xs">Auto-start dialog</span>
              </label>
              <p className="text-xs text-muted-foreground pl-6">
                Bot will automatically send the first message after initial text, without waiting for user input
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Conversation
                  </label>
                  <button
                    onClick={() => {
                      setTempConversation(
                        block.conversation
                          ? JSON.stringify(block.conversation, null, 2)
                          : ""
                      );
                      setShowConversationModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid="button-expand-conversation"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Expand
                  </button>
                </div>
                <textarea
                  value={
                    block.conversation
                      ? JSON.stringify(block.conversation, null, 2)
                      : ""
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) {
                        onUpdate({ conversation: parsed });
                      }
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="Initial conversation history (JSON format)..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                  data-testid="textarea-conversation"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional initial conversation history in JSON format
                </p>
              </div>
            </div>

            {/* Modals */}
            {showTextModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowTextModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Text</h2>
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder="Initial message to the user..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-text-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ text: tempText });
                        setShowTextModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPromptModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowPromptModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit System Prompt</h2>
                    <button
                      onClick={() => setShowPromptModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-prompt-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      placeholder="Instructions for the AI..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-prompt-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowPromptModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-prompt"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ systemPrompt: tempPrompt });
                        setShowPromptModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-prompt"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showConversationModal && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowConversationModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Conversation</h2>
                    <button
                      onClick={() => setShowConversationModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-conversation-modal"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempConversation}
                      onChange={(e) => setTempConversation(e.target.value)}
                      placeholder='[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]'
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-conversation-modal"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowConversationModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-conversation"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(tempConversation);
                          if (Array.isArray(parsed)) {
                            onUpdate({ conversation: parsed });
                            setShowConversationModal(false);
                          } else {
                            alert("Invalid format: must be a JSON array");
                          }
                        } catch (e) {
                          alert(`Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-conversation"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {block.type === "Revision" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Text <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempText(block.text || "");
                    setEditingRevisionField("text");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-text-revision"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Message when there are mistakes to repeat..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-revision-text"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Prefix <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={block.prefix || ""}
                onChange={(e) => onUpdate({ prefix: e.target.value })}
                placeholder="vocab_ or Test_Quiz_"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                data-testid="input-revision-prefix"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Префикс ID элементов для поиска ошибок (например, vocab_ для элементов vocab_1, vocab_2)
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  No Mistakes Message <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempText(block.noMistakes || "");
                    setEditingRevisionField("noMistakes");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-no-mistakes"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.noMistakes || ""}
                onChange={(e) => onUpdate({ noMistakes: e.target.value })}
                placeholder="Message when there are no mistakes..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-revision-no-mistakes"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Button (optional)
              </label>
              <input
                type="text"
                value={block.button || ""}
                onChange={(e) => onUpdate({ button: e.target.value })}
                placeholder="Начать повторение"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="input-revision-button"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Текст кнопки для продолжения после показа сообщения (опционально)
              </p>
            </div>

            {showTextModal && block.type === "Revision" && editingRevisionField && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => {
                  setShowTextModal(false);
                  setEditingRevisionField(null);
                }}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">
                      Edit {editingRevisionField === "text" ? "Text" : "No Mistakes Message"}
                    </h2>
                    <button
                      onClick={() => {
                        setShowTextModal(false);
                        setEditingRevisionField(null);
                      }}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal-revision"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder={editingRevisionField === "text" 
                        ? "Message when there are mistakes to repeat..."
                        : "Message when there are no mistakes..."}
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none font-mono"
                      data-testid="textarea-text-modal-revision"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setShowTextModal(false);
                        setEditingRevisionField(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text-revision"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (editingRevisionField === "text") {
                          onUpdate({ text: tempText });
                        } else if (editingRevisionField === "noMistakes") {
                          onUpdate({ noMistakes: tempText });
                        }
                        setShowTextModal(false);
                        setEditingRevisionField(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text-revision"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showTextModal && block.type === "Jump" && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowTextModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Text</h2>
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal-jump"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder="Question or message..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                      data-testid="textarea-text-modal-jump"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text-modal-jump"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ text: tempText });
                        setShowTextModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text-modal-jump"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showTextModal && block.type === "Jump" && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowTextModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Text</h2>
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal-jump"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder="Question or message..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                      data-testid="textarea-text-modal-jump"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text-modal-jump"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ text: tempText });
                        setShowTextModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text-modal-jump"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {block.type === "Jump" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Text <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempText(block.text || "");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-text-jump"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Question or message..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-jump-text"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Options (inline buttons)
                </label>
                <button
                  onClick={() => {
                    const currentOptions = block.options || [];
                    onUpdate({ options: [...currentOptions, { text: "" }] });
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-add-option-jump"
                >
                  <Plus className="w-3 h-3" />
                  Add option
                </button>
              </div>
              <div className="space-y-2">
                {(block.options || []).map((option, index) => (
                  <div key={index} className="p-3 border border-input rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Option {index + 1}</span>
                      <button
                        onClick={() => {
                          const newOptions = [...(block.options || [])];
                          newOptions.splice(index, 1);
                          onUpdate({ options: newOptions.length > 0 ? newOptions : undefined });
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-remove-option-jump-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => {
                        const newOptions = [...(block.options || [])];
                        newOptions[index] = { ...newOptions[index], text: e.target.value };
                        onUpdate({ options: newOptions });
                      }}
                      placeholder="Button text *"
                      className="w-full px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      data-testid={`input-option-text-jump-${index}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={option.goto || ""}
                        onChange={(e) => {
                          const newOptions = [...(block.options || [])];
                          newOptions[index] = { ...newOptions[index], goto: e.target.value || undefined };
                          onUpdate({ options: newOptions });
                        }}
                        placeholder="goto: element_id"
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                        data-testid={`input-option-goto-jump-${index}`}
                      />
                      <input
                        type="text"
                        value={option.wait || ""}
                        onChange={(e) => {
                          const newOptions = [...(block.options || [])];
                          newOptions[index] = { ...newOptions[index], wait: e.target.value || undefined };
                          onUpdate({ options: newOptions });
                        }}
                        placeholder="wait: 1d:2h:3m:4s"
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                        data-testid={`input-option-wait-jump-${index}`}
                      />
                    </div>
                    {option.wait && (
                      <input
                        type="text"
                        value={option.wait_text || ""}
                        onChange={(e) => {
                          const newOptions = [...(block.options || [])];
                          newOptions[index] = { ...newOptions[index], wait_text: e.target.value || undefined };
                          onUpdate({ options: newOptions });
                        }}
                        placeholder="wait_text: Message when wait is set"
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                        data-testid={`input-option-wait-text-jump-${index}`}
                      />
                    )}
                  </div>
                ))}
                {(!block.options || block.options.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">
                    No inline buttons. Click "Add option" to add navigation options.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Button (optional)
              </label>
              <input
                type="text"
                value={block.button || ""}
                onChange={(e) => onUpdate({ button: e.target.value })}
                placeholder="Continue"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="input-jump-button"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Текст кнопки для продолжения. Если указан, элемент будет ждать нажатия кнопки перед переходом к следующему.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input
                  type="checkbox"
                  checked={block.linkPreview}
                  onChange={(e) => onUpdate({ linkPreview: e.target.checked })}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                  data-testid="checkbox-link-preview-jump"
                />
                <span className="text-sm font-medium text-muted-foreground">Link preview</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                Показывать ли превью ссылок в сообщении. Если включено, Telegram автоматически отображает картинку, заголовок и описание для ссылок в тексте.
              </p>
            </div>
          </>
        )}

        {block.type === "Test" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Text <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    setTempText(block.text || "");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-text-test"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Result text with {score} and {maxscore} variables..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-test-text"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Используйте переменные {"{score}"} и {"{maxscore}"} для подстановки баллов
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Prefix <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={block.prefix || ""}
                onChange={(e) => onUpdate({ prefix: e.target.value })}
                placeholder="q_"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                data-testid="input-test-prefix"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Префикс ID элементов для подсчета баллов (например, q_ для элементов q_1, q_2)
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Score (evaluations by error percentage) <span className="text-destructive">*</span>
                </label>
                <button
                  onClick={() => {
                    const currentScore = block.score || {};
                    const newKey = Object.keys(currentScore).length > 0 
                      ? Math.max(...Object.keys(currentScore).map(k => parseInt(k))) + 10
                      : 20;
                    onUpdate({ score: { ...currentScore, [newKey]: "" } });
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-add-score-test"
                >
                  <Plus className="w-3 h-3" />
                  Add score
                </button>
              </div>
              <div className="space-y-2">
                {block.score && Object.keys(block.score).length > 0 ? (
                  Object.entries(block.score)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([percent, message]) => (
                      <div key={percent} className="p-3 border border-input rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            ≤{percent}% errors
                          </span>
                          <button
                            onClick={() => {
                              const newScore = { ...block.score };
                              delete newScore[parseInt(percent)];
                              onUpdate({ score: Object.keys(newScore).length > 0 ? newScore : undefined });
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            data-testid={`button-remove-score-test-${percent}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={percent}
                            onChange={(e) => {
                              const numValue = parseInt(e.target.value);
                              if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                const newScore = { ...block.score };
                                delete newScore[parseInt(percent)];
                                newScore[numValue] = message;
                                onUpdate({ score: newScore });
                              }
                            }}
                            min="0"
                            max="100"
                            className="w-20 px-2 py-1 text-xs bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors font-mono"
                            data-testid={`input-score-percent-test-${percent}`}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => {
                              const newScore = { ...block.score };
                              newScore[parseInt(percent)] = e.target.value;
                              onUpdate({ score: newScore });
                            }}
                            placeholder="Message for this error percentage..."
                            className="flex-1 px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                            data-testid={`input-score-message-test-${percent}`}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No score evaluations. Click "Add score" to add evaluation messages.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Button (optional)
              </label>
              <input
                type="text"
                value={block.button || ""}
                onChange={(e) => onUpdate({ button: e.target.value })}
                placeholder="OK"
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                data-testid="input-test-button"
              />
            </div>

            {showTextModal && block.type === "Test" && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowTextModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Text</h2>
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal-test"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder="Result text with {score} and {maxscore} variables..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                      data-testid="textarea-text-modal-test"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text-modal-test"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ text: tempText });
                        setShowTextModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text-modal-test"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {block.type === "End" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Text (optional)
                </label>
                <button
                  onClick={() => {
                    setTempText(block.text || "");
                    setShowTextModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="button-expand-text-end"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand
                </button>
              </div>
              <textarea
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Final message (optional)..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                data-testid="textarea-end-text"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Финальное сообщение при завершении курса. Если не указано, курс завершится без сообщения.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                <input
                  type="checkbox"
                  checked={block.linkPreview}
                  onChange={(e) => onUpdate({ linkPreview: e.target.checked })}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                  data-testid="checkbox-link-preview-end"
                />
                <span className="text-sm font-medium text-muted-foreground">Link preview</span>
              </label>
              <p className="text-xs text-muted-foreground ml-6">
                Показывать ли превью ссылок в сообщении. Если включено, Telegram автоматически отображает картинку, заголовок и описание для ссылок в тексте.
              </p>
            </div>

            {showTextModal && block.type === "End" && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowTextModal(false)}
              >
                <div
                  className="bg-card rounded-xl shadow-2xl w-[90%] h-[80%] max-w-4xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="font-semibold">Edit Text</h2>
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="p-1 rounded hover:bg-muted"
                      data-testid="button-close-text-modal-end"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                    <textarea
                      value={tempText}
                      onChange={(e) => setTempText(e.target.value)}
                      placeholder="Final message (optional)..."
                      className="w-full h-full px-4 py-3 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                      data-testid="textarea-text-modal-end"
                      autoFocus
                    />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setShowTextModal(false)}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      data-testid="button-cancel-text-modal-end"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onUpdate({ text: tempText });
                        setShowTextModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      data-testid="button-save-text-modal-end"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Assistant for this block */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            AI Assistant for this block
          </h3>
        </div>

        <div className="space-y-2">
          {block.type === "Message" && (
            <>
              <AiButton action="shorten_message" label="Shorten text" />
              <AiButton action="simplify_message_a1" label="Simplify for A1" />
              <AiButton action="friendly_message" label="Make more friendly" />
            </>
          )}

          {block.type === "Quiz" && (
            <>
              <AiButton action="improve_quiz_question" label="Improve question" />
              <AiButton action="suggest_quiz_answers" label="Suggest answer options" />
            </>
          )}

          {block.type === "Question" && (
            <>
              <AiButton action="improve_quiz_question" label="Improve question" />
              <AiButton action="suggest_quiz_answers" label="Suggest answer options" />
            </>
          )}

          {block.type === "Audio" && (
            <>
              <AiButton action="shorten_message" label="Shorten text" />
              <AiButton action="simplify_message_a1" label="Simplify for A1" />
            </>
          )}

          {block.type === "MultiChoice" && (
            <>
              <AiButton action="improve_quiz_question" label="Improve question" />
              <AiButton action="suggest_quiz_answers" label="Suggest answer options" />
            </>
          )}

          {block.type === "Input" && (
            <>
              <AiButton action="rephrase_input" label="Rephrase question" />
              <AiButton action="simplify_input_a1" label="Simplify for A1" />
            </>
          )}

          {block.type === "Dialog" && (
            <>
              <AiButton action="improve_system_prompt" label="Improve system prompt" />
              <AiButton action="friendly_dialog" label="Make tone more friendly" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
