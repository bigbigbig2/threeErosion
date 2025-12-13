# Phase 2: 模拟引擎迁移 - 进度记录

## 已完成 ✅

### 核心架构
- [x] SimulationConfig.ts - 模拟参数配置
- [x] TextureManager.ts - Ping-Pong 纹理管理器
- [x] BaseSimPass.ts - 模拟 Pass 基类
- [x] SimulationEngine.ts - 模拟引擎主类
- [x] 集成到 App.ts

### 纹理系统
- [x] 创建所有必需的纹理对：
  - terrain（地形：高度+水深）
  - flux（水流通量）
  - velocity（速度场）
  - sediment（泥沙浓度）
  - sedimentBlend（泥沙混合）
  - terrainFlux（热力侵蚀通量）
  - maxSlippage（最大滑坡高度）
  - terrainNormal（地形法线）
  - sedimentAdvectA/B（MacCormack 中间纹理）

## 进行中 🚧

### 模拟 Pass 实现
接下来需要实现以下 Pass（按执行顺序）：

1. [ ] **RainPass** - 降雨（增加水量）
2. [ ] **FluxPass** - 水流通量计算
3. [ ] **WaterUpdatePass** - 水量和速度更新
4. [ ] **SedimentPass** - 侵蚀和沉积
5. [ ] **AdvectionPass** - 泥沙平流（半拉格朗日）
6. [ ] **MacCormackPass** - MacCormack 平流（可选）
7. [ ] **MaxSlippagePass** - 最大滑坡高度计算
8. [ ] **ThermalFluxPass** - 热力侵蚀通量
9. [ ] **ThermalApplyPass** - 应用热力侵蚀
10. [ ] **EvaporationPass** - 水分蒸发
11. [ ] **AveragePass** - 地形平滑

### 着色器迁移
需要从原项目迁移以下着色器：
- [ ] rain-frag.glsl
- [ ] flow-frag.glsl
- [ ] alterwaterhight-frag.glsl
- [ ] sediment-frag.glsl
- [ ] sediadvect-frag.glsl
- [ ] maccormack-frag.glsl
- [ ] maxslippageheight-frag.glsl
- [ ] thermalterrainflux-frag.glsl
- [ ] thermalapply-frag.glsl
- [ ] eva-frag.glsl
- [ ] average-frag.glsl

## 下一步 📋

1. **创建第一个 Pass（RainPass）**
   - 从原项目复制 rain-frag.glsl
   - 创建 RainPass.ts
   - 测试是否能正常执行

2. **逐个实现其他 Pass**
   - 每实现一个 Pass 就测试一次
   - 确保物理模拟的正确性

3. **初始化地形**
   - 创建 InitialTerrainPass（使用噪声生成初始地形）
   - 从原项目迁移 initial-frag.glsl

## 技术要点

### Three.js WebGLRenderTarget 替代原生 FBO
```typescript
// 原代码
gl_context.bindFramebuffer(gl_context.FRAMEBUFFER, frame_buffer);
gl_context.framebufferTexture2D(...);
renderer.render(camera, shader, [square]);

// Three.js 代码
renderer.setRenderTarget(writeTarget);
renderer.render(simulationScene, simulationCamera);
renderer.setRenderTarget(null);
```

### Ping-Pong 纹理交换
```typescript
// 每帧模拟后交换
this.textureManager.swapTextures();
```

### Uniform 传递
```typescript
// 在 Pass 中设置
this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
```

## 预计时间

- Phase 2 总计：3-5 天
- 当前进度：20%（核心架构完成）
- 剩余工作：实现 11 个 Pass + 测试

## 测试计划

1. **单元测试**：每个 Pass 独立测试
2. **集成测试**：完整模拟流程测试
3. **对比测试**：与原项目结果对比

## 注意事项

- 着色器代码基本不需要修改（只需调整 uniform 名称）
- 注意 Three.js 的纹理坐标系（Y 轴可能需要翻转）
- 确保浮点纹理格式正确（THREE.FloatType）
