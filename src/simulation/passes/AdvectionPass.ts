/**
 * 泥沙平流 Pass（半拉格朗日方法）
 * 根据速度场输运泥沙
 * 使用 MRT 输出: sediment, velocity, sedimentBlend
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

const fragmentShader = `
precision highp float;

uniform sampler2D vel;
uniform sampler2D sedi;
uniform sampler2D sediBlend;
uniform sampler2D terrain;

uniform float u_SimRes;
uniform float u_timestep;
uniform float unif_advectionSpeedScale;
uniform float unif_advectMultiplier;

in vec2 vUv;

out vec4 fragColor;

void main() {
    vec2 curuv = vUv;
    float div = 1.0 / u_SimRes;

    vec4 curvel = texture(vel, curuv);
    vec4 cursedi = texture(sedi, curuv);
    vec4 curterrain = texture(terrain, curuv);

    // 计算回溯位置（半拉格朗日）
    vec4 useVel = curvel / u_SimRes;
    useVel *= unif_advectMultiplier * 0.5;

    vec2 oldloc = vec2(
        curuv.x - useVel.x * u_timestep,
        curuv.y - useVel.y * u_timestep
    );
    
    float oldsedi = texture(sedi, oldloc).x;

    // 计算泥沙混合值（用于可视化）
    float curSediVal = cursedi.x * curterrain.y * 0.1;
    float sediBlendVal = texture(sediBlend, curuv).x;
    sediBlendVal = (sediBlendVal * 1660.0 + curSediVal) / 1661.0;

    // 简化：只输出 sediment
    fragColor = vec4(oldsedi, 0.0, 0.0, 1.0);
}
`;

export class AdvectionPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'AdvectionPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      vel: { value: null },
      sedi: { value: null },
      sediBlend: { value: null },
      terrain: { value: null },
      u_SimRes: { value: 1024 },
      u_timestep: { value: 0.05 },
      unif_advectionSpeedScale: { value: 1.0 },
      unif_advectMultiplier: { value: 1.0 }
    };
  }
  
  protected initMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader,
      glslVersion: THREE.GLSL3
    });
  }
  
  protected setupInputTextures(): void {
    this.uniforms.vel.value = this.textureManager.getReadTexture('velocity');
    this.uniforms.sedi.value = this.textureManager.getReadTexture('sediment');
    this.uniforms.sediBlend.value = this.textureManager.getReadTexture('sedimentBlend');
    this.uniforms.terrain.value = this.textureManager.getReadTexture('terrain');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return null; // 使用 MRT
  }
  
  /**
   * 执行 Pass - 使用 MRT 同时输出到 3 个纹理
   */
  public execute(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quad: THREE.Mesh
  ): void {
    this.setupInputTextures();
    quad.material = this.material;
    
    const sedimentTarget = this.textureManager.getWriteTarget('sediment');
    
    if (!sedimentTarget) {
      console.error('❌ AdvectionPass: 无法获取渲染目标');
      return;
    }
    
    // 简化：只渲染到 sediment
    renderer.setRenderTarget(sedimentTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  }
}
