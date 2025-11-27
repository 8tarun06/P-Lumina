// src/layouts/DesktopLayout.jsx
import React from "react";

/**
 * DesktopLayout
 * Minimal wrapper for desktop. Keeps your existing Navbar/Sidebar exactly.
 * Use this file to add global desktop-only wrappers later if needed.
 */
export default function DesktopLayout({ children }) {
  return <div className="desktop-layout-wrapper">{children}</div>;
}
