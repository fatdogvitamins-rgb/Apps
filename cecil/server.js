const express = require('express');
const path = require('path');
const http = require('http');
const { Server: WebSocketServer } = require('ws');

let noble;
try {
  noble = require('@abandonware/noble');
} catch (err) {
  console.warn('Optional Bluetooth dependency not installed, running in simulated mode.');
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const BLE_SERVICE_UUID = (process.env.CECIL_BLE_SERVICE || 'ffe0').toLowerCase();
const BLE_CHAR_UUID = (process.env.CECIL_BLE_CHAR || 'ffe1').toLowerCase();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory map of robots discovered/connected via Bluetooth.
// Key: device id, Value: {id, name, state, peripheral}
const robots = new Map();

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'robots', robots: Array.from(robots.values()) }));
});

app.get('/api/robots', (req, res) => {
  res.json({ robots: Array.from(robots.values()) });
});

app.post('/api/command', async (req, res) => {
  const { robotId, command, payloadHex } = req.body;
  if (!robotId || (!command && !payloadHex)) {
    return res.status(400).json({ error: 'robotId and command or payloadHex are required' });
  }

  const robot = robots.get(robotId);
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  const payload = payloadHex
    ? Buffer.from(payloadHex.replace(/\s+/g, ''), 'hex')
    : buildMbotPayload(command);

  if (!payload) {
    return res.status(400).json({ error: 'Unable to build payload for the given command' });
  }

  console.log(`Sending command to ${robot.name} (${robotId}):`, command || payloadHex);

  // Write to BLE characteristic if connected
  if (robot.writeChar) {
    try {
      await robot.writeChar.writeAsync(payload, false);
      broadcast({ type: 'command', robotId, command, payloadHex });
      return res.json({ ok: true });
    } catch (err) {
      console.error('BLE write failed', err);
      return res.status(500).json({ error: 'BLE write failed', details: String(err) });
    }
  }

  // Fallback: just broadcast to UI
  broadcast({ type: 'command', robotId, command, payloadHex });
  res.json({ ok: true, simulated: true });
});

function buildMbotPayload(command) {
  // Basic Makeblock packet protocol (mBot): 0xFF 0x55 <len> <cmd> <...>
  // For demo purposes we provide a few simple movement commands.
  const cmdMap = {
    forward: [0x7a, 0x00, 0x00, 0x32, 0x00],
    back: [0x7a, 0x00, 0x00, 0xce, 0xff],
    left: [0x7a, 0x00, 0x00, 0x32, 0xff],
    right: [0x7a, 0x00, 0x00, 0xce, 0x00],
    stop: [0x7a, 0x00, 0x00, 0x00, 0x00],
  };

  const body = cmdMap[command];
  if (!body) return null;

  // Packet framing: [0xFF, 0x55, len, ...body]
  const packet = Buffer.from([0xff, 0x55, body.length, ...body]);
  return packet;
}

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

const knownRobotNames = ['CecilBot', 'Cecil'];

if (noble) {
  noble.on('stateChange', async (state) => {
    console.log('Bluetooth state:', state);
    if (state === 'poweredOn') {
      await noble.startScanningAsync([], false);
      console.log('Scanning for Bluetooth devices...');
    } else {
      await noble.stopScanningAsync();
    }
  });

  noble.on('discover', async (peripheral) => {
    const name = peripheral.advertisement.localName || peripheral.id;
    if (!knownRobotNames.some((prefix) => name?.includes(prefix))) {
      return;
    }

    if (robots.has(peripheral.id)) {
      return;
    }

    const robot = {
      id: peripheral.id,
      name,
      state: 'discovered',
  };
  // Keep a reference to the peripheral without serializing it.
  Object.defineProperty(robot, 'peripheral', {
    value: peripheral,
    enumerable: false,
  });

      // Discover services/characteristics for mBot (and similar BLE modules)
      const { services, characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
      robot.services = services.map((s) => ({ uuid: s.uuid }));
      robot.characteristics = characteristics.map((c) => ({ uuid: c.uuid, properties: c.properties }));

      // Prefer a pre-configured (or common) BLE characteristic for writing
      const writeChar = characteristics.find(
        (c) => c.uuid.toLowerCase() === BLE_CHAR_UUID || c.properties.includes('write') || c.properties.includes('writeWithoutResponse')
      );

      robot.writeCharUuid = writeChar?.uuid;
      Object.defineProperty(robot, 'writeChar', {
        value: writeChar,
        enumerable: false,
      });

      robot.state = 'connected';
      broadcast({ type: 'robots', robots: Array.from(robots.values()) });

      peripheral.on('disconnect', () => {
        robot.state = 'disconnected';
        broadcast({ type: 'robots', robots: Array.from(robots.values()) });
      });
    } catch (err) {
      console.error('Failed to connect to', name, err);
      robot.state = 'error';
      broadcast({ type: 'robots', robots: Array.from(robots.values()) });
    }
  });
} else {
  // Simulation mode: create a fake robot so the UI works without Bluetooth.
  setTimeout(() => {
    const robot = {
      id: 'sim-robot-1',
      name: 'CecilBot (Sim)',
      state: 'connected',
    };
    robots.set(robot.id, robot);
    broadcast({ type: 'robots', robots: Array.from(robots.values()) });
  }, 500);
}

server.listen(PORT, () => {
  console.log(`Cecil server running: http://localhost:${PORT}`);
  console.log('Use the web UI at / or hit /api/robots and /api/command.');
});
