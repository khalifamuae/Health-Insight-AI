import { sendTestEmail } from "./resendClient";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startDailyLearningSchedule } from "./knowledgeEngine";
import { monitorMiddleware, monitorStats, monitor } from "./monitor";
import http from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Monitor stats endpoint (للداشبورد)
  app.get("/api/monitor/stats", (req, res) => {
    const uptime = Math.floor((Date.now() - monitorStats.startTime) / 1000);
    res.json({
      uptime,
      totalErrors: monitorStats.totalErrors,
      criticalErrors: monitorStats.criticalErrors,
      warnings: monitorStats.warnings,
      lastError: monitorStats.lastError,
      recentErrors: monitorStats.errors.slice(0, 20),
    });
  });
  app.get("/test-email", async (_req, res) => {
    try {
      const result = await sendTestEmail("khalifamuae@gmail.com");
      res.status(200).json({
        success: true,
        message: "Email sent",
        result,
      });
    } catch (error) {
      console.error("Test email failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send email",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    // 🔴 Monitor: اصطياد الأخطاء وإرسال تنبيه
    monitorMiddleware(err, _req, res, next);

    const status = err.status || err.statusCode || 500;
    const message = status < 500 ? (err.message || "Bad Request") : "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5001", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      startDailyLearningSchedule();
      startHealthMonitor(port);
      startDailyReport();
    },
  );
})();

function startHealthMonitor(port: number) {
  const INTERVAL = 30 * 60 * 1000;

  function checkHealth() {
    const req = http.get(`http://0.0.0.0:${port}/api/health`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const health = JSON.parse(data);
          const mem = health.memory;
          log(
            `Health OK | uptime: ${health.uptime}s | memory: ${mem.heapUsed}/${mem.heapTotal}MB | DB: ${health.database}`,
            "health-monitor",
          );
        } catch {
          log(`Health check response parse error`, "health-monitor");
        }
      });
    });
    req.on("error", (err) => {
      log(`Health check FAILED: ${err.message}`, "health-monitor");
      monitor.critical("Health Check Failed", err, { port });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      log(`Health check TIMEOUT`, "health-monitor");
    });
  }

  log(`Health monitor started (every 30 minutes)`, "health-monitor");
  checkHealth();
  setInterval(checkHealth, INTERVAL);
}

// ───── Daily Report (10 PM Dubai Time) ─────

function startDailyReport() {
  const DUBAI_OFFSET = 4 * 60; // UTC+4

  async function sendDailyReport() {
    try {
      const { db } = await import("./db");
      const { userProfiles } = await import("../shared/schema");
      const { sql, gte } = await import("drizzle-orm");
      const { getResendClient } = await import("./resendClient");

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);

      // إحصائيات المستخدمين
      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(userProfiles);
      const [todayResult] = await db.select({ count: sql<number>`count(*)::int` }).from(userProfiles).where(gte(userProfiles.createdAt, todayStart));
      const [yesterdayResult] = await db.select({ count: sql<number>`count(*)::int` }).from(userProfiles).where(gte(userProfiles.createdAt, yesterday));

      // إحصائيات الباقات
      const planStats = await db.select({
        plan: userProfiles.subscriptionPlan,
        count: sql<number>`count(*)::int`
      }).from(userProfiles).groupBy(userProfiles.subscriptionPlan);

      const totalUsers = totalResult?.count ?? 0;
      const newToday = todayResult?.count ?? 0;
      const newYesterday = yesterdayResult?.count ?? 0;

      const planMap: Record<string, number> = {};
      planStats.forEach(p => { planMap[p.plan ?? "free"] = p.count; });

      const growth = newYesterday > 0
        ? ((newToday - newYesterday) / newYesterday * 100).toFixed(1)
        : newToday > 0 ? "100" : "0";

      const growthEmoji = Number(growth) >= 0 ? "📈" : "📉";

      // إرسال الإيميل
      const { client, fromEmail } = await getResendClient();
      const dateStr = now.toLocaleDateString("ar-AE", { timeZone: "Asia/Dubai", weekday: "long", year: "numeric", month: "long", day: "numeric" });

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#1a56db,#0ea5e9);padding:24px">
      <h1 style="margin:0;color:#fff;font-size:22px">📊 التقرير اليومي — BioTrack AI</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">${dateStr}</p>
    </div>
    <div style="padding:24px">

      <h2 style="margin:0 0 16px;font-size:16px;color:#444">👥 إحصائيات المستخدمين</h2>
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:#eff6ff;padding:16px;border-radius:8px;text-align:center">
          <p style="margin:0;font-size:28px;font-weight:900;color:#1a56db">${totalUsers.toLocaleString("ar")}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#666">إجمالي المستخدمين</p>
        </div>
        <div style="flex:1;min-width:140px;background:#f0fdf4;padding:16px;border-radius:8px;text-align:center">
          <p style="margin:0;font-size:28px;font-weight:900;color:#16a34a">+${newToday}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#666">مستخدمون جدد اليوم</p>
        </div>
        <div style="flex:1;min-width:140px;background:#fefce8;padding:16px;border-radius:8px;text-align:center">
          <p style="margin:0;font-size:28px;font-weight:900;color:#ca8a04">${growthEmoji} ${growth}%</p>
          <p style="margin:4px 0 0;font-size:13px;color:#666">نمو مقارنة بالأمس</p>
        </div>
      </div>

      <h2 style="margin:0 0 12px;font-size:16px;color:#444">💎 توزيع الباقات</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${["free","basic","premium","pro"].map(plan => {
          const count = planMap[plan] ?? 0;
          const pct = totalUsers > 0 ? Math.round(count / totalUsers * 100) : 0;
          const colors: Record<string,string> = { free:"#6b7280", basic:"#0ea5e9", premium:"#8b5cf6", pro:"#f59e0b" };
          const labels: Record<string,string> = { free:"مجاني", basic:"أساسي", premium:"مميز", pro:"برو" };
          return `<tr>
            <td style="padding:8px 12px;background:#f8f8f8;font-weight:bold;width:100px;color:${colors[plan]}">${labels[plan]}</td>
            <td style="padding:8px 12px">
              <div style="background:#e5e7eb;border-radius:4px;height:8px">
                <div style="background:${colors[plan]};width:${pct}%;height:8px;border-radius:4px"></div>
              </div>
            </td>
            <td style="padding:8px 12px;text-align:left;font-weight:bold;width:60px">${count}</td>
            <td style="padding:8px 12px;color:#999;width:40px">${pct}%</td>
          </tr>`;
        }).join("")}
      </table>

      <h2 style="margin:0 0 12px;font-size:16px;color:#444">🔍 حالة النظام</h2>
      <div style="background:#f8f8f8;padding:16px;border-radius:8px">
        <p style="margin:0;font-size:14px">أخطاء اليوم: <strong>${monitorStats.totalErrors}</strong></p>
        <p style="margin:6px 0 0;font-size:14px">أخطاء حرجة: <strong style="color:#dc2626">${monitorStats.criticalErrors}</strong></p>
        <p style="margin:6px 0 0;font-size:14px">تحذيرات: <strong style="color:#d97706">${monitorStats.warnings}</strong></p>
      </div>

    </div>
    <div style="background:#f8f8f8;padding:16px 24px;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#999;text-align:center">BioTrack AI Daily Report • biotrack-ai.com</p>
    </div>
  </div>
</body>
</html>`;

      await client.emails.send({
        from: fromEmail,
        to: process.env.ALERT_EMAIL || "khalifa@biotrack-ai.com",
        subject: `📊 التقرير اليومي — ${newToday} مستخدم جديد اليوم | إجمالي ${totalUsers}`,
        html,
      });

      // واتساب
      const phone = process.env.CALLMEBOT_PHONE;
      const apikey = process.env.CALLMEBOT_APIKEY;
      if (phone && apikey) {
        const msg = encodeURIComponent(
          `📊 *التقرير اليومي — BioTrack AI*\n\n` +
          `👥 إجمالي المستخدمين: *${totalUsers}*\n` +
          `🆕 جدد اليوم: *+${newToday}*\n` +
          `${growthEmoji} النمو: *${growth}%*\n\n` +
          `💎 الباقات:\n` +
          `• مجاني: ${planMap["free"] ?? 0}\n` +
          `• أساسي: ${planMap["basic"] ?? 0}\n` +
          `• مميز: ${planMap["premium"] ?? 0}\n` +
          `• برو: ${planMap["pro"] ?? 0}\n\n` +
          `🔍 أخطاء اليوم: ${monitorStats.totalErrors}\n\n` +
          `biotrack-ai.com`
        );
        await fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${msg}&apikey=${apikey}`);
      }

      log(`Daily report sent — Total: ${totalUsers}, New today: ${newToday}`, "daily-report");

    } catch (err: any) {
      log(`Daily report failed: ${err.message}`, "daily-report");
    }
  }

  function scheduleNextReport() {
    const now = new Date();
    // الساعة 10 مساءً بتوقيت دبي = 18:00 UTC
    const next = new Date(now);
    next.setUTCHours(18, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

    const msUntilNext = next.getTime() - now.getTime();
    const hoursUntil = (msUntilNext / 1000 / 60 / 60).toFixed(1);

    log(`Daily report scheduled in ${hoursUntil} hours (10 PM Dubai)`, "daily-report");

    setTimeout(() => {
      sendDailyReport();
      setInterval(sendDailyReport, 24 * 60 * 60 * 1000);
    }, msUntilNext);
  }

  scheduleNextReport();
}
