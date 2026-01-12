export interface DialogMessageRequest {
  element_id: string;
  message: string;
}

export interface DialogMessageResponse {
  reply: string;
  stop: boolean;
  conversation: Array<{role: string, content: string}>;
}

export const dialogApi = {
  sendMessage: async (
    courseId: string,
    elementId: string,
    message: string
  ): Promise<DialogMessageResponse> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${apiUrl}/api/mvp/courses/${courseId}/dialog/message`;
    const body = {
      element_id: elementId,
      message: message
    };
    
    console.log('dialogApi.sendMessage: Request', { url, body });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    
    console.log('dialogApi.sendMessage: Response status', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('dialogApi.sendMessage: Error', { status: response.status, errorText });
      throw new Error(`Ошибка отправки сообщения: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('dialogApi.sendMessage: Response data', data);
    return data;
  }
};
