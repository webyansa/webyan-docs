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
  textDark: '#0f172a',
};

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
  gradient1: string;
  gradient2: string;
  icon: string;
}

const getHeaderConfig = (type: EmailType): HeaderConfig => {
  const configs: Record<EmailType, HeaderConfig> = {
    welcome: {
      gradient1: '#10b981',
      gradient2: '#059669',
      icon: '🎉',
    },
    password_reset: {
      gradient1: BRAND_COLORS.warning,
      gradient2: BRAND_COLORS.warningDark,
      icon: '🔐',
    },
    ticket_created: {
      gradient1: BRAND_COLORS.primary,
      gradient2: BRAND_COLORS.primaryLight,
      icon: '🎫',
    },
    ticket_reply: {
      gradient1: BRAND_COLORS.info,
      gradient2: BRAND_COLORS.infoDark,
      icon: '💬',
    },
    ticket_resolved: {
      gradient1: BRAND_COLORS.success,
      gradient2: BRAND_COLORS.successDark,
      icon: '✅',
    },
    ticket_closed: {
      gradient1: BRAND_COLORS.neutral,
      gradient2: BRAND_COLORS.neutralDark,
      icon: '📁',
    },
    meeting_confirmed: {
      gradient1: BRAND_COLORS.success,
      gradient2: BRAND_COLORS.successDark,
      icon: '📅',
    },
    meeting_cancelled: {
      gradient1: BRAND_COLORS.danger,
      gradient2: BRAND_COLORS.dangerDark,
      icon: '❌',
    },
    meeting_completed: {
      gradient1: BRAND_COLORS.primary,
      gradient2: BRAND_COLORS.secondary,
      icon: '✨',
    },
    alert: {
      gradient1: BRAND_COLORS.danger,
      gradient2: BRAND_COLORS.dangerDark,
      icon: '🚨',
    },
    info: {
      gradient1: BRAND_COLORS.secondary,
      gradient2: '#0284c7',
      icon: 'ℹ️',
    },
    subscription: {
      gradient1: BRAND_COLORS.success,
      gradient2: BRAND_COLORS.successDark,
      icon: '👑',
    },
  };
  return configs[type];
};

const createHeader = (type: EmailType, title: string, subtitle?: string): string => {
  const config = getHeaderConfig(type);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${config.gradient1}, ${config.gradient2});">
      <tr>
        <td align="center" style="padding: 50px 30px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 80px; text-align: center; font-size: 40px;">
                  ${config.icon}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${title}</h1>
              </td>
            </tr>
            ${subtitle ? `
            <tr>
              <td align="center" style="padding-top: 12px;">
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${subtitle}</p>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
  `;
};

const createFooter = (): string => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${BRAND_COLORS.primaryDark}, ${BRAND_COLORS.primary});">
    <tr>
      <td align="center" style="padding: 35px 30px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom: 15px;">
              <table cellpadding="0" cellspacing="0" border="0" style="background: rgba(255,255,255,0.15); border-radius: 10px;">
                <tr>
                  <td style="padding: 10px 25px;">
                    <span style="color: #ffffff; font-size: 22px; font-weight: bold; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">ويبيان</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin: 0 0 5px; font-size: 14px; color: rgba(255,255,255,0.9); font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">فريق دعم ويبيان</p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8); font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">support@webyan.net</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.6); font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                © ${new Date().getFullYear()} ويبيان - جميع الحقوق محفوظة
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

const createEmailWrapper = (content: string): string => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ويبيان</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td align="center" style="padding: 30px 15px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: ${BRAND_COLORS.surface}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// =============================================================================
// قوالب البريد المختلفة
// =============================================================================

// 1. قالب الترحيب
export const welcomeTemplate = (data: { name: string; loginUrl: string }) => ({
  subject: '🎉 مرحباً بك في ويبيان!',
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('welcome', 'مرحباً بك في ويبيان!', 'نحن سعداء بانضمامك إلينا')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                أهلاً <strong style="color: ${BRAND_COLORS.primary};">${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                يسعدنا انضمامك إلى منصة ويبيان للدعم الفني! نحن هنا لمساعدتك وتقديم أفضل تجربة دعم ممكنة.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; border-right: 5px solid ${BRAND_COLORS.success};">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: ${BRAND_COLORS.successDark}; margin: 0 0 15px; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">🌟 ما يمكنك فعله الآن:</h3>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="padding: 8px 0; color: #065f46; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• استعراض أدلة المستخدم الشاملة</td></tr>
                      <tr><td style="padding: 8px 0; color: #065f46; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• فتح تذاكر الدعم الفني ومتابعتها</td></tr>
                      <tr><td style="padding: 8px 0; color: #065f46; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• حجز اجتماعات مع فريق الدعم</td></tr>
                      <tr><td style="padding: 8px 0; color: #065f46; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• التواصل المباشر عبر المحادثات الفورية</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0;">
              <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                🚀 ابدأ رحلتك الآن
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_COLORS.background}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;" align="center">
                    <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; margin: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                      إذا كان لديك أي استفسار، لا تتردد في التواصل معنا. نحن هنا لمساعدتك!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
});

// 2. قالب استعادة كلمة المرور
export const passwordResetTemplate = (data: { name: string; resetUrl: string; expiryTime: string }) => ({
  subject: '🔐 طلب إعادة تعيين كلمة المرور',
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('password_reset', 'إعادة تعيين كلمة المرور', 'طلب تغيير كلمة المرور الخاصة بك')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; border-right: 5px solid ${BRAND_COLORS.warning};">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <span style="font-size: 24px;">⏰</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #92400e; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                            ينتهي صلاحية هذا الرابط خلال <strong>${data.expiryTime}</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0;">
              <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.warning}, ${BRAND_COLORS.warningDark}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                🔑 إعادة تعيين كلمة المرور
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fef2f2; border-radius: 12px; border-right: 5px solid ${BRAND_COLORS.danger};">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                      <strong>⚠️ تنبيه أمني:</strong> لا تشارك هذا الرابط مع أي شخص. فريق ويبيان لن يطلب منك كلمة المرور أبداً.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('ticket_created', 'تم استلام تذكرتك بنجاح!', 'سيقوم فريقنا بمراجعتها قريباً')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                شكراً لتواصلك معنا! تم استلام تذكرة الدعم الفني وسيتم مراجعتها من قبل فريقنا المختص.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 16px; border-right: 5px solid ${BRAND_COLORS.primary};">
                <tr>
                  <td align="center" style="padding: 30px;">
                    <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; margin: 0 0 8px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">رقم التذكرة</p>
                    <p style="color: ${BRAND_COLORS.primary}; font-size: 32px; font-weight: 800; margin: 0; font-family: 'Courier New', monospace;">${data.ticketNumber}</p>
                    <p style="color: ${BRAND_COLORS.textDark}; font-size: 15px; margin: 18px 0 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                      <strong>الموضوع:</strong> ${data.subject}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 25px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: top; padding-left: 15px;">
                          <span style="font-size: 32px;">⏰</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0 0 5px; color: #92400e; font-weight: 700; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">الوقت المتوقع للرد</p>
                          <p style="margin: 0; color: #78350f; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">سيتم الرد خلال <strong>${data.responseTime} ساعة عمل</strong> بحد أقصى</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0;">
              <a href="${data.trackUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(30, 64, 175, 0.4);">
                📋 متابعة التذكرة
              </a>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_COLORS.background}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <h4 style="color: ${BRAND_COLORS.textDark}; margin: 0 0 12px; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">💡 نصائح مفيدة:</h4>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="padding: 6px 0; color: ${BRAND_COLORS.text}; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• احتفظ برقم التذكرة لمتابعة حالة طلبك</td></tr>
                      <tr><td style="padding: 6px 0; color: ${BRAND_COLORS.text}; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• ستصلك رسالة عند أي تحديث على التذكرة</td></tr>
                      <tr><td style="padding: 6px 0; color: ${BRAND_COLORS.text}; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">• يمكنك إضافة معلومات إضافية من خلال الرد على التذكرة</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('ticket_reply', 'رد جديد على تذكرتك', 'فريق الدعم قام بالرد على استفسارك')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border-radius: 12px; border-right: 5px solid ${BRAND_COLORS.info};">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <span style="color: ${BRAND_COLORS.info}; font-weight: 700; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">رقم التذكرة: ${data.ticketNumber}</span>
                        </td>
                        <td align="left">
                          <span style="background: #ddd6fe; color: #5b21b6; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">قيد المعالجة</span>
                        </td>
                      </tr>
                    </table>
                    <p style="color: ${BRAND_COLORS.textDark}; margin: 12px 0 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>الموضوع:</strong> ${data.subject}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 25px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_COLORS.background}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <div style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, ${BRAND_COLORS.info}, ${BRAND_COLORS.infoDark}); line-height: 45px; text-align: center; color: white; font-size: 18px;">👨‍💼</div>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; font-weight: 700; color: ${BRAND_COLORS.textDark}; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.replierName}</p>
                          <p style="margin: 3px 0 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">فريق الدعم الفني</p>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 10px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 18px;">
                          <p style="margin: 0; color: ${BRAND_COLORS.textDark}; line-height: 1.8; white-space: pre-wrap; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.replyMessage}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.info}, ${BRAND_COLORS.infoDark}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                💬 عرض المحادثة والرد
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('ticket_resolved', 'تم حل تذكرتك بنجاح! 🎉', 'نأمل أن نكون قد ساعدناك')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                يسعدنا إبلاغك بأنه تم حل تذكرتك وإغلاقها. نشكرك على تواصلك معنا ونتمنى أن تكون المشكلة قد تم حلها بشكل مرضٍ.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; border-right: 5px solid ${BRAND_COLORS.success};">
                <tr>
                  <td style="padding: 25px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 15px;">
                          <div style="width: 50px; height: 50px; background: ${BRAND_COLORS.success}; border-radius: 50%; line-height: 50px; text-align: center;">
                            <span style="color: white; font-size: 24px;">✓</span>
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #065f46; font-weight: 700; font-size: 18px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">تم الحل بنجاح</p>
                          <p style="margin: 5px 0 0; color: #047857; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">رقم التذكرة: ${data.ticketNumber}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #065f46; margin: 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>الموضوع:</strong> ${data.subject}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.closureMessage ? `
          <tr>
            <td style="padding-top: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${BRAND_COLORS.background}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: ${BRAND_COLORS.textMuted}; font-size: 14px; margin: 0 0 10px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>رسالة الإغلاق:</strong></p>
                    <p style="color: ${BRAND_COLORS.textDark}; margin: 0; line-height: 1.8; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.closureMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding-top: 25px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #92400e; font-weight: 700; font-size: 16px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">⭐ نقدر رأيك!</p>
                    <p style="margin: 0; color: #78350f; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">شاركنا تجربتك لنستمر في تحسين خدماتنا</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                📋 عرض تفاصيل التذكرة
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('meeting_confirmed', 'تم تأكيد موعد اجتماعك! ✅', 'نتطلع للقائك')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                تم تأكيد موعد اجتماعك مع فريق ويبيان. يرجى التحضير والحضور في الموعد المحدد.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px; border-right: 5px solid ${BRAND_COLORS.success};">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; color: #065f46; width: 100px; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>📋 الموضوع:</strong></td>
                        <td style="padding: 10px 0; color: #065f46; font-size: 17px; font-weight: 700; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.meetingSubject}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>📅 التاريخ:</strong></td>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.meetingDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>⏰ الوقت:</strong></td>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.meetingTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>👤 مع:</strong></td>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.staffName}</td>
                      </tr>
                      ${data.meetingLink ? `
                      <tr>
                        <td style="padding: 10px 0; color: #065f46; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>🔗 الرابط:</strong></td>
                        <td style="padding: 10px 0;"><a href="${data.meetingLink}" style="color: ${BRAND_COLORS.success}; text-decoration: underline; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.meetingLink}</a></td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fef3c7; border-radius: 12px;">
                <tr>
                  <td style="padding: 18px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                      <strong>💡 تذكير:</strong> يُرجى الحضور قبل الموعد بـ 5 دقائق على الأقل للتأكد من جاهزية الاتصال.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.success}, ${BRAND_COLORS.successDark}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                📅 عرض تفاصيل الاجتماع
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
});

// 7. قالب إلغاء الاجتماع
export const meetingCancelledTemplate = (data: { 
  name: string; 
  meetingSubject: string;
  reason?: string;
  newMeetingUrl: string;
}) => ({
  subject: `❌ تم إلغاء الاجتماع: ${data.meetingSubject}`,
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('meeting_cancelled', 'تم إلغاء الاجتماع', 'نأسف لهذا الإزعاج')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                نأسف لإبلاغك بأنه تم إلغاء الاجتماع المجدول. نعتذر عن أي إزعاج قد يسببه هذا الأمر.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fef2f2, #fecaca); border-radius: 16px; border-right: 5px solid ${BRAND_COLORS.danger};">
                <tr>
                  <td style="padding: 25px;">
                    <p style="color: #991b1b; margin: 0 0 10px; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>الموضوع:</strong> ${data.meetingSubject}</p>
                    ${data.reason ? `<p style="color: #991b1b; margin: 10px 0 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;"><strong>السبب:</strong> ${data.reason}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px;">
              <p style="color: ${BRAND_COLORS.text}; font-size: 15px; margin: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                يمكنك طلب موعد جديد في أي وقت يناسبك من خلال الرابط أدناه.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.newMeetingUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(30, 64, 175, 0.4);">
                📅 طلب موعد جديد
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('alert', data.title, 'يرجى الاطلاع على هذا التنبيه المهم')}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fef2f2, #fecaca); border-radius: 16px; border-right: 5px solid ${BRAND_COLORS.danger};">
                <tr>
                  <td style="padding: 25px;">
                    <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.8; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.actionUrl ? `
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.danger}, ${BRAND_COLORS.dangerDark}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
                ${data.actionText || 'اتخذ إجراء الآن'}
              </a>
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader('info', data.title)}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <div style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.9; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                ${data.content}
              </div>
            </td>
          </tr>
          ${data.actionUrl ? `
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND_COLORS.secondary}, #0284c7); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
                ${data.actionText || 'المزيد'}
              </a>
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
  html: createEmailWrapper(`
    <tr>
      <td>
        ${createHeader(
          data.status === 'approved' ? 'subscription' : 'info',
          data.status === 'approved' ? 'تم تفعيل اشتراكك! 🎉' : 'تحديث على طلب الاشتراك',
          data.status === 'approved' ? 'شكراً لثقتك بنا' : undefined
        )}
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 35px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="font-size: 18px; color: ${BRAND_COLORS.textDark}; margin: 0 0 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          ${data.status === 'approved' ? `
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                يسعدنا إبلاغك بأنه تم الموافقة على طلب اشتراكك وتفعيل الخدمة!
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 16px;">
                <tr>
                  <td align="center" style="padding: 30px;">
                    <p style="color: #065f46; font-size: 14px; margin: 0 0 10px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">الباقة المفعلة</p>
                    <p style="color: ${BRAND_COLORS.success}; font-size: 28px; font-weight: 800; margin: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.planName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : `
          <tr>
            <td>
              <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.8; margin: 0 0 25px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
                نأسف لإبلاغك بأنه لم نتمكن من الموافقة على طلب اشتراكك في الوقت الحالي.
              </p>
            </td>
          </tr>
          `}
          ${data.adminMessage ? `
          <tr>
            <td style="padding-top: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${data.status === 'approved' ? BRAND_COLORS.background : '#fef3c7'}; border-radius: 12px; border-right: 5px solid ${data.status === 'approved' ? BRAND_COLORS.primary : BRAND_COLORS.warning};">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: ${data.status === 'approved' ? BRAND_COLORS.textDark : '#92400e'}; margin: 0; line-height: 1.8; font-size: 15px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">${data.adminMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td align="center" style="padding: 35px 0 0;">
              <a href="${data.viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${data.status === 'approved' ? BRAND_COLORS.success : BRAND_COLORS.primary}, ${data.status === 'approved' ? BRAND_COLORS.successDark : BRAND_COLORS.primaryLight}); color: #ffffff; padding: 16px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
                📋 عرض تفاصيل الاشتراك
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        ${createFooter()}
      </td>
    </tr>
  `),
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
