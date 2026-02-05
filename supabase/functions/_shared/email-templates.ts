// نظام قوالب البريد الإلكتروني لويبيان
// Professional Email Templates for Webyan

// ألوان الهوية - كل الألوان بالهكس الصريح
const COLORS = {
  // الألوان الأساسية
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  primaryDark: '#1e3a8a',
  
  // ألوان الحالات
  success: '#059669',
  successLight: '#10b981',
  successBg: '#ecfdf5',
  
  warning: '#d97706',
  warningLight: '#f59e0b',
  warningBg: '#fffbeb',
  
  danger: '#dc2626',
  dangerLight: '#ef4444',
  dangerBg: '#fef2f2',
  
  info: '#0284c7',
  infoLight: '#0ea5e9',
  infoBg: '#f0f9ff',
  
  // ألوان النصوص - مهمة جداً
  textBlack: '#000000',
  textDark: '#1f2937',
  textBody: '#374151',
  textMuted: '#6b7280',
  
  // ألوان الخلفيات
  bgWhite: '#ffffff',
  bgLight: '#f9fafb',
  bgGray: '#f3f4f6',
};

// قالب HTML الأساسي للبريد
const createEmailWrapper = (bodyContent: string): string => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="ar">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ويبيان</title>
</head>
<body bgcolor="${COLORS.bgLight}" style="margin:0;padding:0;background-color:${COLORS.bgLight};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgLight}">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgWhite}" style="max-width:600px;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          ${bodyContent}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// رأس الصفحة مع أيقونة وعنوان
const createHeader = (icon: string, title: string, subtitle: string, bgColor: string): string => `
<tr>
  <td align="center" bgcolor="${bgColor}" style="padding:40px 30px;background-color:${bgColor};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom:16px;">
          <span style="font-size:50px;display:block;">${icon}</span>
        </td>
      </tr>
      <tr>
        <td align="center">
          <h1 style="margin:0;padding:0;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">${title}</h1>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:10px;">
          <p style="margin:0;padding:0;font-size:15px;color:rgba(255,255,255,0.9);font-family:Arial,sans-serif;">${subtitle}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

// التذييل الموحد
const createFooter = (): string => `
<tr>
  <td align="center" bgcolor="${COLORS.primaryDark}" style="padding:30px;background-color:${COLORS.primaryDark};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom:12px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">ويبيان</span>
        </td>
      </tr>
      <tr>
        <td align="center">
          <p style="margin:0;padding:0;font-size:13px;color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;">فريق دعم ويبيان</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:4px;">
          <p style="margin:0;padding:0;font-size:12px;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;">support@webyan.sa</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:16px;">
          <p style="margin:0;padding:0;font-size:11px;color:rgba(255,255,255,0.5);font-family:Arial,sans-serif;">© ${new Date().getFullYear()} ويبيان - جميع الحقوق محفوظة</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

// زر رئيسي
const createButton = (text: string, url: string, bgColor: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td align="center" bgcolor="${bgColor}" style="background-color:${bgColor};border-radius:8px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">${text}</a>
    </td>
  </tr>
</table>
`;

// صندوق معلومات
const createInfoBox = (content: string, bgColor: string, borderColor: string, textColor: string): string => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td bgcolor="${bgColor}" style="background-color:${bgColor};padding:20px;border-radius:8px;border-right:4px solid ${borderColor};">
      <p style="margin:0;padding:0;font-size:15px;line-height:1.7;color:${textColor};font-family:Arial,sans-serif;">${content}</p>
    </td>
  </tr>
</table>
`;

// =============================================================================
// قوالب البريد الإلكتروني
// =============================================================================

// 1. قالب الترحيب
export const welcomeTemplate = (data: { name: string; loginUrl: string }) => ({
  subject: '🎉 مرحباً بك في ويبيان!',
  html: createEmailWrapper(`
    ${createHeader('🎉', 'مرحباً بك في ويبيان!', 'نحن سعداء بانضمامك إلينا', COLORS.success)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                أهلاً <strong style="color:${COLORS.primary};">${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                يسعدنا انضمامك إلى منصة ويبيان للدعم الفني! نحن هنا لمساعدتك وتقديم أفضل تجربة دعم ممكنة.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.successBg}" style="background-color:${COLORS.successBg};border-radius:10px;border-right:4px solid ${COLORS.success};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px 0;padding:0;font-size:15px;font-weight:700;color:${COLORS.success};font-family:Arial,sans-serif;">🌟 ما يمكنك فعله الآن:</p>
                    <p style="margin:0;padding:0;font-size:14px;line-height:2;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                      • استعراض أدلة المستخدم الشاملة<br/>
                      • فتح تذاكر الدعم الفني ومتابعتها<br/>
                      • حجز اجتماعات مع فريق الدعم<br/>
                      • التواصل المباشر عبر المحادثات الفورية
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0 25px;">
              ${createButton('🚀 ابدأ رحلتك الآن', data.loginUrl, COLORS.success)}
            </td>
          </tr>
          <tr>
            <td bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};padding:16px;border-radius:8px;">
              <p style="margin:0;padding:0;font-size:13px;color:${COLORS.textMuted};text-align:center;font-family:Arial,sans-serif;">
                إذا كان لديك أي استفسار، لا تتردد في التواصل معنا. نحن هنا لمساعدتك!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 2. قالب استعادة كلمة المرور
export const passwordResetTemplate = (data: { name: string; resetUrl: string; expiryTime: string }) => ({
  subject: '🔐 طلب إعادة تعيين كلمة المرور',
  html: createEmailWrapper(`
    ${createHeader('🔐', 'إعادة تعيين كلمة المرور', 'طلب تغيير كلمة المرور الخاصة بك', COLORS.warning)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              ${createInfoBox(`⏰ ينتهي صلاحية هذا الرابط خلال <strong>${data.expiryTime}</strong>`, COLORS.warningBg, COLORS.warning, COLORS.textBody)}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0 25px;">
              ${createButton('🔑 إعادة تعيين كلمة المرور', data.resetUrl, COLORS.warning)}
            </td>
          </tr>
          <tr>
            <td>
              ${createInfoBox('⚠️ <strong>تنبيه أمني:</strong> لا تشارك هذا الرابط مع أي شخص. فريق ويبيان لن يطلب منك كلمة المرور أبداً.', COLORS.dangerBg, COLORS.danger, COLORS.textBody)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
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
    ${createHeader('🎫', 'تم استلام تذكرتك بنجاح!', 'سيقوم فريقنا بمراجعتها قريباً', COLORS.primary)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                شكراً لتواصلك معنا! تم استلام تذكرة الدعم الفني وسيتم مراجعتها من قبل فريقنا المختص.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.primary};">
                <tr>
                  <td align="center" style="padding:25px;">
                    <p style="margin:0 0 6px 0;padding:0;font-size:13px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">رقم التذكرة</p>
                    <p style="margin:0 0 15px 0;padding:0;font-size:28px;font-weight:700;color:${COLORS.primary};font-family:monospace;">${data.ticketNumber}</p>
                    <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                      <strong>الموضوع:</strong> ${data.subject}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.successBg}" style="background-color:${COLORS.successBg};border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                      ⏱️ الوقت المتوقع للرد: <strong style="color:${COLORS.success};">${data.responseTime}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('📋 متابعة التذكرة', data.trackUrl, COLORS.primary)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 4. قالب الرد على التذكرة
export const ticketReplyTemplate = (data: { 
  name: string; 
  ticketNumber: string; 
  subject: string;
  replyText: string;
  trackUrl: string;
}) => ({
  subject: `💬 رد جديد على تذكرتك #${data.ticketNumber}`,
  html: createEmailWrapper(`
    ${createHeader('💬', 'رد جديد على تذكرتك', 'لديك رد جديد من فريق الدعم', COLORS.info)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                تم إضافة رد جديد على تذكرتك. يرجى الاطلاع على التفاصيل أدناه.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 4px 0;padding:0;font-size:13px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">التذكرة:</p>
                    <p style="margin:0;padding:0;font-size:15px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                      <strong style="color:${COLORS.primary};">#${data.ticketNumber}</strong> - ${data.subject}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.info};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:13px;font-weight:700;color:${COLORS.info};font-family:Arial,sans-serif;">📝 الرد:</p>
                    <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.replyText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('💬 الرد على التذكرة', data.trackUrl, COLORS.info)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 5. قالب حل التذكرة
export const ticketResolvedTemplate = (data: { 
  name: string; 
  ticketNumber: string; 
  subject: string;
  resolution?: string;
  feedbackUrl?: string;
}) => ({
  subject: `✅ تم حل تذكرتك #${data.ticketNumber}`,
  html: createEmailWrapper(`
    ${createHeader('✅', 'تم حل تذكرتك بنجاح!', 'نأمل أن نكون قد ساعدناك', COLORS.success)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                يسعدنا إبلاغك بأنه تم حل تذكرتك بنجاح! نأمل أن يكون فريقنا قد ساعدك في حل مشكلتك.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.successBg}" style="background-color:${COLORS.successBg};border-radius:10px;border-right:4px solid ${COLORS.success};">
                <tr>
                  <td align="center" style="padding:25px;">
                    <p style="margin:0 0 6px 0;padding:0;font-size:13px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">التذكرة المغلقة</p>
                    <p style="margin:0 0 10px 0;padding:0;font-size:24px;font-weight:700;color:${COLORS.success};font-family:monospace;">#${data.ticketNumber}</p>
                    <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textDark};font-family:Arial,sans-serif;">${data.subject}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.resolution ? `
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:13px;font-weight:700;color:${COLORS.textMuted};font-family:Arial,sans-serif;">📋 ملخص الحل:</p>
                    <p style="margin:0;padding:0;font-size:14px;line-height:1.7;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.resolution}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          ${data.feedbackUrl ? `
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('⭐ قيّم تجربتك', data.feedbackUrl, COLORS.success)}
            </td>
          </tr>
          ` : ''}
          <tr>
            <td bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};padding:16px;border-radius:8px;">
              <p style="margin:0;padding:0;font-size:13px;color:${COLORS.textMuted};text-align:center;font-family:Arial,sans-serif;">
                شكراً لثقتك بنا! إذا كان لديك أي استفسار آخر، لا تتردد في فتح تذكرة جديدة.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 6. قالب إغلاق التذكرة
export const ticketClosedTemplate = (data: { 
  name: string; 
  ticketNumber: string; 
  subject: string;
  closureReport?: string;
}) => ({
  subject: `📁 تم إغلاق تذكرتك #${data.ticketNumber}`,
  html: createEmailWrapper(`
    ${createHeader('📁', 'تم إغلاق التذكرة', 'تذكرتك مغلقة الآن', '#6b7280')}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                نود إعلامك بأنه تم إغلاق تذكرة الدعم الخاصة بك.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};border-radius:10px;border-right:4px solid #6b7280;">
                <tr>
                  <td align="center" style="padding:25px;">
                    <p style="margin:0 0 6px 0;padding:0;font-size:13px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">التذكرة المغلقة</p>
                    <p style="margin:0 0 10px 0;padding:0;font-size:24px;font-weight:700;color:#6b7280;font-family:monospace;">#${data.ticketNumber}</p>
                    <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textDark};font-family:Arial,sans-serif;">${data.subject}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.closureReport ? `
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:13px;font-weight:700;color:${COLORS.info};font-family:Arial,sans-serif;">📋 تقرير الإغلاق:</p>
                    <p style="margin:0;padding:0;font-size:14px;line-height:1.7;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.closureReport}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 7. قالب تأكيد الاجتماع
export const meetingConfirmedTemplate = (data: { 
  name: string; 
  meetingSubject: string;
  meetingDate: string;
  meetingTime: string;
  meetingDuration: string;
  meetingLink?: string;
  staffName?: string;
}) => ({
  subject: `📅 تم تأكيد اجتماعك: ${data.meetingSubject}`,
  html: createEmailWrapper(`
    ${createHeader('📅', 'تم تأكيد الاجتماع!', 'اجتماعك جاهز', COLORS.success)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                يسعدنا إبلاغك بأن اجتماعك قد تم تأكيده بنجاح!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.successBg}" style="background-color:${COLORS.successBg};border-radius:10px;border-right:4px solid ${COLORS.success};">
                <tr>
                  <td style="padding:25px;">
                    <p style="margin:0 0 15px 0;padding:0;font-size:16px;font-weight:700;color:${COLORS.success};font-family:Arial,sans-serif;">${data.meetingSubject}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📆 <strong>التاريخ:</strong> ${data.meetingDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏰ <strong>الوقت:</strong> ${data.meetingTime}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏱️ <strong>المدة:</strong> ${data.meetingDuration}</p>
                        </td>
                      </tr>
                      ${data.staffName ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>المسؤول:</strong> ${data.staffName}</p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.meetingLink ? `
          <tr>
            <td align="center" style="padding:15px 0 25px;">
              ${createButton('🔗 انضم للاجتماع', data.meetingLink, COLORS.success)}
            </td>
          </tr>
          ` : ''}
          <tr>
            <td bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};padding:16px;border-radius:8px;">
              <p style="margin:0;padding:0;font-size:13px;color:${COLORS.textMuted};text-align:center;font-family:Arial,sans-serif;">
                يرجى الانضمام قبل الموعد بـ 5 دقائق لضمان بداية سلسة للاجتماع.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 8. قالب إلغاء الاجتماع
export const meetingCancelledTemplate = (data: { 
  name: string; 
  meetingSubject: string;
  meetingDate: string;
  cancellationReason?: string;
}) => ({
  subject: `❌ تم إلغاء الاجتماع: ${data.meetingSubject}`,
  html: createEmailWrapper(`
    ${createHeader('❌', 'تم إلغاء الاجتماع', 'نأسف لهذا الإزعاج', COLORS.danger)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                نود إعلامك بأن الاجتماع التالي قد تم إلغاؤه:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.dangerBg}" style="background-color:${COLORS.dangerBg};border-radius:10px;border-right:4px solid ${COLORS.danger};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:15px;font-weight:700;color:${COLORS.danger};font-family:Arial,sans-serif;">${data.meetingSubject}</p>
                    <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📆 التاريخ: ${data.meetingDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.cancellationReason ? `
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:13px;font-weight:700;color:${COLORS.textMuted};font-family:Arial,sans-serif;">سبب الإلغاء:</p>
                    <p style="margin:0;padding:0;font-size:14px;line-height:1.7;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.cancellationReason}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};padding:16px;border-radius:8px;">
              <p style="margin:0;padding:0;font-size:13px;color:${COLORS.textMuted};text-align:center;font-family:Arial,sans-serif;">
                يمكنك حجز موعد جديد في أي وقت يناسبك من خلال لوحة التحكم.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 9. قالب انتهاء الاجتماع (للتقييم)
export const meetingCompletedTemplate = (data: { 
  name: string; 
  meetingSubject: string;
  staffName: string;
  ratingUrl: string;
}) => ({
  subject: `✨ شكراً لحضور الاجتماع: ${data.meetingSubject}`,
  html: createEmailWrapper(`
    ${createHeader('✨', 'شكراً لحضورك!', 'نتمنى أن يكون الاجتماع مفيداً', COLORS.primary)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                شكراً لحضورك اجتماع <strong>"${data.meetingSubject}"</strong> مع <strong>${data.staffName}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.primary};">
                <tr>
                  <td align="center" style="padding:25px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:40px;">⭐⭐⭐⭐⭐</p>
                    <p style="margin:0;padding:0;font-size:15px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                      رأيك يهمنا! ساعدنا في تحسين خدماتنا بتقييم تجربتك.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('⭐ قيّم الاجتماع الآن', data.ratingUrl, COLORS.primary)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 10. قالب تنبيه/إشعار عام
export const alertTemplate = (data: { 
  name: string; 
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}) => ({
  subject: `🚨 ${data.title}`,
  html: createEmailWrapper(`
    ${createHeader('🚨', data.title, 'يرجى الاطلاع على هذا التنبيه المهم', COLORS.danger)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong>${data.name}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.dangerBg}" style="background-color:${COLORS.dangerBg};border-radius:10px;border-right:4px solid ${COLORS.danger};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.actionUrl && data.actionText ? `
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton(data.actionText, data.actionUrl, COLORS.danger)}
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 11. قالب إعلام للموظفين (تذكرة جديدة موجهة)
export const staffTicketAssignedTemplate = (data: { 
  staffName: string; 
  ticketNumber: string;
  subject: string;
  priority: string;
  clientName: string;
  adminNote?: string;
  dashboardUrl: string;
}) => ({
  subject: `🚨 تذكرة جديدة موجهة إليك: ${data.ticketNumber}`,
  html: createEmailWrapper(`
    ${createHeader('🚨', 'تذكرة جديدة موجهة إليك: ' + data.ticketNumber, 'يرجى الاطلاع على هذا التنبيه المهم', COLORS.danger)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong style="color:${COLORS.primary};">${data.staffName}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                تم توجيه تذكرة دعم جديدة إليك. يرجى مراجعتها والرد في أقرب وقت ممكن.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.primary};">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📌 <strong>رقم التذكرة:</strong> <span style="color:${COLORS.primary};font-weight:700;">${data.ticketNumber}</span></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📝 <strong>الموضوع:</strong> ${data.subject}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>العميل:</strong> ${data.clientName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⚡ <strong>الأولوية:</strong> <span style="color:${data.priority === 'high' || data.priority === 'عالية' ? COLORS.danger : COLORS.warning};font-weight:700;">${data.priority}</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${data.adminNote ? `
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.warningBg}" style="background-color:${COLORS.warningBg};border-radius:8px;border-right:4px solid ${COLORS.warning};">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 6px 0;padding:0;font-size:13px;font-weight:700;color:${COLORS.warning};font-family:Arial,sans-serif;">📎 ملاحظة من الإدارة:</p>
                    <p style="margin:0;padding:0;font-size:14px;line-height:1.7;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.adminNote}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('📋 فتح لوحة التذاكر', data.dashboardUrl, COLORS.primary)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 12. قالب إشعار الاشتراك
export const subscriptionTemplate = (data: { 
  name: string; 
  planName: string;
  status: 'active' | 'renewed' | 'expiring' | 'expired' | 'cancelled';
  expiryDate?: string;
  actionUrl?: string;
}) => {
  const statusConfig = {
    active: { icon: '👑', title: 'تم تفعيل اشتراكك!', color: COLORS.success, bgColor: COLORS.successBg },
    renewed: { icon: '🔄', title: 'تم تجديد اشتراكك!', color: COLORS.success, bgColor: COLORS.successBg },
    expiring: { icon: '⚠️', title: 'اشتراكك على وشك الانتهاء', color: COLORS.warning, bgColor: COLORS.warningBg },
    expired: { icon: '⏰', title: 'انتهى اشتراكك', color: COLORS.danger, bgColor: COLORS.dangerBg },
    cancelled: { icon: '❌', title: 'تم إلغاء اشتراكك', color: COLORS.danger, bgColor: COLORS.dangerBg },
  };

  const config = statusConfig[data.status];

  return {
    subject: `${config.icon} ${config.title}`,
    html: createEmailWrapper(`
      ${createHeader(config.icon, config.title, `باقة ${data.planName}`, config.color)}
      <tr>
        <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom:20px;">
                <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                  مرحباً <strong>${data.name}</strong>،
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:25px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${config.bgColor}" style="background-color:${config.bgColor};border-radius:10px;border-right:4px solid ${config.color};">
                  <tr>
                    <td align="center" style="padding:25px;">
                      <p style="margin:0 0 8px 0;padding:0;font-size:14px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">الباقة</p>
                      <p style="margin:0 0 15px 0;padding:0;font-size:22px;font-weight:700;color:${config.color};font-family:Arial,sans-serif;">${data.planName}</p>
                      ${data.expiryDate ? `
                      <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                        📅 تاريخ ${data.status === 'expired' ? 'الانتهاء' : 'التجديد'}: <strong>${data.expiryDate}</strong>
                      </p>
                      ` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${data.actionUrl ? `
            <tr>
              <td align="center" style="padding:15px 0;">
                ${createButton(data.status === 'expiring' || data.status === 'expired' ? '🔄 تجديد الاشتراك' : '📊 إدارة الاشتراك', data.actionUrl, config.color)}
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
      ${createFooter()}
    `),
  };
};

// 13. قالب إشعار الموظف بالاجتماع
export const staffMeetingNotificationTemplate = (data: {
  staffName: string;
  meetingSubject: string;
  meetingDate: string;
  meetingTime: string;
  clientName: string;
  organizationName: string;
  dashboardUrl: string;
}) => ({
  subject: `📅 اجتماع جديد مُسند إليك: ${data.meetingSubject}`,
  html: createEmailWrapper(`
    ${createHeader('📅', 'اجتماع جديد مُسند إليك', 'يرجى مراجعة تفاصيل الاجتماع', COLORS.primary)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong style="color:${COLORS.primary};">${data.staffName}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                تم إسناد اجتماع جديد إليك. يرجى مراجعة التفاصيل والاستعداد للاجتماع.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.primary};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 15px 0;padding:0;font-size:16px;font-weight:700;color:${COLORS.primary};font-family:Arial,sans-serif;">${data.meetingSubject}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📆 <strong>التاريخ:</strong> ${data.meetingDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏰ <strong>الوقت:</strong> ${data.meetingTime}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>العميل:</strong> ${data.clientName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">🏢 <strong>المنظمة:</strong> ${data.organizationName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('📋 فتح لوحة الاجتماعات', data.dashboardUrl, COLORS.primary)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 14. قالب رد جديد على التذكرة للموظف
export const staffNewReplyTemplate = (data: {
  staffName: string;
  ticketNumber: string;
  subject: string;
  clientName: string;
  replyPreview: string;
  dashboardUrl: string;
}) => ({
  subject: `💬 رد جديد من العميل على التذكرة #${data.ticketNumber}`,
  html: createEmailWrapper(`
    ${createHeader('💬', 'رد جديد من العميل', 'هناك رد جديد يحتاج مراجعتك', COLORS.info)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong style="color:${COLORS.primary};">${data.staffName}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                أرسل العميل <strong>${data.clientName}</strong> رداً جديداً على التذكرة.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};border-radius:8px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                      <strong style="color:${COLORS.primary};">#${data.ticketNumber}</strong> - ${data.subject}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.info};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px 0;padding:0;font-size:13px;font-weight:700;color:${COLORS.info};font-family:Arial,sans-serif;">📝 الرد:</p>
                    <p style="margin:0;padding:0;font-size:14px;line-height:1.7;color:${COLORS.textBody};font-family:Arial,sans-serif;">${data.replyPreview}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('💬 الرد على التذكرة', data.dashboardUrl, COLORS.info)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 15. قالب تنبيه التصعيد
export const escalationAlertTemplate = (data: {
  staffName: string;
  ticketNumber: string;
  subject: string;
  hoursWaiting: number;
  clientName: string;
  dashboardUrl: string;
}) => ({
  subject: `⚠️ تذكرة متأخرة تحتاج اهتمام: #${data.ticketNumber}`,
  html: createEmailWrapper(`
    ${createHeader('⚠️', 'تذكرة متأخرة!', 'تحتاج هذه التذكرة اهتماماً عاجلاً', COLORS.warning)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong style="color:${COLORS.primary};">${data.staffName}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                هناك تذكرة متأخرة منذ <strong style="color:${COLORS.danger};">${data.hoursWaiting} ساعة</strong> وتحتاج اهتماماً عاجلاً.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.warningBg}" style="background-color:${COLORS.warningBg};border-radius:10px;border-right:4px solid ${COLORS.warning};">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📌 <strong>رقم التذكرة:</strong> <span style="color:${COLORS.danger};font-weight:700;">#${data.ticketNumber}</span></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📝 <strong>الموضوع:</strong> ${data.subject}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>العميل:</strong> ${data.clientName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏰ <strong>مدة الانتظار:</strong> <span style="color:${COLORS.danger};font-weight:700;">${data.hoursWaiting} ساعة</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0;">
              ${createButton('🔥 معالجة التذكرة الآن', data.dashboardUrl, COLORS.danger)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 16. قالب إعادة تعيين كلمة مرور الموظف
export const staffPasswordResetTemplate = (data: {
  staffName: string;
  resetUrl: string;
  expiryTime: string;
}) => ({
  subject: '🔐 إعادة تعيين كلمة المرور - لوحة الموظفين',
  html: createEmailWrapper(`
    ${createHeader('🔐', 'إعادة تعيين كلمة المرور', 'طلب تغيير كلمة مرور حساب الموظف', COLORS.warning)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong style="color:${COLORS.primary};">${data.staffName}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في لوحة الموظفين. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              ${createInfoBox(`⏰ ينتهي صلاحية هذا الرابط خلال <strong>${data.expiryTime}</strong>`, COLORS.warningBg, COLORS.warning, COLORS.textBody)}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px 0 25px;">
              ${createButton('🔑 إعادة تعيين كلمة المرور', data.resetUrl, COLORS.warning)}
            </td>
          </tr>
          <tr>
            <td>
              ${createInfoBox('⚠️ <strong>تنبيه أمني:</strong> لا تشارك هذا الرابط مع أي شخص. فريق ويبيان لن يطلب منك كلمة المرور أبداً.', COLORS.dangerBg, COLORS.danger, COLORS.textBody)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});

// 17. قالب إرسال عرض السعر
export const quoteEmailTemplate = (data: {
  clientName: string;
  quoteNumber: string;
  quoteTitle: string;
  totalAmount: string;
  validUntil: string;
  viewUrl: string;
  staffName: string;
}) => ({
  subject: `📄 عرض سعر #${data.quoteNumber} من ويبيان`,
  html: createEmailWrapper(`
    ${createHeader('📄', 'عرض سعر جديد', 'مرفق عرض السعر الخاص بكم', COLORS.primary)}
    <tr>
      <td bgcolor="${COLORS.bgWhite}" style="padding:35px 30px;background-color:${COLORS.bgWhite};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;padding:0;font-size:17px;color:${COLORS.textDark};font-family:Arial,sans-serif;">
                مرحباً <strong style="color:${COLORS.primary};">${data.clientName}</strong>،
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <p style="margin:0;padding:0;font-size:15px;line-height:1.8;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                يسعدنا إرسال عرض السعر الخاص بكم. يرجى مراجعة التفاصيل أدناه والتواصل معنا في حال وجود أي استفسارات.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:25px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.infoBg}" style="background-color:${COLORS.infoBg};border-radius:10px;border-right:4px solid ${COLORS.primary};">
                <tr>
                  <td style="padding:25px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;padding:0;font-size:13px;color:${COLORS.textMuted};font-family:Arial,sans-serif;">رقم عرض السعر</p>
                          <p style="margin:4px 0 0;padding:0;font-size:22px;font-weight:700;color:${COLORS.primary};font-family:monospace;">${data.quoteNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid ${COLORS.bgGray};">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                            <strong>الموضوع:</strong> ${data.quoteTitle}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid ${COLORS.bgGray};">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                            <strong>الإجمالي:</strong> <span style="font-size:18px;font-weight:700;color:${COLORS.primary};">${data.totalAmount}</span>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;border-top:1px solid ${COLORS.bgGray};">
                          <p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">
                            <strong>صالح حتى:</strong> ${data.validUntil}
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
            <td align="center" style="padding:15px 0 25px;">
              ${createButton('📋 عرض التفاصيل الكاملة', data.viewUrl, COLORS.primary)}
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              ${createInfoBox('📎 <strong>ملاحظة:</strong> ستجد ملف PDF مرفق يحتوي على تفاصيل عرض السعر الكاملة.', COLORS.successBg, COLORS.success, COLORS.textBody)}
            </td>
          </tr>
          <tr>
            <td bgcolor="${COLORS.bgGray}" style="background-color:${COLORS.bgGray};padding:16px;border-radius:8px;">
              <p style="margin:0;padding:0;font-size:13px;color:${COLORS.textMuted};text-align:center;font-family:Arial,sans-serif;">
                تم إعداد هذا العرض بواسطة <strong>${data.staffName}</strong> - فريق المبيعات ويبيان
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${createFooter()}
  `),
});
