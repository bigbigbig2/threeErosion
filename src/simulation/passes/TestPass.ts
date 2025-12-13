/**
 * 测试 Pass - 用于验证渲染到纹理是否工作
 * 这个 Pass 会把纹理填充为红色
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export class TestPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'TestPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      u_time: { value: 0.0 }
    };
  }
  
  protected initMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        varying vec2 vUv;
        
        void main() {
          // 输出红色，亮度随时间变化
          float brightness = 0.5 + 0.5 * sin(u_time);
          gl_FragColor = vec4(brightness, 0.0, 0.0, 1.0);
        }
      `
    });
  }
  
  protected setupInputTextures(): void {
    // 这个测试 Pass 不需要输入纹理
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }
  
  public updateTime(time: number): void {
    this.setUniform('u_time', time);
  }
}
