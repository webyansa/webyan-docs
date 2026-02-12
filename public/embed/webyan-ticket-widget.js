(function() {
  'use strict';

  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var config = {
    apiKey: script.getAttribute('data-api-key') || '',
    position: script.getAttribute('data-position') || 'bottom-right',
    color: script.getAttribute('data-color') || '#263c84',
    text: script.getAttribute('data-text') || 'الدعم الفني',
    trigger: script.getAttribute('data-trigger') || '',
    functionsUrl: 'https://mzzhpknxooubophxvwch.supabase.co/functions/v1',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16emhwa254b291Ym9waHh2d2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTA3OTcsImV4cCI6MjA4MzY2Njc5N30.anpvU3Dyz1sb0kNvrOO4hk5XZWJJ03CZ6hmfHLISDak'
  };

  if (!config.apiKey) {
    console.error('[Webyan] Missing data-api-key attribute');
    return;
  }

  // === SVG Icons ===
  var icons = {
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    creditCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    graduation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    loader: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
  };

  // === Categories & Priorities ===
  var categories = [
    { value: 'technical', label: 'مشكلة تقنية', icon: 'monitor', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', activeBg: '#fee2e2', activeBorder: '#f87171', activeRing: '#fecaca' },
    { value: 'billing', label: 'الفواتير', icon: 'creditCard', bg: '#fffbeb', border: '#fed7aa', text: '#b45309', activeBg: '#fef3c7', activeBorder: '#f59e0b', activeRing: '#fed7aa' },
    { value: 'feature', label: 'طلب ميزة', icon: 'sparkles', bg: '#faf5ff', border: '#e9d5ff', text: '#7c3aed', activeBg: '#f3e8ff', activeBorder: '#a78bfa', activeRing: '#e9d5ff' },
    { value: 'training', label: 'التدريب والدعم', icon: 'graduation', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', activeBg: '#dbeafe', activeBorder: '#60a5fa', activeRing: '#bfdbfe' },
    { value: 'other', label: 'أخرى', icon: 'more', bg: '#f9fafb', border: '#e5e7eb', text: '#4b5563', activeBg: '#f3f4f6', activeBorder: '#9ca3af', activeRing: '#e5e7eb' }
  ];

  var priorities = [
    { value: 'low', label: 'منخفضة', desc: 'يمكن الانتظار', icon: 'clock', bg: '#f8fafc', border: '#e2e8f0', text: '#475569', activeBg: '#f1f5f9', activeBorder: '#94a3b8', activeRing: '#e2e8f0' },
    { value: 'medium', label: 'متوسطة', desc: 'يحتاج حل قريب', icon: 'alert', bg: '#fefce8', border: '#fde68a', text: '#a16207', activeBg: '#fef9c3', activeBorder: '#facc15', activeRing: '#fde68a' },
    { value: 'high', label: 'عالية', desc: 'يؤثر على العمل', icon: 'zap', bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', activeBg: '#ffedd5', activeBorder: '#fb923c', activeRing: '#fed7aa' },
    { value: 'urgent', label: 'عاجلة', desc: 'توقف كامل', icon: 'flame', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', activeBg: '#fee2e2', activeBorder: '#f87171', activeRing: '#fecaca' }
  ];

  // === State ===
  var state = {
    isOpen: false,
    step: 1,
    loading: true,
    submitting: false,
    submitted: false,
    ticketNumber: '',
    error: null,
    organization: null,
    form: {
      category: 'technical',
      priority: 'medium',
      subject: '',
      description: '',
      contactName: '',
      contactEmail: '',
      websiteUrl: ''
    }
  };

  // === Styles ===
  var style = document.createElement('style');
  style.textContent = '\
#webyan-ticket-fab{position:fixed;z-index:999999;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 8px 32px rgba(38,60,132,0.35);animation:wt-pulse 2.5s infinite}\
#webyan-ticket-fab:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 12px 40px rgba(38,60,132,0.45)}\
#webyan-ticket-fab svg{width:26px;height:26px;color:#fff;transition:transform .3s;stroke:#fff}\
@keyframes wt-pulse{0%,100%{box-shadow:0 8px 32px rgba(38,60,132,0.35)}50%{box-shadow:0 8px 48px rgba(36,194,236,0.4)}}\
#wt-overlay{position:fixed;inset:0;z-index:999997;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;visibility:hidden;transition:opacity .3s ease}\
#wt-overlay.open{opacity:1;visibility:visible}\
#wt-modal{position:fixed;z-index:999998;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.92);width:520px;max-width:calc(100vw - 32px);max-height:calc(100vh - 40px);background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.25);opacity:0;visibility:hidden;transition:all .35s cubic-bezier(.4,0,.2,1);overflow:hidden;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}\
#wt-modal.open{opacity:1;visibility:visible;transform:translate(-50%,-50%) scale(1)}\
#wt-modal *{box-sizing:border-box;margin:0;padding:0}\
#wt-modal .wt-header{background:linear-gradient(135deg,#263c84 0%,#24c2ec 100%);padding:20px 24px;color:#fff;position:relative;overflow:hidden;flex-shrink:0}\
#wt-modal .wt-header::before{content:"";position:absolute;top:-20px;left:-20px;width:80px;height:80px;background:rgba(255,255,255,0.08);border-radius:50%}\
#wt-modal .wt-header::after{content:"";position:absolute;bottom:-15px;right:-15px;width:60px;height:60px;background:rgba(255,255,255,0.06);border-radius:50%}\
#wt-modal .wt-header-content{display:flex;align-items:center;gap:12px;position:relative;z-index:1}\
#wt-modal .wt-header-icon{width:44px;height:44px;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);border-radius:12px;display:flex;align-items:center;justify-content:center}\
#wt-modal .wt-header-icon svg{width:22px;height:22px;stroke:#fff}\
#wt-modal .wt-header-text h2{font-size:18px;font-weight:700;margin:0}\
#wt-modal .wt-header-text p{font-size:12px;opacity:0.85;margin:2px 0 0}\
#wt-modal .wt-close{position:absolute;top:16px;left:16px;background:rgba(255,255,255,0.15);border:none;color:#fff;width:32px;height:32px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;z-index:2}\
#wt-modal .wt-close:hover{background:rgba(255,255,255,0.3)}\
#wt-modal .wt-close svg{width:16px;height:16px;stroke:#fff}\
#wt-modal .wt-body{flex:1;overflow-y:auto;padding:0}\
#wt-modal .wt-progress{display:flex;gap:6px;padding:16px 24px 8px}\
#wt-modal .wt-progress-bar{flex:1;height:4px;border-radius:4px;background:#e2e8f0;transition:background .4s}\
#wt-modal .wt-progress-bar.active{background:linear-gradient(90deg,#263c84,#24c2ec)}\
#wt-modal .wt-section{padding:16px 24px}\
#wt-modal .wt-section-title{display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:15px;font-weight:600;color:#1e293b}\
#wt-modal .wt-section-num{width:26px;height:26px;border-radius:50%;background:#f0f4ff;color:#263c84;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}\
#wt-modal .wt-label{font-size:14px;font-weight:500;color:#334155;margin-bottom:8px;display:block;text-align:right}\
#wt-modal .wt-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}\
#wt-modal .wt-cat-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:12px;border:2px solid;cursor:pointer;transition:all .2s;font-size:13px;font-weight:500;text-align:center}\
#wt-modal .wt-cat-btn svg{width:24px;height:24px}\
#wt-modal .wt-cat-btn:hover{transform:translateY(-1px)}\
#wt-modal .wt-pris{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}\
#wt-modal .wt-pri-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 6px;border-radius:12px;border:2px solid;cursor:pointer;transition:all .2s;text-align:center}\
#wt-modal .wt-pri-btn svg{width:22px;height:22px}\
#wt-modal .wt-pri-btn .wt-pri-label{font-size:13px;font-weight:500}\
#wt-modal .wt-pri-btn .wt-pri-desc{font-size:10px;opacity:0.75}\
#wt-modal .wt-pri-btn:hover{transform:translateY(-1px)}\
#wt-modal .wt-input{width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;color:#1e293b;outline:none;transition:border-color .2s;direction:rtl;font-family:inherit}\
#wt-modal .wt-input:focus{border-color:#263c84}\
#wt-modal .wt-textarea{resize:none;min-height:120px;line-height:1.6}\
#wt-modal .wt-footer{padding:14px 24px;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;flex-shrink:0;background:#fafbfc}\
#wt-modal .wt-footer-info{flex:1;font-size:12px;color:#94a3b8;text-align:right}\
#wt-modal .wt-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}\
#wt-modal .wt-btn-primary{background:linear-gradient(135deg,#263c84 0%,#24c2ec 100%);color:#fff;box-shadow:0 4px 14px rgba(38,60,132,0.3)}\
#wt-modal .wt-btn-primary:hover{box-shadow:0 6px 20px rgba(38,60,132,0.4);transform:translateY(-1px)}\
#wt-modal .wt-btn-primary:disabled{opacity:0.6;cursor:not-allowed;transform:none}\
#wt-modal .wt-btn-primary svg{width:16px;height:16px;stroke:#fff}\
#wt-modal .wt-btn-outline{background:transparent;color:#64748b;border:1px solid #e2e8f0}\
#wt-modal .wt-btn-outline:hover{background:#f8fafc}\
#wt-modal .wt-security{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;font-size:11px;color:#94a3b8}\
#wt-modal .wt-security svg{width:12px;height:12px;stroke:#94a3b8}\
#wt-modal .wt-contact{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#f0f7ff;border:1px solid #dbeafe;margin:0 24px 8px}\
#wt-modal .wt-contact-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#263c84,#24c2ec);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}\
#wt-modal .wt-contact-info{font-size:12px;color:#475569;min-width:0}\
#wt-modal .wt-contact-info strong{font-weight:600;color:#1e293b}\
#wt-modal .wt-success{text-align:center;padding:40px 24px}\
#wt-modal .wt-success-icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(34,197,94,0.3)}\
#wt-modal .wt-success-icon svg{width:36px;height:36px;stroke:#fff}\
#wt-modal .wt-success h3{font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px}\
#wt-modal .wt-success p{font-size:14px;color:#64748b;margin-bottom:20px}\
#wt-modal .wt-success-num{background:linear-gradient(135deg,rgba(38,60,132,0.05),rgba(36,194,236,0.08));border:1px solid rgba(38,60,132,0.12);border-radius:14px;padding:16px;margin-bottom:20px}\
#wt-modal .wt-success-num small{font-size:12px;color:#94a3b8;display:block;margin-bottom:4px}\
#wt-modal .wt-success-num span{font-size:28px;font-weight:800;font-family:monospace;color:#263c84}\
#wt-modal .wt-dim{opacity:0.5;pointer-events:none}\
@keyframes wt-spin{to{transform:rotate(360deg)}}\
#wt-modal .wt-spinner{animation:wt-spin 1s linear infinite}\
@media(max-width:480px){#wt-modal{width:100%;height:100%;max-height:100vh;max-width:100vw;border-radius:0;top:0;left:0;transform:translateY(100%)}#wt-modal.open{transform:translateY(0)}#wt-modal .wt-pris{grid-template-columns:repeat(2,1fr)}}\
  ';
  document.head.appendChild(style);

  // === FAB Position ===
  var isRight = config.position.indexOf('right') !== -1;
  var isTop = config.position.indexOf('top') !== -1;
  var fabPos = (isRight ? 'right:20px;' : 'left:20px;') + (isTop ? 'top:20px;' : 'bottom:20px;');

  // === Create Overlay ===
  var overlay = document.createElement('div');
  overlay.id = 'wt-overlay';
  document.body.appendChild(overlay);

  // === Create Modal ===
  var modal = document.createElement('div');
  modal.id = 'wt-modal';
  modal.setAttribute('dir', 'rtl');
  document.body.appendChild(modal);

  // === Render Functions ===
  function renderModal() {
    if (state.loading) {
      modal.innerHTML = '\
<div class="wt-header">\
  <div class="wt-header-content">\
    <div class="wt-header-icon">' + icons.headphones + '</div>\
    <div class="wt-header-text"><h2>الدعم الفني</h2><p>جاري التحميل...</p></div>\
  </div>\
  <button class="wt-close" onclick="WebyanTicket.close()">' + icons.close + '</button>\
</div>\
<div style="display:flex;align-items:center;justify-content:center;padding:60px 0">\
  <div class="wt-spinner" style="width:32px;height:32px;color:#263c84">' + icons.loader + '</div>\
</div>';
      return;
    }

    if (state.error) {
      modal.innerHTML = '\
<div class="wt-header">\
  <div class="wt-header-content">\
    <div class="wt-header-icon">' + icons.headphones + '</div>\
    <div class="wt-header-text"><h2>الدعم الفني</h2></div>\
  </div>\
  <button class="wt-close" onclick="WebyanTicket.close()">' + icons.close + '</button>\
</div>\
<div style="text-align:center;padding:40px 24px">\
  <div style="width:60px;height:60px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">\
    <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width:30px;height:30px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>\
  </div>\
  <h3 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px">رمز غير صالح</h3>\
  <p style="font-size:14px;color:#64748b">' + state.error + '</p>\
</div>';
      return;
    }

    if (state.submitted) {
      modal.innerHTML = '\
<div class="wt-header">\
  <div class="wt-header-content">\
    <div class="wt-header-icon">' + icons.headphones + '</div>\
    <div class="wt-header-text"><h2>الدعم الفني</h2><p>' + (state.organization ? state.organization.name : '') + '</p></div>\
  </div>\
  <button class="wt-close" onclick="WebyanTicket.close()">' + icons.close + '</button>\
</div>\
<div class="wt-success">\
  <div class="wt-success-icon">' + icons.check + '</div>\
  <h3>تم إرسال التذكرة بنجاح! 🎉</h3>\
  <p>سيتم التواصل معك في أقرب وقت ممكن</p>\
  <div class="wt-success-num">\
    <small>رقم التذكرة</small>\
    <span>' + state.ticketNumber + '</span>\
  </div>\
  <button class="wt-btn wt-btn-outline" onclick="WebyanTicket._reset()">' + icons.message + ' إرسال تذكرة أخرى</button>\
</div>';
      return;
    }

    // Build form
    var html = '';

    // Header
    html += '<div class="wt-header">';
    html += '<div class="wt-header-content">';
    html += '<div class="wt-header-icon">' + icons.headphones + '</div>';
    html += '<div class="wt-header-text"><h2>الدعم الفني</h2><p>' + (state.organization ? state.organization.name : '') + '</p></div>';
    html += '</div>';
    html += '<button class="wt-close" onclick="WebyanTicket.close()">' + icons.close + '</button>';
    html += '</div>';

    // Progress
    html += '<div class="wt-progress">';
    for (var i = 1; i <= 3; i++) {
      html += '<div class="wt-progress-bar' + (i <= state.step ? ' active' : '') + '"></div>';
    }
    html += '</div>';

    // Contact banner
    if (state.form.contactName) {
      html += '<div class="wt-contact">';
      html += '<div class="wt-contact-avatar">' + state.form.contactName.charAt(0) + '</div>';
      html += '<div class="wt-contact-info"><strong>' + state.form.contactName + '</strong><br>' + state.form.contactEmail + '</div>';
      html += '</div>';
    }

    html += '<div class="wt-body">';

    // Step 1: Category & Priority
    html += '<div class="wt-section">';
    html += '<div class="wt-section-title"><div class="wt-section-num">1</div>تصنيف المشكلة</div>';
    
    html += '<div class="wt-label">نوع المشكلة</div>';
    html += '<div class="wt-cats">';
    categories.forEach(function(cat) {
      var isActive = state.form.category === cat.value;
      var bg = isActive ? cat.activeBg : cat.bg;
      var border = isActive ? cat.activeBorder : cat.border;
      var ring = isActive ? ';box-shadow:0 0 0 3px ' + cat.activeRing : '';
      html += '<button class="wt-cat-btn" style="background:' + bg + ';border-color:' + border + ';color:' + cat.text + ring + '" onclick="WebyanTicket._setCat(\'' + cat.value + '\')">';
      html += '<span style="width:24px;height:24px;display:block">' + icons[cat.icon] + '</span>';
      html += cat.label + '</button>';
    });
    html += '</div>';

    html += '<div style="height:14px"></div>';
    html += '<div class="wt-label">مستوى الأولوية</div>';
    html += '<div class="wt-pris">';
    priorities.forEach(function(p) {
      var isActive = state.form.priority === p.value;
      var bg = isActive ? p.activeBg : p.bg;
      var border = isActive ? p.activeBorder : p.border;
      var ring = isActive ? ';box-shadow:0 0 0 3px ' + p.activeRing : '';
      html += '<button class="wt-pri-btn" style="background:' + bg + ';border-color:' + border + ';color:' + p.text + ring + '" onclick="WebyanTicket._setPri(\'' + p.value + '\')">';
      html += '<span style="width:22px;height:22px;display:block">' + icons[p.icon] + '</span>';
      html += '<span class="wt-pri-label">' + p.label + '</span>';
      html += '<span class="wt-pri-desc">' + p.desc + '</span>';
      html += '</button>';
    });
    html += '</div>';
    html += '</div>';

    // Step 2: Details
    html += '<div class="wt-section' + (state.step < 2 ? ' wt-dim' : '') + '">';
    html += '<div class="wt-section-title"><div class="wt-section-num">2</div>تفاصيل المشكلة</div>';
    html += '<div class="wt-label">' + icons.message + ' عنوان المشكلة <span style="color:#ef4444">*</span></div>';
    html += '<input class="wt-input" placeholder="اكتب عنواناً مختصراً يصف المشكلة" value="' + escapeAttr(state.form.subject) + '" oninput="WebyanTicket._setField(\'subject\',this.value)" onfocus="WebyanTicket._goStep(2)" />';
    html += '<div style="height:12px"></div>';
    html += '<div class="wt-label">وصف المشكلة بالتفصيل <span style="color:#ef4444">*</span></div>';
    html += '<textarea class="wt-input wt-textarea" placeholder="اشرح المشكلة بالتفصيل...\n• ما الذي كنت تحاول فعله؟\n• ما الذي حدث؟\n• ما الرسالة أو الخطأ الذي ظهر؟" oninput="WebyanTicket._setField(\'description\',this.value)" onfocus="WebyanTicket._goStep(2)">' + escapeHtml(state.form.description) + '</textarea>';
    html += '</div>';

    // Step 3: Additional
    html += '<div class="wt-section' + (state.step < 3 ? ' wt-dim' : '') + '">';
    html += '<div class="wt-section-title"><div class="wt-section-num">3</div>معلومات إضافية (اختياري)</div>';
    html += '<div class="wt-label">' + icons.link + ' رابط الصفحة</div>';
    html += '<input class="wt-input" type="url" dir="ltr" placeholder="https://example.com/page" value="' + escapeAttr(state.form.websiteUrl) + '" oninput="WebyanTicket._setField(\'websiteUrl\',this.value)" onfocus="WebyanTicket._goStep(3)" />';
    html += '</div>';

    // Security note
    html += '<div class="wt-security">' + icons.lock + ' بياناتك آمنة ومحمية</div>';

    html += '</div>'; // end wt-body

    // Footer
    html += '<div class="wt-footer">';
    html += '<div class="wt-footer-info">سيتم إرسال التذكرة لفريق الدعم الفني</div>';
    var disabled = !state.form.subject.trim() || !state.form.description.trim() || state.submitting;
    html += '<button class="wt-btn wt-btn-primary"' + (disabled ? ' disabled' : '') + ' onclick="WebyanTicket._submit()">';
    if (state.submitting) {
      html += '<span class="wt-spinner" style="width:16px;height:16px;display:inline-block">' + icons.loader + '</span> جاري الإرسال...';
    } else {
      html += icons.send + ' إرسال التذكرة';
    }
    html += '</button>';
    html += '</div>';

    modal.innerHTML = html;
  }

  function escapeHtml(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeAttr(s) { return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

  // === Toggle ===
  function openWidget() {
    if (state.isOpen) return;
    state.isOpen = true;
    modal.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (fab) fab.style.display = 'none';
    if (state.loading && !state.error && !state.organization) {
      verifyToken();
    }
    renderModal();
  }

  function closeWidget() {
    if (!state.isOpen) return;
    state.isOpen = false;
    modal.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (fab) fab.style.display = 'flex';
  }

  // === API Calls ===
  function verifyToken() {
    state.loading = true;
    state.error = null;
    renderModal();

    var body = config.apiKey.startsWith('wbyn_') 
      ? JSON.stringify({ apiKey: config.apiKey })
      : JSON.stringify({ token: config.apiKey });

    fetch(config.functionsUrl + '/verify-embed-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.anonKey,
        'apikey': config.anonKey
      },
      body: body
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.valid) {
        state.error = data.error || 'رمز التضمين غير صالح';
        state.loading = false;
        renderModal();
        return;
      }
      state.organization = data.organization;
      state.form.contactName = data.contactName || '';
      state.form.contactEmail = data.contactEmail || data.organization?.contact_email || '';
      state.loading = false;
      renderModal();
    })
    .catch(function(err) {
      console.error('[Webyan] Verify error:', err);
      state.error = 'حدث خطأ في التحقق من الرمز';
      state.loading = false;
      renderModal();
    });
  }

  function submitTicket() {
    if (state.submitting) return;
    state.submitting = true;
    renderModal();

    var submitBody = {
      subject: state.form.subject,
      description: state.form.description,
      category: state.form.category,
      priority: state.form.priority,
      contactName: state.form.contactName,
      contactEmail: state.form.contactEmail,
      websiteUrl: state.form.websiteUrl
    };

    if (config.apiKey.startsWith('wbyn_')) {
      submitBody.apiKey = config.apiKey;
    } else {
      submitBody.token = config.apiKey;
    }

    fetch(config.functionsUrl + '/create-embed-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.anonKey,
        'apikey': config.anonKey
      },
      body: JSON.stringify(submitBody)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.submitting = false;
      if (data.success) {
        state.submitted = true;
        state.ticketNumber = data.ticketNumber;
      } else {
        alert(data.error || 'حدث خطأ أثناء إرسال التذكرة');
      }
      renderModal();
    })
    .catch(function(err) {
      console.error('[Webyan] Submit error:', err);
      state.submitting = false;
      alert('حدث خطأ في الاتصال');
      renderModal();
    });
  }

  function resetForm() {
    state.submitted = false;
    state.ticketNumber = '';
    state.step = 1;
    state.form.subject = '';
    state.form.description = '';
    state.form.category = 'technical';
    state.form.priority = 'medium';
    state.form.websiteUrl = '';
    renderModal();
  }

  // === FAB ===
  var fab = null;
  if (config.trigger) {
    var triggers = document.querySelectorAll(config.trigger);
    if (triggers.length > 0) {
      triggers.forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          openWidget();
        });
      });
    } else {
      console.warn('[Webyan] Trigger element not found: ' + config.trigger);
    }
  } else {
    fab = document.createElement('button');
    fab.id = 'webyan-ticket-fab';
    fab.setAttribute('aria-label', config.text);
    fab.style.cssText = 'background:linear-gradient(135deg,' + config.color + ' 0%,#24c2ec 100%);' + fabPos;
    fab.innerHTML = icons.ticket;
    fab.addEventListener('click', openWidget);
    document.body.appendChild(fab);
  }

  // === Event Listeners ===
  overlay.addEventListener('click', closeWidget);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && state.isOpen) closeWidget();
  });

  // === Public API ===
  window.WebyanTicket = {
    open: openWidget,
    close: closeWidget,
    toggle: function() { state.isOpen ? closeWidget() : openWidget(); },
    _setCat: function(v) { state.form.category = v; if (state.step < 1) state.step = 1; renderModal(); },
    _setPri: function(v) { state.form.priority = v; if (state.step < 2) state.step = 2; renderModal(); },
    _setField: function(k, v) { state.form[k] = v; },
    _goStep: function(s) { if (state.step < s) { state.step = s; renderModal(); } },
    _submit: submitTicket,
    _reset: resetForm
  };
})();
