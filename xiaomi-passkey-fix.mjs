#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const PORT = 9222;
const AUTH_PREFIX = 'https://auth.openai.com/';
const TEST_MS = Number(process.env.XIAOMI_PASSKEY_TEST_MS || 0);
const attached = new Map();
const connecting = new Set();
const startedAt = Date.now();

let running = true;
let injectedAny = false;
let noAuthSince = 0;
let cleaned = false;

const injectSource = [
  "(() => {",
  "  if (location.hostname !== 'auth.openai.com' || window.__xiaomiTransportCompat) return;",
  "  const original = navigator.credentials.get.bind(navigator.credentials);",
  "  navigator.credentials.get = function(options) {",
  "    const pk = options?.publicKey;",
  "    if (pk?.rpId === 'openai.com' && pk.allowCredentials?.length) {",
  "      options = { ...options, publicKey: { ...pk,",
  "        allowCredentials: pk.allowCredentials.map(c => ({ ...c, transports: ['internal'] })) }};",
  "    }",
  "    return original(options);",
  "  };",
  "  window.__xiaomiTransportCompat = true;",
  "})();"
].join('\n');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function adb(args, options = {}) {
  return execFileSync('adb', args, {
    encoding: 'utf8',
    timeout: options.timeout || 15000,
    stdio: options.stdio || 'pipe'
  });
}

function checkDevice() {
  let output;
  try {
    output = adb(['devices']);
  } catch {
    console.error('[错误] 找不到 adb。请先安装 Android Platform Tools，并加入 PATH。');
    process.exit(1);
  }

  const devices = output
    .split(/\r?\n/)
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/\s+/))
    .filter(parts => parts[1] === 'device')
    .map(parts => parts[0]);

  if (devices.length === 0) {
    console.error('[错误] 没有已授权的 adb 设备。');
    console.error('检查：数据线、USB 调试、手机上“允许 USB 调试”。');
    console.error('然后执行：adb devices -l');
    process.exit(1);
  }

  if (devices.length > 1) {
    const selected = process.env.ANDROID_SERIAL;
    if (selected && devices.includes(selected)) {
      console.log('[信息] 使用 ANDROID_SERIAL=' + selected);
      return selected;
    }
    console.error('[错误] 连接了多台设备。请先设置：');
    console.error('set ANDROID_SERIAL=你的设备序列号');
    console.error('可用设备：' + devices.join(', '));
    process.exit(1);
  }

  process.env.ANDROID_SERIAL = devices[0];
  console.log('[1/4] adb 设备：' + devices[0]);
  return devices[0];
}

function prepareForward() {
  try {
    const sockets = adb(['shell', 'cat', '/proc/net/unix'], { timeout: 5000 });
    if (!sockets.includes('chrome_devtools_remote')) {
      console.warn('[提示] 还没看到浏览器 DevTools socket。');
      console.warn('先打开一次 Edge/Chrome，脚本会继续等待。');
    }
  } catch {}

  try {
    adb(['forward', '--remove', 'tcp:' + PORT], { stdio: 'ignore', timeout: 5000 });
  } catch {}

  try {
    adb(['forward', 'tcp:' + PORT, 'localabstract:chrome_devtools_remote'], {
      stdio: 'ignore',
      timeout: 10000
    });
  } catch {
    console.error('[错误] adb forward 失败。');
    console.error('可能是端口 9222 被占用。先执行：adb forward --remove tcp:9222');
    process.exit(1);
  }

  console.log('[2/4] 已建立 DevTools 转发：127.0.0.1:' + PORT);
}

async function getTargets() {
  try {
    const response = await fetch('http://127.0.0.1:' + PORT + '/json', {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return [];
    const list = await response.json();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function attach(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket 连接超时')), 5000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('WebSocket 连接失败'));
    }, { once: true });
  });

  let id = 1;
  const pending = new Map();

  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  const send = (method, params = {}) => new Promise(resolve => {
    const messageId = id++;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  ws.addEventListener('close', () => attached.delete(target.id), { once: true });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: injectSource });

  const result = await send('Runtime.evaluate', {
    expression: injectSource,
    returnByValue: true,
    awaitPromise: false
  });

  if (result?.result?.exceptionDetails) {
    throw new Error('页面内执行脚本失败');
  }

  attached.set(target.id, ws);
  injectedAny = true;
  noAuthSince = 0;

  console.log('');
  console.log('[OK] 已注入：' + target.url);
  console.log('现在在手机上点“使用密钥继续”，再按指纹。');
  console.log('保持这个窗口打开。');
}

function cleanup() {
  if (cleaned) return;
  cleaned = true;

  for (const ws of attached.values()) {
    try { ws.close(); } catch {}
  }
  attached.clear();

  try {
    adb(['forward', '--remove', 'tcp:' + PORT], { stdio: 'ignore', timeout: 5000 });
  } catch {}
}

async function main() {
  console.log('================================');
  console.log(' 小米通行密钥一键修复');
  console.log('================================');
  console.log('');

  checkDevice();
  prepareForward();

  console.log('[3/4] 等待 auth.openai.com 登录页...');
  console.log('请在手机打开 ChatGPT，进入登录流程，停在“使用密钥继续”之前。');
  console.log('');

  while (running) {
    const targets = await getTargets();
    const authTargets = targets.filter(target =>
      target.type === 'page' && target.url?.startsWith(AUTH_PREFIX)
    );

    const liveIds = new Set(targets.map(target => target.id));
    for (const [targetId, ws] of attached) {
      if (!liveIds.has(targetId)) {
        try { ws.close(); } catch {}
        attached.delete(targetId);
      }
    }

    for (const target of authTargets) {
      if (!attached.has(target.id) && !connecting.has(target.id)) {
        connecting.add(target.id);
        attach(target)
          .catch(error => {
            console.warn('[警告] 注入失败：' + (error?.message ?? error));
          })
          .finally(() => connecting.delete(target.id));
      }
    }

    if (authTargets.length > 0) {
      noAuthSince = 0;
    } else if (injectedAny) {
      if (!noAuthSince) noAuthSince = Date.now();
      if (Date.now() - noAuthSince > 8000) {
        console.log('');
        console.log('[4/4] 认证页已离开，登录流程可能已经完成。');
        console.log('请确认 ChatGPT 是否已登录。脚本将自动清理。');
        break;
      }
    }

    if (TEST_MS > 0 && !injectedAny && Date.now() - startedAt > TEST_MS) {
      console.log('[测试] 到时退出。');
      break;
    }

    await sleep(500);
  }
}

process.on('SIGINT', () => {
  console.log('');
  console.log('收到 Ctrl+C，正在退出...');
  running = false;
});

process.on('SIGTERM', () => {
  running = false;
});

main()
  .catch(error => {
    console.error('');
    console.error('[错误] ' + (error?.message ?? error));
    process.exitCode = 1;
  })
  .finally(() => {
    cleanup();
    console.log('已移除 adb 端口转发。');
  });
