// قوالب البريد للموظفين - Staff Email Templates
import { COLORS, createEmailWrapper, createHeader, createFooter, createButton, createInfoBox } from "./email-base.ts";

// Re-export base utilities for backwards compatibility
export { COLORS, createEmailWrapper, createHeader, createFooter, createButton, createInfoBox };

// قالب تنبيه/إشعار عام
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

// قالب إعلام للموظفين (تذكرة جديدة موجهة)
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
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📌 <strong>رقم التذكرة:</strong> <span style="color:${COLORS.primary};font-weight:700;">${data.ticketNumber}</span></p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📝 <strong>الموضوع:</strong> ${data.subject}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>العميل:</strong> ${data.clientName}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⚡ <strong>الأولوية:</strong> <span style="color:${data.priority === 'high' || data.priority === 'عالية' ? COLORS.danger : COLORS.warning};font-weight:700;">${data.priority}</span></p></td></tr>
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

// قالب رد جديد على التذكرة للموظف
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

// قالب تنبيه التصعيد
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
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📌 <strong>رقم التذكرة:</strong> <span style="color:${COLORS.danger};font-weight:700;">#${data.ticketNumber}</span></p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📝 <strong>الموضوع:</strong> ${data.subject}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>العميل:</strong> ${data.clientName}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏰ <strong>مدة الانتظار:</strong> <span style="color:${COLORS.danger};font-weight:700;">${data.hoursWaiting} ساعة</span></p></td></tr>
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

// قالب إعادة تعيين كلمة مرور الموظف
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

// قالب إشعار الموظف بالاجتماع
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
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">📆 <strong>التاريخ:</strong> ${data.meetingDate}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">⏰ <strong>الوقت:</strong> ${data.meetingTime}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">👤 <strong>العميل:</strong> ${data.clientName}</p></td></tr>
                      <tr><td style="padding:6px 0;"><p style="margin:0;padding:0;font-size:14px;color:${COLORS.textBody};font-family:Arial,sans-serif;">🏢 <strong>المنظمة:</strong> ${data.organizationName}</p></td></tr>
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
