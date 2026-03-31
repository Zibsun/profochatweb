/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'unsplenetic-mustached-jordy.ngrok-free.dev',
    ], // Добавить домены для изображений
  },
  // Настройка для работы с нативными модулями PostgreSQL и canvas
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Исключаем canvas из клиентского бандла (нужен только на сервере для react-pdf)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    
    if (isServer) {
      // Исключаем pg и связанные нативные модули из бандла клиента
      config.externals = config.externals || [];
      
      // Добавляем pg, canvas и их зависимости как внешние модули для сервера
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
        'pg-pool': 'commonjs pg-pool',
        'canvas': 'commonjs canvas',
      });
    }
    return config;
  },
}

module.exports = nextConfig
