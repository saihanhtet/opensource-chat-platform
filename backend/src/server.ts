import dotenv from "dotenv";
import http from "http";
import path from "path";

import { createApp } from "./app.ts";
import { connectDatabase } from "./lib/database.ts";
import { initSocketServer } from "./socket/server.ts";

dotenv.config({ path: path.join(import.meta.dir, "../.env") });

const frontendDir = path.join(import.meta.dir, "../../frontend");

async function bootstrap() {
  const app = createApp();
  const httpServer = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;
  const env = process.env.NODE_ENV || "development";

  if (env === "production") {
    const { default: next } = await import("next");
    const nextApp = next({
      dev: false,
      dir: frontendDir,
    });
    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    app.use((req, res, nextFn) => {
      const url = req.originalUrl ?? req.url ?? "";
      if (url.startsWith("/api")) {
        return nextFn();
      }
      return void handle(req, res).catch(nextFn);
    });
  }

  await connectDatabase();
  initSocketServer(httpServer);
  httpServer.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
    console.log("Server can talk now");
  });
}

void bootstrap();
