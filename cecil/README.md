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
- The `command` endpoint currently broadcasts commands to connected web clients; replace it with real BLE characteristic writes for your robot.
