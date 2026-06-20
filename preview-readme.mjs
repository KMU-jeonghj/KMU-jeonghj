import { readFileSync, writeFileSync, watch } from "node:fs";
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readmePath = join(__dirname, "README.md");
const outputPath = join(__dirname, "preview.html");
const PORT = 4173;
const isOnce = process.argv.includes("--once");

function buildHtml(markdown) {
  const body = marked.parse(markdown);

  return `<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>README Preview — KMU-jeonghj</title>
  <link
    id="markdown-theme"
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-light.min.css"
  />
  <style>
    :root {
      --page-bg: #ffffff;
      --banner-bg: #f6f8fa;
      --banner-border: #d0d7de;
      --banner-text: #57606a;
      --banner-accent: #0969da;
      --toggle-bg: #ffffff;
      --toggle-border: #d0d7de;
      --toggle-text: #24292f;
    }

    [data-theme="dark"] {
      --page-bg: #0d1117;
      --banner-bg: #161b22;
      --banner-border: #30363d;
      --banner-text: #8b949e;
      --banner-accent: #58a6ff;
      --toggle-bg: #21262d;
      --toggle-border: #30363d;
      --toggle-text: #c9d1d9;
    }

    body {
      margin: 0;
      background: var(--page-bg);
      transition: background 0.2s ease;
    }

    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
    }

    .preview-banner {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      background: var(--banner-bg);
      border-bottom: 1px solid var(--banner-border);
      color: var(--banner-text);
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 10px 16px;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .preview-banner strong {
      color: var(--banner-accent);
    }

    .preview-hint {
      font-size: 12px;
      opacity: 0.85;
    }

    .theme-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: 1px solid var(--toggle-border);
      border-radius: 6px;
      background: var(--toggle-bg);
      color: var(--toggle-text);
      font: 12px/1.4 inherit;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .theme-toggle:hover {
      border-color: var(--banner-accent);
    }

    .theme-toggle:focus-visible {
      outline: 2px solid var(--banner-accent);
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  <div class="preview-banner">
    <span>
      <strong>Local Preview</strong>
      <span class="preview-hint"> — README 저장 후 새로고침(F5)하면 반영됩니다.</span>
    </span>
    <button type="button" class="theme-toggle" id="theme-toggle" aria-label="테마 전환">
      🌙 Dark
    </button>
  </div>
  <article class="markdown-body">${body}</article>
  <script>
    const STORAGE_KEY = "readme-preview-theme";
    const root = document.documentElement;
    const toggleBtn = document.getElementById("theme-toggle");
    const themeLink = document.getElementById("markdown-theme");

    const themes = {
      light: {
        css: "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-light.min.css",
        label: "🌙 Dark",
        next: "dark",
      },
      dark: {
        css: "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-dark.min.css",
        label: "☀️ Light",
        next: "light",
      },
    };

    function applyTheme(theme) {
      const config = themes[theme] ?? themes.light;
      root.setAttribute("data-theme", theme);
      themeLink.href = config.css;
      toggleBtn.textContent = config.label;
      toggleBtn.dataset.next = config.next;
      localStorage.setItem(STORAGE_KEY, theme);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    applyTheme(saved === "dark" ? "dark" : "light");

    toggleBtn.addEventListener("click", () => {
      applyTheme(toggleBtn.dataset.next);
    });
  </script>
</body>
</html>`;
}

function renderFromReadme() {
  const markdown = readFileSync(readmePath, "utf-8");
  return buildHtml(markdown);
}

function openBrowser(url) {
  try {
    execSync(`start "" "${url}"`, { shell: true });
  } catch {
    console.log(`Open ${url} in your browser manually.`);
  }
}

function startServer() {
  const server = createServer((req, res) => {
    if (req.url !== "/" && req.url !== "/index.html") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    try {
      const html = renderFromReadme();
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Preview build failed: ${error.message}`);
    }
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Preview server: ${url}`);
    console.log("README.md 저장 후 브라우저에서 F5로 새로고침하세요.");
    console.log("종료: Ctrl + C");
    openBrowser(url);
  });

  watch(readmePath, { persistent: true }, () => {
    console.log("[preview] README.md changed — refresh browser (F5)");
  });
}

if (isOnce) {
  const html = renderFromReadme();
  writeFileSync(outputPath, html, "utf-8");
  console.log(`Generated: ${outputPath}`);
  openBrowser(outputPath);
} else {
  startServer();
}
