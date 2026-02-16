/**
 * Webyan Demo Request Widget
 * Embed this script on your website to add a demo request popup
 * 
 * Usage:
 * <script src="https://YOUR_DOMAIN/embed/webyan-demo-widget.js" data-button-text="طلب عرض توضيحي"></script>
 * 
 * Or manually trigger: window.WebyanDemo.open()
 */
(function() {
  'use strict';

  var config = {
    popupUrl: '',
    buttonText: 'طلب عرض توضيحي',
    buttonColor: '#0ea5e9',
    buttonPosition: 'bottom-left',
    showButton: true,
    mode: 'floating'
  };

  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  
  if (currentScript) {
    var baseUrl = currentScript.src.replace('/embed/webyan-demo-widget.js', '');
    config.popupUrl = baseUrl + '/embed/demo-request-popup';
    
    if (currentScript.getAttribute('data-button-text')) config.buttonText = currentScript.getAttribute('data-button-text');
    if (currentScript.getAttribute('data-button-color')) config.buttonColor = currentScript.getAttribute('data-button-color');
    if (currentScript.getAttribute('data-button-position')) config.buttonPosition = currentScript.getAttribute('data-button-position');
    if (currentScript.getAttribute('data-show-button') === 'false') config.showButton = false;
    if (currentScript.getAttribute('data-mode') === 'inline') config.mode = 'inline';
  }

  var styles = document.createElement('style');
  styles.textContent = '\
    .webyan-demo-overlay {\
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;\
      background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);\
      z-index: 999998; opacity: 0; visibility: hidden;\
      transition: opacity 0.3s ease, visibility 0.3s ease;\
    }\
    .webyan-demo-overlay.active { opacity: 1; visibility: visible; }\
    .webyan-demo-popup {\
      position: fixed; top: 50%; left: 50%;\
      transform: translate(-50%, -50%) scale(0.95);\
      width: 460px; max-width: 92vw;\
      height: auto; max-height: 88vh;\
      z-index: 999999; opacity: 0; visibility: hidden;\
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\
      border-radius: 20px; overflow: hidden;\
      box-shadow: 0 25px 60px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);\
    }\
    .webyan-demo-popup.active {\
      opacity: 1; visibility: visible;\
      transform: translate(-50%, -50%) scale(1);\
    }\
    .webyan-demo-popup iframe {\
      width: 100%; height: 85vh; max-height: 700px;\
      border: none; display: block;\
      background: #ffffff;\
    }\
    .webyan-demo-button {\
      position: fixed; z-index: 999990;\
      padding: 10px 56px; border-radius: 50px; border: 2px solid ' + config.buttonColor + ';\
      background: white;\
      color: ' + config.buttonColor + '; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;\
      font-size: 15px; font-weight: 600; cursor: pointer;\
      transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px;\
      text-decoration: none; overflow: hidden; position: relative;\
    }\
    .webyan-demo-button .button__flair {\
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;\
      background: ' + config.buttonColor + ';\
      transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);\
      border-radius: 50px; z-index: 0;\
    }\
    .webyan-demo-button:hover .button__flair { transform: translateY(0); }\
    .webyan-demo-button:hover { color: white; transform: translateY(-2px); border-color: ' + config.buttonColor + '; }\
    .webyan-demo-button:active { transform: translateY(0) scale(0.97); }\
    .webyan-demo-button .button__label { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 8px; }\
    .webyan-demo-button.bottom-left { bottom: 20px; left: 20px; position: fixed; }\
    .webyan-demo-button.bottom-right { bottom: 20px; right: 20px; position: fixed; }\
    .webyan-demo-button.inline-mode { position: static; z-index: auto; }\
    @media (max-width: 640px) {\
      .webyan-demo-popup { width: 95vw; max-height: 92vh; border-radius: 16px; }\
      .webyan-demo-popup iframe { height: 88vh; max-height: none; }\
      .webyan-demo-button { padding: 8px 32px; font-size: 13px; }\
    }\
  ';
  document.head.appendChild(styles);

  var overlay = document.createElement('div');
  overlay.className = 'webyan-demo-overlay';
  overlay.onclick = function() { window.WebyanDemo.close(); };
  document.body.appendChild(overlay);

  var popup = document.createElement('div');
  popup.className = 'webyan-demo-popup';
  popup.innerHTML = '<iframe id="webyan-demo-iframe" title="طلب عرض توضيحي" allow="clipboard-write"></iframe>';
  document.body.appendChild(popup);

  if (config.showButton) {
    var button = document.createElement('a');
    button.href = 'javascript:void(0)';
    var isInline = config.mode === 'inline';
    button.className = 'webyan-demo-button ' + (isInline ? 'inline-mode' : config.buttonPosition);
    button.innerHTML = '\
      <span class="button__flair"></span>\
      <span class="button__label">' + config.buttonText + '</span>\
    ';
    button.onclick = function() {
      window.WebyanDemo.open();
    };
    if (isInline && currentScript && currentScript.parentNode) {
      currentScript.parentNode.insertBefore(button, currentScript.nextSibling);
    } else {
      document.body.appendChild(button);
    }
  }

  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'WEBYAN_POPUP_CLOSED') window.WebyanDemo.close();
    if (event.data && event.data.type === 'WEBYAN_FORM_SUBMITTED') {
      if (typeof gtag === 'function') {
        gtag('event', 'demo_request_submitted', { event_category: 'engagement', event_label: 'Webyan Demo Request' });
      }
    }
  });

  window.WebyanDemo = {
    open: function(options) {
      options = options || {};
      var iframe = document.getElementById('webyan-demo-iframe');
      var url = config.popupUrl + '?autoopen=true&source_page=' + encodeURIComponent(options.sourcePage || window.location.href);
      var urlParams = new URLSearchParams(window.location.search);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(param) {
        var value = options[param] || urlParams.get(param);
        if (value) url += '&' + param + '=' + encodeURIComponent(value);
      });
      iframe.src = url;
      overlay.classList.add('active');
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
    },
    close: function() {
      overlay.classList.remove('active');
      popup.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(function() {
        var iframe = document.getElementById('webyan-demo-iframe');
        if (iframe) iframe.src = 'about:blank';
      }, 300);
    }
  };

  if (window.location.search.indexOf('webyan_demo=open') !== -1) {
    setTimeout(function() { window.WebyanDemo.open(); }, 500);
  }
})();
