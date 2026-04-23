import fs from 'fs';

// 1. Patch src/bot/index.ts for Graceful Shutdown
let botIndex = fs.readFileSync('src/bot/index.ts', 'utf-8');
const oldShutdown = `    // 3. Останавливаем все проектные боты из реестра
    const registry = BotRegistry.getAll();
    for (const [projectId, instance] of registry) {
      logger.info(\`Остановка бота для проекта \${projectId}...\`);
      await instance.stop(signal);
    }
    
    logger.info('--- ВСЕ ПРОЦЕССЫ УСПЕШНО ОСТАНОВЛЕНЫ. ВЫХОД. ---');
    process.exit(0);`;
const newShutdown = `    // 3. Останавливаем все проектные боты из реестра
    const registry = BotRegistry.getAll();
    for (const [projectId, instance] of registry) {
      logger.info(\`Остановка бота для проекта \${projectId}...\`);
      await instance.stop(signal);
    }

    // 4. ОБЯЗАТЕЛЬНО закрываем пул коннектов к БД
    // Это убережет от повисших транзакций при рестарте
    try {
      await prisma.$disconnect();
      logger.info('Prisma connection pool closed.');
    } catch (e) {
      logger.error('Error disconnecting Prisma:', e);
    }
    
    logger.info('--- ВСЕ ПРОЦЕССЫ УСПЕШНО ОСТАНОВЛЕНЫ. ВЫХОД. ---');
    process.exit(0);`;

botIndex = botIndex.replace(oldShutdown, newShutdown);
fs.writeFileSync('src/bot/index.ts', botIndex);


// 2. Patch Dockerfile for Tini and src/ copying
let dockerfile = fs.readFileSync('Dockerfile', 'utf-8');
const oldApkAdd = `RUN apk add --no-cache openssl`;
const newApkAdd = `RUN apk add --no-cache openssl tini`;
dockerfile = dockerfile.replace(oldApkAdd, newApkAdd);
// Wait, there are two apk add --no-cache openssl in Dockerfile
// One in runner stage is: `RUN apk add --no-cache openssl`
// We will replace all if we can, or just the one after `FROM base AS runner`
const oldRunnerStart = `FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl`;
const newRunnerStart = `FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl tini`;
dockerfile = dockerfile.replace(oldRunnerStart, newRunnerStart);

const oldCopyPrisma = `COPY --from=builder /app/prisma ./prisma`;
const newCopyPrisma = `COPY --from=builder /app/prisma ./prisma
# Copy src code for bot/workers not included in Next.js standalone
COPY --from=builder /app/src ./src`;
dockerfile = dockerfile.replace(oldCopyPrisma, newCopyPrisma);

const oldEntry = `ENTRYPOINT ["./docker-entrypoint.sh"]`;
const newEntry = `ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]`;
dockerfile = dockerfile.replace(oldEntry, newEntry);
fs.writeFileSync('Dockerfile', dockerfile);


// 3. Patch docker-compose.prod.yml for Bot process and DB Limits
let dcompose = fs.readFileSync('docker-compose.prod.yml', 'utf-8');

const oldAppEnv = `      - DATABASE_URL=postgresql://\${POSTGRES_USER:-postgres}:\${POSTGRES_PASSWORD:-postgres}@db:5432/\${POSTGRES_DB:-smmplan_lite}?schema=public`;
const newAppEnv = `      - DATABASE_URL=postgresql://\${POSTGRES_USER:-postgres}:\${POSTGRES_PASSWORD:-postgres}@db:5432/\${POSTGRES_DB:-smmplan_lite}?schema=public&connection_limit=5&pool_timeout=30`;
dcompose = dcompose.replace(oldAppEnv, newAppEnv);

const oldAppBlock = `  app:
    image: smmplan_lite_prod_app:latest
    container_name: smmplan_lite_prod_app
    restart: always`;
const newAppBlock = `  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: smmplan_lite_prod_app:latest
    container_name: smmplan_lite_prod_app
    restart: always`;
dcompose = dcompose.replace(oldAppBlock, newAppBlock);

const certbotBlock = `  certbot:`;
const botService = `  bot:
    image: smmplan_lite_prod_app:latest
    container_name: smmplan_lite_prod_bot
    restart: unless-stopped
    command: ["npx", "tsx", "src/bot/index.ts"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://\${POSTGRES_USER:-postgres}:\${POSTGRES_PASSWORD:-postgres}@db:5432/\${POSTGRES_DB:-smmplan_lite}?schema=public&connection_limit=5&pool_timeout=30
      - REDIS_URL=redis://redis:6379 
      - APP_ENCRYPTION_KEY=\${APP_ENCRYPTION_KEY}
      - ADMIN_ALERT_BOT_TOKEN=\${ADMIN_ALERT_BOT_TOKEN}
      - ADMIN_ALERT_CHAT_ID=\${ADMIN_ALERT_CHAT_ID}
      - TELEGRAM_BOT_TOKEN=\${TELEGRAM_BOT_TOKEN}
      - BASE_URL=\${BASE_URL}
      - YOO_SHOP_ID=\${YOO_SHOP_ID}
      - YOO_SECRET_KEY=\${YOO_SECRET_KEY}
      - CRYPTOBOT_TOKEN=\${CRYPTOBOT_TOKEN}
      - CRON_SECRET=\${CRON_SECRET}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  certbot:`;
dcompose = dcompose.replace(certbotBlock, botService);
fs.writeFileSync('docker-compose.prod.yml', dcompose);

console.log('All deployment blockers patched!');
