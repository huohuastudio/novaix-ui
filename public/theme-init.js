(function () {
  var theme = localStorage.getItem("theme") || "system"
  var isDark = theme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : theme === "dark"
  if (isDark) {
    document.documentElement.classList.add("dark")
  }
})()
