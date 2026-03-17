#!/usr/bin/env node

const fetch = globalThis.fetch || require('node-fetch');
const { argv } = require('process');

const SERVER = process.env.CECIL_SERVER || 'http://localhost:4000';

function help() {
  console.log(`Cecil CLI

Usage:
  node cli.js list
  node cli.js send --id <robotId> --cmd <command>

Environment:
  CECIL_SERVER (default: ${SERVER})
`);
}

async function list() {
  const res = await fetch(`${SERVER}/api/robots`);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

async function send(robotId, command) {
  const res = await fetch(`${SERVER}/api/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ robotId, command }),
  });
  console.log(await res.text());
}

async function run() {
  const [,, cmd, ...args] = argv;
  if (!cmd || cmd === 'help') {
    return help();
  }

  if (cmd === 'list') {
    return list();
  }

  if (cmd === 'send') {
    const idIndex = args.indexOf('--id');
    const cmdIndex = args.indexOf('--cmd');
    const robotId = idIndex >= 0 ? args[idIndex + 1] : undefined;
    const command = cmdIndex >= 0 ? args[cmdIndex + 1] : undefined;

    if (!robotId || !command) {
      console.error('Missing --id or --cmd');
      return help();
    }

    return send(robotId, command);
  }

  help();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
