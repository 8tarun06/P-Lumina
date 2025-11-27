// src/layouts/TabletLayout.jsx
import React from "react";

/**
 * TabletLayout
 * Slightly different wrapper for tablet widths (keeps Navbar/Sidebar).
 * It exists so you can tweak tablet-specific behaviors later.
 */
export default function TabletLayout({ children }) {
  return <div className="tablet-layout-wrapper">{children}</div>;
}
