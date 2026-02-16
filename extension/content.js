/**
 * LinguistAI - Content Script
 * Monitors textareas and contenteditable elements for real-time grammar checking.
 */

(function () {
  'use strict';

  const DEBOUNCE_MS = 600;
  let debounceTimer = null;
  let tooltipHost = null;
  let currentTooltip = null;
  let tooltipHideTimeout = null;
  let enabled = true;

  // Initialize: check if extension is enabled
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    enabled = result.extensionEnabled !== false;
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.extensionEnabled) {
      enabled = changes.extensionEnabled.newValue;
      if (!enabled) {
        clearAllHighlights();
        hideTooltip();
      }
    }
  });

  function clearAllHighlights() {
    document.querySelectorAll('.linguist-ai-error').forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });
    document.querySelectorAll('.linguist-ai-textarea-mirror').forEach((m) => {
      const wrapper = m.closest('.linguist-ai-textarea-wrapper');
      if (wrapper) {
        const textarea = wrapper.querySelector('textarea');
        if (textarea) {
          wrapper.parentNode.insertBefore(textarea, wrapper);
        }
        wrapper.remove();
      }
    });
  }

  function hideTooltip() {
    clearTimeout(tooltipHideTimeout);
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
  }

  function scheduleTooltipHide() {
    clearTimeout(tooltipHideTimeout);
    tooltipHideTimeout = setTimeout(hideTooltip, 200);
  }

  function createTooltip(correction, targetRect, onAccept) {
    hideTooltip();

    const host = document.createElement('div');
    host.id = 'linguist-ai-tooltip-host';
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .tooltip {
        position: fixed;
        z-index: 2147483647;
        background: #1f2937;
        color: #f9fafb;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        max-width: 280px;
        pointer-events: auto;
      }
      .tooltip-suggestion { color: #34d399; font-weight: 600; margin: 4px 0; }
      .tooltip-explanation { color: #9ca3af; font-size: 12px; margin-bottom: 10px; }
      .tooltip-accept {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      }
      .tooltip-accept:hover { background: #2563eb; }
    `;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-suggestion">→ ${escapeHtml(correction.suggestion)}</div>
      <div class="tooltip-explanation">${escapeHtml(correction.explanation)}</div>
      <button class="tooltip-accept">Accept</button>
    `;

    shadow.appendChild(style);
    shadow.appendChild(tooltip);

    const btn = shadow.querySelector('.tooltip-accept');
    btn.addEventListener('click', () => {
      onAccept?.();
      hideTooltip();
      host.remove();
    });

    tooltip.addEventListener('mouseenter', () => clearTimeout(tooltipHideTimeout));
    tooltip.addEventListener('mouseleave', scheduleTooltipHide);
    document.body.appendChild(host);

    let left = targetRect.left + targetRect.width / 2 - 140;
    let top = targetRect.top - 8;

    if (top < 10) top = targetRect.bottom + 8;
    if (left < 10) left = 10;
    if (left > window.innerWidth - 290) left = window.innerWidth - 290;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.transform = 'translateY(-100%)';

    currentTooltip = host;
    tooltipHost = host;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getTargetElements() {
    const textareas = Array.from(document.querySelectorAll('textarea'));
    const editables = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    return { textareas, editables };
  }

  function processElement(el) {
    if (!enabled) return;

    if (el.tagName === 'TEXTAREA') {
      processTextarea(el);
    } else if (el.isContentEditable) {
      processContentEditable(el);
    }
  }

  // --- Textarea: overlay mirror approach ---
  function setupTextareaMirror(textarea) {
    if (textarea.closest('.linguist-ai-textarea-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'linguist-ai-textarea-wrapper';
    wrapper.style.cssText = 'position:relative; display:inline-block;';

    const mirror = document.createElement('div');
    mirror.className = 'linguist-ai-textarea-mirror';
    mirror.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      padding: 8px;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow: hidden;
      pointer-events: none; /* Spans override with pointer-events: auto */
      box-sizing: border-box;
    `;

    const computed = getComputedStyle(textarea);
    mirror.style.fontFamily = computed.fontFamily;
    mirror.style.fontSize = computed.fontSize;
    mirror.style.lineHeight = computed.lineHeight;
    mirror.style.padding = computed.padding;
    mirror.style.color = computed.color;

    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);
    wrapper.appendChild(mirror); // Mirror on top so hover works; pointer-events: none passes clicks to textarea

    textarea.style.background = 'transparent';
    textarea.style.color = 'transparent';
    textarea.style.caretColor = '#000';
    textarea.style.position = 'absolute';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.resize = 'none';

    mirror.style.overflow = 'auto';
    textarea.addEventListener('scroll', () => { mirror.scrollTop = textarea.scrollTop; mirror.scrollLeft = textarea.scrollLeft; });

    updateTextareaMirror(textarea, mirror, []);
    textarea.addEventListener('input', () => { updateTextareaMirror(textarea, mirror, []); }, { passive: true });

    return mirror;
  }

  function updateTextareaMirror(textarea, mirror, corrections) {
    const text = textarea.value;
    if (corrections.length === 0) {
      mirror.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
      return;
    }

    const parts = [];
    let lastEnd = 0;
    const sorted = [...corrections].sort((a, b) => a.startIndex - b.startIndex);

    sorted.forEach((c) => {
      if (c.startIndex > lastEnd) {
        parts.push(escapeHtml(text.slice(lastEnd, c.startIndex)).replace(/\n/g, '<br>'));
      }
      parts.push(`<span class="linguist-ai-error" data-start="${c.startIndex}" data-end="${c.endIndex}" data-suggestion="${escapeHtml(c.suggestion)}" data-explanation="${escapeHtml(c.explanation)}" data-original="${escapeHtml(c.original)}">${escapeHtml(c.original)}</span>`);
      lastEnd = c.endIndex;
    });
    if (lastEnd < text.length) {
      parts.push(escapeHtml(text.slice(lastEnd)).replace(/\n/g, '<br>'));
    }
    mirror.innerHTML = parts.join('');
  }

  async function processTextarea(textarea) {
    const text = textarea.value;
    const mirror = textarea.closest('.linguist-ai-textarea-wrapper')?.querySelector('.linguist-ai-textarea-mirror') || setupTextareaMirror(textarea);
    if (!mirror) return;
    updateTextareaMirror(textarea, mirror, []);

    if (!text.trim()) return;

    try {
      const corrections = await window.LinguistAPI.checkGrammar(text);
      updateTextareaMirror(textarea, mirror, corrections);
      attachMirrorListeners(mirror, textarea, corrections);
    } catch (e) {
      console.warn('LinguistAI:', e);
    }
  }

  function attachMirrorListeners(mirror, textarea, corrections) {
    mirror.querySelectorAll('.linguist-ai-error').forEach((span) => {
      span.onmouseenter = (e) => {
        const rect = span.getBoundingClientRect();
        createTooltip(
          { suggestion: span.dataset.suggestion, explanation: span.dataset.explanation, original: span.dataset.original },
          rect,
          () => acceptTextareaCorrection(textarea, parseInt(span.dataset.start), parseInt(span.dataset.end), span.dataset.suggestion)
        );
      };
      span.onmouseleave = () => {
        setTimeout(hideTooltip, 150);
      };
    });
  }

  function acceptTextareaCorrection(textarea, start, end, suggestion) {
    const text = textarea.value;
    const newText = text.slice(0, start) + suggestion + text.slice(end);
    textarea.value = newText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    chrome.runtime.sendMessage({ action: 'incrementCorrections' });
    processTextarea(textarea);
  }

  // --- ContentEditable ---
  function processContentEditable(el) {
    const text = el.innerText || el.textContent || '';
    if (!text.trim()) return;

    el.querySelectorAll('.linguist-ai-error').forEach((span) => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.replaceChild(document.createTextNode(span.textContent), span);
    });

    window.LinguistAPI.checkGrammar(text).then((corrections) => {
      if (!enabled) return;
      corrections.sort((a, b) => b.startIndex - a.startIndex); // Process from end to avoid offset shifts

      corrections.forEach((c) => {
        const { startNode, startOffset, endNode, endOffset } = getRangeAtOffsets(el, c.startIndex, c.endIndex);
        if (!startNode) return;
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode || startNode, endOffset);
        const span = document.createElement('span');
        span.className = 'linguist-ai-error';
        span.dataset.suggestion = c.suggestion;
        span.dataset.explanation = c.explanation;
        span.dataset.original = c.original;
        try {
          range.surroundContents(span);
        } catch (_) {}
        span.onmouseenter = () => {
          createTooltip(c, span.getBoundingClientRect(), () => acceptContentEditableCorrection(span, c.suggestion));
        };
        span.onmouseleave = scheduleTooltipHide;
      });
    });
  }

  function getRangeAtOffsets(root, startIdx, endIdx) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = 0;
    let startNode = null, startOffset = 0, endNode = null, endOffset = 0;
    let node;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      if (startNode === null && current + len > startIdx) {
        startNode = node;
        startOffset = startIdx - current;
      }
      if (endNode === null && current + len >= endIdx) {
        endNode = node;
        endOffset = endIdx - current;
        break;
      }
      current += len;
    }
    return { startNode, startOffset, endNode: endNode || startNode, endOffset: endNode ? endOffset : startOffset };
  }

  function acceptContentEditableCorrection(span, suggestion) {
    span.textContent = suggestion;
    span.classList.remove('linguist-ai-error');
    span.replaceWith(document.createTextNode(suggestion));
    chrome.runtime.sendMessage({ action: 'incrementCorrections' });
  }

  // --- Debounced check ---
  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const { textareas, editables } = getTargetElements();
      textareas.forEach(processTextarea);
      editables.forEach(processContentEditable);
    }, DEBOUNCE_MS);
  }

  function setupListeners() {
    document.addEventListener('input', (e) => {
      if (e.target.matches('textarea, [contenteditable="true"]')) scheduleCheck();
    }, true);

    document.addEventListener('focusin', (e) => {
      if (e.target.matches('textarea, [contenteditable="true"]')) scheduleCheck();
    }, true);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.matches?.('textarea')) processTextarea(node);
            node.querySelectorAll?.('textarea, [contenteditable="true"]').forEach(processElement);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    getTargetElements().textareas.forEach((t) => {
      if (t.value.trim()) scheduleCheck();
    });
    getTargetElements().editables.forEach((e) => {
      if (e.innerText?.trim()) scheduleCheck();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupListeners);
  } else {
    setupListeners();
  }
})();
