/* ================================
   Copupbid Page Protection Script
   Author: Copupbid Security Layer
   Purpose: Deter inspection, copying,
            screenshots & devtools
================================ */

// 🔒 Disable right-click
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// 🔒 Block common inspect / view-source shortcuts
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  // Ctrl / Cmd combinations
  if (
    (e.ctrlKey || e.metaKey) &&
    (
      key === "u" || // View source
      key === "s" || // Save
      key === "p" || // Print
      key === "c" || // Copy
      key === "x" || // Cut
      key === "a" || // Select all
      key === "i" || // DevTools
      key === "j"    // DevTools
    )
  ) {
    e.preventDefault();
    showWarning();
    return false;
  }

  // F12
  if (e.key === "F12") {
    e.preventDefault();
    showWarning();
    return false;
  }
});

// 🔒 Detect DevTools opening (most reliable browser trick)
(function detectDevTools() {
  let devtoolsOpen = false;

  const threshold = 160;

  setInterval(() => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        onDevToolsOpen();
      }
    } else {
      devtoolsOpen = false;
    }
  }, 1000);
})();

// 🔒 Blur page when tab loses focus (screen recording deterrent)
window.addEventListener("blur", () => {
  document.body.style.filter = "blur(10px)";
});

window.addEventListener("focus", () => {
  document.body.style.filter = "none";
});

// 🔒 Disable text selection
document.addEventListener("selectstart", (e) => {
  e.preventDefault();
});

// 🔒 Disable drag (images & text)
document.addEventListener("dragstart", (e) => {
  e.preventDefault();
});

// 🚨 DevTools response
function onDevToolsOpen() {
  document.body.innerHTML = `
    <div style="
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#0a0f1c;
      color:white;
      font-family:Arial;
      text-align:center;
      padding:40px;
    ">
      <div>
        <h1 style="font-size:28px;margin-bottom:16px;">⚠️ Access Restricted</h1>
        <p style="color:#9ca3af;font-size:16px;">
          This page is protected.<br>
          Inspection and copying are not permitted.
        </p>
      </div>
    </div>
  `;
}

// ⚠️ Soft warning popup
function showWarning() {
  const warning = document.createElement("div");
  warning.innerText = "⚠️ This action is restricted on Copupbid";
  warning.style.position = "fixed";
  warning.style.bottom = "20px";
  warning.style.right = "20px";
  warning.style.background = "rgba(0,0,0,0.85)";
  warning.style.color = "#fff";
  warning.style.padding = "12px 16px";
  warning.style.borderRadius = "10px";
  warning.style.fontSize = "14px";
  warning.style.zIndex = "999999";

  document.body.appendChild(warning);

  setTimeout(() => {
    warning.remove();
  }, 2000);
}
