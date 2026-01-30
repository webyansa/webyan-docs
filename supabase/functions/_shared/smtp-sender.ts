// مكتبة إرسال البريد الموحدة - تدعم SMTP مخصص مع fallback لـ Resend
// Unified Email Sender - Supports custom SMTP with Resend fallback

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { BufReader, BufWriter, TextProtoReader } from "https://deno.land/x/smtp@v0.7.0/deps.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  emailType?: string;
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
    // Use type assertion since edge functions don't have auto-generated types
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
    // Don't throw - logging failure shouldn't break email sending
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
    smtp_sender_email: settingsMap['smtp_sender_email'] || 'support@webyan.net',
    smtp_sender_name: settingsMap['smtp_sender_name'] || 'ويبيان',
    smtp_encryption: settingsMap['smtp_encryption'] || 'tls',
    public_base_url: settingsMap['public_base_url'] || 'https://docs.webyan.net',
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

// SMTP Helper functions
const readSmtpResponse = async (reader: TextProtoReader) => {
  const first = await reader.readLine();
  if (!first) throw new Error("SMTP: no response");
  const code = Number(first.slice(0, 3));
  const isMulti = first.length >= 4 && first[3] === "-";
  const lines: string[] = [first];
  if (isMulti) {
    while (true) {
      const line = await reader.readLine();
      if (!line) break;
      lines.push(line);
      if (line.startsWith(String(code)) && line[3] === " ") break;
    }
  }
  return { code, lines };
};

const writeLine = async (writer: BufWriter, line: string) => {
  const enc = new TextEncoder();
  await writer.write(enc.encode(`${line}\r\n`));
  await writer.flush();
};

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
}): Promise<void> {
  const tcpConn = await Deno.connect({ hostname: params.hostname, port: params.port });
  let conn: Deno.Conn = tcpConn;

  const makeIO = (c: Deno.Conn) => {
    const reader = new TextProtoReader(new BufReader(c));
    const writer = new BufWriter(c);
    return { reader, writer };
  };

  let { reader, writer } = makeIO(conn);

  const assert2xx3xx = (code: number, expected: number | number[]) => {
    const ok = Array.isArray(expected) ? expected.includes(code) : code === expected;
    if (!ok) throw new Error(`SMTP unexpected response code ${code}`);
  };

  // Greeting
  let res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 220);

  // EHLO
  await writeLine(writer, `EHLO ${params.hostname}`);
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 250);

  const supportsStartTLS = res.lines.some((l) => l.toUpperCase().includes("STARTTLS"));
  if (!supportsStartTLS) {
    throw new Error("Server does not advertise STARTTLS");
  }

  // STARTTLS
  await writeLine(writer, "STARTTLS");
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 220);

  // Upgrade connection to TLS
  const tlsConn = await Deno.startTls(tcpConn, { hostname: params.hostname });
  conn = tlsConn;
  ({ reader, writer } = makeIO(conn));

  // EHLO again over TLS
  await writeLine(writer, `EHLO ${params.hostname}`);
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 250);

  // AUTH LOGIN
  await writeLine(writer, "AUTH LOGIN");
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 334);
  await writeLine(writer, btoa(params.username));
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 334);
  await writeLine(writer, btoa(params.password));
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, [235, 503]);

  // MAIL FROM / RCPT TO / DATA
  await writeLine(writer, `MAIL FROM:<${params.from}>`);
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 250);
  await writeLine(writer, `RCPT TO:<${params.to}>`);
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, [250, 251]);
  await writeLine(writer, "DATA");
  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 354);

  // MIME message
  const msg = [
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    `From: ${params.from}`,
    `To: ${params.to}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    params.html,
    ".",
  ].join("\r\n");

  const enc = new TextEncoder();
  await writer.write(enc.encode(msg + "\r\n"));
  await writer.flush();

  res = await readSmtpResponse(reader);
  assert2xx3xx(res.code, 250);

  // QUIT
  await writeLine(writer, "QUIT");
  try {
    await readSmtpResponse(reader);
  } catch {
    // ignore
  }
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
      });
    } else if (smtp_encryption === "ssl" || port === 465) {
      const client = new SmtpClient();
      await client.connectTLS({
        hostname: smtp_host,
        port: port,
        username: smtp_username,
        password: smtp_password,
      });
      await client.send({
        from: `${fromName} <${fromEmail}>`,
        to: toEmail,
        subject: params.subject,
        content: "text/html",
        html: params.html,
      });
      await client.close();
    } else {
      const client = new SmtpClient();
      await client.connect({
        hostname: smtp_host,
        port: port,
        username: smtp_username,
        password: smtp_password,
      });
      await client.send({
        from: `${fromName} <${fromEmail}>`,
        to: toEmail,
        subject: params.subject,
        content: "text/html",
        html: params.html,
      });
      await client.close();
    }
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(params: EmailParams, senderName: string = "ويبيان"): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY غير مُعدّ");
  }

  const resend = new Resend(resendApiKey);
  const toEmails = Array.isArray(params.to) ? params.to : [params.to];
  
  await resend.emails.send({
    from: params.from || `${senderName} <support@webyan.net>`,
    to: toEmails,
    subject: params.subject,
    html: params.html,
  });
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
      
      // Log success
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
        
        // Log fallback success
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
        
        // Log complete failure
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
    
    // Log success
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
    
    // Log failure
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
