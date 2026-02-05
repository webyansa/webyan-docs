// قوالب البريد لـ CRM - CRM Email Templates
import { COLORS, createEmailWrapper, createHeader, createFooter, createButton, createInfoBox } from "./email-base.ts";

// Re-export base utilities for backwards compatibility
export { COLORS, createEmailWrapper, createHeader, createFooter, createButton, createInfoBox };

// قالب إرسال عرض السعر
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
