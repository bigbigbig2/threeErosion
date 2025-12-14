/**
 * BrushPass - 笔刷编辑通道
 * 
 * 职责：根据笔刷参数修改地形高度或水深
 * 
 * 实现方式：
 * 1. 使用高斯权重计算笔刷影响范围
 * 2. 支持地形笔刷（修改 R 通道 - 高度）
 * 3. 支持水体笔刷（修改 G 通道 - 水深）
 * 4. 支持添加/减去操作
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export interface BrushParams {
  active: boolean;        // 笔刷是否激活
  position: THREE.Vector2; // 笔刷位置（UV 坐标）
  size: number;           // 笔刷大小
  strength: number;       // 笔刷强度
  type: number;           // 笔刷类型（0: 地形, 1: 水体）
  operation: number;      // 操作类型（0: 添加, 1: 减去）
}

export class BrushPass extends BaseSimPass {
  private currentBrushParams: BrushParams | null = null;
  
  constructor(textureManager: TextureManager) {
    super(textureManager, 'BrushPass');
  }

  protected initUniforms(): void {
    this.uniforms = {
      terrain: { value: null },
      u_BrushActive: { value: 0 },
      u_BrushPos: { value: new THREE.Vector2(0.5, 0.5) },
      u_BrushSize: { value: 0.05 },
      u_BrushStrength: { value: 0.1 },
      u_BrushType: { value: 0 },
      u_BrushOperation: { value: 0 }
    };
  }
  
  protected setupInputTextures(): void {
    this.setUniform('terrain', this.textureManager.getReadTexture('terrain'));
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }

  protected initMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D terrain;
        uniform int u_BrushActive;
        uniform vec2 u_BrushPos;
        uniform float u_BrushSize;
        uniform float u_BrushStrength;
        uniform int u_BrushType;
        uniform int u_BrushOperation;
        
        varying vec2 vUv;
        
        void main() {
          // 读取当前地形数据
          vec4 terrainData = texture2D(terrain, vUv);
          
          // 如果笔刷未激活，直接返回原始数据
          if (u_BrushActive == 0) {
            gl_FragColor = terrainData;
            return;
          }
          
          // 计算到笔刷中心的距离
          float dist = distance(vUv, u_BrushPos);
          
          // 如果超出笔刷范围，返回原始数据
          if (dist > u_BrushSize) {
            gl_FragColor = terrainData;
            return;
          }
          
          // 计算高斯权重
          float weight = exp(-dist * dist / (u_BrushSize * u_BrushSize * 0.5));
          
          // 计算笔刷影响值
          float brushEffect = u_BrushStrength * weight;
          
          // 根据操作类型调整符号
          if (u_BrushOperation == 1) {
            brushEffect = -brushEffect;
          }
          
          // 根据笔刷类型修改对应通道
          // 注意：地形高度值范围是 0-200+，所以需要放大笔刷效果
          if (u_BrushType == 0) {
            // 地形笔刷：修改 R 通道（高度）
            terrainData.r += brushEffect * 100.0;  // 放大效果
            terrainData.r = max(terrainData.r, 0.0);
          } else {
            // 水体笔刷：修改 G 通道（水深）
            terrainData.g += brushEffect * 50.0;  // 放大效果
            terrainData.g = max(terrainData.g, 0.0);
          }
          
          gl_FragColor = terrainData;
        }
      `
    });
  }

  /**
   * 更新笔刷参数
   */
  public updateBrushParams(brushParams: BrushParams): void {
    this.currentBrushParams = brushParams;
    
    // 更新笔刷参数
    this.setUniform('u_BrushActive', brushParams.active ? 1 : 0);
    this.setUniform('u_BrushPos', brushParams.position);
    this.setUniform('u_BrushSize', brushParams.size);
    this.setUniform('u_BrushStrength', brushParams.strength);
    this.setUniform('u_BrushType', brushParams.type);
    this.setUniform('u_BrushOperation', brushParams.operation);
  }
}
