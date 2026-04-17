(function exposePinyinEngine(global) {
  const INPUT_TOOL = 'zh-t-i0-pinyin';
  const DEFAULT_LIMIT = 9;

  class SandboxChinesePinyinEngine {
    constructor() {
      this.decoder = null;
      this.ready = false;
      this.failed = null;
    }

    ensureDecoder() {
      if (this.decoder || this.failed) {
        return;
      }

      try {
        this.decoder = new goog.ime.offline.Decoder(INPUT_TOOL, () => {
          this.ready = true;
        });
        this.ready = this.decoder.isReady();
      } catch (error) {
        this.failed = error;
        console.error('[Sandbox Chinese IME] Failed to initialize pinyin decoder:', error);
      }
    }

    decode(source, limit = DEFAULT_LIMIT) {
      const normalized = this.normalizeSource(source);
      if (!normalized) {
        return { source: '', tokens: [], candidates: [] };
      }

      this.ensureDecoder();
      if (!this.decoder || !this.decoder.isReady()) {
        return {
          source: normalized,
          tokens: [normalized],
          candidates: [{ text: normalized, range: normalized.length, score: 0 }]
        };
      }

      const response = this.decoder.decode(normalized, Math.max(limit * 3, limit));
      if (!response) {
        return {
          source: normalized,
          tokens: [normalized],
          candidates: [{ text: normalized, range: normalized.length, score: 0 }]
        };
      }

      const candidates = [];
      const seen = new Set();
      for (const candidate of response.candidates || []) {
        const text = String(candidate.target || '');
        if (!text || seen.has(text)) {
          continue;
        }
        seen.add(text);
        candidates.push({
          text,
          range: Number(candidate.range || normalized.length),
          score: Number(candidate.score || 0)
        });
        if (candidates.length >= limit) {
          break;
        }
      }

      if (!seen.has(normalized)) {
        candidates.push({ text: normalized, range: normalized.length, score: 0 });
      }

      return {
        source: normalized,
        tokens: response.tokens || [normalized],
        candidates
      };
    }

    normalizeSource(source) {
      return String(source || '')
        .toLowerCase()
        .replace(/v/g, 'v')
        .replace(/[^a-z']/g, '')
        .replace(/'{2,}/g, "'");
    }
  }

  global.SandboxChinesePinyinEngine = SandboxChinesePinyinEngine;
})(window);
