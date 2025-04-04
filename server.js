
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = 3000;
const API_TARGET = "http://localhost:8000";

app.use("/api", createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  pathRewrite: { "^/api": "" }
}));

app.use("/models", express.static(path.join(__dirname, "public/models")));
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/js", express.static(path.join(__dirname, "public/js")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
});
