dist/ 目录说明（前后端分离部署）
================================

frontend/
  纯静态站点。在 Vercel 新建项目，Root Directory 设为 dist/frontend（或把本目录内容作为仓库根）。
  构建：无需构建（installCommand 已关闭）。
  环境：前端通过 JS 里的 window.API_BASE_URL 请求后端；默认写死在各 .js 里时可不改。
        若域名与后端不同，请复制 api-config.sample.js 为 api-config.js 并填写后端地址，
        再在页面中先于其他脚本引入 <script src="api-config.js"></script>。

backend/
  仅含 api/ Serverless 函数。在 Vercel 另建项目，Root Directory 设为 dist/backend。
  在 Vercel 环境变量中配置：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY、ADMIN_JWT_SECRET、CORS_ORIGIN
  （CORS_ORIGIN 填你的前端域名，多个用英文逗号分隔；开发可用 *）。
  详见 api/.env.example。

仓库根目录的 vercel.json 仍为「整站一体部署」用；只部署 frontend 或 backend 时请使用各自目录内的 vercel.json。
