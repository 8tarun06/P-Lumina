export function setupThemeToggle() {
  try {
    const applyTheme = (theme) => {
      document.body.classList.toggle("dark-mode", theme === "dark");

      const logo = document.getElementById("siteLogo");
      if (logo) {
        logo.src = theme === "dark" ? "dark mode logo.png" : "logo.png";
      }

      const toggle = document.getElementById("theme-toggle");
      if (toggle) toggle.checked = theme === "dark";
    };

    const savedTheme = localStorage.getItem("theme") || "light";
    requestAnimationFrame(() => applyTheme(savedTheme));

    const toggle = document.getElementById("theme-toggle");

    const handleToggle = () => {
      const isDark = document.body.classList.toggle("dark-mode");
      const newTheme = isDark ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    };

    if (toggle) {
      toggle.addEventListener("change", handleToggle);
    }

    // ✅ Sync across tabs
    const handleStorage = (event) => {
      if (event.key === "theme") {
        applyTheme(event.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);

    // ✅ Cleanup function
    return () => {
      if (toggle) toggle.removeEventListener("change", handleToggle);
      window.removeEventListener("storage", handleStorage);
    };
  } catch (err) {
    console.error("🔥 Theme sync failed:", err);
  }
}

