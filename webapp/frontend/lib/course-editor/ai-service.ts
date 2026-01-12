export type BlockType = "Message" | "Quiz" | "Question" | "Audio" | "Input" | "Dialog" | "Section" | "MultiChoice" | "Revision" | "Jump" | "Test" | "End";

export interface Block {
  id: string;
  type: BlockType;
  title?: string;
  text?: string;
  question?: string;
  answers?: { text: string; correct?: boolean; feedback?: string }[];
  // MultiChoice-specific fields
  feedbackCorrect?: string;
  feedbackPartial?: string;
  feedbackIncorrect?: string;
  prompt?: string;
  placeholder?: string;
  normalization?: string;
  // Dialog-specific fields
  dialogTitle?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  reasoning?: string;
  maxTokens?: number;
  conversation?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  transcriptionLanguage?: string;
  voiceResponse?: boolean;
  autoStart?: boolean;
  ttsVoice?: string;
  ttsModel?: string;
  ttsSpeed?: number;
  // Revision-specific fields
  prefix?: string; // Префикс ID элементов для поиска ошибок
  noMistakes?: string; // Сообщение, если ошибок нет
  // Test-specific fields
  score?: Record<number, string>; // Словарь оценок по проценту ошибок (ключ - процент, значение - сообщение)
  // Common fields
  button?: string; // Текст кнопки для продолжения (для Message, Revision)
  parseMode: string;
  linkPreview: boolean;
  media?: string[]; // Массив URL медиафайлов (для Message, Quiz)
  options?: Array<{ // Inline кнопки (для Message, Jump)
    text: string;
    goto?: string;
    wait?: string;
    wait_text?: string;
  }>;
  internalName?: string;
  description?: string;
  tags?: string[];
}

interface AiParams {
  scope: 'block' | 'course';
  action: string;
  instruction?: string;
  block?: Block;
  blocks?: Block[];
}

interface AiResult {
  updatedBlock?: Block;
  updatedBlocks?: Block[];
  message?: string;
}

export async function callAiAssistant(params: AiParams): Promise<AiResult> {
  const { scope, action, instruction, block, blocks } = params;

  // Simulate AI thinking delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

  // STUB IMPLEMENTATION
  // Replace this with real LLM calls when ready

  if (scope === 'block' && block) {
    switch (action) {
      // Message block actions
      case 'shorten_message':
        return {
          updatedBlock: {
            ...block,
            text: shortenText(block.text || ''),
          },
          message: 'Text has been shortened.',
        };

      case 'simplify_message_a1':
        return {
          updatedBlock: {
            ...block,
            text: simplifyForA1(block.text || ''),
          },
          message: 'Text simplified for A1 level.',
        };

      case 'friendly_message':
        return {
          updatedBlock: {
            ...block,
            text: makeFriendly(block.text || ''),
          },
          message: 'Text made more friendly.',
        };

      // Quiz block actions
      case 'improve_quiz_question':
        return {
          updatedBlock: {
            ...block,
            question: improveQuestion(block.question || ''),
          },
          message: 'Question improved.',
        };

      case 'suggest_quiz_answers':
        return {
          updatedBlock: {
            ...block,
            answers: improveAnswers(block.answers || []),
          },
          message: 'Answer options improved.',
        };

      // Input block actions
      case 'rephrase_input':
        return {
          updatedBlock: {
            ...block,
            prompt: rephrasePrompt(block.prompt || ''),
          },
          message: 'Prompt rephrased.',
        };

      case 'simplify_input_a1':
        return {
          updatedBlock: {
            ...block,
            prompt: simplifyForA1(block.prompt || ''),
          },
          message: 'Prompt simplified for A1 level.',
        };

      // Dialog block actions
      case 'improve_system_prompt':
        return {
          updatedBlock: {
            ...block,
            systemPrompt: improveSystemPrompt(block.systemPrompt || ''),
          },
          message: 'System prompt improved.',
        };

      case 'friendly_dialog':
        return {
          updatedBlock: {
            ...block,
            systemPrompt: makeFriendlySystemPrompt(block.systemPrompt || ''),
          },
          message: 'Dialog tone made more friendly.',
        };

      default:
        return {
          updatedBlock: block,
          message: `Action "${action}" not implemented yet.`,
        };
    }
  }

  if (scope === 'course' && blocks) {
    // Course-wide AI actions
    const updatedBlocks = blocks.map(b => {
      if (b.type === 'Message' && b.text) {
        return { ...b, text: `${b.text} [AI: ${instruction || 'processed'}]` };
      }
      if (b.type === 'Quiz' && b.question) {
        return { ...b, question: `${b.question} [AI: ${instruction || 'processed'}]` };
      }
      if (b.type === 'Input' && b.prompt) {
        return { ...b, prompt: `${b.prompt} [AI: ${instruction || 'processed'}]` };
      }
      return b;
    });

    return {
      updatedBlocks,
      message: `Applied AI transformation to ${blocks.length} blocks: "${instruction}"`,
    };
  }

  return {
    message: 'No changes made.',
  };
}

// Helper functions for stub transformations

function shortenText(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length <= 1) {
    return text.substring(0, Math.floor(text.length * 0.7)) + '...';
  }
  return sentences.slice(0, Math.ceil(sentences.length * 0.6)).join('. ') + '.';
}

function simplifyForA1(text: string): string {
  return text
    .replace(/however/gi, 'but')
    .replace(/therefore/gi, 'so')
    .replace(/additionally/gi, 'also')
    .replace(/subsequently/gi, 'then')
    .replace(/utilize/gi, 'use')
    .replace(/approximately/gi, 'about')
    + ' [Simplified for A1]';
}

function makeFriendly(text: string): string {
  const friendlyStarters = ['Hey there! ', 'Hi! ', 'Hello! '];
  const starter = friendlyStarters[Math.floor(Math.random() * friendlyStarters.length)];
  return starter + text + ' 😊';
}

function improveQuestion(question: string): string {
  if (!question.endsWith('?')) {
    question = question + '?';
  }
  return question.replace(/^/, 'Can you tell me: ');
}

function improveAnswers(answers: { text: string; correct: boolean }[]): { text: string; correct: boolean }[] {
  return answers.map((a, i) => ({
    ...a,
    text: a.text ? `${a.text} ✓` : `Improved option ${i + 1}`,
  }));
}

function rephrasePrompt(prompt: string): string {
  return `Please ${prompt.toLowerCase().replace(/^please\s*/i, '')}`;
}

function improveSystemPrompt(prompt: string): string {
  return prompt + '\n\nBe concise, helpful, and encouraging. Use simple language appropriate for language learners.';
}

function makeFriendlySystemPrompt(prompt: string): string {
  return prompt + '\n\nAlways be warm, supportive, and patient. Celebrate small wins and encourage the learner.';
}
