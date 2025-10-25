const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'шлях до JSON файлу')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .parse(process.argv);

const options = program.opts(); // ← ЛИШЕ ОДИН РАЗ!

console.log('DEBUG: Options received:', options);

// Перевірка обов'язкових параметрів
if (!options.input || !options.host || !options.port) {
  console.error('Error: Missing required parameters');
  console.error('Usage: node main.js -i <file> -h <host> -p <port>');
  process.exit(1);
}

console.log('DEBUG: All parameters are present');

// Асинхронна функція для запуску
async function start() {
  try {
    await fs.access(options.input);
    startServer();
  } catch (error) {
    console.error('Cannot find input file');
    process.exit(1);
  }
}

// Запуск програми
start();

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const data = await fs.readFile(options.input, 'utf8');
      const flights = data.trim().split('\n').map(line => JSON.parse(line));
      
      const url = new URL(req.url, `http://${req.headers.host}`);
      const dateParam = url.searchParams.get('date') === 'true';
      const airtimeMin = url.searchParams.get('airtime_min');
      
      let filteredFlights = flights;
      if (airtimeMin) {
        filteredFlights = flights.filter(flight => flight.AIR_TIME > parseInt(airtimeMin));
      }
      
      const result = filteredFlights.map(flight => {
        const flightData = {};
        if (dateParam) flightData.date = flight.FL_DATE;
        flightData.air_time = flight.AIR_TIME;
        flightData.distance = flight.DISTANCE;
        return { flight: flightData };
      });
      
      const xmlBuilder = new XMLBuilder({
        ignoreAttributes: false,
        format: true
      });
      
      const xmlData = xmlBuilder.build({ flights: result });
      
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xmlData);
      
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Server is running on http://${options.host}:${options.port}`);
  });
}
