/**
 * 模拟引擎主类
 * 负责协调所有模拟 Pass 的执行
 */

import * as THREE from 'three';
import { TextureManager } from './TextureManager';
import type { SimulationConfig } from './SimulationConfig';
import { DEFAULT_SIMULATION_CONFIG } from './SimulationConfig';
import { InitialTerrainPass } from './passes/InitialTerrainPass';
import { RainPass } from './passes/RainPass';
import { FluxPass } from './passes/FluxPass';
import { WaterUpdatePass } from './passes/WaterUpdatePass';
import { SedimentPass } from './passes/SedimentPass';
import { AdvectionPass } from './passes/AdvectionPass';
import { MacCormackPass } from './passes/MacCormackPass';
import { MaxSlippagePass } from './passes/MaxSlippagePass';
import { ThermalFluxPass } from './passes/ThermalFluxPass';
import { ThermalApplyPass } from './passes/ThermalApplyPass';
import { EvaporationPass } from './passes/EvaporationPass';
import { AveragePass } from './passes/AveragePass';
import { BrushPass } from './passes/BrushPass';
import type { BrushParams } from './passes/BrushPass';

export class SimulationEngine {
  private renderer: THREE.WebGLRenderer;
  private textureManager: TextureManager; 
  private config: SimulationConfig;
  
  private simulationScene!: THREE.Scene;
  private simulationCamera!: THREE.OrthographicCamera;
  private quadMesh!: THREE.Mesh;
  
  // 模拟 Pass 列表
  private initialTerrainPass: InitialTerrainPass | null = null;
  private rainPass: RainPass | null = null;
  private fluxPass: FluxPass | null = null;
  private waterUpdatePass: WaterUpdatePass | null = null;
  private sedimentPass: SedimentPass | null = null;
  private advectionPass: AdvectionPass | null = null;
  private macCormackPass: MacCormackPass | null = null;
  private maxSlippagePass: MaxSlippagePass | null = null;
  private thermalFluxPass: ThermalFluxPass | null = null;
  private thermalApplyPass: ThermalApplyPass | null = null;
  private evaporationPass: EvaporationPass | null = null;
  private averagePass: AveragePass | null = null;
  private brushPass: BrushPass | null = null;
  private isInitialized: boolean = false;
  
  private frameCount: number = 0;
  private isPaused: boolean = true;  // 默认暂停，防止启动时淹没
  
  // 缓存复制材质（性能优化）
  private copyMaterial: THREE.ShaderMaterial | null = null;
  
  constructor(renderer: THREE.WebGLRenderer, config: Partial<SimulationConfig> = {}) {
    this.renderer = renderer;
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    
    this.textureManager = new TextureManager(this.config.resolution);
    
    this.setupSimulationScene();
    this.initCopyMaterial();
    this.initializePasses();
    
    console.log('✅ 模拟引擎初始化完成');
  }
  
  /**
   * 设置模拟场景
   * 创建一个全屏四边形用于渲染到纹理
   */
  private setupSimulationScene(): void {
    this.simulationScene = new THREE.Scene();
    
    // 正交相机（-1 到 1 的 NDC 空间）
    this.simulationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // 全屏四边形
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(geometry);
    this.simulationScene.add(this.quadMesh);
  }
  
  /**
   * 初始化所有模拟 Pass
   */
  private initializePasses(): void {
    // 创建地形初始化 Pass
    this.initialTerrainPass = new InitialTerrainPass(this.textureManager);
    
    // 创建降雨 Pass
    this.rainPass = new RainPass(this.textureManager);
    
    // 创建水流通量 Pass
    this.fluxPass = new FluxPass(this.textureManager);
    
    // 创建水量更新 Pass
    this.waterUpdatePass = new WaterUpdatePass(this.textureManager);
    
    // 创建泥沙侵蚀/沉积 Pass
    this.sedimentPass = new SedimentPass(this.textureManager);
    
    // 创建泥沙平流 Pass
    this.advectionPass = new AdvectionPass(this.textureManager);
    
    // 创建 MacCormack 平流 Pass
    this.macCormackPass = new MacCormackPass(this.textureManager);
    
    // 创建热力侵蚀 Pass
    this.maxSlippagePass = new MaxSlippagePass(this.textureManager);
    this.thermalFluxPass = new ThermalFluxPass(this.textureManager);
    this.thermalApplyPass = new ThermalApplyPass(this.textureManager);
    
    // 创建蒸发和平滑 Pass
    this.evaporationPass = new EvaporationPass(this.textureManager);
    this.averagePass = new AveragePass(this.textureManager);
    
    // 创建笔刷 Pass
    this.brushPass = new BrushPass(this.textureManager);
    
    console.log('✅ 模拟 Pass 初始化完成');
  }
  
  /**
   * 更新模拟（每帧调用）
   */
  public update(deltaTime: number): void {
    // 如果地形未初始化，先初始化（即使暂停也要初始化）
    if (!this.isInitialized) {
      console.log('🔧 开始初始化地形...');
      this.executeSimulationStep();
      console.log('✅ 地形初始化完成，isInitialized =', this.isInitialized);
      return;
    }
    
    // 如果暂停，不执行模拟
    if (this.isPaused) return;
    
    // 根据速度设置执行多次模拟
    for (let i = 0; i < this.config.speed; i++) {
      this.executeSimulationStep();
      this.frameCount++;
    }
  }
  
  /**
   * 执行一步完整的模拟
   * 严格按照原版 WebGL 的管线流程：
   * 1. Rain → swap terrain
   * 2. Flux → swap flux
   * 3. WaterUpdate → swap terrain AND velocity (MRT)
   * 4. Sediment → swap terrain, sediment, normal, velocity (MRT)
   */
  private executeSimulationStep(): void {
    // 第一帧：初始化地形（写入两次，填充 read 和 write）
    if (!this.isInitialized && this.initialTerrainPass) {
      this.initialTerrainPass.setUniform('u_Time', 0);
      this.initialTerrainPass.setUniform('u_TerrainScale', this.config.terrainScale || 3.2);
      this.initialTerrainPass.setUniform('u_TerrainHeight', this.config.terrainHeight || 2.0);
      this.initialTerrainPass.setUniform('u_terrainBaseType', this.config.terrainBaseType || 0);
      this.initialTerrainPass.setUniform('u_TerrainMask', this.config.terrainMask !== undefined ? this.config.terrainMask : 1);
      
      // 第一次写入
      this.initialTerrainPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换后再写入一次，确保两个纹理都有数据
      this.textureManager.swapTextures();
      
      this.initialTerrainPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      this.isInitialized = true;
      console.log('✅ 地形初始化完成（双缓冲）');
      return; // 初始化帧不再交换
    }
    
    // ===== 步骤 0: 降雨 =====
    if (this.rainPass && this.config.rainEnabled) {
      this.rainPass.setUniform('u_Time', this.frameCount * 0.01);
      this.rainPass.setUniform('u_RainDegree', this.config.rainDegree || 4.5);
      
      this.rainPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 terrain
      this.textureManager.swapTexture('terrain');
    }
    
    // ===== 步骤 1: 水流通量计算 =====
    if (this.fluxPass) {
      this.fluxPass.setUniform('u_SimRes', this.config.resolution);
      this.fluxPass.setUniform('u_PipeLen', this.config.pipeLength || 0.8);
      this.fluxPass.setUniform('u_timestep', this.config.timestep || 0.05);
      this.fluxPass.setUniform('u_PipeArea', this.config.pipeArea || 0.6);
      
      this.fluxPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 flux
      this.textureManager.swapTexture('flux');
    }
    
    // ===== 步骤 2: 水量和速度更新 (MRT) =====
    if (this.waterUpdatePass) {
      this.waterUpdatePass.setUniform('u_SimRes', this.config.resolution);
      this.waterUpdatePass.setUniform('u_PipeLen', this.config.pipeLength || 0.8);
      this.waterUpdatePass.setUniform('u_timestep', this.config.timestep || 0.05);
      this.waterUpdatePass.setUniform('u_PipeArea', this.config.pipeArea || 0.6);
      this.waterUpdatePass.setUniform('u_VelMult', this.config.velocityMultiplier || 1.0);
      this.waterUpdatePass.setUniform('u_VelAdvMag', this.config.velocityAdvectionMag || 0.2);
      this.waterUpdatePass.setUniform('u_Time', this.frameCount * 0.01);
      
      this.waterUpdatePass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 terrain（velocity 已经在 extractVelocity 中处理）
      this.textureManager.swapTexture('terrain');
      this.textureManager.swapTexture('velocity');
    }
    
    // ===== 步骤 3: 侵蚀和沉积 (MRT) =====
    // 只有当侵蚀参数不全为 0 时才执行
    const hasErosion = (this.config.Kc ?? 0) > 0 || (this.config.Ks ?? 0) > 0 || (this.config.Kd ?? 0) > 0;
    if (this.sedimentPass && hasErosion) {
      this.sedimentPass.setUniform('u_SimRes', this.config.resolution);
      this.sedimentPass.setUniform('u_Kc', this.config.Kc ?? 0);
      this.sedimentPass.setUniform('u_Ks', this.config.Ks ?? 0);
      this.sedimentPass.setUniform('u_Kd', this.config.Kd ?? 0);
      this.sedimentPass.setUniform('u_timestep', this.config.timestep || 0.05);
      this.sedimentPass.setUniform('u_Time', this.frameCount * 0.01);
      
      this.sedimentPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 terrain 和 sediment
      this.textureManager.swapTexture('terrain');
      this.textureManager.swapTexture('sediment');
    }
    
    // ===== 步骤 4: 泥沙输运（平流）=====
    const advectionMethod = this.config.advectionMethod || 1;
    
    if (advectionMethod === 1 && this.advectionPass && this.macCormackPass) {
      // MacCormack 三步法
      
      // 4.1 前向平流 → sedimentAdvectA
      this.advectionPass.setUniform('u_SimRes', this.config.resolution);
      this.advectionPass.setUniform('u_timestep', this.config.timestep || 0.05);
      this.advectionPass.setUniform('unif_advectMultiplier', 1.0);
      this.advectionPass.setUniform('unif_advectionSpeedScale', this.config.advectionSpeedScale || 1.0);
      
      this.advectionPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 sediment, velocity, sedimentBlend
      this.textureManager.swapTexture('sediment');
      this.textureManager.swapTexture('velocity');
      this.textureManager.swapTexture('sedimentBlend');
      
      // 将前向平流结果保存到 sedimentAdvectA
      // 注意：这里需要复制 sediment 到 sedimentAdvectA
      this.copySedimentToAdvectA();
      
      // 4.2 反向平流 → sedimentAdvectB
      this.advectionPass.setUniform('unif_advectMultiplier', -1.0);
      
      this.advectionPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 sediment, velocity, sedimentBlend
      this.textureManager.swapTexture('sediment');
      this.textureManager.swapTexture('velocity');
      this.textureManager.swapTexture('sedimentBlend');
      
      // 将反向平流结果保存到 sedimentAdvectB
      this.copySedimentToAdvectB();
      
      // 4.3 误差修正
      this.macCormackPass.setUniform('u_SimRes', this.config.resolution);
      this.macCormackPass.setUniform('u_timestep', this.config.timestep || 0.05);
      
      this.macCormackPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 sediment
      this.textureManager.swapTexture('sediment');
      
    } else if (this.advectionPass) {
      // 半拉格朗日平流（简单方法）
      this.advectionPass.setUniform('u_SimRes', this.config.resolution);
      this.advectionPass.setUniform('u_timestep', this.config.timestep || 0.05);
      this.advectionPass.setUniform('unif_advectMultiplier', 1.0);
      this.advectionPass.setUniform('unif_advectionSpeedScale', this.config.advectionSpeedScale || 1.0);
      
      this.advectionPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 sediment, velocity, sedimentBlend
      this.textureManager.swapTexture('sediment');
      this.textureManager.swapTexture('velocity');
      this.textureManager.swapTexture('sedimentBlend');
    }
    
    // ===== 步骤 5: 热力侵蚀（循环 3 次）=====
    // 只有当热力侵蚀参数大于 0 时才执行
    const hasThermalErosion = (this.config.thermalRate ?? 0) > 0 && (this.config.thermalErosionScale ?? 0) > 0;
    for (let i = 0; i < (hasThermalErosion ? 3 : 0); i++) {
      // 5.1 计算最大滑坡高度
      if (this.maxSlippagePass) {
        this.maxSlippagePass.setUniform('u_SimRes', this.config.resolution);
        this.maxSlippagePass.setUniform('u_PipeLen', this.config.pipeLength || 0.8);
        this.maxSlippagePass.setUniform('u_timestep', this.config.timestep || 0.05);
        this.maxSlippagePass.setUniform('u_PipeArea', this.config.pipeArea || 0.6);
        this.maxSlippagePass.setUniform('unif_thermalErosionScale', this.config.thermalErosionScale || 1.0);
        this.maxSlippagePass.setUniform('unif_TalusScale', this.config.thermalTalusAngleScale || 8.0);
        this.maxSlippagePass.setUniform('unif_rainMode', 0);
        
        this.maxSlippagePass.execute(
          this.renderer,
          this.simulationScene,
          this.simulationCamera,
          this.quadMesh
        );
        
        // 交换 maxSlippage
        this.textureManager.swapTexture('maxSlippage');
      }
      
      // 5.2 计算热力流动
      if (this.thermalFluxPass) {
        this.thermalFluxPass.setUniform('u_SimRes', this.config.resolution);
        this.thermalFluxPass.setUniform('u_PipeLen', this.config.pipeLength || 0.8);
        this.thermalFluxPass.setUniform('u_timestep', this.config.timestep || 0.05);
        this.thermalFluxPass.setUniform('u_PipeArea', this.config.pipeArea || 0.6);
        this.thermalFluxPass.setUniform('unif_thermalRate', this.config.thermalRate || 0.5);
        
        this.thermalFluxPass.execute(
          this.renderer,
          this.simulationScene,
          this.simulationCamera,
          this.quadMesh
        );
        
        // 交换 terrainFlux
        this.textureManager.swapTexture('terrainFlux');
      }
      
      // 5.3 应用热力流动到地形
      if (this.thermalApplyPass) {
        this.thermalApplyPass.setUniform('u_SimRes', this.config.resolution);
        this.thermalApplyPass.setUniform('u_PipeLen', this.config.pipeLength || 0.8);
        this.thermalApplyPass.setUniform('u_timestep', this.config.timestep || 0.05);
        this.thermalApplyPass.setUniform('u_PipeArea', this.config.pipeArea || 0.6);
        this.thermalApplyPass.setUniform('unif_thermalErosionScale', this.config.thermalErosionScale || 1.0);
        
        this.thermalApplyPass.execute(
          this.renderer,
          this.simulationScene,
          this.simulationCamera,
          this.quadMesh
        );
        
        // 交换 terrain
        this.textureManager.swapTexture('terrain');
      }
    }
    
    // ===== 步骤 6: 蒸发 =====
    // 只有当蒸发常数大于 0 时才执行
    if (this.evaporationPass && (this.config.evaporationConstant ?? 0) > 0) {
      this.evaporationPass.setUniform('evapod', this.config.evaporationConstant);
      
      this.evaporationPass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 terrain
      this.textureManager.swapTexture('terrain');
    }
    
    // ===== 步骤 7: 地形平滑 =====
    // 只有当地形平滑启用时才执行
    if (this.averagePass && this.config.terrainSmoothingEnabled !== false) {
      this.averagePass.setUniform('u_SimRes', this.config.resolution);
      this.averagePass.setUniform('unif_ErosionMode', this.config.erosionMode ?? 0); // 0: River Mode, 1: Mountain Mode, 2: Polygonal Mode
      this.averagePass.setUniform('unif_rainMode', 0);
      
      this.averagePass.execute(
        this.renderer,
        this.simulationScene,
        this.simulationCamera,
        this.quadMesh
      );
      
      // 交换 terrain
      this.textureManager.swapTexture('terrain');
    }
  }
  
  /**
   * 初始化复制材质（性能优化：只创建一次）
   */
  private initCopyMaterial(): void {
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSource: { value: null }
      },
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tSource;
        in vec2 vUv;
        out vec4 fragColor;
        void main() {
          fragColor = texture(tSource, vUv);
        }
      `,
      glslVersion: THREE.GLSL3
    });
  }
  
  /**
   * 复制 sediment 到 sedimentAdvectA（用于 MacCormack）
   */
  private copySedimentToAdvectA(): void {
    const sedimentTex = this.textureManager.getReadTexture('sediment');
    const advectATarget = this.textureManager.getReadTarget('sedimentAdvectA');
    
    if (sedimentTex && advectATarget && this.copyMaterial) {
      this.copyMaterial.uniforms.tSource.value = sedimentTex;
      this.quadMesh.material = this.copyMaterial;
      this.renderer.setRenderTarget(advectATarget);
      this.renderer.render(this.simulationScene, this.simulationCamera);
      this.renderer.setRenderTarget(null);
    }
  }
  
  /**
   * 复制 sediment 到 sedimentAdvectB（用于 MacCormack）
   */
  private copySedimentToAdvectB(): void {
    const sedimentTex = this.textureManager.getReadTexture('sediment');
    const advectBTarget = this.textureManager.getReadTarget('sedimentAdvectB');
    
    if (sedimentTex && advectBTarget && this.copyMaterial) {
      this.copyMaterial.uniforms.tSource.value = sedimentTex;
      this.quadMesh.material = this.copyMaterial;
      this.renderer.setRenderTarget(advectBTarget);
      this.renderer.render(this.simulationScene, this.simulationCamera);
      this.renderer.setRenderTarget(null);
    }
  }
  
  /**
   * 暂停/恢复模拟
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? '⏸️ 模拟已暂停' : '▶️ 模拟已恢复');
  }
  
  /**
   * 重置模拟
   */
  public reset(): void {
    this.frameCount = 0;
    this.isInitialized = false;
    console.log('🔄 模拟已重置');
  }
  
  /**
   * 获取地形纹理（供渲染使用）
   */
  public getTerrainTexture(): THREE.Texture | null {
    return this.textureManager.getReadTexture('terrain');
  }
  
  /**
   * 获取法线纹理
   */
  public getNormalTexture(): THREE.Texture | null {
    return this.textureManager.getReadTexture('terrainNormal');
  }
  
  /**
   * 获取泥沙纹理
   */
  public getSedimentTexture(): THREE.Texture | null {
    return this.textureManager.getReadTexture('sediment');
  }
  
  /**
   * 获取速度纹理
   */
  public getVelocityTexture(): THREE.Texture | null {
    return this.textureManager.getReadTexture('velocity');
  }
  
  /**
   * 获取所有纹理（供渲染使用）
   */
  public getTextures() {
    return {
      terrain: {
        read: this.textureManager.getReadTexture('terrain'),
        write: this.textureManager.getWriteTarget('terrain')?.texture || null
      },
      flux: {
        read: this.textureManager.getReadTexture('flux'),
        write: this.textureManager.getWriteTarget('flux')?.texture || null
      },
      velocity: {
        read: this.textureManager.getReadTexture('velocity'),
        write: this.textureManager.getWriteTarget('velocity')?.texture || null
      },
      sediment: {
        read: this.textureManager.getReadTexture('sediment'),
        write: this.textureManager.getWriteTarget('sediment')?.texture || null
      },
      sedimentBlend: {
        read: this.textureManager.getReadTexture('sedimentBlend'),
        write: this.textureManager.getWriteTarget('sedimentBlend')?.texture || null
      },
      terrainFlux: {
        read: this.textureManager.getReadTexture('terrainFlux'),
        write: this.textureManager.getWriteTarget('terrainFlux')?.texture || null
      },
      maxSlippage: {
        read: this.textureManager.getReadTexture('maxSlippage'),
        write: this.textureManager.getWriteTarget('maxSlippage')?.texture || null
      },
      terrainNormal: {
        read: this.textureManager.getReadTexture('terrainNormal'),
        write: null
      }
    };
  }
  
  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 标记是否需要重新生成地形
    let needsTerrainRegen = false;
    
    // 如果分辨率改变，需要重新创建纹理
    if (newConfig.resolution && newConfig.resolution !== this.config.resolution) {
      this.textureManager.resize(newConfig.resolution);
      this.reset();
      return; // reset 会重新生成地形
    }
    
    // 更新地形生成参数（这些参数改变需要重新生成地形）
    if (newConfig.terrainScale !== undefined && this.initialTerrainPass) {
      this.initialTerrainPass.setUniform('u_TerrainScale', newConfig.terrainScale);
      needsTerrainRegen = true;
    }
    if (newConfig.terrainHeight !== undefined && this.initialTerrainPass) {
      this.initialTerrainPass.setUniform('u_TerrainHeight', newConfig.terrainHeight);
      needsTerrainRegen = true;
    }
    if (newConfig.terrainBaseType !== undefined && this.initialTerrainPass) {
      this.initialTerrainPass.setUniform('u_terrainBaseType', newConfig.terrainBaseType);
      needsTerrainRegen = true;
    }
    if (newConfig.terrainMask !== undefined && this.initialTerrainPass) {
      this.initialTerrainPass.setUniform('u_TerrainMask', newConfig.terrainMask);
      needsTerrainRegen = true;
    }
    
    // 如果地形生成参数改变，重新生成地形
    if (needsTerrainRegen) {
      this.reset();
    }
    
    // 更新侵蚀模式
    if (newConfig.erosionMode !== undefined && this.averagePass) {
      this.averagePass.setUniform('unif_ErosionMode', newConfig.erosionMode);
    }
  }
  
  /**
   * 应用笔刷编辑
   */
  public applyBrush(brushParams: BrushParams): void {
    if (!this.brushPass || !brushParams.active) return;
    
    // 更新笔刷参数
    this.brushPass.updateBrushParams(brushParams);
    
    // 执行笔刷 Pass
    this.brushPass.execute(this.renderer, this.simulationScene, this.simulationCamera, this.quadMesh);
    
    // 交换 terrain 纹理
    this.textureManager.swapTexture('terrain');
  }
  
  /**
   * 获取当前配置
   */
  public getConfig(): SimulationConfig {
    return { ...this.config };
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    this.textureManager.dispose();
    this.quadMesh.geometry.dispose();
    
    if (this.copyMaterial) {
      this.copyMaterial.dispose();
    }
    
    // TODO: 清理所有 Pass
    // this.passes.forEach(pass => pass.dispose());
    
    console.log('🧹 模拟引擎已清理');
  }
}
