// قوالب البريد للعملاء - Client Email Templates
import { COLORS, createEmailWrapper, createHeader, createFooter, createButton, createInfoBox } from "./email-base.ts";

// Re-export base utilities for backwards compatibility
export { COLORS, createEmailWrapper, createHeader, createFooter, createButton, createInfoBox };

// قالب الترحيب
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

// قالب إنشاء تذكرة جديدة
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

// قالب الرد على التذكرة
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

// قالب حل التذكرة
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

// قالب تأكيد الاجتماع
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
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📆 <strong>التاريخ:</strong> ${data.meetingDate}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏰ <strong>الوقت:</strong> ${data.meetingTime}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏱️ <strong>المدة:</strong> ${data.meetingDuration}</p></td></tr>
                      ${data.staffName ? `<tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>المسؤول:</strong> ${data.staffName}</p></td></tr>` : ''}
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

// قالب إلغاء الاجتماع
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

// قالب إشعار الاشتراك
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

// قالب تنبيه/إشعار عام للعملاء
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
