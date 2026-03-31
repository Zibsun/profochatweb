import axios from 'axios';

// Автоматическое определение API URL на основе текущего домена
function getApiUrl(): string {
  // Если указан явный API URL в переменных окружения, используем его
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl && envApiUrl !== 'http://localhost:8000') {
    return envApiUrl;
  }
  
  // Если работаем через ngrok, нужно использовать ngrok URL для backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname.includes('ngrok')) {
      // Если frontend на ngrok, пробуем использовать тот же домен для backend
      // Это работает, если backend проксируется через тот же ngrok туннель
      // Или нужно настроить отдельный ngrok туннель для backend и указать его в .env.local
      const ngrokBackendUrl = `${protocol}//${hostname}`;
      console.log('Frontend на ngrok, используем для backend:', ngrokBackendUrl);
      console.warn('Если backend не доступен по этому URL, настройте отдельный ngrok туннель: ngrok http 8000');
      return ngrokBackendUrl;
    }
  }
  
  // По умолчанию localhost для локальной разработки
  return 'http://localhost:8000';
}

const API_BASE_URL = getApiUrl();
console.log('API Base URL:', API_BASE_URL);

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Перенаправление на страницу входа
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

