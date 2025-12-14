/**
 * 水体网格
 * 独立的半透明水面网格，用于渲染水体效果
 */

import * as THREE from 'three';
import { WaterMaterial } from './materials/WaterMaterial';

export interface WaterTextures {
  heightMap: THREE.Texture;
  sedimentMap: THREE.Texture;
  sceneDepth: THREE.Texture;
}

export class WaterMesh {
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: WaterMaterial;
  
  constructor(meshResolution: number = 256, simResolution: number = 1024) {
    // 创建平面几何体（与地形相同细分度）
    this.geometry = new THREE.PlaneGeometry(
      50, 50,  // 尺寸
      meshResolution - 1, meshResolution - 1  // 细分
    );
    
    // 旋转到水平
    this.geometry.rotateX(-Math.PI / 2);
    
    // 使用 WaterMaterial
    this.material = new WaterMaterial();
    this.material.setSimulationResolution(simResolution);
    
    // 创建网格
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    // 配置渲染顺序和透明度
    // 水体应该在地形之后渲染
    this.mesh.renderOrder = 1;
    
    // 不投射阴影，但接收阴影
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    
    console.log('✅ 水体网格创建完成（使用 WaterMaterial）');
  }
  
  /**
   * 更新所有纹理
   */
  public updateTextures(textures: Partial<WaterTextures>): void {
    if (textures.heightMap) {
      this.material.uniforms.hightmap.value = textures.heightMap;
    }
    if (textures.sedimentMap) {
      this.material.uniforms.sedimap.value = textures.sedimentMap;
    }
    if (textures.sceneDepth) {
      this.material.uniforms.sceneDepth.value = textures.sceneDepth;
    }
    this.material.needsUpdate = true;
  }
  
  /**
   * 设置水体透明度
   */
  public setTransparency(value: number): void {
    this.material.setTransparency(value);
  }
  
  /**
   * 设置光源位置
   */
  public setLightPosition(pos: THREE.Vector3): void {
    this.material.setLightPosition(pos);
  }
  
  /**
   * 设置相机参数
   */
  public setCameraParams(eye: THREE.Vector3, near: number, far: number): void {
    this.material.setCameraParams(eye, near, far);
  }
  
  /**
   * 设置屏幕尺寸
   */
  public setScreenDimensions(width: number, height: number): void {
    this.material.setScreenDimensions(width, height);
  }
  
  /**
   * 获取网格对象
   */
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
