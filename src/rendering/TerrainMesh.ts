/**
 * 地形网格
 * 根据高度图生成 3D 地形
 */

import * as THREE from 'three';
import { TerrainMaterial, BrushParams } from './materials/TerrainMaterial';

export interface TerrainTextures {
  heightMap: THREE.Texture;
  normalMap: THREE.Texture;
  sedimentMap: THREE.Texture;
  velocityMap: THREE.Texture;
  fluxMap: THREE.Texture;
  terrainFluxMap: THREE.Texture;
  maxSlippageMap: THREE.Texture;
  sedimentBlendMap: THREE.Texture;
}

export class TerrainMesh {
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: TerrainMaterial;
  private resolution: number;
  
  constructor(meshResolution: number = 256, simResolution: number = 1024) {
    this.resolution = meshResolution;
    
    // 创建平面几何体
    this.geometry = new THREE.PlaneGeometry(
      50, 50,  // 尺寸
      meshResolution - 1, meshResolution - 1  // 细分
    );
    
    // 旋转到水平
    this.geometry.rotateX(-Math.PI / 2);
    
    // 使用新的 TerrainMaterial
    this.material = new TerrainMaterial();
    this.material.setSimulationResolution(simResolution);
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    console.log('✅ 地形网格创建完成（使用 TerrainMaterial）');
  }
  
  /**
   * 更新所有纹理
   */
  public updateTextures(textures: Partial<TerrainTextures>): void {
    if (textures.heightMap) {
      this.material.uniforms.hightmap.value = textures.heightMap;
    }
    if (textures.normalMap) {
      this.material.uniforms.normap.value = textures.normalMap;
    }
    if (textures.sedimentMap) {
      this.material.uniforms.sedimap.value = textures.sedimentMap;
    }
    if (textures.velocityMap) {
      this.material.uniforms.velmap.value = textures.velocityMap;
    }
    if (textures.fluxMap) {
      this.material.uniforms.fluxmap.value = textures.fluxMap;
    }
    if (textures.terrainFluxMap) {
      this.material.uniforms.terrainfluxmap.value = textures.terrainFluxMap;
    }
    if (textures.maxSlippageMap) {
      this.material.uniforms.maxslippagemap.value = textures.maxSlippageMap;
    }
    if (textures.sedimentBlendMap) {
      this.material.uniforms.sediBlend.value = textures.sedimentBlendMap;
    }
    this.material.needsUpdate = true;
  }
  
  /**
   * 设置调试模式
   */
  public setDebugMode(mode: number): void {
    this.material.setDebugMode(mode);
  }
  
  /**
   * 设置泥沙痕迹显示
   */
  public setSedimentTrace(enabled: boolean): void {
    this.material.setSedimentTrace(enabled);
  }
  
  /**
   * 设置流动痕迹显示
   */
  public setFlowTrace(enabled: boolean): void {
    this.material.setFlowTrace(enabled);
  }
  
  /**
   * 设置地形调色板
   */
  public setTerrainPalette(palette: number): void {
    this.material.setTerrainPalette(palette);
  }
  
  /**
   * 设置雪线范围
   */
  public setSnowRange(range: number): void {
    this.material.setSnowRange(range);
  }
  
  /**
   * 设置森林范围
   */
  public setForestRange(range: number): void {
    this.material.setForestRange(range);
  }
  
  /**
   * 设置笔刷参数
   */
  public setBrushParams(params: BrushParams): void {
    this.material.setBrushParams(params);
  }
  
  /**
   * 设置光源位置
   */
  public setLightPosition(pos: THREE.Vector3): void {
    this.material.setLightPosition(pos);
  }
  
  /**
   * 设置永久笔刷
   */
  public setPermanentBrush(enabled: boolean, pos?: THREE.Vector2, size?: number, strength?: number): void {
    this.material.setPermanentBrush(enabled, pos, size, strength);
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
