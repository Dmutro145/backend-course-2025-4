const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;

const program = new Command();

// Налаштування параметрів командного рядка
program
  .requiredOption('-i, --input <path>', 'шлях до JSON файлу')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера');

program.parse(process.argv);
const options = program.opts();

// Перевірка наявності файлу
async function checkFileExists() {
  try {
    await fs.access(options.input);
    return true;
  } catch (error) {
    return false;
  }
}

// Запуск сервера
async function startServer() {
  const fileExists = await checkFileExists();
  if (!fileExists) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    // Тут буде обробка запитів (Частина 2)
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Сервер працює! Частина 1 виконана.');
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
    console.log(`Використовується файл: ${options.input}`);
  });

  server.on('error', (err) => {
    console.error('Помилка сервера:', err.message);
  });
}

startServer().catch(console.error);

