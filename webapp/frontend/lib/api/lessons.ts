import { apiClient } from './client';
import { Lesson, LessonStep } from '../types/types';

export const lessonsApi = {
  getLessons: async (courseId: string): Promise<Lesson[]> => {
    const response = await apiClient.get<Lesson[]>(`/courses/${courseId}/lessons`);
    return response.data;
  },

  getLesson: async (lessonId: string): Promise<Lesson> => {
    const response = await apiClient.get<Lesson>(`/lessons/${lessonId}`);
    return response.data;
  },

  getSteps: async (lessonId: string): Promise<LessonStep[]> => {
    const response = await apiClient.get<LessonStep[]>(`/lessons/${lessonId}/steps`);
    return response.data;
  },
};

