/* src/layouts/ResponsiveWrapper.jsx */
import React, { useEffect, useState } from "react";
import DesktopLayout from "./DesktopLayout";
import TabletLayout from "./TabletLayout";
import MobileLayout from "./MobileLayout";
import "./responsive-overrides.css";

/**
 * ResponsiveWrapper
 * - Pass Page={Home} (component) and optional pageProps.
 * - Chooses device type and renders Desktop/Tablet/Mobile layout.
 *
 * NOTE: This wrapper does NOT change Home.jsx. It simply places Home
 * inside the chosen layout. Mobile layout displays the new Amazon-style
 * top bar and bottom navigation and hides the original .top-navbar/.sidebar
 * through CSS override.
 */
export default function ResponsiveWrapper({ Page, pageProps = {} }) {
  const getDeviceType = (width) => {
    // UPDATED BREAKPOINTS — DO NOT TOUCH ANYTHING ELSE
    if (width <= 820) return "phone";     // FIX: Real phones now load MobileLayout
    if (width <= 1024) return "tablet";   // Tablet layout untouched
    return "desktop";                     // Desktop unchanged
  };

  const [device, setDevice] = useState(getDeviceType(window.innerWidth));

  useEffect(() => {
    const onResize = () => setDevice(getDeviceType(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Desktop
  if (device === "desktop") {
    return (
      <DesktopLayout>
        <Page {...pageProps} />
      </DesktopLayout>
    );
  }

  // Tablet
  if (device === "tablet") {
    return (
      <TabletLayout>
        <Page {...pageProps} />
      </TabletLayout>
    );
  }

  // Phone
  return (
    <MobileLayout>
      <Page {...pageProps} />
    </MobileLayout>
  );
}
