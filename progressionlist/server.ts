import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy for dxdata.json (song data + internal levels) to bypass CORS
  app.get("/api/dxdata", async (req, res) => {
    try {
      const response = await fetch("https://raw.githubusercontent.com/gekichumai/dxrating/main/packages/dxdata/dxdata.json");
      if (!response.ok) throw new Error("Failed to fetch dxdata");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch dxdata" });
    }
  });

  // Image proxy to bypass ORB/CORS for cover arts
  app.get("/api/img/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const imageUrl = `https://shama.dxrating.net/images/cover/v2/${filename}`;
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Image not found");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(404).send("Image not found");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
