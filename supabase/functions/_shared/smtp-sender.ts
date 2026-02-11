// مكتبة إرسال البريد الموحدة - تدعم SMTP مخصص مع fallback لـ Resend
// Unified Email Sender - Supports custom SMTP with Resend fallback

import { createClient } from "npm:@supabase/supabase-js@2";

export interface SmtpSettings {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_sender_email: string;
  smtp_sender_name: string;
  smtp_encryption: string;
  public_base_url: string;
}

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
}

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  emailType?: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  success: boolean;
  method: 'smtp' | 'resend';
  error?: string;
}

// Cache for settings to avoid repeated DB calls within same function execution
let cachedSettings: SmtpSettings | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * Log email send attempt to database
 */
async function logEmailSend(params: {
  recipientEmail: string;
  subject: string;
  emailType?: string;
  method: 'smtp' | 'resend';
  status: 'success' | 'failed' | 'fallback';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await (supabase.from('email_logs') as any).insert({
      recipient_email: params.recipientEmail,
      subject: params.subject,
      email_type: params.emailType || 'general',
      method: params.method,
      status: params.status,
      error_message: params.errorMessage || null,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

/**
 * Get SMTP settings from system_settings table
 */
export async function getSmtpSettings(): Promise<SmtpSettings> {
  if (cachedSettings) return cachedSettings;

  const supabase = getSupabaseClient();

  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value');

  const settingsMap: Record<string, string> = {};
  settings?.forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value;
  });

  cachedSettings = {
    smtp_enabled: settingsMap['smtp_enabled'] === 'true',
    smtp_host: settingsMap['smtp_host'] || '',
    smtp_port: settingsMap['smtp_port'] || '587',
    smtp_username: settingsMap['smtp_username'] || '',
    smtp_password: settingsMap['smtp_password'] || '',
    smtp_sender_email: settingsMap['smtp_sender_email'] || 'support@webyan.sa',
    smtp_sender_name: settingsMap['smtp_sender_name'] || 'ويبيان',
    smtp_encryption: settingsMap['smtp_encryption'] || 'tls',
    public_base_url: settingsMap['public_base_url'] || 'https://webyan.sa',
  };

  return cachedSettings;
}

/**
 * Get base URL from settings
 */
export async function getBaseUrl(): Promise<string> {
  const settings = await getSmtpSettings();
  return settings.public_base_url;
}

/**
 * Encode Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Build MIME multipart message with attachments
 */
function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2)}`;
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;

  if (!params.attachments || params.attachments.length === 0) {
    // Simple message without attachments
    return [
      `Subject: ${encodedSubject}`,
      `From: ${params.from}`,
      `To: ${params.to}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      params.html,
      ".",
    ].join("\r\n");
  }

  // Multipart message with attachments
  const lines: string[] = [
    `Subject: ${encodedSubject}`,
    `From: ${params.from}`,
    `To: ${params.to}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    params.html,
  ];

  for (const att of params.attachments) {
    const b64 = uint8ArrayToBase64(att.content);
    // Encode filename for non-ASCII characters
    const encodedFilename = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(att.filename)))}?=`;
    lines.push(
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${encodedFilename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${encodedFilename}"`,
      "",
    );
    // Split base64 into 76-char lines
    for (let i = 0; i < b64.length; i += 76) {
      lines.push(b64.substring(i, i + 76));
    }
  }

  lines.push(`--${boundary}--`, ".");
  return lines.join("\r\n");
}

/**
 * Send email via STARTTLS (for port 587)
 */
async function sendViaStartTLS(params: {
  hostname: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const tcpConn = await Deno.connect({ hostname: params.hostname, port: params.port });
  let conn: Deno.Conn = tcpConn;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const read = async (c: Deno.Conn): Promise<string> => {
    const buf = new Uint8Array(4096);
    const n = await c.read(buf);
    return n ? decoder.decode(buf.subarray(0, n)) : "";
  };

  const write = async (c: Deno.Conn, data: string): Promise<void> => {
    await c.write(encoder.encode(data + "\r\n"));
  };

  const expect = async (c: Deno.Conn, code: number): Promise<string> => {
    const response = await read(c);
    if (!response.startsWith(String(code))) {
      throw new Error(`SMTP: expected ${code}, got: ${response.trim()}`);
    }
    return response;
  };

  // Greeting
  await expect(conn, 220);

  // EHLO
  await write(conn, `EHLO ${params.hostname}`);
  const ehloResponse = await expect(conn, 250);

  if (!ehloResponse.toUpperCase().includes("STARTTLS")) {
    throw new Error("Server does not support STARTTLS");
  }

  // STARTTLS
  await write(conn, "STARTTLS");
  await expect(conn, 220);

  // Upgrade to TLS
  const tlsConn = await Deno.startTls(tcpConn, { hostname: params.hostname });
  conn = tlsConn;

  // EHLO again over TLS
  await write(conn, `EHLO ${params.hostname}`);
  await expect(conn, 250);

  // AUTH LOGIN
  await write(conn, "AUTH LOGIN");
  await expect(conn, 334);
  await write(conn, btoa(params.username));
  await expect(conn, 334);
  await write(conn, btoa(params.password));
  const authResp = await read(conn);
  if (!authResp.startsWith("235") && !authResp.startsWith("503")) {
    throw new Error(`AUTH failed: ${authResp.trim()}`);
  }

  // MAIL FROM
  await write(conn, `MAIL FROM:<${params.from}>`);
  await expect(conn, 250);

  // RCPT TO
  await write(conn, `RCPT TO:<${params.to}>`);
  const rcptResp = await read(conn);
  if (!rcptResp.startsWith("250") && !rcptResp.startsWith("251")) {
    throw new Error(`RCPT TO failed: ${rcptResp.trim()}`);
  }

  // DATA
  await write(conn, "DATA");
  await expect(conn, 354);

  // Build MIME message (with or without attachments)
  const msg = buildMimeMessage({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });

  await conn.write(encoder.encode(msg + "\r\n"));
  await expect(conn, 250);

  // QUIT
  await write(conn, "QUIT");
  try { await read(conn); } catch { /* ignore */ }
  await conn.close();
}

/**
 * Send email via SSL (for port 465)
 */
async function sendViaSSL(params: {
  hostname: string;
  port: number;
  username: string;
  password: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const conn = await Deno.connectTls({ hostname: params.hostname, port: params.port });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const read = async (): Promise<string> => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? decoder.decode(buf.subarray(0, n)) : "";
  };

  const write = async (data: string): Promise<void> => {
    await conn.write(encoder.encode(data + "\r\n"));
  };

  const expect = async (code: number): Promise<string> => {
    const response = await read();
    if (!response.startsWith(String(code))) {
      throw new Error(`SMTP SSL: expected ${code}, got: ${response.trim()}`);
    }
    return response;
  };

  // Greeting
  await expect(220);

  // EHLO
  await write(`EHLO ${params.hostname}`);
  await expect(250);

  // AUTH LOGIN
  await write("AUTH LOGIN");
  await expect(334);
  await write(btoa(params.username));
  await expect(334);
  await write(btoa(params.password));
  const authResp = await read();
  if (!authResp.startsWith("235") && !authResp.startsWith("503")) {
    throw new Error(`AUTH failed: ${authResp.trim()}`);
  }

  // MAIL FROM
  await write(`MAIL FROM:<${params.from}>`);
  await expect(250);

  // RCPT TO
  await write(`RCPT TO:<${params.to}>`);
  const rcptResp = await read();
  if (!rcptResp.startsWith("250") && !rcptResp.startsWith("251")) {
    throw new Error(`RCPT TO failed: ${rcptResp.trim()}`);
  }

  // DATA
  await write("DATA");
  await expect(354);

  // Build MIME message (with or without attachments)
  const msg = buildMimeMessage({
    from: `${params.fromName} <${params.from}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });

  await conn.write(encoder.encode(msg + "\r\n"));
  await expect(250);

  // QUIT
  await write("QUIT");
  try { await read(); } catch { /* ignore */ }
  await conn.close();
}

/**
 * Send email via custom SMTP
 */
async function sendViaSmtp(settings: SmtpSettings, params: EmailParams): Promise<void> {
  const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_sender_email, smtp_sender_name, smtp_encryption } = settings;
  const port = parseInt(smtp_port, 10);
  const fromEmail = smtp_sender_email || smtp_username;
  const fromName = smtp_sender_name || "ويبيان";
  const toEmails = Array.isArray(params.to) ? params.to : [params.to];

  for (const toEmail of toEmails) {
    if (smtp_encryption === "tls" && port === 587) {
      await sendViaStartTLS({
        hostname: smtp_host,
        port,
        username: smtp_username,
        password: smtp_password,
        from: fromEmail,
        to: toEmail,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
    } else if (smtp_encryption === "ssl" || port === 465) {
      await sendViaSSL({
        hostname: smtp_host,
        port,
        username: smtp_username,
        password: smtp_password,
        from: fromEmail,
        fromName,
        to: toEmail,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
    } else {
      // Fallback to STARTTLS for other configurations
      await sendViaStartTLS({
        hostname: smtp_host,
        port,
        username: smtp_username,
        password: smtp_password,
        from: fromEmail,
        to: toEmail,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
    }
  }
}

/**
 * Send email via Resend API
 */
async function sendViaResend(params: EmailParams, senderName: string = "Webyan"): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY غير مُعدّ");
  }

  const toEmails = Array.isArray(params.to) ? params.to : [params.to];
  
  // Use ASCII-safe sender name to avoid encoding issues with some mail servers
  const fromAddress = params.from || `${senderName} <support@webyan.sa>`;
  
  // Build Resend payload with attachments
  const payload: any = {
    from: fromAddress,
    to: toEmails,
    subject: params.subject,
    html: params.html,
    reply_to: "support@webyan.sa",
  };

  if (params.attachments && params.attachments.length > 0) {
    payload.attachments = params.attachments.map(att => ({
      filename: att.filename,
      content: uint8ArrayToBase64(att.content),
      content_type: att.contentType,
    }));
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error(`Resend API error: ${JSON.stringify(responseData)}`);
  }
  
  console.log("Resend response:", responseData);
}

/**
 * Main email sending function with SMTP support and Resend fallback
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const settings = await getSmtpSettings();
  const recipientEmail = Array.isArray(params.to) ? params.to[0] : params.to;
  
  // If custom SMTP is enabled
  if (settings.smtp_enabled && settings.smtp_host && settings.smtp_username && settings.smtp_password) {
    try {
      console.log(`Attempting to send email via custom SMTP (${settings.smtp_host}:${settings.smtp_port})`);
      await sendViaSmtp(settings, params);
      console.log("Email sent successfully via custom SMTP");
      
      await logEmailSend({
        recipientEmail,
        subject: params.subject,
        emailType: params.emailType,
        method: 'smtp',
        status: 'success',
        metadata: { smtp_host: settings.smtp_host, smtp_port: settings.smtp_port }
      });
      
      return { success: true, method: 'smtp' };
    } catch (smtpError) {
      const smtpErrorMsg = smtpError instanceof Error ? smtpError.message : String(smtpError);
      console.error("SMTP failed, falling back to Resend:", smtpErrorMsg);
      
      // Fallback to Resend
      try {
        await sendViaResend(params, settings.smtp_sender_name);
        console.log("Email sent successfully via Resend (fallback)");
        
        await logEmailSend({
          recipientEmail,
          subject: params.subject,
          emailType: params.emailType,
          method: 'resend',
          status: 'fallback',
          errorMessage: `SMTP failed: ${smtpErrorMsg}`,
          metadata: { smtp_host: settings.smtp_host, original_error: smtpErrorMsg }
        });
        
        return { success: true, method: 'resend', error: `SMTP failed: ${smtpErrorMsg}` };
      } catch (resendError) {
        const resendErrorMsg = resendError instanceof Error ? resendError.message : String(resendError);
        console.error("Resend fallback also failed:", resendErrorMsg);
        
        await logEmailSend({
          recipientEmail,
          subject: params.subject,
          emailType: params.emailType,
          method: 'resend',
          status: 'failed',
          errorMessage: `SMTP: ${smtpErrorMsg}. Resend: ${resendErrorMsg}`,
          metadata: { smtp_error: smtpErrorMsg, resend_error: resendErrorMsg }
        });
        
        return { 
          success: false, 
          method: 'resend', 
          error: `SMTP failed: ${smtpErrorMsg}. Resend fallback also failed: ${resendErrorMsg}` 
        };
      }
    }
  }

  // Use Resend directly if SMTP is not enabled
  try {
    console.log("Sending email via Resend (SMTP not enabled)");
    await sendViaResend(params, settings.smtp_sender_name);
    console.log("Email sent successfully via Resend");
    
    await logEmailSend({
      recipientEmail,
      subject: params.subject,
      emailType: params.emailType,
      method: 'resend',
      status: 'success',
    });
    
    return { success: true, method: 'resend' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Resend failed:", errorMsg);
    
    await logEmailSend({
      recipientEmail,
      subject: params.subject,
      emailType: params.emailType,
      method: 'resend',
      status: 'failed',
      errorMessage: errorMsg,
    });
    
    return { success: false, method: 'resend', error: errorMsg };
  }
}

/**
 * Clear cached settings (useful if settings are updated during the same execution)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
}
