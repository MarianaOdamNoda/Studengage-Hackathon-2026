import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a verification build run alongside the dev server on :3000 without sharing .next/.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["better-sqlite3", "node-ical"],
};

export default nextConfig;
