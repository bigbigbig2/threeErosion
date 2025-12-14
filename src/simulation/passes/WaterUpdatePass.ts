/**
 * 水量更新 Pass
 * 根据流入流出的通量更新水深和速度场
 * 使用 MRT (Multiple Render Targets) 同时输出 terrain 和 velocity
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

const fragmentShader = `
precision highp float;

uniform sampler2D readTerrain;
uniform sampler2D readFlux;
uniform sampler2D readSedi;
uniform sampler2D readVel;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;
uniform float u_VelMult;
uniform float u_Time;
uniform float u_VelAdvMag;

in vec2 vUv;

out vec4 fragColor;

void main() {
    vec2 curuv = vUv;
    float div = 1.0 / u_SimRes;
    float pipelen = u_PipeLen;
    
    vec4 curflux = texture(readFlux, curuv);
    vec4 cur = texture(readTerrain, curuv);
    vec4 curvel = texture(readVel, curuv);
    
    vec4 topflux = texture(readFlux, curuv + vec2(0.0, div));
    vec4 rightflux = texture(readFlux, curuv + vec2(div, 0.0));
    vec4 bottomflux = texture(readFlux, curuv + vec2(0.0, -div));
    vec4 leftflux = texture(readFlux, curuv + vec2(-div, 0.0));
    
    // 流出通量
    float ftopout = curflux.x;
    float frightout = curflux.y;
    float fbottomout = curflux.z;
    float fleftout = curflux.w;
    
    vec4 outputflux = curflux;
    vec4 inputflux = vec4(topflux.z, rightflux.w, bottomflux.x, leftflux.y);
    
    float fout = ftopout + frightout + fbottomout + fleftout;
    float fin = topflux.z + rightflux.w + bottomflux.x + leftflux.y;
    
    // 计算水量变化
    float deltavol = u_timestep * (fin - fout) / (u_PipeLen * u_PipeLen);
    
    float d1 = cur.y;
    float d2 = max(d1 + deltavol, 0.0);
    float da = (d1 + d2) / 2.0;
    
    // 计算速度
    vec2 veloci = vec2(
        leftflux.y - outputflux.w + outputflux.y - rightflux.w,
        bottomflux.x - outputflux.z + outputflux.x - topflux.z
    ) / 2.0;
    
    if(cur.y == 0.0 && deltavol == 0.0) {
        veloci = vec2(0.0, 0.0);
    }
    
    if(da <= 0.0001) {
        veloci = vec2(0.0);
    } else {
        veloci = veloci / (da * u_PipeLen);
    }
    
    // 速度自平流
    vec4 useVel = curvel / u_SimRes;
    useVel *= 0.5;
    
    vec2 oldloc = vec2(curuv.x - useVel.x * u_timestep, curuv.y - useVel.y * u_timestep);
    vec2 oldvel = texture(readVel, oldloc).xy;
    
    veloci += oldvel * u_VelAdvMag;
    
    // 忽略非常浅的水体
    if(cur.y < 0.01) {
        veloci = vec2(0.0);
    }
    
    // 临时方案：只输出 terrain，velocity 存储在 BA 通道
    fragColor = vec4(cur.x, max(cur.y + deltavol, 0.0), veloci.x * u_VelMult, veloci.y * u_VelMult);
}
`;

export class WaterUpdatePass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'WaterUpdatePass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      readFlux: { value: null },
      readSedi: { value: null },
      readVel: { value: null },
      u_SimRes: { value: 1024 },
      u_PipeLen: { value: 0.8 },
      u_timestep: { value: 0.05 },
      u_PipeArea: { value: 0.6 },
      u_VelMult: { value: 1.0 },
      u_Time: { value: 0.0 },
      u_VelAdvMag: { value: 0.2 }
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
    this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
    this.uniforms.readFlux.value = this.textureManager.getReadTexture('flux');
    this.uniforms.readSedi.value = this.textureManager.getReadTexture('sediment');
    this.uniforms.readVel.value = this.textureManager.getReadTexture('velocity');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    // 不使用，因为我们需要 MRT
    return null;
  }
  
  /**
   * 执行 Pass - 简化版本（避免 MRT 崩溃）
   */
  public execute(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quad: THREE.Mesh
  ): void {
    this.setupInputTextures();
    quad.material = this.material;
    
    const terrainTarget = this.textureManager.getWriteTarget('terrain');
    
    if (!terrainTarget) {
      console.error('❌ WaterUpdatePass: 无法获取渲染目标');
      return;
    }
    
    // 渲染到 terrain（velocity 暂时存储在 BA 通道）
    renderer.setRenderTarget(terrainTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    
    // TODO: 提取 velocity 到单独的纹理
    this.extractVelocity(renderer, scene, camera, quad);
  }
  
  /**
   * 从 terrain 的 BA 通道提取 velocity
   */
  private extractVelocity(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quad: THREE.Mesh
  ): void {
    const terrainTex = this.textureManager.getReadTexture('terrain');
    const velocityTarget = this.textureManager.getWriteTarget('velocity');
    
    if (!terrainTex || !velocityTarget) return;
    
    const extractMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tSource: { value: terrainTex }
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
          vec4 data = texture(tSource, vUv);
          fragColor = vec4(data.b, data.a, 0.0, 1.0);
        }
      `,
      glslVersion: THREE.GLSL3
    });
    
    const oldMaterial = quad.material;
    quad.material = extractMaterial;
    renderer.setRenderTarget(velocityTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    quad.material = oldMaterial;
    extractMaterial.dispose();
  }
}
