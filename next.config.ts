import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from generating AGENTS.md / CLAUDE.md files into the project.
  agentRules: false,
  // `npm run package:cpanel` needs a self-contained server build it can upload to the hosting.
  output: "standalone",
};

export default nextConfig;
