import { apiClient } from './client';
import { ChatSession, ChatMessage } from '../types/types';

export interface CreateChatSessionRequest {
  step_id: string;
}

export interface SendMessageRequest {
  content: string;
}

export const chatApi = {
  createSession: async (stepId: string): Promise<ChatSession> => {
    const response = await apiClient.post<ChatSession>(`/steps/${stepId}/chat/session`, {
      step_id: stepId,
    });
    return response.data;
  },

  getSession: async (stepId: string): Promise<ChatSession | null> => {
    const response = await apiClient.get<ChatSession>(`/steps/${stepId}/chat/session`);
    return response.data;
  },

  sendMessage: async (sessionId: string, content: string): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>(
      `/chat/sessions/${sessionId}/messages`,
      { content }
    );
    return response.data;
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
    return response.data;
  },

  completeSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/chat/sessions/${sessionId}/complete`);
  },
};

