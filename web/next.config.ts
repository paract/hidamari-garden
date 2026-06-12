import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 複数の package-lock.json が存在する環境で、web/ をルートと認識させる
  outputFileTracingRoot: path.join(__dirname, "./"),
};

export default nextConfig;
