# StepLife Toolkit - 坐标管理工具

一个基于 React + Ant Design 的坐标点管理工具，支持 CSV 文件导入、地图可视化、坐标点编辑和导出。

## 功能特性

1. **CSV 文件解析** - 支持导入包含时间戳和经纬度坐标的 CSV 文件
2. **地图可视化** - 在地图上以点的方式显示所有坐标
3. **框选删除** - 支持在地图上框选坐标点并批量删除
4. **多文件导入** - 支持同时导入多个 CSV 文件，叠加显示
5. **时间段删除** - 支持选择时间段，删除该时间段内的所有坐标点
6. **数据导出** - 支持将修改后的坐标数据按原格式导出为 CSV 文件

## 安装依赖

```bash
npm install
```

## 运行项目

```bash
npm run dev
```

项目将在 http://localhost:3000 启动

## 构建生产版本

```bash
npm run build
```

## CSV 文件格式

CSV 文件应包含以下列：

- dataTime: 时间戳（Unix 时间戳）
- locType: 位置类型
- longitude: 经度
- latitude: 纬度
- heading: 方向
- accuracy: 精度
- speed: 速度
- distance: 距离
- isBackForeground: 前后台标识
- stepType: 步数类型
- altitude: 海拔

示例：

```
dataTime	locType	longitude	latitude	heading	accuracy	speed	distance	isBackForeground	stepType	altitude
1766856707	0	116.27712	39.8947186	0	0	0	0	0	0	0
1766856720	0	116.2757362	39.8947469	0	0	1.5	0	0	0	0
```

## 技术栈

- React 18
- Ant Design 5
- Leaflet (地图组件)
- PapaParse (CSV 解析)
- Vite (构建工具)
- Day.js (时间处理)

