/**
 * 模拟 Pass 基类
 * 所有模拟步骤都继承自这个类
 */

import * as THREE from 'three';
import type { TextureManager } from '../TextureManager';

export abstract class BaseSimPass {
  protected material: THREE.ShaderMaterial;
  protected textureManager: TextureManager;
  protected uniforms: { [key: string]: THREE.IUniform };
  protected name: string;
  
  constructor(textureManager: TextureManager, name: string) {
    this.textureManager = textureManager;
    this.name = name;
    this.uniforms = {};
    this.initUniforms();
    this.initMaterial();
  }
  
  /**
   * 初始化 Uniform 变量（子类实现）
   */
  protected abstract initUniforms(): void;
  
  /**
   * 初始化材质（子类实现）
   */
  protected abstract initMaterial(): void;
  
  /**
   * 设置输入纹理（子类实现）
   */
  protected abstract setupInputTextures(): void;
  
  /**
   * 获取渲染目标（子类实现）
   */
  protected abstract getRenderTarget(): THREE.WebGLRenderTarget | null;
  
  /**
   * 执行模拟 Pass
   */
  public execute(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quad: THREE.Mesh
  ): void {
    // 设置输入纹理
    this.setupInputTextures();
    
    // 获取渲染目标
    const renderTarget = this.getRenderTarget();
    if (!renderTarget) {
      console.error(`${this.name}: 渲染目标为空`);
      return;
    }
    
    // 应用材质到四边形
    quad.material = this.material;
    
    // 渲染到纹理
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  }
  
  /**
   * 设置 Uniform 值
   */
  public setUniform(name: string, value: any): void {
    if (this.uniforms[name]) {
      this.uniforms[name].value = value;
    } else {
      console.warn(`${this.name}: Uniform "${name}" 不存在`);
    }
  }
  
  /**
   * 获取材质（用于调试）
   */
  public getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    this.material.dispose();
  }
}
