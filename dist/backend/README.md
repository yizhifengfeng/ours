# API (Vercel + Supabase)

## 安装

```bash
cd api
npm install
```

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_JWT_SECRET`
- `CORS_ORIGIN`

## 主要权限规则（按你当前需求）

- 普通用户：
  - 可读公开数据（places / danmaku / keywords / messages / music current）
  - 不可上传音乐，不可修改页面内容
  - 不可读取信件内容
  - 仅可通过 `PATCH /api/messages-position` 保存留言板拖拽位置
- 管理员（JWT）：
  - 可新增/编辑/删除页面相关数据
  - 可上传音乐并设置当前播放曲目
  - 可读写信件

## 已实现端点

- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET|POST|PATCH|DELETE /api/places`
- `GET|POST|PATCH|DELETE /api/danmaku`
- `GET|POST|PATCH|DELETE /api/place-photos`
- `GET|POST|PATCH|DELETE /api/keywords`
- `GET|POST|PATCH|DELETE /api/messages`
- `PATCH /api/messages-position`
- `GET|POST|PATCH|DELETE /api/letters` (admin only)
- `GET|POST /api/letter-reads`
- `GET|POST /api/music-current`
- `GET|POST|DELETE /api/music-tracks`
- `POST /api/upload-sign` (admin only)
- `POST /api/music-upload-sign` (admin only)

## Supabase

请先在 Supabase SQL Editor 运行 `supabase-schema.sql`。

另外建议创建两个 Storage bucket：

- `uploads-images`
- `uploads-music`

并结合你的前端上传流程使用 `createSignedUploadUrl`。
