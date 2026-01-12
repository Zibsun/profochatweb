# Makefile для ProfoChatBot
# Удобные команды для запуска и управления проектом

.PHONY: help telegram-run telegram-api webapp-dev-backend webapp-dev-frontend webapp-dev-all webapp-test webapp-setup webapp-docker-up webapp-docker-down webapp-docker-logs check-db

help:
	@echo "ProfoChatBot - Доступные команды:"
	@echo ""
	@echo "Telegram бот:"
	@echo "  make telegram-run       - Запуск Telegram бота"
	@echo "  make telegram-api        - Запуск API для Telegram бота"
	@echo ""
	@echo "Webapp (разработка):"
	@echo "  make webapp-dev-backend  - Запуск backend для разработки"
	@echo "  make webapp-dev-frontend - Запуск frontend для разработки"
	@echo "  make webapp-dev-all      - Запуск всего стека (backend + frontend)"
	@echo ""
	@echo "Webapp (настройка):"
	@echo "  make webapp-setup        - Настройка всего webapp (backend + frontend)"
	@echo "  make webapp-setup-backend  - Настройка только backend"
	@echo "  make webapp-setup-frontend - Настройка только frontend"
	@echo ""
	@echo "Webapp (тестирование):"
	@echo "  make webapp-test         - Тестирование backend"
	@echo ""
	@echo "Webapp (Docker):"
	@echo "  make webapp-docker-up    - Запуск через Docker Compose"
	@echo "  make webapp-docker-down  - Остановка Docker"
	@echo "  make webapp-docker-logs  - Просмотр логов Docker"
	@echo ""
	@echo "Утилиты:"
	@echo "  make check-db            - Проверка подключения к базе данных"

# Telegram бот
telegram-run:
	@./bin/telegram/run.sh

telegram-api:
	@./bin/telegram/run-api.sh

# Webapp разработка
webapp-dev-backend:
	@./bin/webapp/dev-backend.sh

webapp-dev-frontend:
	@./bin/webapp/dev-frontend.sh

webapp-dev-all:
	@./bin/webapp/dev-all.sh

# Webapp настройка
webapp-setup:
	@echo "Настройка webapp..."
	@./bin/webapp/setup-backend.sh
	@./bin/webapp/setup-frontend.sh

webapp-setup-backend:
	@./bin/webapp/setup-backend.sh

webapp-setup-frontend:
	@./bin/webapp/setup-frontend.sh

# Webapp тестирование
webapp-test:
	@./bin/webapp/test-backend.sh

# Webapp Docker
webapp-docker-up:
	@./bin/webapp/docker-start.sh

webapp-docker-down:
	@./bin/webapp/docker-stop.sh

webapp-docker-logs:
	@./bin/webapp/docker-logs.sh

# Утилиты
check-db:
	@python bin/utils/check_db.py
