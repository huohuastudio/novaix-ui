# Novaix UI

[Novaix](https://github.com/huohuastudio/novaix-releases) 的前端源码，基于 React + TypeScript + TailwindCSS v4 + shadcn/ui 构建。

本仓库随 Novaix 版本发布自动同步，你可以基于它开发自定义主题，或直接修改界面后构建为主题包安装到 Novaix 中。

## 技术栈

- **React 19** + **TypeScript**
- **TailwindCSS v4** — CSS 框架
- **shadcn/ui** — UI 组件库
- **Vite** — 构建工具
- **React Router v7** — 客户端路由
- **@hey-api/openapi-ts** — 从 Swagger 自动生成 API 客户端

## 快速开始

### 环境要求

- Node.js 22+
- pnpm 10+
- 运行中的 Novaix 后端（默认 `http://localhost:8080`）

### 开发

```bash
# 安装依赖
pnpm install

# 生成 API 客户端（需要后端的 swagger.json）
curl -o swagger.json http://localhost:8080/docs/swagger.json
OPENAPI_INPUT=swagger.json pnpm api:gen

# 启动开发服务器（默认端口 3000，API 代理到 localhost:8080）
pnpm dev
```

### 构建

```bash
pnpm build
```

构建产物在 `dist/` 目录下。

## 制作主题

将构建产物打包为 Novaix 主题：

```bash
# 1. 构建
pnpm build

# 2. 创建主题目录
mkdir -p my-theme/ui
cp -r dist/* my-theme/ui/

# 3. 创建 theme.json
cat > my-theme/theme.json << 'EOF'
{
  "id": "my-theme",
  "name": "我的主题",
  "version": "1.0.0",
  "description": "基于官方前端定制的主题",
  "author": {"name": "你的名字"},
  "novaix": "~0.2.5"
}
EOF

# 4. 打包
cd my-theme && zip -r ../my-theme.zip .
```

在 Novaix 后台 → 主题管理 → 上传安装，选择 `my-theme.zip` 即可。

### 提交到主题市场

如果你希望将主题上架到 Novaix 官方主题市场，供所有用户在线安装：

1. Fork [novaix-releases](https://github.com/huohuastudio/novaix-releases) 仓库
2. 将 `my-theme.zip` 放到 `themes/` 目录下
3. 在 `themes/index.json` 的 `themes` 数组中添加你的主题信息：
   ```json
   {
     "id": "my-theme",
     "name": "我的主题",
     "version": "1.0.0",
     "description": "简短描述",
     "author": {"name": "你的名字", "url": "https://github.com/your-name"},
     "novaix": "~0.2.5",
     "download_url": "https://raw.githubusercontent.com/huohuastudio/novaix-releases/main/themes/my-theme.zip"
   }
   ```
4. 提交 PR，审核通过后你的主题将出现在所有 Novaix 实例的主题市场中

详细要求见 [novaix-releases README](https://github.com/huohuastudio/novaix-releases#主题市场)。

## 项目结构

```
src/
├── api/              # 自动生成的 API 客户端（不在仓库中，需运行 pnpm api:gen）
├── components/       # 公共组件
│   └── ui/           # shadcn/ui 基础组件
├── hooks/            # 自定义 Hooks
├── layouts/          # 页面布局（Admin / Portal）
├── lib/              # 工具函数
├── pages/
│   ├── admin/        # 管理后台页面
│   └── portal/       # 用户前台页面
└── App.tsx           # 路由定义
```

## 注意事项

- `src/api/` 目录从 Swagger 文档自动生成，不包含在仓库中。开发前需要先生成 API 客户端
- 开发服务器通过 Vite 代理将 `/api` 请求转发到后端，确保后端已启动
- `theme.json` 中的 `novaix` 字段建议使用 `~x.y.z` 约束（仅允许 patch 更新），前端与后端 API 强耦合
- 本仓库代码随 Novaix 主仓库版本发布自动同步，请基于 tag 对应的版本开发

## 许可证

[MIT](LICENSE)
