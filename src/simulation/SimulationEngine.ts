/**
 * 模拟引擎主类
 * 负责协调所有模拟 Pass 的执行
 */

import * as THREE from 'three';
import { TextureManager } from './TextureManager';
import type { SimulationConfig } from './SimulationConfig';
import { DEFAULT_SIMULATION_CONFIG } from './SimulationConfig';
import { InitialTerrainPass } from './passes/InitialTerrainPass';

export class SimulationEngine {
  private renderer: THREE.WebGLRenderer;
  private textureManager: TextureManager;
  private config: SimulationConfig;
  
  private simulationScene: THREE.Scene;
  private simulationCamera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  
  // 模拟 Pass 列表
  private initialTerrainPass: InitialTerrainPass | null = null;
  private isInitialized: boolean = false;
  
  private frameCount: number = 0;
  private isPaused: boolean = false;
  
  constructor(renderer: THREE.WebGLRenderer, config: Partial<SimulationConfig> = {}) {
    this.renderer = renderer;
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    
    this.textureManager = new TextureManager(this.config.resolution);
    
    this.setupSimulationScene();
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
    
    console.log('✅ 模拟 Pass 初始化完成');
  }
  
  /**
   * 更新模拟（每帧调用）
   */
  public update(deltaTime: number): void {
    if (this.isPaused) return;
    
    // 根据速度设置执行多次模拟
    for (let i = 0; i < this.config.speed; i++) {
      this.executeSimulationStep();
      this.frameCount++;
    }
  }
  
  /**
   * 执行一步完整的模拟
   */
  private executeSimulationStep(): void {
    // 第一帧：初始化地形（写入两次，填充 read 和 write）
    if (!this.isInitialized && this.initialTerrainPass) {
      this.initialTerrainPass.setUniform('u_Time', 0);
      this.initialTerrainPass.setUniform('u_TerrainScale', this.config.terrainScale || 3.2);
      this.initialTerrainPass.setUniform('u_TerrainHeight', this.config.terrainHeight || 2.0);
      
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
    
    // TODO: 后续添加侵蚀模拟 Pass
    
    // 只有在有实际模拟时才交换纹理
    // this.textureManager.swapTextures();
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
   * 更新配置
   */
  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果分辨率改变，需要重新创建纹理
    if (newConfig.resolution && newConfig.resolution !== this.config.resolution) {
      this.textureManager.resize(newConfig.resolution);
      this.reset();
    }
    
    // TODO: 更新所有 Pass 的参数
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
    
    // TODO: 清理所有 Pass
    // this.passes.forEach(pass => pass.dispose());
    
    console.log('🧹 模拟引擎已清理');
  }
}
