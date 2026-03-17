# Cecil (Robot Control)

A small Node.js project that discovers Bluetooth robots, exposes a control API, and provides a web UI + CLI client.

## Setup

From the repo root:

```bash
cd cecil
npm install
```

## Run the server

```bash
npm start
```

Then open:

- Web UI: http://localhost:4000
- API: http://localhost:4000/api/robots

## CLI

```bash
npm run cli -- list
npm run cli -- send --id <robotId> --cmd "move:forward"
```

## Notes

- This project can use `@abandonware/noble` for Bluetooth Low Energy scanning, but it installs as an optional dependency. If you don't have BLE support or build tools installed, the server will run in simulation mode.
- The server now attempts to discover a writable BLE characteristic and send commands there.

### mBot (Makeblock) notes

- Many mBot BLE modules use service `ffe0` and characteristic `ffe1` (HM-10 style). If your module uses a different UUID, set:

```bash
export CECIL_BLE_SERVICE=xxxx
export CECIL_BLE_CHAR=yyyy
```

- You can send commands as either:
  - A pre-defined command (forward/back/left/right/stop)
  - A raw payload in hex (e.g. `ff 55 05 ...`)
