import { createApp } from "./app.ts";
import express from "express";
import { resolve } from "node:path";
import { createServer as createHttpServer } from "node:http";
const app = createApp();
const server = createHttpServer(app);
if (process.argv.includes("--production")) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 3000),
  host = process.env.HOST ?? "127.0.0.1";
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `El puerto ${port} ya está ocupado. Cierra la otra instancia o cambia PORT.`
      : error.message,
  );
  process.exit(1);
});
server.listen(port, host, () =>
  console.log(`QA Lab listo: http://${host}:${port}`),
);
