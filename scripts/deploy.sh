#!/bin/bash

# Exit on any error
set -e

echo "🚀 Запуск процесса деплоя Smmplan Lite..."

echo "📥 1. Обновление кода из репозитория..."
git pull origin main

echo "🏗️ 2. Сборка контейнеров (с кэшем)..."
docker-compose -f docker-compose.prod.yml build

echo "🟢 3. Перезапуск инфраструктуры (Up)..."
docker-compose -f docker-compose.prod.yml up -d

echo "🗄️ 4. Применение миграций базы данных..."
# Выполняем миграцию непосредственно внутри запущенного app-контейнера
docker exec smmplan_lite_prod_app npx prisma migrate deploy

echo "🧹 5. Очистка старых Docker images..."
docker image prune -f

echo "✅ Деплой успешно завершен!"
