import { App } from "./app/App";
import "./styles/main.css";

function paintError(error: unknown): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root || root.dataset.booted === "1") return;
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `<main style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#060914;color:#f8fafc;text-align:center;direction:rtl">
    <section><h1 style="color:#fbbf24">המשחק לא הצליח להיטען</h1><p>רעננו את הדף או פתחו אותו ישירות בדפדפן.</p><pre style="color:#94a3b8;white-space:pre-wrap">${message.replace(/[&<>]/g, "")}</pre><button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:12px;background:#e11d48;color:white;font-weight:800">נסה שוב</button></section>
  </main>`;
}

window.addEventListener("error", (event) => paintError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => paintError(event.reason));

try {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("#app is missing");
  new App(root);
} catch (error) {
  paintError(error);
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js").catch(() => {
      // The game remains playable online if registration is blocked.
    });
  });
}
