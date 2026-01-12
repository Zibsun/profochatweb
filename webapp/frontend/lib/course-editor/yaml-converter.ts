import { Block, BlockType } from './ai-service';

/**
 * Преобразует YAML структуру курса в массив блоков редактора
 */
export function convertYamlToBlocks(yamlContent: Record<string, any>): Block[] {
  const blocks: Block[] = [];

  // Проходим по всем ключам верхнего уровня (element_id)
  for (const [elementId, elementData] of Object.entries(yamlContent)) {
    if (!elementData || typeof elementData !== 'object') {
      continue; // Пропускаем некорректные элементы
    }

    const elementType = elementData.type;

    // Преобразуем в зависимости от типа
    switch (elementType) {
      case 'section':
        blocks.push(convertSectionToBlock(elementId, elementData));
        break;
      case 'message':
        blocks.push(convertMessageToBlock(elementId, elementData));
        break;
      case 'quiz':
        blocks.push(convertQuizToBlock(elementId, elementData));
        break;
      case 'question':
        blocks.push(convertQuestionToBlock(elementId, elementData));
        break;
      case 'audio':
        blocks.push(convertAudioToBlock(elementId, elementData));
        break;
      case 'multi_choice':
        blocks.push(convertMultiChoiceToBlock(elementId, elementData));
        break;
      case 'input':
        blocks.push(convertInputToBlock(elementId, elementData));
        break;
      case 'dialog':
        blocks.push(convertDialogToBlock(elementId, elementData));
        break;
      case 'revision':
        blocks.push(convertRevisionToBlock(elementId, elementData));
        break;
      case 'jump':
        blocks.push(convertJumpToBlock(elementId, elementData));
        break;
      case 'test':
        blocks.push(convertTestToBlock(elementId, elementData));
        break;
      case 'end':
        blocks.push(convertEndToBlock(elementId, elementData));
        break;
      // Игнорируем остальные типы для MVP
      default:
        console.warn(`Unsupported element type: ${elementType} for element ${elementId}`);
        break;
    }
  }

  return blocks;
}

/**
 * Преобразует массив блоков редактора в YAML структуру курса
 */
export function convertBlocksToYaml(blocks: Block[]): Record<string, any> {
  const yamlContent: Record<string, any> = {};

  // Преобразуем каждый блок в YAML элемент
  for (const block of blocks) {
    switch (block.type) {
      case 'Section':
        yamlContent[block.id] = convertSectionToYaml(block);
        break;
      case 'Message':
        yamlContent[block.id] = convertMessageToYaml(block);
        break;
      case 'Quiz':
        yamlContent[block.id] = convertQuizToYaml(block);
        break;
      case 'Question':
        yamlContent[block.id] = convertQuestionToYaml(block);
        break;
      case 'Audio':
        yamlContent[block.id] = convertAudioToYaml(block);
        break;
      case 'MultiChoice':
        yamlContent[block.id] = convertMultiChoiceToYaml(block);
        break;
      case 'Input':
        yamlContent[block.id] = convertInputToYaml(block);
        break;
      case 'Dialog':
        yamlContent[block.id] = convertDialogToYaml(block);
        break;
      case 'Revision':
        yamlContent[block.id] = convertRevisionToYaml(block);
        break;
      case 'Jump':
        yamlContent[block.id] = convertJumpToYaml(block);
        break;
      case 'Test':
        yamlContent[block.id] = convertTestToYaml(block);
        break;
      case 'End':
        yamlContent[block.id] = convertEndToYaml(block);
        break;
    }
  }

  return yamlContent;
}

// ============================================================================
// Преобразование YAML → Block
// ============================================================================

function convertSectionToBlock(elementId: string, elementData: any): Block {
  return {
    id: elementId,
    type: 'Section',
    title: elementData.title || '',
    parseMode: 'TEXT',
    linkPreview: false,
  };
}

function convertMessageToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode: HTML → HTML, MARKDOWN → MARKDOWN, иначе TEXT
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview: "yes"/"no" или boolean
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Message',
    text: elementData.text || '',
    title: elementData.title, // Опционально
    parseMode,
    linkPreview,
  };

  // Добавляем media, если оно есть
  if (elementData.media && Array.isArray(elementData.media)) {
    block.media = elementData.media;
  }

  // Добавляем button, если он есть
  if (elementData.button) {
    block.button = elementData.button;
  }

  // Добавляем options (inline кнопки), если они есть
  if (elementData.options && Array.isArray(elementData.options)) {
    block.options = elementData.options.map((opt: any) => ({
      text: opt.text || '',
      goto: opt.goto,
      wait: opt.wait,
      wait_text: opt.wait_text,
    }));
  }

  return block;
}

function convertQuizToBlock(elementId: string, elementData: any): Block {
  // Преобразуем answers
  const answers = (elementData.answers || []).map((answer: any) => ({
    text: answer.text || '',
    correct: answer.correct === 'yes' || answer.correct === true,
  }));

  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Quiz',
    question: elementData.text || '',
    answers,
    parseMode,
    linkPreview,
  };

  // Добавляем media, если оно есть
  if (elementData.media && Array.isArray(elementData.media)) {
    block.media = elementData.media;
  }

  return block;
}

function convertQuestionToBlock(elementId: string, elementData: any): Block {
  // Преобразуем answers (без correct, но с feedback)
  const answers = (elementData.answers || []).map((answer: any) => ({
    text: answer.text || '',
    feedback: answer.feedback,
  }));

  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Question',
    question: elementData.text || '',
    answers,
    parseMode,
    linkPreview,
  };

  // Добавляем media, если оно есть
  if (elementData.media && Array.isArray(elementData.media)) {
    block.media = elementData.media;
  }

  return block;
}

function convertAudioToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Audio',
    text: elementData.text,
    parseMode,
    linkPreview,
  };

  // media обязателен для Audio
  if (elementData.media && Array.isArray(elementData.media)) {
    block.media = elementData.media;
  } else {
    block.media = [];
  }

  return block;
}

function convertMultiChoiceToBlock(elementId: string, elementData: any): Block {
  // Преобразуем answers
  const answers = (elementData.answers || []).map((answer: any) => ({
    text: answer.text || '',
    correct: answer.correct === 'yes' || answer.correct === true,
  }));

  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'MultiChoice',
    question: elementData.text || '',
    answers,
    parseMode,
    linkPreview,
  };

  // Добавляем feedback поля
  if (elementData.feedback_correct) {
    (block as any).feedbackCorrect = elementData.feedback_correct;
  }
  if (elementData.feedback_partial) {
    (block as any).feedbackPartial = elementData.feedback_partial;
  }
  if (elementData.feedback_incorrect) {
    (block as any).feedbackIncorrect = elementData.feedback_incorrect;
  }

  return block;
}

function convertInputToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Input',
    prompt: elementData.text || '',
    normalization: elementData.input_type || 'text', // input_type → normalization
    parseMode,
    linkPreview,
  };

  // Добавляем опциональные поля, если они есть
  if (elementData.correct_answer) {
    (block as any).correctAnswer = elementData.correct_answer;
  }
  if (elementData.feedback_correct) {
    (block as any).feedbackCorrect = elementData.feedback_correct;
  }
  if (elementData.feedback_incorrect) {
    (block as any).feedbackIncorrect = elementData.feedback_incorrect;
  }

  return block;
}

function convertDialogToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode (может быть HTML! для HTML в ответах модели)
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML' || elementData.parse_mode === 'HTML!') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Dialog',
    text: elementData.text || '', // Начальное сообщение
    dialogTitle: elementData.text ? elementData.text.substring(0, 50) : undefined, // Первые 50 символов text как заголовок
    systemPrompt: elementData.prompt || '',
    model: elementData.model,
    temperature: elementData.temperature ?? 0.7,
    reasoning: elementData.reasoning,
    maxTokens: elementData.max_messages || elementData.max_tokens || 150,
    conversation: elementData.conversation,
    transcriptionLanguage: elementData.transcription_language,
    voiceResponse: elementData.voice_response === true || elementData.voice_response === 'yes',
    autoStart: elementData.auto_start === true || elementData.auto_start === 'yes',
    ttsVoice: elementData.tts_voice || '21m00Tcm4TlvDq8ikWAM',
    ttsModel: elementData.tts_model || 'eleven_multilingual_v2',
    ttsSpeed: elementData.tts_speed ?? 1.0,
    parseMode,
    linkPreview,
  };

  return block;
}

// ============================================================================
// Преобразование Block → YAML
// ============================================================================

function convertSectionToYaml(block: Block): Record<string, any> {
  return {
    type: 'section',
    title: block.title || '',
  };
}

function convertMessageToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'message',
    text: block.text || '',
  };

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  // Добавляем media, если оно есть
  if (block.media && block.media.length > 0) {
    yamlElement.media = block.media;
  }

  // Добавляем button, если он есть
  if (block.button) {
    yamlElement.button = block.button;
  }

  // Добавляем options (inline кнопки), если они есть
  if (block.options && block.options.length > 0) {
    yamlElement.options = block.options.map((opt) => {
      const yamlOption: Record<string, any> = {
        text: opt.text,
      };
      if (opt.goto) {
        yamlOption.goto = opt.goto;
      }
      if (opt.wait) {
        yamlOption.wait = opt.wait;
      }
      if (opt.wait_text) {
        yamlOption.wait_text = opt.wait_text;
      }
      return yamlOption;
    });
  }

  return yamlElement;
}

function convertQuizToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'quiz',
    text: block.question || '',
    answers: (block.answers || []).map((answer) => {
      const yamlAnswer: Record<string, any> = {
        text: answer.text,
      };
      if (answer.correct) {
        yamlAnswer.correct = 'yes';
      }
      // feedback можно добавить из расширенных полей Block при необходимости
      return yamlAnswer;
    }),
  };

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  // Добавляем media, если оно есть
  if (block.media && block.media.length > 0) {
    yamlElement.media = block.media;
  }

  return yamlElement;
}

function convertQuestionToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'question',
    text: block.question || '',
    answers: (block.answers || []).map((answer) => {
      const yamlAnswer: Record<string, any> = {
        text: answer.text,
      };
      // Добавляем feedback, если он есть
      if (answer.feedback) {
        yamlAnswer.feedback = answer.feedback;
      }
      return yamlAnswer;
    }),
  };

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  // Добавляем media, если оно есть
  if (block.media && block.media.length > 0) {
    yamlElement.media = block.media;
  }

  return yamlElement;
}

function convertAudioToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'audio',
    media: block.media || [],
  };

  // Добавляем text, если он есть
  if (block.text) {
    yamlElement.text = block.text;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertMultiChoiceToYaml(block: Block): Record<string, any> {
  const extendedBlock = block as any;
  
  const yamlElement: Record<string, any> = {
    type: 'multi_choice',
    text: block.question || '',
    answers: (block.answers || []).map((answer) => {
      const yamlAnswer: Record<string, any> = {
        text: answer.text,
      };
      if (answer.correct) {
        yamlAnswer.correct = 'yes';
      } else {
        yamlAnswer.correct = 'no';
      }
      return yamlAnswer;
    }),
  };

  // Добавляем обязательные feedback поля
  if (extendedBlock.feedbackCorrect) {
    yamlElement.feedback_correct = extendedBlock.feedbackCorrect;
  }
  if (extendedBlock.feedbackPartial) {
    yamlElement.feedback_partial = extendedBlock.feedbackPartial;
  }
  if (extendedBlock.feedbackIncorrect) {
    yamlElement.feedback_incorrect = extendedBlock.feedbackIncorrect;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertRevisionToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Revision',
    text: elementData.text || '',
    prefix: elementData.prefix || '',
    noMistakes: elementData.no_mistakes || '',
    parseMode,
    linkPreview,
  };

  // Добавляем button, если он есть
  if (elementData.button) {
    block.button = elementData.button;
  }

  return block;
}

function convertJumpToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Jump',
    text: elementData.text || '',
    parseMode,
    linkPreview,
  };

  // Добавляем options (inline кнопки), если они есть
  if (elementData.options && Array.isArray(elementData.options)) {
    block.options = elementData.options.map((opt: any) => ({
      text: opt.text || '',
      goto: opt.goto,
      wait: opt.wait,
      wait_text: opt.wait_text,
    }));
  }

  return block;
}

function convertTestToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'Test',
    text: elementData.text || '',
    prefix: elementData.prefix || '',
    parseMode,
    linkPreview,
  };

  // Добавляем score (словарь оценок)
  if (elementData.score && typeof elementData.score === 'object') {
    const scoreDict: Record<number, string> = {};
    for (const [key, value] of Object.entries(elementData.score)) {
      const numKey = parseInt(key, 10);
      if (!isNaN(numKey) && typeof value === 'string') {
        scoreDict[numKey] = value;
      }
    }
    block.score = scoreDict;
  }

  // Добавляем button, если он есть
  if (elementData.button) {
    block.button = elementData.button;
  }

  return block;
}

function convertEndToBlock(elementId: string, elementData: any): Block {
  // Преобразуем parse_mode
  let parseMode = 'TEXT';
  if (elementData.parse_mode === 'HTML') {
    parseMode = 'HTML';
  } else if (elementData.parse_mode === 'MARKDOWN') {
    parseMode = 'MARKDOWN';
  }

  // Преобразуем link_preview
  let linkPreview = true;
  if (elementData.link_preview === 'no' || elementData.link_preview === false) {
    linkPreview = false;
  }

  const block: Block = {
    id: elementId,
    type: 'End',
    text: elementData.text || '',
    parseMode,
    linkPreview,
  };

  return block;
}

function convertRevisionToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'revision',
    text: block.text || '',
    prefix: block.prefix || '',
    no_mistakes: block.noMistakes || '',
  };

  // Добавляем button, если он есть
  if (block.button) {
    yamlElement.button = block.button;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertJumpToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'jump',
    text: block.text || '',
  };

  // Добавляем options (inline кнопки), если они есть
  if (block.options && block.options.length > 0) {
    yamlElement.options = block.options.map((opt) => {
      const yamlOption: Record<string, any> = {
        text: opt.text,
      };
      if (opt.goto) {
        yamlOption.goto = opt.goto;
      }
      if (opt.wait) {
        yamlOption.wait = opt.wait;
      }
      if (opt.wait_text) {
        yamlOption.wait_text = opt.wait_text;
      }
      return yamlOption;
    });
  }

  // Добавляем button, если он есть
  if (block.button) {
    yamlElement.button = block.button;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertTestToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'test',
    text: block.text || '',
    prefix: block.prefix || '',
  };

  // Добавляем score (словарь оценок)
  if (block.score && Object.keys(block.score).length > 0) {
    yamlElement.score = {};
    // Сортируем ключи по возрастанию для читаемости YAML
    const sortedKeys = Object.keys(block.score)
      .map(k => parseInt(k, 10))
      .filter(k => !isNaN(k))
      .sort((a, b) => a - b);
    
    for (const key of sortedKeys) {
      yamlElement.score[key] = block.score[key];
    }
  }

  // Добавляем button, если он есть
  if (block.button) {
    yamlElement.button = block.button;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertEndToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'end',
  };

  // Добавляем text, если он есть
  if (block.text && block.text.trim() !== '') {
    yamlElement.text = block.text;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertInputToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'input',
    text: block.prompt || '',
  };

  // Добавляем correct_answer и feedback из расширенных полей Block
  const extendedBlock = block as any;
  if (extendedBlock.correctAnswer) {
    yamlElement.correct_answer = extendedBlock.correctAnswer;
  }
  if (extendedBlock.feedbackCorrect) {
    yamlElement.feedback_correct = extendedBlock.feedbackCorrect;
  }
  if (extendedBlock.feedbackIncorrect) {
    yamlElement.feedback_incorrect = extendedBlock.feedbackIncorrect;
  }

  // Добавляем input_type из normalization
  if (block.normalization && block.normalization !== 'text') {
    yamlElement.input_type = block.normalization;
  }

  // Добавляем опциональные поля
  if (block.parseMode && block.parseMode !== 'TEXT') {
    yamlElement.parse_mode = block.parseMode === 'HTML' ? 'HTML' : 'MARKDOWN';
  }

  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}

function convertDialogToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'dialog',
    text: block.text || '', // Начальное сообщение
    prompt: block.systemPrompt || '',
  };

  // Опциональные поля модели
  if (block.model) {
    yamlElement.model = block.model;
  }
  if (block.temperature !== undefined) {
    yamlElement.temperature = block.temperature;
  }
  if (block.reasoning) {
    yamlElement.reasoning = block.reasoning;
  }
  if (block.maxTokens !== undefined) {
    yamlElement.max_messages = block.maxTokens;
  }

  // Голосовые параметры
  if (block.voiceResponse === true) {
    yamlElement.voice_response = true;
    if (block.transcriptionLanguage) {
      yamlElement.transcription_language = block.transcriptionLanguage;
    }
    if (block.ttsVoice && block.ttsVoice !== '21m00Tcm4TlvDq8ikWAM') {
      yamlElement.tts_voice = block.ttsVoice;
    }
    if (block.ttsModel && block.ttsModel !== 'eleven_multilingual_v2') {
      yamlElement.tts_model = block.ttsModel;
    }
    if (block.ttsSpeed !== undefined && block.ttsSpeed !== 1.0) {
      yamlElement.tts_speed = block.ttsSpeed;
    }
  }

  // Дополнительные параметры
  if (block.autoStart === true) {
    yamlElement.auto_start = true;
  }
  if (block.conversation && block.conversation.length > 0) {
    yamlElement.conversation = block.conversation;
  }

  // Parse mode (HTML! для HTML в ответах модели)
  if (block.parseMode && block.parseMode !== 'TEXT') {
    if (block.parseMode === 'HTML') {
      yamlElement.parse_mode = 'HTML!';
    } else {
      yamlElement.parse_mode = 'MARKDOWN';
    }
  }

  // Link preview
  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }

  return yamlElement;
}
