// QA checks for pages with looping clips (elements with [data-video], the video layer's <VideoLoop />); design:
// openspec/changes/add-video/design.md, "Checks". Four checks per page:
//   video-reduced-motion  reduced motion: every video paused at 0, the poster visible
//   video-no-js           JavaScript disabled: the poster visible, nothing playing
//   video-runtime         normal load: each clip starts playing when scrolled to (not paused, currentTime
//                         advancing), no console or page errors about media
//   video-budget          the bytes of each served .mp4 against video.maxKb and the clips per page against
//                         video.maxPerPage
// A browser that cannot decode H.264 (some Chromium builds) cannot play any clip: the runtime check then
// records `unsupported` and passes, and the report says so; the other three checks do not need playback.

export const VIDEO_ERROR = /video|media|mp4|play|codec|decode/i;
const H264 = 'video/mp4; codecs="avc1.64001f"';

/** Number of [data-video] elements in an HTML string (`data-video-state` and friends do not count). */
export function videoCount(html) {
  return [...String(html).matchAll(/\sdata-video(?![\w-])/g)].length;
}

/** Absolute URLs of the .mp4 files a page references (<source src>, <video src>), each once. */
export function videoSources(html, pageUrl) {
  const urls = new Set();
  for (const tag of String(html).matchAll(/<(?:source|video)\b[^>]*>/gi)) {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (!src || src.startsWith('data:')) continue;
    if (!/\.mp4(?:[?#]|$)/i.test(src)) continue;
    try {
      urls.add(new URL(src, pageUrl).href);
    } catch {
      // not a URL: nothing to measure
    }
  }
  return [...urls];
}

/** Budget block from measured files; `files` are [{ url, bytes }]. */
export function budgetResult(files, count, { maxKb, maxPerPage }) {
  const measured = files.map((f) => ({
    url: f.url,
    kb: Number((f.bytes / 1024).toFixed(1)),
  }));
  const over = measured.filter((f) => f.kb > maxKb);
  return {
    maxKb,
    maxPerPage,
    count,
    files: measured,
    pass: over.length === 0 && count <= maxPerPage,
  };
}

/**
 * Runs in the page: scrolls to every [data-video] and waits for its poster to decode. It sets no timer, so it also
 * works with JavaScript disabled (timers do not fire then); the caller waits and then reads `readVideoState`.
 */
export async function prepareVideos() {
  for (const figure of document.querySelectorAll('[data-video]')) {
    figure.scrollIntoView({ block: 'center' });
    const img = figure.querySelector('img');
    if (!img) continue;
    try {
      await img.decode();
    } catch {
      // a broken image shows up as not visible below
    }
  }
}

/** Runs in the page (synchronously): paused state, time and poster visibility of every [data-video]. */
export function readVideoState() {
  const visible = (node) => {
    let opacity = 1;
    for (let n = node; n && n.nodeType === 1; n = n.parentElement)
      opacity *= parseFloat(getComputedStyle(n).opacity);
    const rect = node.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      opacity > 0 &&
      node.checkVisibility({ checkVisibilityCSS: true })
    );
  };
  return [...document.querySelectorAll('[data-video]')].map((figure, index) => {
    const img = figure.querySelector('img');
    const video = figure.querySelector('video');
    return {
      index,
      hasVideo: Boolean(video),
      hasPoster: Boolean(img) || Boolean(video?.getAttribute('poster')),
      posterVisible: img
        ? img.naturalWidth > 0 && visible(img)
        : Boolean(video?.getAttribute('poster')) && visible(video),
      playing: video
        ? !video.paused || video.currentTime > 0 || video.readyState > 2
        : false,
      currentTime: video ? video.currentTime : 0,
    };
  });
}

const pushFailure = (failures, page, viewport, check, metric, f) =>
  failures.push({ check, page, viewport, metric, ...f });

const selectorOf = (index) => `[data-video] (clip ${index + 1})`;

/**
 * Run the video checks for one page. Mutates `failures`; returns the report block.
 * @param {object} o
 * @param {import('playwright').Browser} o.browser
 * @param {string} o.url
 * @param {string} o.path       URL path of the page (for failures)
 * @param {string} o.html       the page's HTML (clip count and the files to measure)
 * @param {object} o.config     QA config (reducedMotion, video)
 * @param {Array} o.failures
 */
export async function runVideoChecks({
  browser,
  url,
  path,
  html,
  config,
  failures,
}) {
  const width = config.reducedMotion.viewportWidth;
  const viewport = { width, height: 900 };
  const { maxKb, maxPerPage, playTimeoutMs } = config.video;
  const block = {
    count: videoCount(html),
    reducedMotion: null,
    noJs: null,
    runtime: null,
    budget: null,
  };

  const fallback = async (check, options, key) => {
    const context = await browser.newContext({ viewport, ...options });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'load' });
      if (options.reducedMotion)
        await page.waitForTimeout(config.reducedMotion.settleMs + 500);
      await page.evaluate(prepareVideos);
      await page.waitForTimeout(400);
      const clips = await page.evaluate(readVideoState);
      block[key] = {
        viewportWidth: width,
        clips,
        pass: clips.every((c) => !c.playing && c.posterVisible),
      };
      const mode = options.reducedMotion
        ? 'under prefers-reduced-motion'
        : 'without JavaScript';
      for (const c of clips) {
        if (c.playing)
          pushFailure(failures, path, width, check, 'playing', {
            measured: `paused ${!c.playing}, currentTime ${c.currentTime}`,
            threshold: 'no clip plays',
            selector: selectorOf(c.index),
            message: `clip ${c.index + 1} plays ${mode}`,
          });
        if (!c.posterVisible)
          pushFailure(failures, path, width, check, 'poster', {
            measured: c.hasPoster ? 'not visible' : 'missing',
            threshold: 'poster visible',
            selector: selectorOf(c.index),
            message: `clip ${c.index + 1} has no visible poster ${mode}`,
          });
      }
    } finally {
      await context.close();
    }
  };

  // (a) Reduced motion, (b) no JavaScript.
  await fallback(
    'video-reduced-motion',
    { reducedMotion: 'reduce' },
    'reducedMotion',
  );
  await fallback('video-no-js', { javaScriptEnabled: false }, 'noJs');

  // (c) Normal load: each clip plays when scrolled to; (d) budget from the files the page references.
  {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && VIDEO_ERROR.test(m.text()))
          errors.push(`console.error: ${m.text()}`);
      });
      page.on('response', (res) => {
        if (/\.mp4(?:[?#]|$)/i.test(res.url()) && res.status() >= 400)
          errors.push(`HTTP ${res.status()} for ${res.url()}`);
      });
      await page.goto(url, { waitUntil: 'load' });
      const supported = await page.evaluate(
        (type) => document.createElement('video').canPlayType(type) !== '',
        H264,
      );
      const clips = [];
      for (let i = 0; i < block.count; i += 1) {
        await page.evaluate(
          (index) =>
            document
              .querySelectorAll('[data-video]')
              [index].scrollIntoView({ block: 'center' }),
          i,
        );
        let playing = false;
        if (supported) {
          try {
            await page.waitForFunction(
              (index) => {
                const video = document
                  .querySelectorAll('[data-video]')
                  [index].querySelector('video');
                return video && !video.paused && video.currentTime > 0.05;
              },
              i,
              { timeout: playTimeoutMs },
            );
            playing = true;
          } catch {
            playing = false;
          }
        }
        const state = await page.evaluate((index) => {
          const video = document
            .querySelectorAll('[data-video]')
            [index].querySelector('video');
          return {
            paused: video.paused,
            currentTime: video.currentTime,
            error: video.error ? video.error.message || video.error.code : null,
          };
        }, i);
        clips.push({ index: i, playing, unsupported: !supported, ...state });
        if (supported && !playing)
          pushFailure(failures, path, width, 'video-runtime', 'play', {
            measured: `paused ${state.paused}, currentTime ${state.currentTime.toFixed(2)}${state.error ? `, error ${state.error}` : ''}`,
            threshold: `playing within ${playTimeoutMs} ms of scrolling to it`,
            selector: selectorOf(i),
            message: `clip ${i + 1} did not start playing within ${playTimeoutMs} ms of being scrolled into view`,
          });
      }
      const unique = [...new Set(errors)];
      block.runtime = {
        viewportWidth: width,
        h264: supported,
        clips,
        errors: unique,
        pass:
          unique.length === 0 && clips.every((c) => c.playing || c.unsupported),
      };
      for (const message of unique)
        pushFailure(failures, path, width, 'video-runtime', 'error', {
          measured: message,
          threshold: 'no video errors',
          message,
        });

      // Budget: the size of each served file (the same URLs the page loads).
      const files = [];
      for (const fileUrl of videoSources(html, url)) {
        try {
          const response = await fetch(fileUrl);
          files.push({
            url: fileUrl,
            bytes: response.ok ? (await response.arrayBuffer()).byteLength : 0,
          });
        } catch {
          files.push({ url: fileUrl, bytes: 0 });
        }
      }
      block.budget = budgetResult(files, block.count, { maxKb, maxPerPage });
      for (const f of block.budget.files)
        if (f.kb > maxKb)
          pushFailure(failures, path, null, 'video-budget', 'kb', {
            measured: f.kb,
            threshold: maxKb,
            message: `${f.url.split('/').pop()} is ${f.kb} KB (budget ${maxKb} KB per clip): re-encode it shorter or smaller`,
          });
      if (block.count > maxPerPage)
        pushFailure(failures, path, null, 'video-budget', 'count', {
          measured: block.count,
          threshold: maxPerPage,
          message: `${block.count} clips on one page (budget ${maxPerPage})`,
        });
    } finally {
      await context.close();
    }
  }
  return block;
}
