import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve app-ads.txt with correct content type for AdMob verification
  app.get("/app-ads.txt", (_req, res) => {
    const appAdsPath = path.resolve(distPath, "app-ads.txt");
    if (fs.existsSync(appAdsPath)) {
      res.type("text/plain").sendFile(appAdsPath);
    } else {
      // Hardcoded fallback to ensure AdMob verification always works
      res.type("text/plain").send(
        "google.com, pub-1897992442343412, DIRECT, f08c47fec0942fa0\n"
      );
    }
  });

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
