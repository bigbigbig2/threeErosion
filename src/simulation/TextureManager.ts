/**
 * 纹理管理器
 * 负责创建和管理 Ping-Pong 纹理对
 */

import * as THREE from 'three';

interface TexturePair {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
}

export class TextureManager {
  private resolution: number;
  private texturePairs: Map<string, TexturePair> = new Map();
  
  constructor(resolution: number) {
    this.resolution = resolution;
    this.initializeTextures();
  }
  
  /**
   * 初始化所有模拟纹理
   */
  private initializeTextures(): void {
    // 地形纹理（R: 高度, G: 水深）
    this.createTexturePair('terrain', THREE.RGBAFormat);
    
    // 水流通量纹理（RGBA: 上/右/下/左 流量）
    this.createTexturePair('flux', THREE.RGBAFormat);
    
    // 速度场纹理（RG: X/Y 速度）
    this.createTexturePair('velocity', THREE.RGBAFormat);
    
    // 泥沙浓度纹理
    this.createTexturePair('sediment', THREE.RGBAFormat);
    
    // 泥沙混合纹理
    this.createTexturePair('sedimentBlend', THREE.RGBAFormat);
    
    // 热力侵蚀通量纹理
    this.createTexturePair('terrainFlux', THREE.RGBAFormat);
    
    // 最大滑坡高度纹理
    this.createTexturePair('maxSlippage', THREE.RGBAFormat);
    
    // 地形法线纹理（不需要 Ping-Pong）
    this.createSingleTexture('terrainNormal', THREE.RGBAFormat);
    
    // MacCormack 平流中间纹理
    this.createSingleTexture('sedimentAdvectA', THREE.RGBAFormat);
    this.createSingleTexture('sedimentAdvectB', THREE.RGBAFormat);
    
    console.log('✅ 纹理管理器初始化完成');
  }
  
  /**
   * 创建 Ping-Pong 纹理对
   */
  private createTexturePair(name: string, format: THREE.PixelFormat): void {
    const options: THREE.RenderTargetOptions = {
      format,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false
    };
    
    const readTarget = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      options
    );
    
    const writeTarget = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      options
    );
    
    this.texturePairs.set(name, { read: readTarget, write: writeTarget });
  }
  
  /**
   * 创建单个纹理（不需要 Ping-Pong）
   */
  private createSingleTexture(name: string, format: THREE.PixelFormat): void {
    const options: THREE.RenderTargetOptions = {
      format,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false
    };
    
    const target = new THREE.WebGLRenderTarget(
      this.resolution,
      this.resolution,
      options
    );
    
    // 单个纹理也存储为 pair，但 read 和 write 指向同一个
    this.texturePairs.set(name, { read: target, write: target });
  }
  
  /**
   * 交换所有 Ping-Pong 纹理
   */
  public swapTextures(): void {
    const swapList = [
      'terrain',
      'flux',
      'velocity',
      'sediment',
      'sedimentBlend',
      'terrainFlux',
      'maxSlippage'
    ];
    
    swapList.forEach((name) => {
      const pair = this.texturePairs.get(name);
      if (pair && pair.read !== pair.write) {
        const temp = pair.read;
        pair.read = pair.write;
        pair.write = temp;
      }
    });
  }
  
  /**
   * 获取读取纹理
   */
  public getReadTexture(name: string): THREE.Texture | null {
    const pair = this.texturePairs.get(name);
    return pair ? pair.read.texture : null;
  }
  
  /**
   * 获取写入目标
   */
  public getWriteTarget(name: string): THREE.WebGLRenderTarget | null {
    return this.texturePairs.get(name)?.write || null;
  }
  
  /**
   * 获取读取目标
   */
  public getReadTarget(name: string): THREE.WebGLRenderTarget | null {
    return this.texturePairs.get(name)?.read || null;
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    this.texturePairs.forEach((pair) => {
      pair.read.dispose();
      if (pair.write !== pair.read) {
        pair.write.dispose();
      }
    });
    this.texturePairs.clear();
    
    console.log('🧹 纹理管理器已清理');
  }
  
  /**
   * 调整分辨率
   */
  public resize(newResolution: number): void {
    this.dispose();
    this.resolution = newResolution;
    this.initializeTextures();
    
    console.log(`🔄 纹理分辨率已调整为 ${newResolution}`);
  }
}
