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
  const { robotId, command } = req.body;
  if (!robotId || !command) {
    return res.status(400).json({ error: 'robotId and command are required' });
  }

  const robot = robots.get(robotId);
  if (!robot) {
    return res.status(404).json({ error: 'Robot not found' });
  }

  // This is where a real implementation would write to the BLE characteristic.
  // For now we just broadcast the command to any connected UI and log it.
  console.log(`Sending command to ${robot.name} (${robotId}):`, command);
  broadcast({ type: 'command', robotId, command });

  res.json({ ok: true });
});

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
      peripheral,
    };
    robots.set(peripheral.id, robot);
    broadcast({ type: 'robots', robots: Array.from(robots.values()) });

    try {
      robot.state = 'connecting';
      broadcast({ type: 'robots', robots: Array.from(robots.values()) });
      await peripheral.connectAsync();
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
