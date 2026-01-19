// نظام قوالب البريد الإلكتروني المتعددة لويبيان
// Professional Multi-Template Email System for Webyan

// ألوان هوية ويبيان
const BRAND_COLORS = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  primaryLight: '#3b82f6',
  secondary: '#0ea5e9',
  success: '#10b981',
  successDark: '#059669',
  warning: '#f59e0b',
  warningDark: '#d97706',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  info: '#6366f1',
  infoDark: '#4f46e5',
  neutral: '#64748b',
  neutralDark: '#475569',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textMuted: '#64748b',
};

// شعار ويبيان SVG
const WEBYAN_LOGO = `
  <svg width="140" height="45" viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="140" height="45" rx="10" fill="#1e40af"/>
    <text x="70" y="30" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">ويبيان</text>
  </svg>
`;

// الأنماط الأساسية المشتركة
const getBaseStyles = () => `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl;
    background-color: ${BRAND_COLORS.background};
    line-height: 1.6;
    color: ${BRAND_COLORS.text};
  }
  
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background: ${BRAND_COLORS.surface};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  }
  
  .content {
    padding: 32px;
  }
  
  .button {
    display: inline-block;
    padding: 14px 36px;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 700;
    font-size: 16px;
    text-align: center;
    transition: all 0.3s ease;
  }
  
  .button-primary {
    background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight});
    color: white !important;
  }
  
  .info-box {
    background: ${BRAND_COLORS.background};
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    border-right: 4px solid ${BRAND_COLORS.primary};
  }
  
  .footer {
    background: linear-gradient(135deg, ${BRAND_COLORS.primaryDark}, ${BRAND_COLORS.primary});
    padding: 30px;
    text-align: center;
    color: white;
  }
  
  .footer p {
    margin: 5px 0;
    opacity: 0.9;
  }
  
  .footer .copyright {
    opacity: 0.7;
    font-size: 12px;
    margin-top: 15px;
  }
`;

// قالب الترويسة حسب نوع الرسالة
type EmailType = 
  | 'welcome' 
  | 'password_reset' 
  | 'ticket_created' 
  | 'ticket_reply' 
  | 'ticket_resolved' 
  | 'ticket_closed'
  | 'meeting_confirmed'
  | 'meeting_cancelled'
  | 'meeting_completed'
  | 'alert'
  | 'info'
  | 'subscription';

interface HeaderConfig {
  gradient: string;
  icon: string;
  iconBg: string;
}

const getHeaderConfig = (type: EmailType): HeaderConfig => {
  const configs: Record<EmailType, HeaderConfig> = {
    welcome: {
      gradient: `linear-gradient(135deg, #10b981, #059669)`,
      icon: '🎉',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    password_reset: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.warning}, ${BRAND_COLORS.warningDark})`,
      icon: '🔐',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    ticket_created: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight})`,
      icon: '🎫',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    ticket_reply: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.info}, ${BRAND_COLORS.infoDark})`,
      icon: '💬',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    ticket_resolved: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark})`,
      icon: '✅',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    ticket_closed: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.neutral}, ${BRAND_COLORS.neutralDark})`,
      icon: '📁',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    meeting_confirmed: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark})`,
      icon: '📅',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    meeting_cancelled: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.danger}, ${BRAND_COLORS.dangerDark})`,
      icon: '❌',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    meeting_completed: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
      icon: '✨',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    alert: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.danger}, ${BRAND_COLORS.dangerDark})`,
      icon: '🚨',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    info: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.secondary}, #0284c7)`,
      icon: 'ℹ️',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    subscription: {
      gradient: `linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark})`,
      icon: '👑',
      iconBg: 'rgba(255,255,255,0.2)',
    },
  };
  return configs[type];
};

const createHeader = (type: EmailType, title: string, subtitle?: string): string => {
  const config = getHeaderConfig(type);
  return `
    <div style="background: ${config.gradient}; padding: 45px 30px; text-align: center;">
      <div style="width: 80px; height: 80px; background: ${config.iconBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 40px;">
        ${config.icon}
      </div>
      <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800;">${title}</h1>
      ${subtitle ? `<p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">${subtitle}</p>` : ''}
    </div>
  `;
};

const createFooter = (): string => `
  <div class="footer" style="background: linear-gradient(135deg, ${BRAND_COLORS.primaryDark}, ${BRAND_COLORS.primary}); padding: 30px; text-align: center; color: white;">
    ${WEBYAN_LOGO}
    <p style="margin: 15px 0 5px; font-size: 14px; opacity: 0.9;">فريق دعم ويبيان</p>
    <p style="margin: 5px 0; font-size: 13px; opacity: 0.8;">support@webyan.net</p>
    <p style="margin: 20px 0 0; font-size: 12px; opacity: 0.6;">
      © ${new Date().getFullYear()} ويبيان - جميع الحقوق محفوظة
    </p>
  </div>
`;

// =============================================================================
// قوالب البريد المختلفة
// =============================================================================

// 1. قالب الترحيب
export const welcomeTemplate = (data: { name: string; loginUrl: string }) => ({
  subject: '🎉 مرحباً بك في ويبيان!',
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('welcome', 'مرحباً بك في ويبيان!', 'نحن سعداء بانضمامك إلينا')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            أهلاً <strong style="color: ${BRAND_COLORS.primary};">${data.name}</strong>،
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            يسعدنا انضمامك إلى منصة ويبيان للدعم الفني! نحن هنا لمساعدتك وتقديم أفضل تجربة دعم ممكنة.
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 25px; margin: 25px 0; border-right: 5px solid ${BRAND_COLORS.success};">
            <h3 style="color: ${BRAND_COLORS.successDark}; margin: 0 0 15px; font-size: 17px;">🌟 ما يمكنك فعله الآن:</h3>
            <ul style="margin: 0; padding-right: 20px; color: #065f46; line-height: 2;">
              <li>استعراض أدلة المستخدم الشاملة</li>
              <li>فتح تذاكر الدعم الفني ومتابعتها</li>
              <li>حجز اجتماعات مع فريق الدعم</li>
              <li>التواصل المباشر عبر المحادثات الفورية</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              🚀 ابدأ رحلتك الآن
            </a>
          </div>
          
          <div style="background: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px; margin-top: 25px;">
            <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; margin: 0; text-align: center;">
              إذا كان لديك أي استفسار، لا تتردد في التواصل معنا. نحن هنا لمساعدتك!
            </p>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 2. قالب استعادة كلمة المرور
export const passwordResetTemplate = (data: { name: string; resetUrl: string; expiryTime: string }) => ({
  subject: '🔐 طلب إعادة تعيين كلمة المرور',
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('password_reset', 'إعادة تعيين كلمة المرور', 'طلب تغيير كلمة المرور الخاصة بك')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.
          </p>
          
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; margin: 20px 0; border-right: 5px solid ${BRAND_COLORS.warning};">
            <p style="margin: 0; color: #92400e; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">⏰</span>
              <span>ينتهي صلاحية هذا الرابط خلال <strong>${data.expiryTime}</strong></span>
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.warning}, ${BRAND_COLORS.warningDark}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
              🔑 إعادة تعيين كلمة المرور
            </a>
          </div>
          
          <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin-top: 25px; border-right: 5px solid ${BRAND_COLORS.danger};">
            <p style="color: #991b1b; font-size: 14px; margin: 0;">
              <strong>⚠️ تنبيه أمني:</strong> لا تشارك هذا الرابط مع أي شخص. فريق ويبيان لن يطلب منك كلمة المرور أبداً.
            </p>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 3. قالب إنشاء تذكرة جديدة
export const ticketCreatedTemplate = (data: { 
  name: string; 
  ticketNumber: string; 
  subject: string; 
  responseTime: string;
  trackUrl: string;
}) => ({
  subject: `✅ تم استلام تذكرتك #${data.ticketNumber}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('ticket_created', 'تم استلام تذكرتك بنجاح!', 'سيقوم فريقنا بمراجعتها قريباً')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            شكراً لتواصلك معنا! تم استلام تذكرة الدعم الفني وسيتم مراجعتها من قبل فريقنا المختص.
          </p>
          
          <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 16px; padding: 25px; margin: 25px 0; border-right: 5px solid ${BRAND_COLORS.primary}; text-align: center;">
            <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; margin: 0 0 8px;">رقم التذكرة</p>
            <p style="color: ${BRAND_COLORS.primary}; font-size: 28px; font-weight: 800; margin: 0; font-family: monospace;">${data.ticketNumber}</p>
            <p style="color: ${BRAND_COLORS.text}; font-size: 15px; margin: 15px 0 0;">
              <strong>الموضوع:</strong> ${data.subject}
            </p>
          </div>
          
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; margin: 20px 0; display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 32px;">⏰</span>
            <div>
              <p style="margin: 0 0 5px; color: #92400e; font-weight: 700;">الوقت المتوقع للرد</p>
              <p style="margin: 0; color: #78350f;">سيتم الرد خلال <strong>${data.responseTime} ساعة عمل</strong> بحد أقصى</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.trackUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(30, 64, 175, 0.4);">
              📋 متابعة التذكرة
            </a>
          </div>
          
          <div style="background: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px;">
            <h4 style="color: ${BRAND_COLORS.text}; margin: 0 0 12px; font-size: 15px;">💡 نصائح مفيدة:</h4>
            <ul style="margin: 0; padding-right: 20px; color: ${BRAND_COLORS.textMuted}; font-size: 14px; line-height: 2;">
              <li>احتفظ برقم التذكرة لمتابعة حالة طلبك</li>
              <li>ستصلك رسالة عند أي تحديث على التذكرة</li>
              <li>يمكنك إضافة معلومات إضافية من خلال الرد على التذكرة</li>
            </ul>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 4. قالب رد على التذكرة
export const ticketReplyTemplate = (data: { 
  name: string; 
  ticketNumber: string; 
  subject: string; 
  replyMessage: string;
  replierName: string;
  viewUrl: string;
}) => ({
  subject: `💬 رد جديد على تذكرتك #${data.ticketNumber}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('ticket_reply', 'رد جديد على تذكرتك', 'فريق الدعم قام بالرد على استفسارك')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border-radius: 12px; padding: 20px; margin: 20px 0; border-right: 5px solid ${BRAND_COLORS.info};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="color: ${BRAND_COLORS.info}; font-weight: 700;">رقم التذكرة: ${data.ticketNumber}</span>
              <span style="background: #ddd6fe; color: #5b21b6; padding: 5px 12px; border-radius: 20px; font-size: 13px;">قيد المعالجة</span>
            </div>
            <p style="color: ${BRAND_COLORS.text}; margin: 0;"><strong>الموضوع:</strong> ${data.subject}</p>
          </div>
          
          <div style="background: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
              <div style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, ${BRAND_COLORS.info}, ${BRAND_COLORS.infoDark}); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">👨‍💼</div>
              <div>
                <p style="margin: 0; font-weight: 700; color: ${BRAND_COLORS.text};">${data.replierName}</p>
                <p style="margin: 3px 0 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px;">فريق الدعم الفني</p>
              </div>
            </div>
            <div style="background: white; border-radius: 10px; padding: 18px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: ${BRAND_COLORS.text}; line-height: 1.8; white-space: pre-wrap;">${data.replyMessage}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.info}, ${BRAND_COLORS.infoDark}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
              💬 عرض المحادثة والرد
            </a>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 5. قالب حل التذكرة
export const ticketResolvedTemplate = (data: { 
  name: string; 
  ticketNumber: string; 
  subject: string;
  closureMessage?: string;
  viewUrl: string;
}) => ({
  subject: `✅ تم حل تذكرتك #${data.ticketNumber}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('ticket_resolved', 'تم حل تذكرتك بنجاح! 🎉', 'نأمل أن نكون قد ساعدناك')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            يسعدنا إبلاغك بأنه تم حل تذكرتك وإغلاقها. نشكرك على تواصلك معنا ونتمنى أن تكون المشكلة قد تم حلها بشكل مرضٍ.
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 25px; margin: 25px 0; border-right: 5px solid ${BRAND_COLORS.success};">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
              <div style="width: 50px; height: 50px; background: ${BRAND_COLORS.success}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">✓</span>
              </div>
              <div>
                <p style="margin: 0; color: #065f46; font-weight: 700; font-size: 18px;">تم الحل بنجاح</p>
                <p style="margin: 5px 0 0; color: #047857; font-size: 14px;">رقم التذكرة: ${data.ticketNumber}</p>
              </div>
            </div>
            <p style="color: #065f46; margin: 0;"><strong>الموضوع:</strong> ${data.subject}</p>
          </div>
          
          ${data.closureMessage ? `
          <div style="background: ${BRAND_COLORS.background}; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; margin: 0 0 10px;"><strong>رسالة الإغلاق:</strong></p>
            <p style="color: ${BRAND_COLORS.text}; margin: 0; line-height: 1.8;">${data.closureMessage}</p>
          </div>
          ` : ''}
          
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 8px; color: #92400e; font-weight: 700; font-size: 16px;">⭐ نقدر رأيك!</p>
            <p style="margin: 0; color: #78350f; font-size: 14px;">شاركنا تجربتك لنستمر في تحسين خدماتنا</p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              📋 عرض تفاصيل التذكرة
            </a>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 6. قالب تأكيد الاجتماع
export const meetingConfirmedTemplate = (data: { 
  name: string; 
  meetingSubject: string; 
  meetingDate: string;
  meetingTime: string;
  meetingLink?: string;
  staffName: string;
  viewUrl: string;
}) => ({
  subject: `📅 تم تأكيد موعد اجتماعك: ${data.meetingSubject}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('meeting_confirmed', 'تم تأكيد موعد اجتماعك! ✅', 'نتطلع للقائك')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            تم تأكيد موعد اجتماعك مع فريق ويبيان. يرجى التحضير والحضور في الموعد المحدد.
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 25px; margin: 25px 0; border-right: 5px solid ${BRAND_COLORS.success};">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #065f46; width: 100px;"><strong>📋 الموضوع:</strong></td>
                <td style="padding: 10px 0; color: #065f46; font-size: 17px; font-weight: 700;">${data.meetingSubject}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #065f46;"><strong>📅 التاريخ:</strong></td>
                <td style="padding: 10px 0; color: #065f46;">${data.meetingDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #065f46;"><strong>⏰ الوقت:</strong></td>
                <td style="padding: 10px 0; color: #065f46;">${data.meetingTime}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #065f46;"><strong>👤 مع:</strong></td>
                <td style="padding: 10px 0; color: #065f46;">${data.staffName}</td>
              </tr>
              ${data.meetingLink ? `
              <tr>
                <td style="padding: 10px 0; color: #065f46;"><strong>🔗 الرابط:</strong></td>
                <td style="padding: 10px 0;"><a href="${data.meetingLink}" style="color: ${BRAND_COLORS.success}; text-decoration: underline;">${data.meetingLink}</a></td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #fef3c7; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>💡 تذكير:</strong> يُرجى الحضور قبل الموعد بـ 5 دقائق على الأقل للتأكد من جاهزية الاتصال.
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              📅 عرض تفاصيل الاجتماع
            </a>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 7. قالب إلغاء الاجتماع
export const meetingCancelledTemplate = (data: { 
  name: string; 
  meetingSubject: string;
  reason?: string;
  newMeetingUrl: string;
}) => ({
  subject: `❌ تم إلغاء الاجتماع: ${data.meetingSubject}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('meeting_cancelled', 'تم إلغاء الاجتماع', 'نأسف لهذا الإزعاج')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            نأسف لإبلاغك بأنه تم إلغاء الاجتماع المجدول. نعتذر عن أي إزعاج قد يسببه هذا الأمر.
          </p>
          
          <div style="background: linear-gradient(135deg, #fef2f2, #fecaca); border-radius: 16px; padding: 25px; margin: 25px 0; border-right: 5px solid ${BRAND_COLORS.danger};">
            <p style="color: #991b1b; margin: 0 0 10px;"><strong>الموضوع:</strong> ${data.meetingSubject}</p>
            ${data.reason ? `<p style="color: #991b1b; margin: 10px 0 0;"><strong>السبب:</strong> ${data.reason}</p>` : ''}
          </div>
          
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 15px; margin: 20px 0;">
            يمكنك طلب موعد جديد في أي وقت يناسبك من خلال الرابط أدناه.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.newMeetingUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(30, 64, 175, 0.4);">
              📅 طلب موعد جديد
            </a>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 8. قالب التنبيهات المهمة
export const alertTemplate = (data: { 
  name: string; 
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}) => ({
  subject: `🚨 ${data.title}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('alert', data.title, 'يرجى الاطلاع على هذا التنبيه المهم')}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <div style="background: linear-gradient(135deg, #fef2f2, #fecaca); border-radius: 16px; padding: 25px; margin: 25px 0; border-right: 5px solid ${BRAND_COLORS.danger};">
            <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.8;">${data.message}</p>
          </div>
          
          ${data.actionUrl ? `
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.danger}, ${BRAND_COLORS.dangerDark}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
              ${data.actionText || 'اتخذ إجراء الآن'}
            </a>
          </div>
          ` : ''}
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 9. قالب المعلومات العامة
export const infoTemplate = (data: { 
  name: string; 
  title: string;
  content: string;
  actionUrl?: string;
  actionText?: string;
}) => ({
  subject: `ℹ️ ${data.title}`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader('info', data.title)}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          <div style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.9;">
            ${data.content}
          </div>
          
          ${data.actionUrl ? `
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.secondary}, #0284c7); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
              ${data.actionText || 'المزيد'}
            </a>
          </div>
          ` : ''}
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// 10. قالب الاشتراك
export const subscriptionTemplate = (data: { 
  name: string; 
  planName: string;
  status: 'approved' | 'rejected';
  adminMessage?: string;
  viewUrl: string;
}) => ({
  subject: data.status === 'approved' 
    ? `🎉 تم الموافقة على اشتراكك في ${data.planName}` 
    : `📋 تحديث على طلب اشتراكك`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${getBaseStyles()}</style>
    </head>
    <body style="background: ${BRAND_COLORS.background}; padding: 20px;">
      <div class="email-wrapper" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        ${createHeader(
          data.status === 'approved' ? 'subscription' : 'info',
          data.status === 'approved' ? 'تم تفعيل اشتراكك! 🎉' : 'تحديث على طلب الاشتراك',
          data.status === 'approved' ? 'شكراً لثقتك بنا' : undefined
        )}
        
        <div style="padding: 32px;">
          <p style="font-size: 18px; color: ${BRAND_COLORS.text}; margin-bottom: 20px;">
            مرحباً <strong>${data.name}</strong>،
          </p>
          
          ${data.status === 'approved' ? `
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            يسعدنا إبلاغك بأنه تم الموافقة على طلب اشتراكك وتفعيل الخدمة!
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; padding: 30px; margin: 25px 0; text-align: center;">
            <p style="color: #065f46; font-size: 14px; margin: 0 0 10px;">الباقة المفعلة</p>
            <p style="color: ${BRAND_COLORS.success}; font-size: 28px; font-weight: 800; margin: 0;">${data.planName}</p>
          </div>
          ` : `
          <p style="color: ${BRAND_COLORS.textMuted}; font-size: 16px; line-height: 1.8; margin-bottom: 25px;">
            نأسف لإبلاغك بأنه لم نتمكن من الموافقة على طلب اشتراكك في الوقت الحالي.
          </p>
          `}
          
          ${data.adminMessage ? `
          <div style="background: ${data.status === 'approved' ? BRAND_COLORS.background : '#fef3c7'}; border-radius: 12px; padding: 20px; margin: 20px 0; border-right: 5px solid ${data.status === 'approved' ? BRAND_COLORS.primary : BRAND_COLORS.warning};">
            <p style="color: ${data.status === 'approved' ? BRAND_COLORS.text : '#92400e'}; margin: 0; line-height: 1.8;">${data.adminMessage}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${data.status === 'approved' ? BRAND_COLORS.success : BRAND_COLORS.primary}, ${data.status === 'approved' ? BRAND_COLORS.successDark : BRAND_COLORS.primaryLight}); color: white; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
              📋 عرض تفاصيل الاشتراك
            </a>
          </div>
        </div>
        
        ${createFooter()}
      </div>
    </body>
    </html>
  `,
});

// دالة مساعدة للحصول على القالب المناسب
export type EmailTemplateType = 
  | 'welcome'
  | 'password_reset'
  | 'ticket_created'
  | 'ticket_reply'
  | 'ticket_resolved'
  | 'meeting_confirmed'
  | 'meeting_cancelled'
  | 'alert'
  | 'info'
  | 'subscription';

export const getEmailTemplate = (type: EmailTemplateType, data: Record<string, unknown>) => {
  switch (type) {
    case 'welcome':
      return welcomeTemplate(data as Parameters<typeof welcomeTemplate>[0]);
    case 'password_reset':
      return passwordResetTemplate(data as Parameters<typeof passwordResetTemplate>[0]);
    case 'ticket_created':
      return ticketCreatedTemplate(data as Parameters<typeof ticketCreatedTemplate>[0]);
    case 'ticket_reply':
      return ticketReplyTemplate(data as Parameters<typeof ticketReplyTemplate>[0]);
    case 'ticket_resolved':
      return ticketResolvedTemplate(data as Parameters<typeof ticketResolvedTemplate>[0]);
    case 'meeting_confirmed':
      return meetingConfirmedTemplate(data as Parameters<typeof meetingConfirmedTemplate>[0]);
    case 'meeting_cancelled':
      return meetingCancelledTemplate(data as Parameters<typeof meetingCancelledTemplate>[0]);
    case 'alert':
      return alertTemplate(data as Parameters<typeof alertTemplate>[0]);
    case 'info':
      return infoTemplate(data as Parameters<typeof infoTemplate>[0]);
    case 'subscription':
      return subscriptionTemplate(data as Parameters<typeof subscriptionTemplate>[0]);
    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
};
