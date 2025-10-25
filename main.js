const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'шлях до JSON файлу')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера');

program.parse(process.argv);
const options = program.opts();

async function readFlightsData() {
  try {
    const data = await fs.readFile(options.input, 'utf8');
    const lines = data.trim().split('\n');
    const flights = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(flight => flight !== null);

    console.log(`Зчитано ${flights.length} записів`);
    return flights;
  } catch (error) {
    console.error('Помилка читання файлу:', error.message);
    return [];
  }
}

function filterFlights(flights, queryParams) {
  let filtered = flights.filter(flight =>
    flight.AIR_TIME !== undefined &&
    flight.DISTANCE !== undefined
  );

  if (queryParams.airtime_min) {
    const minTime = parseFloat(queryParams.airtime_min);
    filtered = filtered.filter(flight => flight.AIR_TIME > minTime);
  }

  return filtered;
}

function generateXML(flights, queryParams) {
  const builder = new XMLBuilder({ format: true });

  const flightsData = flights.map(flight => {
    const flightObj = {
      air_time: flight.AIR_TIME,
      distance: flight.DISTANCE
    };

    if (queryParams.date === 'true' && flight.FL_DATE) {
      flightObj.date = flight.FL_DATE;
    }

    return flightObj;
  });

  const xmlObj = {
    flights: {
      flight: flightsData
    }
  };

  return builder.build(xmlObj);
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    console.log(`Запит: ${req.url}`);

    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryParams = Object.fromEntries(url.searchParams);

    try {
      const allFlights = await readFlightsData();
      const filteredFlights = filterFlights(allFlights, queryParams);
      const xmlResponse = generateXML(filteredFlights, queryParams);

      res.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8'
      });
      res.end(xmlResponse);

      console.log(`Відправлено ${filteredFlights.length} записів`);
    } catch (error) {
      console.error('Помилка:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Помилка сервера');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
    console.log('Доступні параметри: ?date=true & ?airtime_min=X');
  });

  server.on('error', err => {
    console.error('Помилка сервера:', err.message);
  });
}

startServer().catch(console.error);






