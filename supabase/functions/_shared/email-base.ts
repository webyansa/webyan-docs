// القاعدة الأساسية لقوالب البريد - Email Template Base
// This file contains the core components used by all email templates

export const COLORS = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  primaryDark: '#1e3a8a',
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
  textBlack: '#000000',
  textDark: '#1f2937',
  textBody: '#374151',
  textMuted: '#6b7280',
  bgWhite: '#ffffff',
  bgLight: '#f9fafb',
  bgGray: '#f3f4f6',
};

export const createEmailWrapper = (bodyContent: string): string => `
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

export const createHeader = (icon: string, title: string, subtitle: string, bgColor: string): string => `
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

export const createFooter = (): string => `
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

export const createButton = (text: string, url: string, bgColor: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td align="center" bgcolor="${bgColor}" style="background-color:${bgColor};border-radius:8px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">${text}</a>
    </td>
  </tr>
</table>
`;

export const createInfoBox = (content: string, bgColor: string, borderColor: string, textColor: string): string => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td bgcolor="${bgColor}" style="background-color:${bgColor};padding:20px;border-radius:8px;border-right:4px solid ${borderColor};">
      <p style="margin:0;padding:0;font-size:15px;line-height:1.7;color:${textColor};font-family:Arial,sans-serif;">${content}</p>
    </td>
  </tr>
</table>
`;
