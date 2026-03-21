// subtitle-interceptor.js — MAIN world content script
// Injected at document_start on crunchyroll.com/watch/* pages.
// Overrides window.fetch to intercept ASS subtitle file fetches.
// Parses cues and posts them to the isolated world (content.js) via postMessage.
// Does NOT access chrome.* APIs — MAIN world isolation.

(function () {
  'use strict';

  // Guard against double-injection (e.g. hot reload during development).
  if (window.__veil_interceptor_loaded) return;
  window.__veil_interceptor_loaded = true;

  // ── ASS Parser ────────────────────────────────────────────────────────────

  function assTimestampToSeconds(ts) {
    // ts format: "H:MM:SS.cs" (hours, 2-digit minutes, 2-digit seconds, 2-digit centiseconds)
    // e.g. "0:02:15.00" → 135.0, "1:23:45.67" → 5025.67
    const dotIdx = ts.lastIndexOf('.');
    const cs = dotIdx !== -1 ? parseInt(ts.slice(dotIdx + 1), 10) : 0;
    const hms = dotIdx !== -1 ? ts.slice(0, dotIdx) : ts;
    const parts = hms.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s + cs / 100;
  }

  function parseASS(body) {
    const cues = [];
    // Matches: Dialogue: layer, start, end, style, name, marginL, marginR, marginV, effect, text
    // Capture groups: (1) start, (2) end, (5) text
    const re = /^Dialogue:\s*\d+,(\d:\d{2}:\d{2}\.\d{2}),(\d:\d{2}:\d{2}\.\d{2}),[^,]*,[^,]*,\d+,\d+,\d+,[^,]*,(.*)/gm;
    let match;
    while ((match = re.exec(body)) !== null) {
      const start = assTimestampToSeconds(match[1]);
      const end   = assTimestampToSeconds(match[2]);
      const rawText = match[3];

      // Strip ALL ASS override tags (anything inside braces)
      const text = rawText
        .replace(/\{[^}]*\}/g, '')   // {tags}
        .replace(/\\N/g, ' ')         // ASS soft newline → space
        .replace(/\\n/g, ' ')         // ASS hard newline → space
        .replace(/\\h/g, '\u00a0')    // non-breaking space
        .replace(/\s+/g, ' ')         // collapse whitespace
        .trim();

      if (text && end > start) {
        cues.push({ start, end, text });
      }
    }
    cues.sort(function (a, b) { return a.start - b.start; });
    return cues;
  }

  // ── Language Filter ───────────────────────────────────────────────────────

  function isPreferredLanguage(url) {
    // Accept English subtitle tracks; reject signs-only and Japanese-only tracks.
    // Crunchyroll subtitle URLs contain a language code segment before .ass:
    //   e.g. "...en-US.ass", "...ja-JP.ass", "...en-US-signs.ass"
    // If URL has no language code, accept it (conservative).
    const lower = url.toLowerCase();
    if (/[._-](ja|ko|zh|ar|pt|es|de|fr|it|ru)[._-]/.test(lower)) return false;
    if (/signs/.test(lower)) return false;
    return true;
  }

  function isASSUrl(url) {
    // Match .ass at end of path (before query string) or crunchyroll subtitle CDN URLs.
    return /\.ass(\?|$)/i.test(url) ||
           /static\.crunchyroll\.com.*\.ass/i.test(url) ||
           /crunchyroll\.com.*subtitle.*\.ass/i.test(url);
  }

  // ── Fetch Override ────────────────────────────────────────────────────────

  const originalFetch = window.fetch.bind(window);

  window.fetch = function () {
    var args = Array.prototype.slice.call(arguments);
    var resource = args[0];
    var url = '';
    if (typeof resource === 'string') {
      url = resource;
    } else if (resource && typeof resource === 'object' && resource.url) {
      url = resource.url;
    }

    var promise = originalFetch.apply(window, args);

    if (url && isASSUrl(url) && isPreferredLanguage(url)) {
      promise = promise.then(function (response) {
        // MUST clone before reading — consuming the original breaks the player.
        var cloned = response.clone();
        cloned.text().then(function (body) {
          var cues = parseASS(body);
          if (cues.length > 0) {
            window.postMessage({
              type: '__VEIL_SUBTITLE_INTERCEPTED__',
              url: url,
              cues: cues,
            }, '*');
          }
        }).catch(function () {
          // Never crash the page on parse failure.
        });
        return response; // return the original, unmodified
      });
    }

    return promise;
  };

})();
