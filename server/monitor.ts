/**
 * BioTrack AI - Monitoring & Alert System
 * يرسل تنبيهات فورية عبر الإيميل والواتساب عند حدوث أخطاء
 */

import { getResendClient } from "./resendClient";

// ───── Config ─────
const ALERT_EMAIL = process.env.ALERT_EMAIL || "khalifa@biotrack-ai.com";
const APP_NAME = "BioTrack AI";

// CallMeBot WhatsApp Config (مجاني - بدون Twilio)
// أضف في Replit Secrets:
//   CALLMEBOT_PHONE  → 971503222434
//   CALLMEBOT_APIKEY → 9222833
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE;
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY;

// منع إرسال نفس الخطأ كثيراً (cooldown 5 دقائق)
const errorCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000;

// إحصائيات في الذاكرة
export const monitorStats = {
  totalErrors: 0,
  criticalErrors: 0,
  warnings: 0,
  lastError: null as ErrorLog | null,
  errors: [] as ErrorLog[],
  startTime: Date.now(),
};

export interface ErrorLog {
  id: string;
  type: "critical" | "error" | "warning";
  title: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
  notified: boolean;
}

// ───── Core Monitor Functions ─────

export async function logError(
  title: string,
  error: any,
  context?: Record<string, any>,
  type: "critical" | "error" | "warning" = "error"
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const log: ErrorLog = {
    id: Date.now().toString(36),
    type,
    title,
    message: errorMessage,
    stack: errorStack,
    context,
    timestamp: new Date(),
    notified: false,
  };

  // تحديث الإحصائيات
  monitorStats.totalErrors++;
  if (type === "critical") monitorStats.criticalErrors++;
  if (type === "warning") monitorStats.warnings++;
  monitorStats.lastError = log;
  monitorStats.errors.unshift(log);
  if (monitorStats.errors.length > 100) monitorStats.errors.pop();

  console.error(`[MONITOR][${type.toUpperCase()}] ${title}: ${errorMessage}`);

  // إرسال تنبيه (مع cooldown)
  const cooldownKey = `${type}:${title}`;
  const lastSent = errorCooldowns.get(cooldownKey) || 0;
  const now = Date.now();

  if (now - lastSent > COOLDOWN_MS) {
    errorCooldowns.set(cooldownKey, now);
    log.notified = true;
    await Promise.allSettled([
      sendAlertEmail(log).catch((e) =>
        console.error("[MONITOR] Failed to send alert email:", e.message)
      ),
      sendWhatsApp(log).catch((e) =>
        console.error("[MONITOR] Failed to send WhatsApp alert:", e.message)
      ),
    ]);
  }
}

// ───── Email Alert ─────

async function sendAlertEmail(log: ErrorLog): Promise<void> {
  try {
    const { client, fromEmail } = await getResendClient();

    const typeEmoji = log.type === "critical" ? "🔴" : log.type === "error" ? "🟠" : "🟡";
    const typeLabel = log.type === "critical" ? "CRITICAL" : log.type === "error" ? "ERROR" : "WARNING";

    const contextHtml = log.context
      ? `<table style="width:100%;border-collapse:collapse;margin-top:8px">${Object.entries(log.context)
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 8px;background:#f5f5f5;font-weight:bold;width:140px">${k}</td><td style="padding:4px 8px;background:#fff;word-break:break-all">${JSON.stringify(v)}</td></tr>`
          )
          .join("")}</table>`
      : "<p style='color:#999'>لا يوجد context إضافي</p>";

    const stackHtml = log.stack
      ? `<pre style="background:#1a1a1a;color:#ff6b6b;padding:12px;border-radius:6px;font-size:11px;overflow:auto;max-height:200px">${log.stack}</pre>`
      : "";

    const subject = `${typeEmoji} ${APP_NAME} ${typeLabel}: ${log.title}`;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)">
    <div style="background:${log.type === "critical" ? "#dc2626" : log.type === "error" ? "#ea580c" : "#d97706"};padding:20px 24px">
      <h1 style="margin:0;color:#fff;font-size:20px">${typeEmoji} ${APP_NAME} Monitor</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${typeLabel} — تنبيه فوري</p>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px">${log.title}</h2>
      <p style="margin:0 0 20px;color:#555;font-size:15px;background:#fff3cd;padding:12px;border-radius:6px;border-right:4px solid #ffc107">${log.message}</p>
      <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px;background:#f8f8f8;padding:12px;border-radius:6px">
          <p style="margin:0;font-size:12px;color:#999">الوقت</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:bold">${log.timestamp.toLocaleString("ar-AE", { timeZone: "Asia/Dubai" })}</p>
        </div>
        <div style="flex:1;min-width:200px;background:#f8f8f8;padding:12px;border-radius:6px">
          <p style="margin:0;font-size:12px;color:#999">معرف الخطأ</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:bold;font-family:monospace">${log.id}</p>
        </div>
        <div style="flex:1;min-width:200px;background:#f8f8f8;padding:12px;border-radius:6px">
          <p style="margin:0;font-size:12px;color:#999">إجمالي الأخطاء</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:bold">${monitorStats.totalErrors} خطأ</p>
        </div>
      </div>
      ${log.context ? `<h3 style="margin:0 0 8px;font-size:14px;color:#444">📋 تفاصيل إضافية</h3>${contextHtml}` : ""}
      ${log.stack ? `<h3 style="margin:20px 0 8px;font-size:14px;color:#444">🔍 Stack Trace</h3>${stackHtml}` : ""}
    </div>
    <div style="background:#f8f8f8;padding:16px 24px;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#999;text-align:center">${APP_NAME} Monitoring System • biotrack-ai.com</p>
    </div>
  </div>
</body>
</html>`;

    await client.emails.send({
      from: fromEmail,
      to: ALERT_EMAIL,
      subject,
      html,
    });

    console.log(`[MONITOR] Alert email sent for: ${log.title}`);
  } catch (err: any) {
    console.error("[MONITOR] Email send failed:", err.message);
  }
}

// ───── WhatsApp Alert (CallMeBot - مجاني) ─────

async function sendWhatsApp(log: ErrorLog): Promise<void> {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    console.log("[MONITOR] WhatsApp skipped — أضف CALLMEBOT_PHONE و CALLMEBOT_APIKEY في Replit Secrets");
    return;
  }

  try {
    const typeEmoji = log.type === "critical" ? "🔴" : log.type === "error" ? "🟠" : "🟡";
    const typeLabel = log.type === "critical" ? "CRITICAL" : log.type === "error" ? "ERROR" : "WARNING";

    const contextText = log.context
      ? "\n" + Object.entries(log.context)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `• ${k}: ${JSON.stringify(v)}`)
          .join("\n")
      : "";

    const message = [
      `${typeEmoji} *${APP_NAME} ${typeLabel}*`,
      ``,
      `*${log.title}*`,
      `${log.message}`,
      ``,
      `🕐 ${log.timestamp.toLocaleString("ar-AE", { timeZone: "Asia/Dubai" })}`,
      `🆔 ${log.id}`,
      `📊 إجمالي الأخطاء: ${monitorStats.totalErrors}`,
      contextText ? `\n📋 التفاصيل:\n${contextText}` : "",
      ``,
      `biotrack-ai.com`,
    ].filter(line => line !== "").join("\n");

    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${CALLMEBOT_PHONE}&text=${encodedMsg}&apikey=${CALLMEBOT_APIKEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CallMeBot error: ${response.status}`);
    }

    console.log(`[MONITOR] WhatsApp alert sent for: ${log.title}`);
  } catch (err: any) {
    console.error("[MONITOR] WhatsApp send failed:", err.message);
  }
}

// ───── Express Middleware ─────

export function monitorMiddleware(
  err: any,
  req: any,
  res: any,
  next: any
): void {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    logError(
      `API Error: ${req.method} ${req.path}`,
      err,
      {
        method: req.method,
        path: req.path,
        status,
        userId: req.user?.id || "anonymous",
        body: req.method !== "GET" ? JSON.stringify(req.body).slice(0, 200) : undefined,
      },
      "error"
    ).catch(() => {});
  }

  next(err);
}

// ───── Manual Alert Helpers ─────

export const monitor = {
  /** خطأ عادي */
  error: (title: string, error: any, context?: Record<string, any>) =>
    logError(title, error, context, "error"),

  /** خطأ حرج - يرسل تنبيه فوري */
  critical: (title: string, error: any, context?: Record<string, any>) =>
    logError(title, error, context, "critical"),

  /** تحذير */
  warn: (title: string, message: string, context?: Record<string, any>) =>
    logError(title, new Error(message), context, "warning"),
};
