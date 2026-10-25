import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, devices } from 'file:///Users/nerdieblaq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.env.M6_4_1_URL || 'http://127.0.0.1:5173';
const outputDirectory = fileURLToPath(new URL('../artifacts/m6-4-2/', import.meta.url));
const multiplayerRoot = process.env.M6_4_1_MULTIPLAYER_ROOT
  || fileURLToPath(new URL('../../source-m6-4-1/multiplayer/', import.meta.url));
const multiplayerUrl = 'http://127.0.0.1:8787';
const gameIndex = await readFile(new URL('../public/mafia-wars/game/index.html', import.meta.url), 'utf8');
await mkdir(outputDirectory, { recursive: true });

assert.match(gameIndex, /viewport-fit=cover/);
assert.match(gameIndex, /--sat:\s*env\(safe-area-inset-top/);
assert.match(gameIndex, /--sab:\s*env\(safe-area-inset-bottom/);
assert.match(gameIndex, /--sal:\s*env\(safe-area-inset-left/);
assert.match(gameIndex, /--sar:\s*env\(safe-area-inset-right/);

async function startLocalMultiplayerServer() {
  try {
    const response = await fetch(`${multiplayerUrl}/health`, { signal: AbortSignal.timeout(500) });
    if (response.ok) return null;
  } catch {
    // No existing local test service is listening.
  }

  const child = spawn(process.execPath, ['src/local-server.js'], {
    cwd: multiplayerRoot,
    env: { ...process.env, PORT: '8787' },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Local multiplayer server exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(`${multiplayerUrl}/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return child;
    } catch {
      await delay(100);
    }
  }
  child.kill();
  throw new Error('Local multiplayer server did not become healthy on port 8787.');
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'],
});
let localMultiplayerServer;

async function verifyViewport({ name, width, height, mobile, captureWallet = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile ? devices['iPhone 14'].userAgent : undefined,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  try {
    await page.goto(`${baseUrl}/mafia-wars/play`, { waitUntil: 'domcontentloaded' });
    const gameIframe = page.locator('iframe[title="Nerdie City Public City"]');
    await gameIframe.waitFor({ state: 'attached' });
    await page.waitForFunction(
      () => document.querySelector('iframe[title="Nerdie City Public City"]')?.contentWindow?.location.href.includes('/mafia-wars/game/index.html'),
    );
    const gameFrame = page.frames().find((frame) => frame.url().includes('/mafia-wars/game/index.html'));
    assert.ok(gameFrame, `${name}: game frame should be mounted from the game HTML`);
    await gameFrame.waitForFunction(
      () => document.getElementById('pmsg')?.textContent?.includes('City ready'),
      null,
      { timeout: 120_000 },
    );
    await gameFrame.locator('#mpPublic').click();
    await gameFrame.waitForFunction(
      () => window.__hw?.multiplayer?.state === 'connected'
        && window.__hw?.MATCH?.started
        && document.getElementById('hud')?.classList.contains('on'),
      null,
      { timeout: 30_000 },
    );

    const mockAddress = `0x${'1'.repeat(40)}`;
    const mockBalance = '12,345.678901234567890123';
    await page.evaluate(({ address, formatted }) => {
      const game = document.querySelector('iframe[title="Nerdie City Public City"]');
      game.contentWindow.postMessage({
        channel: 'nerdie-city-wallet',
        version: 1,
        type: 'state',
        payload: {
          connected: true,
          address,
          chainId: 8453,
          nerdieBalance: { status: 'ready', formatted },
        },
      }, location.origin);
    }, { address: mockAddress, formatted: mockBalance });
    await gameFrame.waitForFunction(
      () => document.getElementById('walletBalance')?.textContent === '$12,345.68',
    );

    const controlAudit = await gameFrame.evaluate(() => {
      const touchIds = ['tFire', 'tAds', 'tJump', 'tReload', 'tSwap'];
      const rectObject = (rect) => rect ? rect.toJSON() : null;
      const isVisible = (node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return !node.closest('[hidden]')
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) > 0
          && style.pointerEvents !== 'none'
          && rect.width > 0
          && rect.height > 0;
      };
      const controls = Object.fromEntries(touchIds.map((id) => {
        const nodes = [...document.querySelectorAll(`#${id}`)];
        const visible = nodes.filter(isVisible);
        return [id, {
          count: nodes.length,
          visible: visible.length,
          rect: rectObject(visible[0]?.getBoundingClientRect()),
        }];
      }));
      const candidateSelectors = [
        '#cityBankButton', '#avatarToggle', '#mpDiagnosticsToggle', '#combatExit',
        '#abil .ab', '#tFire', '#tAds', '#tJump', '#tReload', '#tSwap', '#tInteract',
      ];
      const interactive = candidateSelectors.flatMap((selector) => (
        [...document.querySelectorAll(selector)]
          .filter(isVisible)
          .map((node) => ({ selector, label: (node.getAttribute('aria-label') || node.textContent || '').trim(), rect: node.getBoundingClientRect().toJSON() }))
      ));
      const overlaps = [];
      for (let i = 0; i < interactive.length; i++) {
        for (let j = i + 1; j < interactive.length; j++) {
          const a = interactive[i].rect, b = interactive[j].rect;
          const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapWidth > 1 && overlapHeight > 1) {
            overlaps.push([interactive[i].selector, interactive[j].selector]);
          }
        }
      }
      const walletButton = document.getElementById('cityBankButton');
      const walletHud = document.getElementById('walletHud');
      const walletBalance = document.getElementById('walletBalance');
      const walletCashLabel = document.getElementById('walletCashLabel');
      const walletBalanceStyle = getComputedStyle(walletBalance);
      const walletBalanceRect = walletBalance.getBoundingClientRect();
      const walletHudRect = walletHud.getBoundingClientRect();
      const minimap = document.getElementById('mapwrap').getBoundingClientRect();
      const characterButton = document.getElementById('avatarToggle');
      const characterRect = characterButton.getBoundingClientRect();
      const networkButton = document.getElementById('mpDiagnosticsToggle');
      return {
        controls,
        interactive,
        overlaps,
        walletButton: {
          label: walletButton.getAttribute('aria-label'),
          rect: rectObject(walletButton.getBoundingClientRect()),
          visible: isVisible(walletButton),
        },
        walletBalance: {
          text: walletBalance.textContent,
          fontSize: walletBalanceStyle.fontSize,
          rect: rectObject(walletBalanceRect),
          hudRect: rectObject(walletHudRect),
          readable: walletBalanceStyle.display !== 'none'
            && walletBalanceStyle.visibility !== 'hidden'
            && Number(walletBalanceStyle.opacity) > 0
            && walletBalanceRect.width > 0
            && walletBalanceRect.height > 0
            && walletBalanceRect.left >= 0
            && walletBalanceRect.right <= innerWidth
            && walletBalance.scrollWidth <= walletBalance.clientWidth + 1,
        },
        walletCashLabel: walletCashLabel?.textContent,
        characterButton: {
          visible: isVisible(characterButton),
          rect: rectObject(characterRect),
          controls: characterButton.getAttribute('aria-controls'),
        },
        networkInfoVisible: isVisible(networkButton),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        map: rectObject(minimap),
        multiplayer: {
          state: window.__hw.multiplayer.state,
          roomCode: window.__hw.multiplayer.credentials.roomCode,
          playerId: window.__hw.multiplayer.credentials.playerId,
          socketOpen: window.__hw.multiplayer.socket?.readyState === WebSocket.OPEN,
        },
      };
    });

    assert.equal(await page.url(), `${baseUrl}/mafia-wars/play`, `${name}: My Wallet remains in the game route`);
    assert.equal(controlAudit.walletButton.visible, true, `${name}: My Wallet button is visible`);
    assert.match(controlAudit.walletButton.label || '', /My Wallet/i, `${name}: My Wallet has an accessible label`);
    assert.ok(controlAudit.walletButton.rect.height >= 44, `${name}: My Wallet meets the 44px touch target`);
    assert.ok(controlAudit.walletBalance.readable, `${name}: NERDIE balance is visible and readable`);
    assert.equal(controlAudit.walletCashLabel, 'NERDIE CASH', `${name}: compact HUD identifies the in-game currency`);
    assert.equal(controlAudit.walletBalance.text, '$12,345.68', `${name}: game HUD safely rounds to two cash decimals`);
    assert.equal(controlAudit.networkInfoVisible, false, `${name}: Network Info is hidden in player mode`);
    assert.equal(controlAudit.scrollWidth, controlAudit.viewportWidth, `${name}: no horizontal overflow`);
    assert.deepEqual(controlAudit.overlaps, [], `${name}: interactive HUD controls do not overlap`);
    assert.equal(controlAudit.multiplayer.state, 'connected', `${name}: multiplayer remains connected`);
    assert.equal(controlAudit.multiplayer.socketOpen, true, `${name}: WebSocket is open`);

    for (const [id, value] of Object.entries(controlAudit.controls)) {
      assert.equal(value.count, 1, `${name}: ${id} should occur once`);
      if (mobile) {
        assert.equal(value.visible, 1, `${name}: ${id} should be visible`);
        assert.ok(value.rect.width >= 44 && value.rect.height >= 44, `${name}: ${id} is a usable touch target`);
      }
    }
    if (mobile) {
      assert.equal(controlAudit.characterButton.visible, true, `${name}: character controls are accessible`);
      assert.equal(controlAudit.characterButton.controls, 'avatarPanel', `${name}: character button identifies its panel`);
      assert.ok(controlAudit.characterButton.rect.height >= 44, `${name}: character control meets the 44px touch target`);
      assert.ok(controlAudit.map.width <= (width < height ? 90 : 120), `${name}: minimap scales for orientation`);
    }

    const sessionBefore = await gameFrame.evaluate(() => {
      window.__m641SessionSentinel = crypto.randomUUID();
      window.__m641SocketRef = window.__hw.multiplayer.socket;
      return {
        sentinel: window.__m641SessionSentinel,
        position: window.__hw.player.pos.toArray(),
        roomCode: window.__hw.multiplayer.credentials.roomCode,
        playerId: window.__hw.multiplayer.credentials.playerId,
        url: location.href,
      };
    });

    await page.screenshot({ path: resolve(outputDirectory, `${name}-gameplay.png`), fullPage: false });
    if (await gameFrame.evaluate(() => document.pointerLockElement !== null)) {
      await gameFrame.evaluate(() => document.exitPointerLock());
      await gameFrame.waitForFunction(() => document.pointerLockElement === null);
    }
    await gameFrame.locator('#cityBankButton').click();
    const walletDialog = page.getByRole('dialog', { name: 'My Wallet' });
    await walletDialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const aside = document.querySelector('aside[aria-label="My Wallet"]');
      if (!aside) return false;
      const transform = getComputedStyle(aside).transform;
      return transform === 'none' || Math.abs(new DOMMatrixReadOnly(transform).m41) < 1;
    });
    assert.match(await walletDialog.innerText(), /Guest · disconnected/, `${name}: guest can open My Wallet without connecting`);
    const overlayHit = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="My Wallet"]');
      const backdrop = document.querySelector('button[aria-label="Close My Wallet"]');
      const target = document.elementFromPoint(Math.floor(innerWidth / 2), Math.floor(innerHeight / 2));
      return Boolean(target && ((aside && aside.contains(target)) || (backdrop && backdrop.contains(target))));
    });
    assert.equal(overlayHit, true, `${name}: open wallet overlay intercepts gameplay touch input`);

    if (captureWallet) {
      await page.screenshot({ path: resolve(outputDirectory, 'wallet-overlay-390x844.png'), fullPage: false });
      await page.screenshot({ path: resolve(outputDirectory, 'inventory-fallback-guest-390x844.png'), fullPage: false });
    }
    await page.getByRole('button', { name: 'Close My Wallet', exact: true }).last().click();
    await page.waitForFunction(
      () => document.querySelector('[role="dialog"][aria-label="My Wallet"]')?.classList.contains('translate-x-full'),
    );
    const sessionAfter = await gameFrame.evaluate(() => ({
      sentinel: window.__m641SessionSentinel,
      position: window.__hw.player.pos.toArray(),
      sameSocket: window.__m641SocketRef === window.__hw.multiplayer.socket,
      socketOpen: window.__hw.multiplayer.socket?.readyState === WebSocket.OPEN,
      state: window.__hw.multiplayer.state,
      roomCode: window.__hw.multiplayer.credentials.roomCode,
      playerId: window.__hw.multiplayer.credentials.playerId,
      url: location.href,
    }));
    assert.equal(sessionAfter.sentinel, sessionBefore.sentinel, `${name}: game document remains mounted`);
    assert.equal(sessionAfter.sameSocket, true, `${name}: the same WebSocket survives the wallet overlay`);
    assert.equal(sessionAfter.socketOpen, true, `${name}: multiplayer remains connected after closing My Wallet`);
    assert.equal(sessionAfter.state, 'connected', `${name}: room session remains connected after closing My Wallet`);
    assert.equal(sessionAfter.roomCode, sessionBefore.roomCode, `${name}: room identity is preserved`);
    assert.equal(sessionAfter.playerId, sessionBefore.playerId, `${name}: player identity is preserved`);
    assert.equal(sessionAfter.url, sessionBefore.url, `${name}: game iframe URL is unchanged`);
    assert.equal(await page.url(), `${baseUrl}/mafia-wars/play`, `${name}: closing wallet restores gameplay without navigation`);
    assert.deepEqual(sessionAfter.position, sessionBefore.position, `${name}: player position is preserved`);
    await gameFrame.waitForFunction(() => document.getElementById('hud')?.classList.contains('on'));
    assert.deepEqual(errors, [], `${name}: browser has no uncaught page errors`);
    return { controlAudit, sessionPreserved: true, gameDocumentPreserved: true };
  } finally {
    await context.close();
  }
}

try {
  localMultiplayerServer = await startLocalMultiplayerServer();
  const viewports = [
    { name: 'portrait-390x844', width: 390, height: 844, mobile: true, captureWallet: true },
    { name: 'portrait-393x852', width: 393, height: 852, mobile: true },
    { name: 'landscape-844x390', width: 844, height: 390, mobile: true },
    { name: 'landscape-852x393', width: 852, height: 393, mobile: true },
    { name: 'desktop-1440x900', width: 1440, height: 900, mobile: false },
  ];
  const results = {};
  for (const viewport of viewports) {
    results[viewport.name] = await verifyViewport(viewport);
  }
  console.log(JSON.stringify({
    results,
    screenshots: [
      'portrait-390x844-gameplay.png',
      'portrait-393x852-gameplay.png',
      'landscape-844x390-gameplay.png',
      'landscape-852x393-gameplay.png',
      'desktop-1440x900-gameplay.png',
      'wallet-overlay-390x844.png',
      'inventory-fallback-guest-390x844.png',
    ].map((name) => resolve(outputDirectory, name)),
    localMultiplayerService: multiplayerUrl,
    realWalletUsed: false,
  }, null, 2));
} finally {
  await browser.close().catch(() => {});
  if (localMultiplayerServer && localMultiplayerServer.exitCode === null) {
    localMultiplayerServer.kill();
    await Promise.race([new Promise((resolveExit) => localMultiplayerServer.once('exit', resolveExit)), delay(3000)]);
  }
}
