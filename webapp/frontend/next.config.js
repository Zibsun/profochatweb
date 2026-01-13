/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Добавить домены для изображений
  },
  // Настройка для работы с нативными модулями PostgreSQL
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Исключаем pg и связанные нативные модули из бандла клиента
      config.externals = config.externals || [];
      
      // Добавляем pg и его зависимости как внешние модули для сервера
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
        'pg-pool': 'commonjs pg-pool',
      });
    }
    return config;
  },
}

module.exports = nextConfig

