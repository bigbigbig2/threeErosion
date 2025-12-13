# 🚀 启动指南

## Phase 1 完成！✅

基础框架已经搭建完成，包括：

### ✅ 已完成的内容

1. **项目配置**
   - ✅ Vite 配置（支持 TypeScript 和 GLSL）
   - ✅ TypeScript 配置（严格模式 + 路径别名）
   - ✅ package.json（所有依赖已安装）

2. **目录结构**
   ```
   src/
   ├── core/              ✅ 核心系统
   ├── simulation/        📁 待实现
   ├── rendering/         📁 待实现
   ├── interaction/       📁 待实现
   ├── ui/               ✅ UI 系统
   └── utils/            📁 待实现
   ```

3. **核心功能**
   - ✅ App.ts - 主应用类（完整实现）
   - ✅ GUIManager.ts - GUI 调试面板
   - ✅ StatsMonitor.ts - 性能监控
   - ✅ Three.js 基础场景（测试立方体）
   - ✅ OrbitControls 相机控制

## 🎮 如何启动

### 1. 启动开发服务器

```bash
cd threeErosion
npm run dev
```

### 2. 打开浏览器

访问: http://localhost:5660

### 3. 你应该看到

- ✅ 一个旋转的绿色立方体
- ✅ 左上角的性能监控（FPS、CPU、GPU）
- ✅ 右上角的 GUI 调试面板
- ✅ 可以用鼠标旋转、缩放、平移相机

## 🎯 测试功能

### 相机控制
- **鼠标左键拖拽**: 旋转视角
- **鼠标右键拖拽**: 平移相机
- **鼠标滚轮**: 缩放
- **空格键**: 暂停/恢复（控制台会显示）

### GUI 面板
- 模拟控制 → 暂停
- 模拟控制 → 重置
- 渲染参数 → 显示线框
- 相机参数 → 视场角（30-90）

### 性能监控
- FPS: 帧率
- CPU: CPU 使用时间
- GPU: GPU 使用时间（如果支持）

## 📝 下一步：Phase 2

现在基础框架已经完成，接下来需要实现：

### Phase 2: 模拟引擎迁移

1. **创建 SimulationEngine.ts**
   - 管理所有模拟 Pass
   - 使用 WebGLRenderTarget 替代原生 FBO

2. **创建 TextureManager.ts**
   - 管理 Ping-Pong 纹理对
   - 自动交换读写纹理

3. **创建 BaseSimPass.ts**
   - 所有模拟 Pass 的基类
   - 统一的执行接口

4. **迁移模拟 Pass**
   - RainPass（降雨）
   - FluxPass（水流通量）
   - WaterUpdatePass（水量更新）
   - SedimentPass（侵蚀沉积）
   - AdvectionPass（泥沙输运）
   - ThermalPass（热力侵蚀）
   - EvaporationPass（蒸发）

## 🐛 故障排除

### 如果看不到立方体
1. 检查浏览器控制台是否有错误
2. 确认 WebGL2 支持（F12 → Console）
3. 尝试刷新页面

### 如果性能很低
1. 降低浏览器的 devicePixelRatio
2. 关闭阴影（在 App.ts 中）
3. 检查 GPU 驱动是否最新

### 如果端口被占用
修改 `vite.config.ts` 中的 `server.port`

## 📚 参考资料

- [Three.js 文档](https://threejs.org/docs/)
- [Vite 文档](https://vitejs.dev/)
- [原项目文档](../THREEJS_MIGRATION_PLAN.md)

---

**恭喜！Phase 1 完成！🎉**

现在你有了一个完整的 Three.js 开发环境，可以开始实现物理模拟了。
