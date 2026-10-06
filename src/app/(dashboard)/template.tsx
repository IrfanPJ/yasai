"use client";

import { motion } from "framer-motion";

// A template (unlike layout) re-mounts on every navigation within this
// route group, which is exactly what gives each page a fresh entrance
// animation. Kept short (160ms) and subtle on purpose — this is an
// internal ops tool staff click through quickly all day; anything longer
// reads as the app being slow, not as "polish".
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-1 flex-col min-h-0"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
