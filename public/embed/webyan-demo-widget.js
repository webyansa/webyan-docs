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

  // Configuration
  var config = {
    popupUrl: '',
    buttonText: 'طلب عرض توضيحي',
    buttonColor: '#0ea5e9',
    buttonPosition: 'bottom-left', // bottom-left, bottom-right
    showButton: true
  };

  // Get script tag and read data attributes
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  
  if (currentScript) {
    var baseUrl = currentScript.src.replace('/embed/webyan-demo-widget.js', '');
    config.popupUrl = baseUrl + '/embed/demo-request-popup';
    
    if (currentScript.getAttribute('data-button-text')) {
      config.buttonText = currentScript.getAttribute('data-button-text');
    }
    if (currentScript.getAttribute('data-button-color')) {
      config.buttonColor = currentScript.getAttribute('data-button-color');
    }
    if (currentScript.getAttribute('data-button-position')) {
      config.buttonPosition = currentScript.getAttribute('data-button-position');
    }
    if (currentScript.getAttribute('data-show-button') === 'false') {
      config.showButton = false;
    }
  }

  // Styles
  var styles = `
    .webyan-demo-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999998;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .webyan-demo-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .webyan-demo-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      z-index: 999999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    .webyan-demo-popup.active {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }
    .webyan-demo-popup iframe {
      width: 100%;
      height: 85vh;
      max-height: 700px;
      border: none;
      display: block;
    }
    .webyan-demo-close {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s ease;
    }
    .webyan-demo-close:hover {
      background: white;
    }
    .webyan-demo-close svg {
      width: 18px;
      height: 18px;
      color: #374151;
    }
    .webyan-demo-button {
      position: fixed;
      z-index: 999990;
      padding: 12px;
      border-radius: 50px;
      border: none;
      background: linear-gradient(135deg, ${config.buttonColor}, ${adjustColor(config.buttonColor, -20)});
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .webyan-demo-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
    }
    .webyan-demo-button.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    .webyan-demo-button.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    .webyan-demo-button .btn-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .webyan-demo-button .btn-text {
      white-space: nowrap;
      overflow: hidden;
      max-width: 200px;
      transition: max-width 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
    }
    .webyan-demo-button.collapsed .btn-text {
      max-width: 0;
      opacity: 0;
      padding: 0;
    }
    .webyan-demo-button .btn-collapse {
      width: 16px;
      height: 16px;
      padding: 2px;
      margin-right: -4px;
      margin-left: 2px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      cursor: pointer;
      transition: background 0.2s ease, transform 0.3s ease;
      flex-shrink: 0;
    }
    .webyan-demo-button .btn-collapse:hover {
      background: rgba(255,255,255,0.4);
    }
    .webyan-demo-button.collapsed .btn-collapse {
      transform: rotate(45deg);
      margin-right: 0;
      margin-left: 0;
    }
    @media (max-width: 640px) {
      .webyan-demo-popup {
        width: 95%;
        max-height: 95vh;
      }
      .webyan-demo-popup iframe {
        height: 90vh;
      }
      .webyan-demo-button {
        padding: 10px;
        font-size: 12px;
      }
    }
  `;

  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    var usePound = false;
    if (color[0] === '#') {
      color = color.slice(1);
      usePound = true;
    }
    var num = parseInt(color, 16);
    var r = Math.min(255, Math.max(0, (num >> 16) + amount));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    var b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  // Create and inject styles
  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'webyan-demo-overlay';
  overlay.onclick = function() {
    window.WebyanDemo.close();
  };
  document.body.appendChild(overlay);

  // Create popup container
  var popup = document.createElement('div');
  popup.className = 'webyan-demo-popup';
  popup.innerHTML = `
    <button class="webyan-demo-close" onclick="window.WebyanDemo.close()">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <iframe id="webyan-demo-iframe" title="طلب عرض توضيحي"></iframe>
  `;
  document.body.appendChild(popup);

  // Create floating button if enabled
  if (config.showButton) {
    var button = document.createElement('button');
    button.className = 'webyan-demo-button ' + config.buttonPosition;
    button.innerHTML = `
      <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span class="btn-text">${config.buttonText}</span>
      <svg class="btn-collapse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    
    // Handle click on main button area (not collapse button)
    button.onclick = function(e) {
      if (e.target.closest('.btn-collapse')) {
        e.stopPropagation();
        button.classList.toggle('collapsed');
        return;
      }
      window.WebyanDemo.open();
    };
    
    document.body.appendChild(button);
  }

  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'WEBYAN_POPUP_CLOSED') {
      window.WebyanDemo.close();
    }
    if (event.data && event.data.type === 'WEBYAN_FORM_SUBMITTED') {
      // Optionally track conversion
      if (typeof gtag === 'function') {
        gtag('event', 'demo_request_submitted', {
          event_category: 'engagement',
          event_label: 'Webyan Demo Request'
        });
      }
    }
  });

  // Public API
  window.WebyanDemo = {
    open: function(options) {
      options = options || {};
      var iframe = document.getElementById('webyan-demo-iframe');
      
      // Build URL with parameters
      var url = config.popupUrl + '?autoopen=true';
      url += '&source_page=' + encodeURIComponent(options.sourcePage || window.location.href);
      
      // Add UTM parameters if present
      var urlParams = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function(param) {
        var value = options[param] || urlParams.get(param);
        if (value) {
          url += '&' + param + '=' + encodeURIComponent(value);
        }
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
      
      // Clear iframe after animation
      setTimeout(function() {
        var iframe = document.getElementById('webyan-demo-iframe');
        if (iframe) {
          iframe.src = 'about:blank';
        }
      }, 300);
    }
  };

  // Auto-open if URL has webyan_demo=open
  if (window.location.search.indexOf('webyan_demo=open') !== -1) {
    setTimeout(function() {
      window.WebyanDemo.open();
    }, 500);
  }

})();
