(function sandboxChineseImeContent(global) {
  const STORAGE_KEY = 'sandboxChineseImeEnabled';
  const CANDIDATE_LIMIT = 9;
  const TEXT_INPUT_TYPES = new Set([
    'text',
    'search',
    'url',
    'tel',
    'email'
  ]);
  const PAGE_SIZE = 9;

  const engine = new global.SandboxChinesePinyinEngine();
  const state = {
    enabled: true,
    target: null,
    source: '',
    candidates: [],
    selected: 0,
    page: 0,
    ui: null
  };

  initialize();

  function initialize() {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, (data) => {
      state.enabled = Boolean(data[STORAGE_KEY]);
      if (!state.enabled) {
        resetComposition();
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[STORAGE_KEY]) {
        return;
      }
      state.enabled = Boolean(changes[STORAGE_KEY].newValue);
      if (!state.enabled) {
        resetComposition();
      }
    });

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('selectionchange', updateCandidatePosition, true);
    document.addEventListener('scroll', updateCandidatePosition, true);
    global.addEventListener('resize', updateCandidatePosition, true);
  }

  function handleFocusIn(event) {
    const target = resolveEditableTarget(event.target);
    state.target = target;
    if (!target) {
      resetComposition();
    }
  }

  function handleFocusOut() {
    global.setTimeout(() => {
      if (!resolveEditableTarget(document.activeElement)) {
        resetComposition();
        state.target = null;
      }
    }, 0);
  }

  function handleKeyDown(event) {
    const target = resolveEditableTarget(event.target);
    if (!state.enabled || !target || event.isComposing) {
      return;
    }

    state.target = target;

    if (handleControlKey(event)) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (isLetterKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      appendSource(event.key.toLowerCase());
      return;
    }

    if (state.source && event.key === "'") {
      event.preventDefault();
      event.stopPropagation();
      appendSource("'");
      return;
    }

    if (state.source && isPrintableKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      commitSelected(event.key);
    }
  }

  function handleControlKey(event) {
    if (!state.source) {
      return false;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      state.source = state.source.slice(0, -1);
      refreshCandidates();
      return true;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      resetComposition();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      commitRaw();
      return true;
    }

    if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      commitSelected();
      return true;
    }

    if (/^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      if (state.candidates[index]) {
        event.preventDefault();
        event.stopPropagation();
        commitCandidate(index);
        return true;
      }
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      moveSelection(1);
      return true;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      moveSelection(-1);
      return true;
    }

    if (event.key === 'PageDown' || event.key === '=') {
      event.preventDefault();
      event.stopPropagation();
      movePage(1);
      return true;
    }

    if (event.key === 'PageUp' || event.key === '-') {
      event.preventDefault();
      event.stopPropagation();
      movePage(-1);
      return true;
    }

    return false;
  }

  function appendSource(character) {
    state.source += character;
    refreshCandidates();
  }

  function refreshCandidates() {
    if (!state.source) {
      resetComposition();
      return;
    }

    const result = engine.decode(state.source, CANDIDATE_LIMIT);
    state.candidates = result.candidates;
    state.selected = 0;
    state.page = 0;
    renderCandidateWindow(result.tokens);
  }

  function commitRaw(suffix = '') {
    insertTextAtTarget(state.source + suffix);
    resetComposition();
  }

  function commitSelected(suffix = '') {
    const candidate = state.candidates[state.selected];
    if (!candidate) {
      commitRaw(suffix);
      return;
    }
    commitCandidate(state.selected, suffix);
  }

  function commitCandidate(index, suffix = '') {
    const candidate = state.candidates[index];
    if (!candidate) {
      return;
    }
    insertTextAtTarget(candidate.text + suffix);
    resetComposition();
  }

  function moveSelection(step) {
    if (!state.candidates.length) {
      return;
    }
    const next = clamp(state.selected + step, 0, state.candidates.length - 1);
    state.selected = next;
    state.page = Math.floor(next / PAGE_SIZE);
    renderCandidateWindow();
  }

  function movePage(step) {
    if (!state.candidates.length) {
      return;
    }
    const maxPage = Math.floor((state.candidates.length - 1) / PAGE_SIZE);
    state.page = clamp(state.page + step, 0, maxPage);
    state.selected = clamp(state.page * PAGE_SIZE, 0, state.candidates.length - 1);
    renderCandidateWindow();
  }

  function resetComposition() {
    state.source = '';
    state.candidates = [];
    state.selected = 0;
    state.page = 0;
    hideCandidateWindow();
  }

  function insertTextAtTarget(text) {
    const target = state.target || resolveEditableTarget(document.activeElement);
    if (!target || !text) {
      return;
    }
    target.focus();

    if (isTextControl(target)) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      target.setRangeText(text, start, end, 'end');
      dispatchInputEvent(target, text);
      return;
    }

    if (isContentEditable(target)) {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        target.append(document.createTextNode(text));
        dispatchInputEvent(target, text);
        return;
      }

      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      dispatchInputEvent(target, text);
    }
  }

  function dispatchInputEvent(target, data) {
    try {
      target.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data
      }));
    } catch (_) {
      target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
  }

  function renderCandidateWindow(tokens) {
    ensureCandidateWindow();
    const root = state.ui.shadowRoot;
    const sourceEl = root.querySelector('.source');
    const listEl = root.querySelector('.candidates');
    const hintEl = root.querySelector('.hint');
    const pageStart = state.page * PAGE_SIZE;
    const visible = state.candidates.slice(pageStart, pageStart + PAGE_SIZE);

    sourceEl.textContent = tokens && tokens.length ? tokens.join(' ') : state.source;
    listEl.textContent = '';
    visible.forEach((candidate, visibleIndex) => {
      const realIndex = pageStart + visibleIndex;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = realIndex === state.selected ? 'selected' : '';
      button.innerHTML = `<span class="index">${realIndex + 1}</span><span class="word"></span>`;
      button.querySelector('.word').textContent = candidate.text;
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        commitCandidate(realIndex);
      });
      listEl.append(button);
    });

    const maxPage = Math.floor((state.candidates.length - 1) / PAGE_SIZE);
    hintEl.textContent = maxPage > 0 ? `${state.page + 1}/${maxPage + 1}  -/= 翻页` : 'Enter 英文  Space 中文';
    state.ui.style.display = 'block';
    updateCandidatePosition();
  }

  function ensureCandidateWindow() {
    if (state.ui) {
      return;
    }

    const host = document.createElement('div');
    host.className = 'sandbox-chinese-ime-root';
    host.style.display = 'none';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .panel {
          min-width: 220px;
          max-width: min(460px, calc(100vw - 24px));
          border: 1px solid rgba(20, 39, 34, 0.18);
          border-radius: 8px;
          color: #111c19;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 14px 32px rgba(16, 26, 22, 0.2);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: hidden;
          pointer-events: auto;
        }
        .source {
          padding: 7px 10px 5px;
          color: #146c5f;
          background: #edf6f2;
          font: 13px/1.25 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .candidates {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 7px;
        }
        button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 30px;
          max-width: 100%;
          padding: 4px 7px;
          border: 0;
          border-radius: 6px;
          color: #17211f;
          background: transparent;
          font: 16px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          cursor: pointer;
        }
        button.selected {
          color: #ffffff;
          background: #146c5f;
        }
        .index {
          color: #6c7d78;
          font-size: 11px;
          font-variant-numeric: tabular-nums;
        }
        button.selected .index {
          color: rgba(255, 255, 255, 0.76);
        }
        .word {
          overflow-wrap: anywhere;
        }
        .hint {
          padding: 0 10px 8px;
          color: #6c7d78;
          font: 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          white-space: nowrap;
        }
      </style>
      <div class="panel" role="listbox" aria-label="拼音候选">
        <div class="source"></div>
        <div class="candidates"></div>
        <div class="hint"></div>
      </div>
    `;

    (document.documentElement || document.body).append(host);
    state.ui = host;
  }

  function hideCandidateWindow() {
    if (state.ui) {
      state.ui.style.display = 'none';
    }
  }

  function updateCandidatePosition() {
    if (!state.ui || state.ui.style.display === 'none') {
      return;
    }

    const rect = getCaretRect(state.target || document.activeElement);
    if (!rect) {
      return;
    }

    const hostRect = state.ui.getBoundingClientRect();
    const width = hostRect.width || 260;
    const left = clamp(rect.left, 8, Math.max(8, global.innerWidth - width - 8));
    const top = clamp(rect.bottom + 6, 8, Math.max(8, global.innerHeight - 120));
    state.ui.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function getCaretRect(target) {
    if (!target) {
      return null;
    }

    if (isTextControl(target)) {
      return getTextControlCaretRect(target);
    }

    if (isContentEditable(target)) {
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(false);
        const rects = range.getClientRects();
        if (rects.length) {
          return rects[0];
        }
      }
      return target.getBoundingClientRect();
    }

    return null;
  }

  function getTextControlCaretRect(target) {
    const rect = target.getBoundingClientRect();
    if (target.tagName !== 'TEXTAREA' && target.type !== 'text' && target.type !== 'search') {
      return rect;
    }

    const computed = global.getComputedStyle(target);
    const mirror = document.createElement('div');
    const span = document.createElement('span');
    const textBeforeCaret = target.value.slice(0, target.selectionStart ?? target.value.length);
    const properties = [
      'boxSizing',
      'width',
      'height',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'letterSpacing',
      'textTransform',
      'lineHeight',
      'textIndent',
      'textAlign'
    ];

    mirror.style.position = 'fixed';
    mirror.style.left = `${rect.left}px`;
    mirror.style.top = `${rect.top}px`;
    mirror.style.visibility = 'hidden';
    mirror.style.overflow = 'hidden';
    mirror.style.whiteSpace = target.tagName === 'TEXTAREA' ? 'pre-wrap' : 'pre';
    mirror.style.wordWrap = 'break-word';
    for (const property of properties) {
      mirror.style[property] = computed[property];
    }

    mirror.textContent = textBeforeCaret;
    span.textContent = '\u200b';
    mirror.append(span);
    document.documentElement.append(mirror);
    const spanRect = span.getBoundingClientRect();
    mirror.remove();

    return {
      left: spanRect.left - target.scrollLeft,
      right: spanRect.right - target.scrollLeft,
      top: spanRect.top - target.scrollTop,
      bottom: spanRect.bottom - target.scrollTop,
      width: spanRect.width,
      height: spanRect.height
    };
  }

  function resolveEditableTarget(node) {
    if (!node || node === document || node === global) {
      return null;
    }

    if (isTextControl(node) || isContentEditable(node)) {
      return node;
    }

    const parentEditable = node.closest && node.closest('[contenteditable=""], [contenteditable="true"]');
    return parentEditable || null;
  }

  function isTextControl(node) {
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (node.readOnly || node.disabled) {
      return false;
    }
    if (node instanceof HTMLTextAreaElement) {
      return true;
    }
    return TEXT_INPUT_TYPES.has(String(node.type || 'text').toLowerCase());
  }

  function isContentEditable(node) {
    if (!(node instanceof HTMLElement)) {
      return false;
    }
    return node.isContentEditable && !node.closest('[contenteditable="false"]');
  }

  function isLetterKey(key) {
    return /^[a-zA-Z]$/.test(key);
  }

  function isPrintableKey(key) {
    return key.length === 1;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})(window);
