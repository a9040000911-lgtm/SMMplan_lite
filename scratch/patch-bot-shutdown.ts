import fs from 'fs';

let content = fs.readFileSync('src/bot/index.ts', 'utf-8');

// Use regex to catch CRLF or LF safely
content = content.replace(/logger\.info\('--- ВСЕ ПРОЦЕССЫ УСПЕШНО ОСТАНОВЛЕНЫ\. ВЫХОД\. ---'\);\s*process\.exit\(0\);/,
`    // 4. ОБЯЗАТЕЛЬНО закрываем пул коннектов к БД
    try {
      await prisma.$disconnect();
      logger.info('Prisma connection pool closed.');
    } catch (e) {
      logger.error('Error disconnecting Prisma:', e);
    }
    logger.info('--- ВСЕ ПРОЦЕССЫ УСПЕШНО ОСТАНОВЛЕНЫ. ВЫХОД. ---');
    process.exit(0);`);

fs.writeFileSync('src/bot/index.ts', content);
console.log('Patched bot graceful shutdown!');
