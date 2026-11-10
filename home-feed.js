/* 首页政策快讯与企业获扶持公开记录。 */
(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const safeUrl = value => {
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) {
      return '';
    }
  };
  const rotationInterval = 5000;
  const validPublishedDate = value => {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const [year, month, day] = match.slice(1).map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  };
  const arrow = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg>';
  const previous = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 5-5 5 5 5"/></svg>';
  const next = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5"/></svg>';
  const pause = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10m6-10v10"/></svg>';
  const play = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 7 5-7 5Z"/></svg>';
  const state = { index: 0, paused: false, hovered: false, focused: false, root: null, timer: null, media: null, cleanups: [] };
  const policies = () => (Array.isArray(window.PolicyPublicPolicies) ? [...window.PolicyPublicPolicies] : [])
    .filter(item => item && item.title && validPublishedDate(item.publishedAt) && safeUrl(item.sourceUrl))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || String(a.id).localeCompare(String(b.id)));
  const current = items => items[state.index % items.length];

  function policyMarkup(item) {
    const [year, month, day] = item.publishedAt.split('-');
    const publishedLabel = `${year}年${Number(month)}月${Number(day)}日发布`;
    return `<div class="home-policy-item"><time class="home-policy-date" datetime="${esc(item.publishedAt)}" title="${esc(publishedLabel)}" aria-label="${esc(publishedLabel)}"><span class="home-policy-date-month">${Number(month)}月</span><strong class="home-policy-date-day">${day}</strong></time><div class="home-policy-copy"><span class="home-policy-published">发布日期<span class="home-policy-year"> · ${year}年</span></span><a class="home-policy-link" href="${esc(safeUrl(item.sourceUrl))}" target="_blank" rel="noopener noreferrer" title="${esc(item.title)}（查看政策原文）">${esc(item.title)}</a></div></div>`;
  }

  function renderTicker() {
    const items = policies();
    if (!items.length) return '';
    state.index %= items.length;
    return `<section class="home-policy-ticker" aria-label="政策快讯"><span class="home-policy-label"><span aria-hidden="true"></span>政策快讯</span><div class="home-policy-content" data-home-feed-content aria-live="off">${policyMarkup(current(items))}</div><div class="home-policy-controls"><span class="home-policy-count" data-home-feed-count aria-hidden="true">${state.index + 1}/${items.length}</span><button type="button" data-action="home-feed-previous" aria-label="上一条政策"${items.length < 2 ? ' disabled' : ''}>${previous}</button><button type="button" data-action="home-feed-next" aria-label="下一条政策"${items.length < 2 ? ' disabled' : ''}>${next}</button><button type="button" data-action="home-feed-pause" aria-label="${state.paused ? '继续轮播' : '暂停轮播'}" aria-pressed="${state.paused}"${items.length < 2 ? ' disabled' : ''}>${state.paused ? play : pause}</button></div></section>`;
  }

  function renderCases() {
    const cases = window.PolicyLandingData?.cases;
    const items = Array.isArray(cases) ? cases.filter(item => item && item.company && item.amount && safeUrl(item.sourceUrl)) : [];
    if (!items.length) return '';
    return `<section class="home-grants" aria-labelledby="home-grants-heading"><div class="home-grants-heading" data-rise><h2 id="home-grants-heading">这些企业已经<wbr>拿到政策资金</h2></div><div class="home-grant-grid">${items.map(item => `<article class="home-grant-card"><div class="home-grant-value" data-rise><strong class="home-grant-amount">${esc(item.amount)}</strong><span>${esc(item.unit)}</span></div><div class="home-grant-body" data-rise style="--i:1"><h3 title="${esc(item.company)}">${esc(item.displayName || item.company)}</h3><p class="home-grant-project">${esc(item.project)}</p><p class="home-grant-support">获得${esc(item.supportLabel)}</p><p class="home-grant-meta">${esc(item.region)} ${esc(item.industry)}，${esc(item.yearLabel)}</p><a class="home-grant-source" href="${esc(safeUrl(item.sourceUrl))}" target="_blank" rel="noopener noreferrer">查看公开报道${arrow}</a></div></article>`).join('')}</div></section>`;
  }

  function stopTimer() {
    if (state.timer !== null) window.clearTimeout(state.timer);
    state.timer = null;
  }

  function canRotate() {
    return state.root?.isConnected && policies().length > 1 && !state.paused && !state.hovered && !state.focused && !document.hidden && !state.media?.matches;
  }

  function schedule() {
    stopTimer();
    if (!canRotate()) return;
    state.timer = window.setTimeout(() => {
      state.timer = null;
      if (!canRotate()) return;
      move(1, false);
    }, rotationInterval);
  }

  function move(direction, announce = true) {
    const items = policies();
    if (!items.length || !state.root?.isConnected) return;
    state.index = (state.index + direction + items.length) % items.length;
    const content = state.root.querySelector('[data-home-feed-content]');
    if (content) {
      const restoreLinkFocus = content.contains(document.activeElement);
      content.setAttribute('aria-live', announce ? 'polite' : 'off');
      content.innerHTML = policyMarkup(current(items));
      if (restoreLinkFocus) content.querySelector('.home-policy-link')?.focus({ preventScroll: true });
    }
    const count = state.root.querySelector('[data-home-feed-count]');
    if (count) count.textContent = `${state.index + 1}/${items.length}`;
    schedule();
  }

  function listen(target, event, callback) {
    target.addEventListener(event, callback);
    state.cleanups.push(() => target.removeEventListener(event, callback));
  }

  function unmount() {
    stopTimer();
    state.cleanups.splice(0).forEach(cleanup => cleanup());
    state.root = null;
    state.media = null;
    state.hovered = false;
    state.focused = false;
  }

  function mountStartField() {
    const input = document.querySelector('.home-start-field > input');
    if (!input) return;
    const personalise = () => {
      const name = input.closest('.company-start-page')?.querySelector('[data-home-name]');
      const value = input.value.trim();
      if (name) name.textContent = value && value.length <= 12 ? value : '你';
    };
    listen(input, 'input', personalise);
    personalise();
    // 有鼠标的设备直接把光标放进输入框；手机不弹键盘。
    if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer:fine)').matches && !window.scrollY) window.requestAnimationFrame(() => { if (input.isConnected) input.focus({ preventScroll: true }); });
  }

  function mountMotion() {
    const page = document.querySelector('.company-start-page');
    if (!page || typeof window.IntersectionObserver !== 'function' || state.media?.matches) return;
    page.classList.add('motion-ready');
    const observer = new window.IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -6% 0px' });
    page.querySelectorAll('[data-rise]').forEach(node => observer.observe(node));
    state.cleanups.push(() => observer.disconnect());
    const bar = page.querySelector('.start-expert-row');
    let frame = 0;
    const drift = () => {
      frame = 0;
      const box = bar.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (window.innerHeight - box.top) / (window.innerHeight + box.height)));
      bar.style.setProperty('--drift', `${Math.round(18 - progress * 18)}px`);
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(drift); };
    listen(window, 'scroll', queue);
    state.cleanups.push(() => { if (frame) window.cancelAnimationFrame(frame); });
    drift();
  }

  function mount() {
    unmount();
    state.root = document.querySelector('.home-policy-ticker');
    if (!state.root) return;
    state.media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const root = state.root;
    state.hovered = typeof root.matches === 'function' && root.matches(':hover');
    state.focused = root.contains(document.activeElement);
    listen(root, 'mouseenter', () => { state.hovered = true; stopTimer(); });
    listen(root, 'mouseleave', () => { state.hovered = false; schedule(); });
    listen(root, 'focusin', () => { state.focused = true; stopTimer(); });
    listen(root, 'focusout', event => {
      state.focused = !!event.relatedTarget && root.contains(event.relatedTarget);
      schedule();
    });
    listen(root, 'keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing || !event.target?.closest?.('.home-policy-controls')) return;
      const items = policies();
      if (items.length < 2) return;
      const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1
        : event.key === 'Home' ? -state.index : event.key === 'End' ? items.length - 1 - state.index : null;
      if (direction === null) return;
      event.preventDefault();
      move(direction);
    });
    listen(document, 'visibilitychange', schedule);
    if (state.media?.addEventListener) listen(state.media, 'change', schedule);
    else if (state.media?.addListener) {
      state.media.addListener(schedule);
      state.cleanups.push(() => state.media?.removeListener(schedule));
    }
    mountStartField();
    mountMotion();
    schedule();
  }

  function handleClick(target) {
    const button = target?.closest?.('button[data-action^="home-feed-"]');
    if (!button || !state.root?.contains(button) || button.disabled) return false;
    if (button.dataset.action === 'home-feed-previous') move(-1);
    else if (button.dataset.action === 'home-feed-next') move(1);
    else if (button.dataset.action === 'home-feed-pause') {
      state.paused = !state.paused;
      button.setAttribute('aria-pressed', String(state.paused));
      button.setAttribute('aria-label', state.paused ? '继续轮播' : '暂停轮播');
      button.innerHTML = state.paused ? play : pause;
      schedule();
    } else return false;
    return true;
  }

  window.PolicyHomeFeed = Object.freeze({ renderTicker, renderCases, mount, unmount, handleClick, rotationInterval });
})();
