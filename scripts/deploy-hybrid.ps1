param (
    [string]$ServerHost = "root@smmplan.pro",
    [string]$ServerPath = "/opt/smmplan_lite"
)

Write-Host "🚀 Запуск гибридного деплоя (Локальная сборка -> Удаленный запуск)..." -ForegroundColor Cyan

Write-Host "🏗️ 1. Сборка Docker-образа локально..." -ForegroundColor Yellow
# We force linux/amd64 so it runs perfectly on the Ubuntu server even if you're on a Snapdragon ARM Windows laptop or Mac
docker buildx build --platform linux/amd64 -t smmplan_lite_prod_app:latest .
if ($LASTEXITCODE -ne 0) { throw "Ошибка сборки образа!" }

Write-Host "📦 2. Упаковка образа в архив (может занять пару минут)..." -ForegroundColor Yellow
docker save smmplan_lite_prod_app:latest -o smmplan_app.tar
if ($LASTEXITCODE -ne 0) { throw "Ошибка сохранения образа!" }

Write-Host "📤 3. Отправка архива на $ServerHost..." -ForegroundColor Yellow
scp smmplan_app.tar "$($ServerHost):/tmp/smmplan_app.tar"
if ($LASTEXITCODE -ne 0) { throw "Ошибка передачи файла (scp)!" }

Write-Host "⚙️ 4. Развертывание на сервере..." -ForegroundColor Yellow
$remoteCommands = @"
    echo '📥 Загрузка нового образа в Docker...'
    docker load -i /tmp/smmplan_app.tar
    rm /tmp/smmplan_app.tar

    echo '🔄 Обновление контейнеров (Без потери данных DB/Redis)...'
    cd $ServerPath
    docker-compose -f docker-compose.prod.yml up -d app

    echo '🗄️ Накат миграций базы данных...'
    docker exec smmplan_lite_prod_app npx prisma migrate deploy

    echo '🧹 Очистка старых образов...'
    docker image prune -a -f --filter "until=24h"
    echo '✅ Деплой успешно завершен на сервере!'
"@

ssh $ServerHost $remoteCommands
if ($LASTEXITCODE -ne 0) { throw "Ошибка выполнения команд на сервере!" }

Write-Host "🗑️ 5. Очистка локальных временных файлов..." -ForegroundColor Yellow
Remove-Item smmplan_app.tar -ErrorAction SilentlyContinue

Write-Host "🎉 Гибридный деплой завершен!" -ForegroundColor Green
