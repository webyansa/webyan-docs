import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { BufReader, BufWriter, TextProtoReader } from "https://deno.land/x/smtp@v0.7.0/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpSettings {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_sender_email: string;
  smtp_sender_name: string;
  smtp_encryption: string;
}

interface TestSmtpRequest {
  to_email: string;
  smtp_settings: SmtpSettings;
}

type SmtpResponse = { success: boolean; message: string; technical?: string };

const json = (payload: SmtpResponse, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const sanitizeSettingsForLogs = (s: SmtpSettings) => ({
  smtp_enabled: s.smtp_enabled,
  smtp_host: s.smtp_host,
  smtp_port: s.smtp_port,
  smtp_username: s.smtp_username,
  smtp_sender_email: s.smtp_sender_email,
  smtp_sender_name: s.smtp_sender_name,
  smtp_encryption: s.smtp_encryption,
});

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
      // End of multiline: same code followed by space
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

const sendViaStartTLS = async (params: {
  hostname: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) => {
  // STARTTLS flow for 587
  const tcpConn = await Deno.connect({ hostname: params.hostname, port: params.port });
  let conn: Deno.Conn = tcpConn;

  // Reader/writer helpers
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
  // (If the runtime doesn't support it, this will throw and we return a clear message)
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
  assert2xx3xx(res.code, [235, 503]); // 503 if already authenticated

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

  // Very simple MIME (HTML)
  const msg = [
    `Subject: ${params.subject}`,
    `From: ${params.from}`,
    `To: ${params.to}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    params.html,
    ".",
  ].join("\r\n");

  // DATA terminator must be \r\n.\r\n
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
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, smtp_settings }: TestSmtpRequest = await req.json();

    console.log("test-smtp invoked", {
      to_email,
      smtp_settings: sanitizeSettingsForLogs(smtp_settings),
    });

    if (!to_email) {
      return json({ success: false, message: "البريد الإلكتروني مطلوب" }, 400);
    }

    // If custom SMTP is not enabled, use Resend
    if (!smtp_settings.smtp_enabled) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return json({ success: false, message: "RESEND_API_KEY غير مُعدّ" });
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "ويبيان <support@webyan.net>",
          to: [to_email],
          subject: "✅ رسالة اختبار من نظام ويبيان",
          html: `
            <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">✅ رسالة اختبار ناجحة</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
                  مرحباً،
                </p>
                <p style="color: #4b5563; line-height: 1.8;">
                  هذه رسالة اختبار من نظام ويبيان. إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني تعمل بشكل صحيح.
                </p>
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                  <p style="margin: 0; color: #065f46; font-weight: 500;">
                    ✓ تم إرسال الرسالة باستخدام: Resend (الافتراضي)
                  </p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
                  تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (response.ok) {
        return json({ success: true, message: "تم إرسال رسالة الاختبار بنجاح عبر Resend" });
      } else {
        const errorData = await response.json();
        return json({
          success: false,
          message: `فشل إرسال الرسالة: ${errorData.message || "خطأ غير معروف"}`,
          technical: JSON.stringify(errorData),
        });
      }
    }

    // Custom SMTP is enabled - use SMTP
    const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_sender_email, smtp_sender_name, smtp_encryption } = smtp_settings;
    
    if (!smtp_host || !smtp_username || !smtp_password) {
      return json({ success: false, message: "إعدادات SMTP غير مكتملة" }, 400);
    }

    console.log(`Attempting SMTP connection to ${smtp_host}:${smtp_port} with encryption: ${smtp_encryption}`);

    const client = new SmtpClient();
    const port = parseInt(smtp_port, 10);

    const fromEmail = smtp_sender_email || smtp_username;
    const fromName = smtp_sender_name || "ويبيان";

    try {
      // Connect based on encryption type
      if (smtp_encryption === "tls" && port === 587) {
        await sendViaStartTLS({
          hostname: smtp_host,
          port,
          username: smtp_username,
          password: smtp_password,
          from: fromEmail,
          to: to_email,
          subject: "✅ رسالة اختبار SMTP من نظام ويبيان",
          html: `
           <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
             <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
               <h1 style="color: white; margin: 0; font-size: 24px;">✅ رسالة اختبار SMTP ناجحة</h1>
             </div>
             <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
               <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">مرحباً،</p>
               <p style="color: #4b5563; line-height: 1.8;">هذه رسالة اختبار من نظام ويبيان. إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات SMTP المخصص تعمل بشكل صحيح.</p>
               <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                 <p style="margin: 0; color: #065f46; font-weight: 500;">✓ تم إرسال الرسالة باستخدام: SMTP المخصص</p>
                 <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">السيرفر: ${smtp_host}:${smtp_port}</p>
               </div>
               <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">تم الإرسال في: ${new Date().toLocaleString('ar-SA')}</p>
             </div>
           </div>
          `,
        });

        return json({
          success: true,
          message: `تم إرسال رسالة الاختبار بنجاح عبر SMTP المخصص (${smtp_host}:${smtp_port})`,
        });
      }

      if (smtp_encryption === "ssl" || port === 465) {
        await client.connectTLS({
          hostname: smtp_host,
          port: port,
          username: smtp_username,
          password: smtp_password,
        });
      } else if (smtp_encryption === "tls") {
        await client.connect({
          hostname: smtp_host,
          port: port,
          username: smtp_username,
          password: smtp_password,
        });
      } else {
        // No encryption
        await client.connect({
          hostname: smtp_host,
          port: port,
          username: smtp_username,
          password: smtp_password,
        });
      }

      console.log("SMTP connected successfully");

      // Send test email
      await client.send({
        from: `${fromName} <${fromEmail}>`,
        to: to_email,
        subject: "✅ رسالة اختبار SMTP من نظام ويبيان",
        content: "text/html",
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ رسالة اختبار SMTP ناجحة</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
                مرحباً،
              </p>
              <p style="color: #4b5563; line-height: 1.8;">
                هذه رسالة اختبار من نظام ويبيان. إذا وصلتك هذه الرسالة، فهذا يعني أن إعدادات SMTP المخصص تعمل بشكل صحيح.
              </p>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; color: #065f46; font-weight: 500;">
                  ✓ تم إرسال الرسالة باستخدام: SMTP المخصص
                </p>
                <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">
                  السيرفر: ${smtp_host}:${smtp_port}
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
                تم الإرسال في: ${new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        `,
      });

      console.log("Email sent successfully");

      await client.close();

      return json({
        success: true,
        message: `تم إرسال رسالة الاختبار بنجاح عبر SMTP المخصص (${smtp_host}:${smtp_port})`,
      });

    } catch (smtpError: unknown) {
      console.error("SMTP Error:", smtpError);
      
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }

      const errorMessage = smtpError instanceof Error ? smtpError.message : String(smtpError);
      
      // Provide helpful error messages
      let userMessage = `فشل الاتصال بـ SMTP: ${errorMessage}`;
      
      if (errorMessage.includes("Connection refused") || errorMessage.includes("connect")) {
        userMessage = `فشل الاتصال بالسيرفر ${smtp_host}:${smtp_port}. تأكد من صحة اسم السيرفر والمنفذ.`;
      } else if (errorMessage.includes("authentication") || errorMessage.includes("AUTH") || errorMessage.includes("535")) {
        userMessage = `فشل المصادقة. تأكد من صحة اسم المستخدم وكلمة المرور.`;
      } else if (errorMessage.includes("certificate") || errorMessage.includes("SSL") || errorMessage.includes("TLS")) {
        userMessage = `خطأ في شهادة SSL/TLS. جرب تغيير نوع التشفير (SSL بدلاً من TLS أو العكس).`;
      } else if (errorMessage.includes("timeout")) {
        userMessage = `انتهت مهلة الاتصال. تأكد من أن المنفذ ${smtp_port} مفتوح ولا يوجد جدار حماية يمنع الاتصال.`;
      }

      return json({ success: false, message: userMessage, technical: errorMessage });
    }

  } catch (error: unknown) {
    console.error("Error testing SMTP:", error);
    const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
    return json({ success: false, message: `حدث خطأ: ${errorMessage}`, technical: errorMessage });
  }
};

serve(handler);
