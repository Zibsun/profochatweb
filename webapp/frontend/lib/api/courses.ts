import { apiClient } from './client';
import { Course, CourseProgress } from '../types/types';

export const coursesApi = {
  getCourses: async (): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>('/courses');
    return response.data;
  },

  getCourse: async (courseId: string): Promise<Course> => {
    const response = await apiClient.get<Course>(`/courses/${courseId}`);
    return response.data;
  },

  getProgress: async (courseId: string): Promise<CourseProgress | null> => {
    const response = await apiClient.get<CourseProgress>(`/courses/${courseId}/progress`);
    return response.data;
  },

  startCourse: async (courseId: string): Promise<CourseProgress> => {
    const response = await apiClient.post<CourseProgress>(`/courses/${courseId}/start`);
    return response.data;
  },
};

