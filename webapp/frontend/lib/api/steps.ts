import { apiClient } from './client';
import { LessonStep } from '../types/types';

export const stepsApi = {
  getStep: async (stepId: string): Promise<LessonStep> => {
    const response = await apiClient.get<LessonStep>(`/steps/${stepId}`);
    return response.data;
  },

  completeStep: async (stepId: string): Promise<void> => {
    await apiClient.post(`/steps/${stepId}/complete`);
  },
};

