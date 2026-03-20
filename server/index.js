import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const locationsPath = path.join(rootDir, "locations.json");
const port = Number(process.env.PORT || 3001);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".webp": "image/webp"
};

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/locations") {
    try {
      const contents = await readFile(locationsPath, "utf8");
      response.writeHead(200, { "Content-Type": mimeTypes[".json"] });
      response.end(contents);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Unable to load locations data." }));
    }
    return;
  }

  if (requestUrl.pathname === "/api/health") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (!existsSync(distDir)) {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Client build not found. Run `npm run build` first.");
    return;
  }

  const requestPath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, safePath);
  const extension = path.extname(filePath).toLowerCase();
  const streamPath = existsSync(filePath) ? filePath : path.join(distDir, "index.html");
  const streamExtension = path.extname(streamPath).toLowerCase();

  response.writeHead(200, {
    "Content-Type": mimeTypes[streamExtension] || "application/octet-stream"
  });

  createReadStream(streamPath).pipe(response);
});

server.listen(port, () => {
  console.log(`Node server listening on http://localhost:${port}`);
});
