<div align="center">
  <h1 style="margin: 0; font-size: 2.5rem; font-weight: bold;">一生足迹工具箱</h1>
  <p>
    <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat" alt="Version" />
    <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=white&style=flat" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5.0.8-646CFF?logo=vite&logoColor=white&style=flat" alt="Vite" />
    <img src="https://img.shields.io/badge/Ant%20Design-6.1.2-0170FE?logo=ant-design&logoColor=white&style=flat" alt="Ant Design" />
    <img src="https://img.shields.io/github/stars/your-username/steplife-toolkit?style=social" alt="GitHub stars" />
  </p>
  <p>
    <em>
      一个专业的坐标点管理工具，支持一生足迹数据文件的可视化编辑、批量处理和智能管理。<br />
      提供直观的地图界面，支持数据导入、筛选、编辑和导出，所有操作都在浏览器本地完成，保护您的隐私安全。
    </em>
  </p>
  <p>
    <a href="https://your-username.github.io/steplife-toolkit/" target="_blank" style="font-size: 20px; font-weight: bold; text-decoration: none;">
      👉 在线体验地址（Github Pages）
    </a>
  </p>
  <p>
    <a href="https://steplife-toolkit.vercel.app/" target="_blank" style="font-size: 18px; font-weight: bold; text-decoration: none; margin-right: 16px;">
      🚀 Vercel 访问地址
    </a>
    <a href="https://steplife-toolkit.netlify.app/" target="_blank" style="font-size: 18px; font-weight: bold; text-decoration: none;">
      🌐 Netlify 访问地址
    </a>
  </p>
</div>

---

<div align="center" style="margin-bottom: 12px;">
  <p style="font-size: 16px; margin-bottom: 8px;">
    支持一键部署，点击下方按钮即可将本项目快速部署到 Vercel 或 Netlify，立即体验或搭建属于你自己的轨迹数据管理工具：
  </p>
  <div style="margin-bottom: 8px;">
    <span style="font-size: 15px; font-weight: bold; margin-right: 10px;">Vercel 部署：</span>
    <a href="https://vercel.com/new/clone?repository-url=https://github.com/your-username/steplife-toolkit" target="_blank" style="display: inline-block; margin-right: 20px;">
      <img src="https://vercel.com/button" alt="使用 Vercel 部署" height="32" />
    </a>
  </div>
  <div>
    <span style="font-size: 15px; font-weight: bold; margin-right: 10px;">Netlify 部署：</span>
    <a href="https://app.netlify.com/start/deploy?repository=https://github.com/your-username/steplife-toolkit" target="_blank" style="display: inline-block;">
      <img src="https://www.netlify.com/img/deploy/button.svg" alt="使用 Netlify 部署" height="32" />
    </a>
  </div>
</div>

---

## ✨ 功能特性

### 📊 数据管理
- ✅ **CSV 文件解析**：支持导入一生足迹标准格式的 CSV 数据文件
- ✅ **多文件导入**：支持同时导入多个 CSV 文件，自动叠加显示
- ✅ **数据导出**：支持将处理后的数据按原格式导出为 CSV 文件
- ✅ **实时统计**：显示文件数量、坐标点总数、时间范围等统计信息

### 🗺️ 地图可视化
- ✅ **交互式地图**：基于 Leaflet 的高性能地图组件
- ✅ **坐标点显示**：在地图上以标记点的方式可视化所有坐标数据
- ✅ **地图图层**：支持多种地图样式选择
- ✅ **缩放控制**：支持地图缩放和平移操作

### ✂️ 智能编辑
- ✅ **框选删除**：在地图上绘制矩形框选区域，批量删除选中的坐标点
- ✅ **时间段筛选**：支持按时间范围筛选和删除坐标点
- ✅ **批量操作**：支持选中多个文件进行批量处理
- ✅ **撤销恢复**：支持撤销上一步操作，保护数据安全

### 🎨 用户体验
- ✅ **响应式布局**：完美适配桌面和移动设备
- ✅ **可调整界面**：支持拖拽调整地图和操作面板的比例
- ✅ **折叠面板**：支持折叠/展开筛选器，节省界面空间
- ✅ **深色模式**：支持白天/夜间主题切换
- ✅ **设置持久化**：界面设置自动保存到本地存储
- ✅ **完全本地处理**：所有数据在浏览器中处理，无需上传到服务器，保护隐私安全

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0（推荐 >= 18.0.0）
- npm >= 7.0.0

### 安装和运行

```bash
# 克隆项目
git clone https://github.com/your-username/steplife-toolkit.git
cd steplife-toolkit

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看应用。

### 构建生产版本

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

构建产物将输出到 `dist` 目录，可直接部署到静态文件服务器。

## 📖 使用指南

### 操作流程

应用提供完整的数据处理工作流：

1. **📁 文件导入** - 上传一生足迹格式的 CSV 文件（支持拖拽）
2. **👁️ 数据预览** - 查看文件统计信息和地图可视化
3. **🔧 数据编辑** - 使用框选或时间筛选进行数据清理
4. **💾 数据导出** - 下载处理后的 CSV 文件

### 文件上传

#### 支持格式
- **文件格式**：`.csv`（一生足迹标准格式）
- **上传方式**：支持点击选择或拖拽上传
- **批量上传**：可同时上传多个文件进行处理
- **文件验证**：自动验证 CSV 格式和数据完整性

#### 数据格式要求

CSV 文件应包含以下列：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `dataTime` | Unix 时间戳 | 数据时间戳 |
| `locType` | 数字 | 位置类型 |
| `longitude` | 数字 | 经度坐标 |
| `latitude` | 数字 | 纬度坐标 |
| `heading` | 数字 | 方向角度 |
| `accuracy` | 数字 | 定位精度 |
| `speed` | 数字 | 移动速度 |
| `distance` | 数字 | 距离 |
| `isBackForeground` | 数字 | 前后台标识 |
| `stepType` | 数字 | 步数类型 |
| `altitude` | 数字 | 海拔高度 |

**示例数据**：
```csv
dataTime,locType,longitude,latitude,heading,accuracy,speed,distance,isBackForeground,stepType,altitude
1766856707,0,116.27712,39.8947186,0,0,0,0,0,0,0
1766856720,0,116.2757362,39.8947469,0,0,1.5,0,0,0,0
1766856733,0,116.2743524,39.8947752,0,0,1.5,0,0,0,0
```

### 数据编辑功能

#### 框选删除
1. 点击"框选模式"按钮进入框选状态
2. 在地图上拖拽绘制矩形选择框
3. 选中的坐标点会高亮显示
4. 点击"删除选中点"确认删除

#### 时间段筛选
1. 在时间筛选器中设置开始和结束时间
2. 点击"应用筛选"查看该时间段内的数据
3. 点击"删除时间段"清除该时间段的所有数据

#### 多文件管理
- 支持同时加载多个 CSV 文件
- 每个文件独立显示，可单独编辑
- 支持批量导出所有文件

### 数据导出

#### 导出格式
- **文件名格式**：`原文件名_modified.csv`
- **文件格式**：保持原始 CSV 格式和数据结构
- **编码格式**：UTF-8（带 BOM）

#### 导出选项
- **单个导出**：选择特定文件单独导出
- **批量导出**：将所有文件打包为 ZIP 压缩包

## 🛠️ 技术栈

### 前端框架
- **React 19.2.3** - 用户界面框架
- **Vite 5.0.8** - 快速构建工具和开发服务器

### UI 组件库
- **Ant Design 6.1.2** - 企业级 UI 组件库

### 地图组件
- **Leaflet 1.9.4** - 开源地图库
- **react-leaflet 5.0.0** - React Leaflet 组件

### 数据处理
- **PapaParse 5.4.1** - 高性能 CSV 解析器
- **Day.js 1.11.10** - 轻量级日期处理库

### 开发工具
- **TypeScript 5.2.2** - 类型安全的 JavaScript
- **@vitejs/plugin-react 4.2.1** - Vite React 插件

## 📁 项目结构

```
steplife-toolkit/
├── src/
│   ├── components/          # React 组件
│   │   ├── MapComponent.jsx # 地图组件
│   │   └── App.jsx          # 主应用组件
│   ├── App.css              # 应用样式
│   ├── index.css            # 全局样式
│   └── main.jsx             # 应用入口
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions 部署配置
├── public/                  # 静态资源
├── index.html              # HTML 模板
├── package.json            # 项目配置和依赖
├── vite.config.js          # Vite 构建配置
└── README.md               # 项目文档
```

## 🌐 浏览器兼容性

- ✅ Chrome/Edge (最新版本)
- ✅ Firefox (最新版本)
- ✅ Safari (最新版本)

**注意**：需要支持以下现代 Web API：
- ES6+ 语法
- `FileReader` API（用于文件读取）
- `Blob` API（用于文件生成）
- `URL.createObjectURL`（用于文件下载）

## 🚀 部署指南

本项目支持多种部署方式，选择最适合您的方案：

### 🌟 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/steplife-toolkit)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/steplife-toolkit)

### 📦 快速部署

#### Vercel 部署（推荐）
```bash
npm install -g vercel
vercel --prod
```

#### Netlify 部署
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

#### GitHub Pages 部署
项目已配置 GitHub Actions 自动部署，推送到 `main` 分支即可自动部署。

### ⚙️ 自动部署配置

项目配置了 GitHub Actions 自动部署工作流，支持部署到多个平台。

#### 支持的部署平台

- **GitHub Pages** - 自动部署到 GitHub Pages（免费）
- **Vercel** - 自动部署到 Vercel（需要配置 secrets）
- **Netlify** - 自动部署到 Netlify（需要配置 secrets）

#### 触发条件

- 推送到 `main` 分支时自动触发部署
- 创建 Pull Request 时会构建但不部署（仅验证）

#### GitHub Pages（自动启用）

GitHub Pages 部署会自动启用，无需额外配置。首次部署需要：

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 中选择 **GitHub Actions**
3. 推送到 `main` 分支后会自动部署

#### Vercel 部署（可选）

如需启用 Vercel 自动部署，需要在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets：
   - `VERCEL_TOKEN`: Vercel 访问令牌
     - 获取方式：Vercel Dashboard → Settings → Tokens → Create Token
   - `VERCEL_ORG_ID`: Vercel 组织 ID
     - 获取方式：Vercel Dashboard → Settings → General → Team ID
   - `VERCEL_PROJECT_ID`: Vercel 项目 ID
     - 获取方式：项目 Settings → General → Project ID

#### Netlify 部署（可选）

如需启用 Netlify 自动部署，需要在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库的 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets：
   - `NETLIFY_AUTH_TOKEN`: Netlify 认证令牌
     - 获取方式：Netlify Dashboard → User settings → Applications → New access token
   - `NETLIFY_SITE_ID`: Netlify 站点 ID
     - 获取方式：站点 Settings → General → Site details → Site ID

#### 查看部署状态

- 在 GitHub 仓库的 **Actions** 标签页查看部署状态
- 部署成功后，可以在对应平台的 Dashboard 查看部署详情
- Pull Request 中会自动评论部署预览链接（如果配置了 Vercel 或 Netlify）

## ⚠️ 注意事项

1. **隐私安全**：所有数据处理都在浏览器本地完成，不会上传到任何服务器
2. **文件大小**：大文件处理可能需要一些时间，请耐心等待
3. **数据备份**：建议在处理前先备份原始文件
4. **浏览器兼容**：建议使用最新版本的现代浏览器以获得最佳体验
5. **数据格式**：请确保 CSV 文件格式正确，包含所有必需的列

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 提交规范
```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 组件采用函数式组件 + Hooks 模式
- 使用 Vite 进行快速构建
- 生产构建会自动进行代码压缩和优化

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Ant Design](https://ant.design/) - UI 组件库
- [Leaflet](https://leafletjs.com/) - 地图库
- [PapaParse](https://www.papaparse.com/) - CSV 解析库

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 [Issue](https://github.com/your-username/steplife-toolkit/issues)
- 在 [GitHub](https://github.com/your-username/steplife-toolkit) 上参与讨论

---

<div align="center">

⭐ 如果这个项目对您有帮助，请给我们一个星标！

**Made with ❤️ for 一生足迹用户**

</div>

