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
    color: script.getAttribute('data-color') || '#263c84',
    text: script.getAttribute('data-text') || 'الدعم الفني',
    trigger: script.getAttribute('data-trigger') || '',
    baseUrl: script.src.replace(/\/embed\/webyan-ticket-widget\.js.*$/, '')
  };

  if (!config.apiKey) {
    console.error('[Webyan] Missing data-api-key attribute');
    return;
  }

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#webyan-ticket-fab{position:fixed;z-index:999999;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 8px 32px rgba(38,60,132,0.35);animation:webyan-t-pulse 2.5s infinite}',
    '#webyan-ticket-fab:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 12px 40px rgba(38,60,132,0.45)}',
    '#webyan-ticket-fab svg{width:26px;height:26px;color:#fff;transition:transform .3s}',
    '#webyan-ticket-fab.open svg{transform:rotate(90deg)}',
    '@keyframes webyan-t-pulse{0%,100%{box-shadow:0 8px 32px rgba(38,60,132,0.35)}50%{box-shadow:0 8px 48px rgba(36,194,236,0.4)}}',
    // Backdrop overlay
    '#webyan-ticket-overlay{position:fixed;inset:0;z-index:999997;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;visibility:hidden;transition:opacity .3s ease}',
    '#webyan-ticket-overlay.open{opacity:1;visibility:visible}',
    // Centered modal popup
    '#webyan-ticket-popup{position:fixed;z-index:999998;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.92);width:460px;max-width:calc(100vw - 40px);height:680px;max-height:calc(100vh - 80px);background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.25),0 0 0 1px rgba(0,0,0,0.05);opacity:0;visibility:hidden;transition:all .35s cubic-bezier(.4,0,.2,1);overflow:hidden}',
    '#webyan-ticket-popup.open{opacity:1;visibility:visible;transform:translate(-50%,-50%) scale(1)}',
    '#webyan-ticket-popup iframe{width:100%;height:100%;border:none}',
    '@media(max-width:480px){#webyan-ticket-popup{width:100%;height:100%;max-height:100vh;max-width:100vw;border-radius:0;top:0;left:0;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .2s}#webyan-ticket-popup.open{transform:translateY(0);opacity:1}}'
  ].join('\n');
  document.head.appendChild(style);

  // Position logic for FAB only
  var isRight = config.position.indexOf('right') !== -1;
  var isTop = config.position.indexOf('top') !== -1;
  var fabPos = (isRight ? 'right:20px;' : 'left:20px;') + (isTop ? 'top:20px;' : 'bottom:20px;');

  // Create backdrop overlay
  var overlay = document.createElement('div');
  overlay.id = 'webyan-ticket-overlay';
  document.body.appendChild(overlay);

  // Create centered popup
  var popup = document.createElement('div');
  popup.id = 'webyan-ticket-popup';

  var iframe = document.createElement('iframe');
  iframe.src = config.baseUrl + '/embed/ticket?key=' + encodeURIComponent(config.apiKey) + '&mode=compact';
  iframe.allow = 'clipboard-write';
  iframe.setAttribute('loading', 'lazy');
  popup.appendChild(iframe);

  document.body.appendChild(popup);

  var isOpen = false;
  function toggle() {
    isOpen = !isOpen;
    popup.classList.toggle('open', isOpen);
    overlay.classList.toggle('open', isOpen);
    // Prevent body scroll when open
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (fab) fab.classList.toggle('open', isOpen);
    if (fab) {
      fab.innerHTML = isOpen
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
    }
  }

  // Trigger mode: attach to existing button(s)
  var fab = null;
  if (config.trigger) {
    var triggers = document.querySelectorAll(config.trigger);
    if (triggers.length > 0) {
      triggers.forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          toggle();
        });
      });
    } else {
      console.warn('[Webyan] Trigger element not found: ' + config.trigger);
    }
  } else {
    // Default: create floating FAB
    fab = document.createElement('button');
    fab.id = 'webyan-ticket-fab';
    fab.setAttribute('aria-label', config.text);
    fab.style.cssText = 'background:linear-gradient(135deg,' + config.color + ' 0%,#24c2ec 100%);' + fabPos;
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);
  }

  // Close on overlay click
  overlay.addEventListener('click', function() {
    if (isOpen) toggle();
  });

  // Close on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) toggle();
  });

  // Listen for messages from iframe
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'WEBYAN_TICKET_CREATED' && isOpen) {
      toggle();
    }
  });

  // Expose global API
  window.WebyanTicket = { open: function() { if (!isOpen) toggle(); }, close: function() { if (isOpen) toggle(); }, toggle: toggle };
})();
