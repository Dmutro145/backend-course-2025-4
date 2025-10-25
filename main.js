const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'шлях до JSON файлу')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .parse(process.argv);

const options = program.opts();

console.log('DEBUG: Options received:', options);

// Перевірка параметрів
if (!options.input || !options.host || !options.port) {
  console.error('Error: Missing required parameters');
  process.exit(1);
}

// Запуск сервера після перевірки файлу
start();

async function start() {
  try {
    await fs.access(options.input);
    startServer();
  } catch (error) {
    console.error('Cannot find input file:', options.input);
    process.exit(1);
  }
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[c]));
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const data = await fs.readFile(options.input, 'utf8');

      // прибираємо порожні рядки
      const flights = data
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));

      const url = new URL(req.url, `http://${req.headers.host}`);
      const dateParam = url.searchParams.get('date') === 'true';
      const airtimeMin = url.searchParams.get('airtime_min');

      let filteredFlights = flights;
      if (airtimeMin) {
        filteredFlights = flights.filter(f => f.AIR_TIME > parseInt(airtimeMin));
      }

      
      let xmlData = '<?xml version="1.0" encoding="UTF-8"?>\n<flights>\n';
      filteredFlights.forEach(f => {
        xmlData += '  <flight>\n';
        if (dateParam) xmlData += `    <date>${escapeXml(f.FL_DATE)}</date>\n`;
        xmlData += `    <air_time>${f.AIR_TIME}</air_time>\n`;
        xmlData += `    <distance>${f.DISTANCE}</distance>\n`;
        xmlData += '  </flight>\n';
      });
      xmlData += '</flights>';

     
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xmlData);

    } catch (error) {
      console.error('Error while processing request:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Server is running on http://${options.host}:${options.port}`);
  });
}
