import { apiClient } from './client';
import { QuizAttempt } from '../types/types';

export interface QuizAttemptRequest {
  selected_option_id: string;
}

export interface QuizAttemptResponse {
  is_correct: boolean;
  feedback: string;
  score: number;
}

export const quizApi = {
  submitAttempt: async (
    stepId: string,
    data: QuizAttemptRequest
  ): Promise<QuizAttemptResponse> => {
    const response = await apiClient.post<QuizAttemptResponse>(
      `/steps/${stepId}/quiz/attempt`,
      data
    );
    return response.data;
  },

  getAttempt: async (stepId: string): Promise<QuizAttempt | null> => {
    const response = await apiClient.get<QuizAttempt>(`/steps/${stepId}/quiz/attempt`);
    return response.data;
  },
};

