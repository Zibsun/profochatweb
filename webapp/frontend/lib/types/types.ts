// Базовые типы из PRD
export type StepType = 'message' | 'video' | 'pdf' | 'quiz_single_choice' | 'chat';

export interface User {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Course {
  course_id: string;
  title: string;
  description: string;
  creator_id: string;
  is_restricted: boolean;
  created_at: string;
}

export interface Lesson {
  lesson_id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

export interface LessonStep {
  step_id: string;
  lesson_id: string;
  step_type: StepType;
  order_index: number;
  content: StepContent;
}

export type StepContent = 
  | MessageStepContent
  | VideoStepContent
  | PdfStepContent
  | QuizStepContent
  | ChatStepContent;

export interface MessageStepContent {
  text: string;
  parse_mode?: 'markdown' | 'html';
  media?: string[];
}

export interface VideoStepContent {
  video_url: string;
  title: string;
  description?: string;
}

export interface PdfStepContent {
  pdf_url: string;
  title: string;
}

export interface QuizStepContent {
  question: string;
  options: QuizOption[];
  feedback_correct?: string;
  feedback_incorrect?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface ChatStepContent {
  initial_message: string;
  system_prompt: string;
  model?: string;
  temperature?: number;
  max_messages?: number;
}

export interface CourseProgress {
  progress_id: string;
  user_id: string;
  course_id: string;
  current_lesson_id?: string;
  current_step_id?: string;
  completed_at?: string;
  started_at: string;
  updated_at: string;
}

export interface ChatSession {
  session_id: string;
  user_id: string;
  step_id: string;
  status: 'active' | 'completed' | 'stopped';
  created_at: string;
}

export interface ChatMessage {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  status: 'pending' | 'sent' | 'error';
}

export interface QuizAttempt {
  attempt_id: string;
  user_id: string;
  step_id: string;
  selected_option_id: string;
  is_correct: boolean;
  score: number;
  max_score: number;
  created_at: string;
}

