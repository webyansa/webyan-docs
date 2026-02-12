(function() {
  'use strict';

  // Find current script element
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  // Read configuration from data attributes
  var config = {
    apiKey: script.getAttribute('data-api-key') || '',
    position: script.getAttribute('data-position') || 'bottom-right',
    color: script.getAttribute('data-color') || '#3b82f6',
    text: script.getAttribute('data-text') || 'الدعم الفني',
    baseUrl: script.src.replace(/\/embed\/webyan-ticket-widget\.js.*$/, '')
  };

  if (!config.apiKey) {
    console.error('[Webyan] Missing data-api-key attribute');
    return;
  }

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#webyan-ticket-fab{position:fixed;z-index:999999;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 6px 24px rgba(0,0,0,0.25);animation:webyan-t-pulse 2.5s infinite}',
    '#webyan-ticket-fab:hover{transform:scale(1.08) translateY(-2px)}',
    '#webyan-ticket-fab svg{width:26px;height:26px;color:#fff;transition:transform .3s}',
    '#webyan-ticket-fab.open svg{transform:rotate(90deg)}',
    '@keyframes webyan-t-pulse{0%,100%{box-shadow:0 6px 24px rgba(0,0,0,0.25)}50%{box-shadow:0 6px 40px rgba(0,0,0,0.35)}}',
    '#webyan-ticket-popup{position:fixed;z-index:999998;width:420px;max-width:calc(100vw - 32px);height:640px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);opacity:0;visibility:hidden;transform:translateY(16px) scale(0.96);transition:all .3s cubic-bezier(.4,0,.2,1);overflow:hidden}',
    '#webyan-ticket-popup.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}',
    '#webyan-ticket-popup iframe{width:100%;height:100%;border:none}',
    '@media(max-width:480px){#webyan-ticket-popup{width:100%;height:100%;max-height:100vh;max-width:100vw;border-radius:0;top:0!important;right:0!important;bottom:0!important;left:0!important}}'
  ].join('\n');
  document.head.appendChild(style);

  // Position logic
  var isRight = config.position.indexOf('right') !== -1;
  var isTop = config.position.indexOf('top') !== -1;
  var fabPos = (isRight ? 'right:20px;' : 'left:20px;') + (isTop ? 'top:20px;' : 'bottom:20px;');
  var popupPos = (isRight ? 'right:20px;' : 'left:20px;') + (isTop ? 'top:90px;' : 'bottom:90px;');

  // Create FAB
  var fab = document.createElement('button');
  fab.id = 'webyan-ticket-fab';
  fab.setAttribute('aria-label', config.text);
  fab.style.cssText = 'background:' + config.color + ';' + fabPos;
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';

  // Create popup
  var popup = document.createElement('div');
  popup.id = 'webyan-ticket-popup';
  popup.style.cssText = popupPos;

  var iframe = document.createElement('iframe');
  iframe.src = config.baseUrl + '/embed/ticket?key=' + encodeURIComponent(config.apiKey) + '&mode=compact';
  iframe.allow = 'clipboard-write';
  iframe.setAttribute('loading', 'lazy');
  popup.appendChild(iframe);

  document.body.appendChild(fab);
  document.body.appendChild(popup);

  // Toggle logic
  var isOpen = false;
  function toggle() {
    isOpen = !isOpen;
    popup.classList.toggle('open', isOpen);
    fab.classList.toggle('open', isOpen);
    fab.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
  }

  fab.addEventListener('click', toggle);

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (isOpen && !e.target.closest('#webyan-ticket-fab') && !e.target.closest('#webyan-ticket-popup')) {
      toggle();
    }
  });

  // Listen for messages from iframe
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'WEBYAN_TICKET_CREATED' && isOpen) {
      toggle();
    }
  });
})();
