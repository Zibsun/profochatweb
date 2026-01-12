export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Добро пожаловать
        </h1>
        <p className="text-gray-600 mb-6">
          Для доступа к курсу необходим специальный URL с указанием идентификатора курса.
          Обратитесь к организатору курса для получения ссылки.
        </p>
        <p className="text-sm text-gray-500">
          Пример: <code className="bg-gray-100 px-2 py-1 rounded">/course/testmessages</code>
        </p>
      </div>
    </div>
  )
}
