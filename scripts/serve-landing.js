const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const publicDir = path.join(__dirname, "..", "public");
const args = process.argv.slice(2);

let port = Number(process.env.PORT) || 5500;
let shouldOpen = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === "--open") {
    shouldOpen = true;
    continue;
  }

  if (arg === "--port" && args[i + 1]) {
    const parsedPort = Number(args[i + 1]);
    if (Number.isInteger(parsedPort) && parsedPort > 0) {
      port = parsedPort;
      i += 1;
    }
  }
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8"
};

function openBrowser(url) {
  const platform = process.platform;

  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function safePathname(requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const decoded = decodeURIComponent(url.pathname);
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized;
}

function resolveFile(requestPath) {
  const absolutePath = path.join(publicDir, requestPath);
  const normalizedAbsolutePath = path.normalize(absolutePath);

  if (!normalizedAbsolutePath.startsWith(publicDir)) {
    return null;
  }

  if (fs.existsSync(normalizedAbsolutePath) && fs.statSync(normalizedAbsolutePath).isDirectory()) {
    const directoryIndex = path.join(normalizedAbsolutePath, "index.html");
    if (fs.existsSync(directoryIndex)) {
      return directoryIndex;
    }
  }

  if (fs.existsSync(normalizedAbsolutePath) && fs.statSync(normalizedAbsolutePath).isFile()) {
    return normalizedAbsolutePath;
  }

  // Mirror the hosting config by serving index.html for unknown document routes.
  if (!path.extname(requestPath)) {
    return path.join(publicDir, "index.html");
  }

  return null;
}

const server = http.createServer((req, res) => {
  try {
    const requestPath = safePathname(req.url || "/");
    const filePath = resolveFile(requestPath);

    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
    console.error(error);
  }
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Landing site running at ${url}`);
  console.log("Press Ctrl+C to stop.");

  if (shouldOpen) {
    openBrowser(url);
  }
});
