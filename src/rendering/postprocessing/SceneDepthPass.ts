import * as THREE from 'three';

/**
 * SceneDepthPass - 场景深度渲染
 * 
 * 职责：渲染地形的深度信息，供水体深度混合使用
 * 
 * 实现方式：
 * 1. 使用 Three.js 内置的深度渲染
 * 2. 创建一个 WebGLRenderTarget 用于存储深度
 * 3. 在渲染水体前，先渲染地形到深度纹理
 */
export class SceneDepthPass {
  private depthTarget: THREE.WebGLRenderTarget;
  
  /**
   * 构造函数
   * @param width 渲染目标宽度
   * @param height 渲染目标高度
   */
  constructor(width: number, height: number) {
    this.depthTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false
    });
  }
  
  /**
   * 执行深度渲染
   * @param renderer WebGL 渲染器
   * @param scene 场景
   * @param camera 相机
   * @param terrainMesh 地形网格
   */
  execute(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    terrainMesh: THREE.Mesh
  ): void {
    // 保存原始可见性状态
    const visibilityMap = new Map<THREE.Object3D, boolean>();
    
    // 只渲染地形，隐藏其他对象
    scene.traverse((obj) => {
      visibilityMap.set(obj, obj.visible);
      if (obj !== terrainMesh) {
        obj.visible = false;
      }
    });
    
    // 渲染深度到目标纹理
    renderer.setRenderTarget(this.depthTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    
    // 恢复所有对象的可见性
    scene.traverse((obj) => {
      const originalVisibility = visibilityMap.get(obj);
      if (originalVisibility !== undefined) {
        obj.visible = originalVisibility;
      }
    });
  }
  
  /**
   * 获取深度纹理
   * @returns 深度纹理
   */
  getDepthTexture(): THREE.Texture {
    return this.depthTarget.texture;
  }
  
  /**
   * 调整渲染目标大小
   * @param width 新宽度
   * @param height 新高度
   */
  setSize(width: number, height: number): void {
    this.depthTarget.setSize(width, height);
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    this.depthTarget.dispose();
  }
}
