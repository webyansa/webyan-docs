/**
 * Webyan Subscription Widget
 * Embed this script on your website to add pricing plans and subscription popup
 * 
 * Usage (Floating Button):
 * <script src="https://webyan.sa/embed/webyan-subscribe-widget.js" data-button-text="اشترك الآن"></script>
 * 
 * Usage (Inline Plans Section):
 * <div id="webyan-pricing"></div>
 * <script src="https://webyan.sa/embed/webyan-subscribe-widget.js" data-mode="inline" data-target="webyan-pricing"></script>
 * 
 * Or manually trigger: window.WebyanSubscribe.open({ planId: 'xxx' })
 * Or show pricing: window.WebyanSubscribe.openPricing()
 */
(function() {
  'use strict';

  var config = {
    baseUrl: '',
    buttonText: 'اشترك الآن',
    buttonColor: '#0ea5e9',
    buttonPosition: 'bottom-right',
    showButton: true,
    mode: 'popup', // popup or inline
    target: null
  };

  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  
  if (currentScript) {
    config.baseUrl = currentScript.src.replace('/embed/webyan-subscribe-widget.js', '');
    
    if (currentScript.getAttribute('data-button-text')) config.buttonText = currentScript.getAttribute('data-button-text');
    if (currentScript.getAttribute('data-button-color')) config.buttonColor = currentScript.getAttribute('data-button-color');
    if (currentScript.getAttribute('data-button-position')) config.buttonPosition = currentScript.getAttribute('data-button-position');
    if (currentScript.getAttribute('data-show-button') === 'false') config.showButton = false;
    if (currentScript.getAttribute('data-mode')) config.mode = currentScript.getAttribute('data-mode');
    if (currentScript.getAttribute('data-target')) config.target = currentScript.getAttribute('data-target');
  }

  function adjustColor(color, amount) {
    var usePound = false;
    if (color[0] === '#') { color = color.slice(1); usePound = true; }
    var num = parseInt(color, 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + amount));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    var b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  // --- Popup Mode Styles ---
  var styles = document.createElement('style');
  styles.textContent = '\
    .webyan-sub-overlay {\
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;\
      background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);\
      z-index: 999998; opacity: 0; visibility: hidden;\
      transition: opacity 0.3s ease, visibility 0.3s ease;\
    }\
    .webyan-sub-overlay.active { opacity: 1; visibility: visible; }\
    .webyan-sub-popup {\
      position: fixed; top: 50%; left: 50%;\
      transform: translate(-50%, -50%) scale(0.95);\
      width: 520px; max-width: 92vw;\
      z-index: 999999; opacity: 0; visibility: hidden;\
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\
      border-radius: 20px; overflow: hidden;\
      box-shadow: 0 25px 60px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);\
    }\
    .webyan-sub-popup.active {\
      opacity: 1; visibility: visible;\
      transform: translate(-50%, -50%) scale(1);\
    }\
    .webyan-sub-popup.wide { width: 90vw; max-width: 1100px; }\
    .webyan-sub-popup iframe {\
      width: 100%; height: 85vh; max-height: 750px;\
      border: none; display: block;\
      background: #ffffff;\
    }\
    .webyan-sub-button {\
      position: fixed; z-index: 999990;\
      padding: 12px 18px; border-radius: 50px; border: none;\
      background: linear-gradient(135deg, ' + config.buttonColor + ', ' + adjustColor(config.buttonColor, -20) + ');\
      color: white; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;\
      font-size: 13px; font-weight: 600; cursor: pointer;\
      box-shadow: 0 4px 14px rgba(14,165,233,0.4);\
      transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;\
    }\
    .webyan-sub-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14,165,233,0.5); }\
    .webyan-sub-button.bottom-left { bottom: 20px; left: 20px; }\
    .webyan-sub-button.bottom-right { bottom: 20px; right: 20px; }\
    .webyan-sub-button .btn-icon { width: 20px; height: 20px; flex-shrink: 0; }\
    @media (max-width: 640px) {\
      .webyan-sub-popup { width: 95vw; max-height: 92vh; border-radius: 16px; }\
      .webyan-sub-popup iframe { height: 88vh; max-height: none; }\
      .webyan-sub-button { padding: 10px 14px; font-size: 12px; }\
    }\
  ';
  document.head.appendChild(styles);

  // --- Create Popup Elements ---
  var overlay = document.createElement('div');
  overlay.className = 'webyan-sub-overlay';
  overlay.onclick = function() { window.WebyanSubscribe.close(); };
  document.body.appendChild(overlay);

  var popup = document.createElement('div');
  popup.className = 'webyan-sub-popup';
  popup.innerHTML = '<iframe id="webyan-sub-iframe" title="اشتراك ويبيان" allow="clipboard-write"></iframe>';
  document.body.appendChild(popup);

  // --- Floating Button ---
  if (config.showButton && config.mode === 'popup') {
    var button = document.createElement('button');
    button.className = 'webyan-sub-button ' + config.buttonPosition;
    button.innerHTML = '\
      <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">\
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />\
      </svg>\
      <span>' + config.buttonText + '</span>\
    ';
    button.onclick = function() { window.WebyanSubscribe.openPricing(); };
    document.body.appendChild(button);
  }

  // --- Inline Mode ---
  if (config.mode === 'inline' && config.target) {
    var container = document.getElementById(config.target);
    if (container) {
      var inlineIframe = document.createElement('iframe');
      inlineIframe.src = config.baseUrl + '/pricing?embed=true&source_page=' + encodeURIComponent(window.location.href);
      inlineIframe.style.cssText = 'width:100%;border:none;min-height:600px;';
      inlineIframe.title = 'باقات ويبيان';
      container.appendChild(inlineIframe);

      // Auto-resize inline iframe
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'WEBYAN_IFRAME_HEIGHT') {
          inlineIframe.style.height = e.data.height + 'px';
        }
      });
    }
  }

  // --- PostMessage Listener ---
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'WEBYAN_POPUP_CLOSED') window.WebyanSubscribe.close();
    if (event.data && event.data.type === 'WEBYAN_OPEN_SUBSCRIBE') {
      window.WebyanSubscribe.open({ planId: event.data.planId });
    }
    if (event.data && event.data.type === 'WEBYAN_FORM_SUBMITTED') {
      if (typeof gtag === 'function') {
        gtag('event', 'subscription_request_submitted', {
          event_category: 'conversion',
          event_label: event.data.planName || 'Webyan Subscription'
        });
      }
    }
  });

  // --- Public API ---
  window.WebyanSubscribe = {
    open: function(options) {
      options = options || {};
      var iframe = document.getElementById('webyan-sub-iframe');
      var url = config.baseUrl + '/subscribe?embed=true&source_page=' + encodeURIComponent(options.sourcePage || window.location.href);
      if (options.planId) url += '&planId=' + encodeURIComponent(options.planId);
      var urlParams = new URLSearchParams(window.location.search);
      ['utm_source','utm_medium','utm_campaign'].forEach(function(param) {
        var value = options[param] || urlParams.get(param);
        if (value) url += '&' + param + '=' + encodeURIComponent(value);
      });
      iframe.src = url;
      popup.classList.remove('wide');
      overlay.classList.add('active');
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
    },
    openPricing: function(options) {
      options = options || {};
      var iframe = document.getElementById('webyan-sub-iframe');
      var url = config.baseUrl + '/pricing?embed=true&source_page=' + encodeURIComponent(options.sourcePage || window.location.href);
      iframe.src = url;
      popup.classList.add('wide');
      overlay.classList.add('active');
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
    },
    close: function() {
      overlay.classList.remove('active');
      popup.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(function() {
        var iframe = document.getElementById('webyan-sub-iframe');
        if (iframe) iframe.src = 'about:blank';
      }, 300);
    }
  };

  // Auto-open via URL param
  if (window.location.search.indexOf('webyan_subscribe=open') !== -1) {
    setTimeout(function() { window.WebyanSubscribe.openPricing(); }, 500);
  }
})();
