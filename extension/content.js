// Content script: maintains a rolling buffer of subtitle lines and can return it on request.

const BUFFER_MAX_LINES = 40; // ~120 seconds worth, depending on cadence
const DEV_LOGGING = false;

let _lastNetflixDetection = { title: '', episodeInfo: null };

const state = {
  buffer: [],
  lastLine: "",
  platform: detectPlatform(location.hostname),
  lastUpdatedAt: null,
};

function detectPlatform(hostname) {
  if (/netflix\.com$/i.test(hostname)) return "netflix";
  if (/crunchyroll\.com$/i.test(hostname)) return "crunchyroll";
  return "other";
}

function log(...args) {
  if (DEV_LOGGING) {
    console.log("[SpoilerShield]", ...args);
  }
}

function normalizeLine(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\u200B/g, "")
    .trim();
}

function getTitle() {
  const og =
    document.querySelector('meta[property="og:title"]') ||
    document.querySelector('meta[name="og:title"]');
  const meta = og?.getAttribute("content");
  return normalizeLine(meta || document.title || "");
}

// Parse season+episode from a text string. Returns {season, episode} or null.
function parseEpisodeText(text) {
  if (!text) return null;
  // "S1E4", "S1 E4"
  let m = text.match(/S(\d+)\s*E(\d+)/i);
  if (m) return { season: m[1], episode: m[2] };
  // "Season 1, Episode 4" / "Season 1 Episode 4"
  m = text.match(/Season\s+(\d+)[,\s]+Episode\s+(\d+)/i);
  if (m) return { season: m[1], episode: m[2] };
  // "Episode 4" alone → default season 1
  m = text.match(/Episode\s+(\d+)/i);
  if (m) return { season: '1', episode: m[1] };
  // "Ep. 4" / "Ep 4"
  m = text.match(/Ep\.?\s*(\d+)/i);
  if (m) return { season: '1', episode: m[1] };
  return null;
}

// Convert a URL slug to a title-cased string.
// e.g. "attack-on-titan" → "Attack On Titan"
function slugToTitle(slug) {
  return (slug || '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

// Extract show info from page (no subtitle parsing)
function detectShowInfo() {
  const platform = state.platform;
  let showTitle = '';
  let episodeInfo = null;

  if (platform === 'crunchyroll') {
    // Method 1: JSON-LD structured data (most reliable when present)
    try {
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        const data = JSON.parse(script.textContent || '{}');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'TVEpisode' || item['@type'] === 'Episode') {
            showTitle = showTitle ||
              item.partOfSeries?.name ||
              item.partOfSeason?.partOfSeries?.name || '';
            const ep = item.episodeNumber;
            const season = item.partOfSeason?.seasonNumber || 1;
            if (ep && !episodeInfo) {
              episodeInfo = { season: String(season), episode: String(ep) };
            }
          } else if (item['@type'] === 'TVSeries') {
            showTitle = showTitle || item.name || '';
          }
        }
        if (showTitle) {
          log('[detect] Method 1 (JSON-LD):', showTitle);
          break;
        }
      }
    } catch {}

    // Method 2: Current URL slug — the most authoritative signal for what page we're on.
    // Series page: /series/<id>/attack-on-titan → "Attack On Titan"
    // Episode page: /watch/<id>/episode-title (no series slug here, falls through)
    if (!showTitle) {
      const seriesUrlMatch = location.pathname.match(/\/series\/[^/]+\/([^/?#]+)/);
      if (seriesUrlMatch) {
        showTitle = slugToTitle(seriesUrlMatch[1]);
        log('[detect] Method 2 (URL slug):', showTitle);
      }
    }

    // Method 3: og:url canonical — Crunchyroll often sets this to the series URL
    // even when viewing an individual episode page.
    if (!showTitle) {
      const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || '';
      const ogSeriesMatch = ogUrl.match(/\/series\/[^/]+\/([^/?#]+)/);
      if (ogSeriesMatch) {
        showTitle = slugToTitle(ogSeriesMatch[1]);
        log('[detect] Method 3 (og:url):', showTitle, '| og:url was:', ogUrl);
      }
    }

    // Methods 4 & 5 use page title / og:title which are unreliable on browse/homepage pages
    // (e.g. "Watch Anime and Read Manga Online | Crunchyroll" → false positive "Anime and Read Manga Online").
    // Only run these on known content paths.
    const isContentPath = /\/(series|watch)\//.test(location.pathname);

    // Method 4: Page title — Crunchyroll uses "Episode Title | Show Name | Crunchyroll"
    // Split on "|" and find the show name segment (last non-"Crunchyroll" part).
    if (!showTitle && isContentPath) {
      const pageTitle = document.title || '';
      const parts = pageTitle.split('|').map(p => p.trim()).filter(Boolean);
      const nonCR = parts.filter(p => !/^crunchyroll$/i.test(p));
      if (nonCR.length >= 2) {
        // "Episode Title | Show Name" → take the last part
        showTitle = nonCR[nonCR.length - 1];
        log('[detect] Method 4 (page title pipe):', showTitle, '| title was:', pageTitle);
      } else if (nonCR.length === 1) {
        // "Show Name - Season N - ..." → take the first dash-segment
        showTitle = nonCR[0].split(/[–—\-]/)[0].trim();
        log('[detect] Method 4 (page title single):', showTitle, '| title was:', pageTitle);
      }
    }

    // Method 5: OG tag fallback
    if (!showTitle && isContentPath) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const content = ogTitle?.getAttribute('content') || '';
      if (content) {
        const parts = content.split('|').map(p => p.trim()).filter(Boolean);
        const nonCR = parts.filter(p => !/^crunchyroll$/i.test(p));
        showTitle = (nonCR.length >= 2 ? nonCR[nonCR.length - 1] : nonCR[0] || '');
        if (!showTitle) showTitle = content.split(/[–—\-|]/)[0].trim();
        if (showTitle) log('[detect] Method 5 (og:title):', showTitle, '| og:title was:', content);
      }
    }

    // Strip common page-title cruft from show name
    showTitle = showTitle
      .replace(/^Watch\s+/i, '')
      .replace(/\s+Season\s+\d+$/i, '')
      .replace(/\s+S\d+\s*E\d+.*/i, '')
      .trim();

    // Episode info from full page title (if not found yet)
    if (!episodeInfo) {
      episodeInfo = parseEpisodeText(document.title || '');
    }

    // Episode info from URL slug: /episode-4- or /s1-e4
    if (!episodeInfo) {
      const path = location.pathname;
      const m = path.match(/\/episode-(\d+)-/i) || path.match(/[/_-]s(\d+)[_-]e(\d+)/i);
      if (m) episodeInfo = { season: m[2] ? m[1] : '1', episode: m[2] || m[1] };
    }

  } else if (platform === 'netflix') {
    // Gate: only detect on /watch/ URLs
    if (!/^\/watch\//.test(location.pathname)) {
      _lastNetflixDetection = { title: '', episodeInfo: null };
      return {
        platform, showTitle: '', episodeInfo: null,
        url: location.href, detectedAt: new Date().toISOString(),
      };
    }

    // Method 1: [data-uia="video-title"]
    // Structure: <div data-uia="video-title"><h4>SHOW NAME</h4><span>E1</span><span>Episode 1</span></div>
    // This element only exists when the player UI is visible (on hover / auto-play).
    const titleEl = document.querySelector('[data-uia="video-title"]');
    if (titleEl) {
      // Title is in the first child element (e.g. <h4>)
      const firstChild = titleEl.firstElementChild;
      if (firstChild) {
        const t = normalizeLine(firstChild.textContent || '');
        if (t && t.toLowerCase() !== 'netflix') {
          showTitle = t;
        }
      }
      // Episode info from remaining child elements (e.g. <span>E1</span><span>Episode 1</span>)
      if (!episodeInfo) {
        const childText = Array.from(titleEl.children)
          .slice(1)  // skip the title element
          .map(el => el.textContent || '').join(' ');
        episodeInfo = parseEpisodeText(childText);
      }
    }

    // Method 2: [data-uia="episode-title"] (separate element)
    if (!episodeInfo) {
      const epEl = document.querySelector('[data-uia="episode-title"]');
      if (epEl) episodeInfo = parseEpisodeText(epEl.textContent || '');
    }

    // Method 3: Page title — always available, doesn't require player UI.
    // Netflix sets document.title to "Show Name - Netflix" or "Episode Title - Show Name - Netflix".
    if (!showTitle) {
      const rawTitle = document.title || '';
      // Try "A - B - Netflix" → B is the show name
      const parts = rawTitle.split(/\s*[-–]\s*/);
      const nonNetflix = parts.filter(p => p && !/^netflix$/i.test(p.trim()));
      if (nonNetflix.length >= 2) {
        // Last non-Netflix segment is the show name
        showTitle = nonNetflix[nonNetflix.length - 1].trim();
      } else if (nonNetflix.length === 1) {
        showTitle = nonNetflix[0].trim();
      }
      if (showTitle && showTitle.toLowerCase() === 'netflix') showTitle = '';
      if (showTitle) log('[netflix] Method 3 (page title):', showTitle);
    }

    // Method 4: og:title meta tag
    if (!showTitle) {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      if (ogTitle && !/^netflix$/i.test(ogTitle.trim())) {
        showTitle = ogTitle.replace(/\s*[-–|]\s*Netflix.*$/i, '').trim();
        if (showTitle) log('[netflix] Method 4 (og:title):', showTitle);
      }
    }

    // Cache: remember last successful detection to survive player UI hide/show cycles.
    // Update cache only when we got fresh data; fall back to cached values otherwise.
    if (showTitle) {
      _lastNetflixDetection.title = showTitle;
      if (episodeInfo) _lastNetflixDetection.episodeInfo = episodeInfo;
    } else if (_lastNetflixDetection.title) {
      showTitle = _lastNetflixDetection.title;
    }
    if (!episodeInfo && _lastNetflixDetection.episodeInfo) {
      episodeInfo = _lastNetflixDetection.episodeInfo;
    }
  }

  return {
    platform,
    showTitle: showTitle || '',
    episodeInfo,
    url: location.href,
    detectedAt: new Date().toISOString(),
  };
}

// Store detected show info
async function storeShowInfo() {
  const showInfo = detectShowInfo();
  try {
    await chrome.storage.local.set({
      spoilershield_show_info: showInfo,
    });
    if (DEV_LOGGING) {
      log("stored show info:", showInfo);
    }
  } catch (err) {
    if (DEV_LOGGING) {
      log("storage error:", err);
    }
  }
}

// Detect and store show info on page load and when DOM changes
(function detectAndStoreShowInfo() {
  // Initial detection
  storeShowInfo();

  // Re-detect when page content changes (for SPA navigation).
  // Debounced to avoid flooding storage on every subtitle DOM mutation.
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      storeShowInfo();
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Watch <head> for title changes — Netflix may replace the entire <title> element
  // (SPA hydration), which would orphan an observer on the original element instance.
  // Observing <head> catches both in-place text mutations and full element replacements.
  let _lastDocTitle = document.title;
  new MutationObserver(() => {
    if (document.title !== _lastDocTitle) {
      _lastDocTitle = document.title;
      storeShowInfo();
    }
  }).observe(document.head || document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Belt-and-suspenders: retry detection after load to catch async title updates
  // regardless of observer mechanics (e.g. Netflix movie pages).
  [1000, 2000, 3000].forEach(ms => setTimeout(storeShowInfo, ms));

  // Also detect on navigation (for SPAs)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Clear cached episode info on URL change so stale episode doesn't persist
      // after SPA nav (e.g. Netflix "Next Episode"). Also clear title so a stale
      // TV show name doesn't bleed into a subsequent movie page (different content).
      if (state.platform === 'netflix') {
        _lastNetflixDetection.episodeInfo = null;
        _lastNetflixDetection.title = '';
      }
      storeShowInfo();
    }
  }, 2000);
})();

function pickSubtitleElements() {
  const isCrunchyroll = state.platform === "crunchyroll";
  
  const selectors = isCrunchyroll
    ? [
        // Crunchyroll-specific selectors (observed patterns)
        '.erc-subtitle-text',
        '.erc-subtitle-text-container',
        '[class*="subtitle-text"]',
        '[class*="subtitle-container"]',
        '.vjs-text-track-display',
        '.vjs-text-track',
        '[class*="vjs-text-track"]',
        // Fallback generic selectors for Crunchyroll
        '[class*="subtitle" i]',
        '[class*="caption" i]',
        '[aria-live]',
        '[role="alert"]',
        '[role="status"]',
      ]
    : [
        // Netflix timed text containers (commonly observed)
        '[data-uia*="timedtext" i]',
        '[data-uia*="subtitle" i]',
        '[data-uia*="caption" i]',
        '.player-timedtext',
        '.player-timedtext-text-container',
        ".player-timedtext-text-container span",
        // Generic fallbacks
        '[class*="subtitle" i]',
        '[class*="caption" i]',
        '[aria-live]',
        '[role="alert"]',
        '[role="status"]',
      ];

  const elements = new Set();
  for (const sel of selectors) {
    try {
      const found = document.querySelectorAll(sel);
      if (isCrunchyroll && DEV_LOGGING && found.length > 0) {
        log(`Selector "${sel}" found ${found.length} elements`);
        found.forEach((el, i) => {
          if (i < 3) { // Log first 3
            const text = (el.innerText || el.textContent || '').trim().substring(0, 50);
            log(`  Element ${i}: text="${text}"`);
          }
        });
      }
      found.forEach((el) => elements.add(el));
    } catch {
      // ignore invalid selector
    }
  }

  // Filter out huge containers (helps avoid grabbing the whole page text)
  const filtered = [...elements].filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect) return true;
    const area = rect.width * rect.height;
    return area < 300_000; // arbitrary: avoid observing full-page wrappers
  });

  if (isCrunchyroll && DEV_LOGGING) {
    log("Found", filtered.length, "potential subtitle elements after filtering");
    if (filtered.length === 0) {
      log("⚠️ NO SUBTITLE ELEMENTS FOUND - checking page structure...");
      // Diagnostic: search for any text that might be subtitles
      const allText = document.body.innerText || '';
      const videoArea = document.querySelector('video')?.parentElement;
      if (videoArea) {
        const videoText = videoArea.innerText || '';
        log(`Video area text length: ${videoText.length}, sample: "${videoText.substring(0, 100)}"`);
      }
    }
  }

  return filtered;
}

function extractLinesFromElement(el) {
  if (!el) return [];

  // Prefer visible text; keep line breaks if present.
  const raw = (el.innerText || el.textContent || "").trim();
  if (!raw) return [];

  // Split on newlines and also handle multi-line subtitles.
  const parts = raw
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  // Some players re-render both lines every tick; keep distinct lines only.
  const out = [];
  for (const p of parts) {
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

function addLine(line) {
  const normalized = normalizeLine(line);
  if (!normalized) return;

  // Dedup repeated lines and very recent repeats.
  const last = state.buffer[state.buffer.length - 1];
  if (normalized === last) return;

  const recent = state.buffer.slice(-6);
  if (recent.includes(normalized)) return;

  state.buffer.push(normalized);
  if (state.buffer.length > BUFFER_MAX_LINES) {
    state.buffer = state.buffer.slice(-BUFFER_MAX_LINES);
  }
  state.lastLine = normalized;
  state.lastUpdatedAt = new Date().toISOString();

  if (DEV_LOGGING) {
    log("captured subtitle:", normalized);
  }
}

async function publishUpdate() {
  const updatedAt = state.lastUpdatedAt || new Date().toISOString();
  const contextText = state.buffer.join(" ").trim();

  // Only store if we have actual content
  if (state.buffer.length === 0 && !contextText.trim()) {
    return;
  }

  const record = {
    platform: state.platform,
    url: location.href,
    title: getTitle(),
    updatedAt: updatedAt,
    lines: [...state.buffer],
    contextText: contextText,
  };

  // Store directly to chrome.storage.local for global access
  try {
    await chrome.storage.local.set({
      spoilershield_context: record,
    });
    
    if (DEV_LOGGING && state.buffer.length > 0) {
      log("stored context:", {
        lines: state.buffer.length,
        contextTextLength: contextText.length,
        lastLine: state.lastLine.substring(0, 50),
      });
    }
  } catch (err) {
    if (DEV_LOGGING) {
      log("storage error:", err);
    }
  }

  // Also send to background for per-tab storage (backward compatibility)
  try {
    chrome.runtime.sendMessage({ 
      type: "CONTEXT_UPDATE", 
      record: {
        ...record,
        capturedAt: updatedAt,
        buffer: record.lines,
        lastLine: state.lastLine,
      }
    });
  } catch {
    // ignore
  }
}

let targets = [];
let perTargetObservers = [];

function resetObservers() {
  for (const obs of perTargetObservers) {
    try {
      obs.disconnect();
    } catch {
      // ignore
    }
  }
  perTargetObservers = [];
  targets = pickSubtitleElements();

  for (const el of targets) {
    const obs = new MutationObserver(async () => {
      const lines = extractLinesFromElement(el);
      if (!lines.length) return;
      for (const l of lines) addLine(l);
      await publishUpdate();
    });
    try {
      obs.observe(el, {
        subtree: true,
        childList: true,
        characterData: true,
      });
      perTargetObservers.push(obs);
    } catch {
      // ignore
    }
  }
  
  if (state.platform === "crunchyroll" && DEV_LOGGING) {
    log("observing", targets.length, "subtitle elements");
  }
}

// Re-scan for subtitle containers periodically because players often re-mount DOM nodes.
const rescanner = new MutationObserver(() => {
  // Debounce via microtask-ish setTimeout.
  if (rescanner._t) return;
  rescanner._t = setTimeout(() => {
    rescanner._t = null;
    resetObservers();
  }, 750);
});
rescanner._t = null;

try {
  rescanner.observe(document.documentElement || document.body, {
    subtree: true,
    childList: true,
  });
} catch {
  // ignore
}

resetObservers();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  
  // Handle re-detect requests
  if (message.type === "REDETECT_SHOW_INFO") {
    // Re-run detection immediately
    storeShowInfo();
    sendResponse({ ok: true });
    return true; // Keep channel open for async response
  }
  
  // Handle GET_CONTEXT requests
  if (message.type !== "GET_CONTEXT") return;

  const updatedAt = state.lastUpdatedAt || new Date().toISOString();
  const record = {
    platform: state.platform,
    url: location.href,
    title: getTitle(),
    updatedAt: updatedAt,
    lines: [...state.buffer],
    contextText: state.buffer.join(" ").trim(),
    // Backward compatibility fields
    capturedAt: updatedAt,
    buffer: [...state.buffer],
    lastLine: state.lastLine,
  };

  sendResponse({ ok: true, record });
});

