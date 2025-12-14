/**
 * 泥沙侵蚀/沉积 Pass
 * 根据速度和坡度计算侵蚀和沉积
 * 使用 MRT 输出: terrain, sediment, terrainNormal, velocity
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

const fragmentShader = `
precision highp float;

uniform sampler2D readTerrain;
uniform sampler2D readVelocity;
uniform sampler2D readSediment;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_Ks;
uniform float u_Kc;
uniform float u_Kd;
uniform float u_timestep;
uniform float u_Time;

in vec2 vUv;

out vec4 fragColor;

vec3 calnor(vec2 uv){
  float eps = 1.0 / u_SimRes;
  vec4 r = texture(readTerrain, uv + vec2(eps, 0.0));
  vec4 t = texture(readTerrain, uv + vec2(0.0, eps));
  vec4 b = texture(readTerrain, uv + vec2(0.0, -eps));
  vec4 l = texture(readTerrain, uv + vec2(-eps, 0.0));

  vec3 nor = vec3(l.x - r.x, 2.0, t.x - b.x);
  nor = normalize(nor);
  return nor;
}

void main() {
  vec2 curuv = vUv;
  float Kc = u_Kc;
  float Ks = u_Ks;
  float Kd = u_Kd;

  vec3 nor = calnor(curuv);
  float slopeSin = abs(sqrt(1.0 - nor.y * nor.y));

  vec4 curvel = texture(readVelocity, curuv);
  vec4 curSediment = texture(readSediment, curuv);
  vec4 curTerrain = texture(readTerrain, curuv);

  float velo = length(curvel.xy);
  float slope = max(0.1, abs(slopeSin));
  float sedicap = Kc * pow(slope, 1.0) * pow(velo, 1.0);

  float cursedi = curSediment.x;
  float hight = curTerrain.x;
  float outsedi = curSediment.x;

  if(sedicap > cursedi) {
    float changesedi = (sedicap - cursedi) * Ks;
    hight = hight - changesedi;
    outsedi = outsedi + changesedi;
  } else {
    float changesedi = (cursedi - sedicap) * Kd;
    hight = hight + changesedi;
    outsedi = outsedi - changesedi;
  }

  // 输出到 terrain（高度已更新）
  // 注意：由于 MRT 问题，我们暂时只输出 terrain
  // sediment 数据存储在 B 通道
  fragColor = vec4(hight, curTerrain.y, outsedi, curTerrain.w);
}
`;

export class SedimentPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'SedimentPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      readVelocity: { value: null },
      readSediment: { value: null },
      u_SimRes: { value: 1024 },
      u_PipeLen: { value: 0.8 },
      u_Ks: { value: 0.036 },
      u_Kc: { value: 0.06 },
      u_Kd: { value: 0.006 },
      u_timestep: { value: 0.05 },
      u_Time: { value: 0.0 }
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
    this.uniforms.readVelocity.value = this.textureManager.getReadTexture('velocity');
    this.uniforms.readSediment.value = this.textureManager.getReadTexture('sediment');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return null;
  }
  
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
      console.error('❌ SedimentPass: 无法获取渲染目标');
      return;
    }
    
    // 渲染到 terrain（sediment 存储在 B 通道）
    renderer.setRenderTarget(terrainTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    
    // 提取 sediment 到单独的纹理
    this.extractSediment(renderer, scene, camera, quad);
  }
  
  /**
   * 从 terrain 的 B 通道提取 sediment
   */
  private extractSediment(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    quad: THREE.Mesh
  ): void {
    const terrainTex = this.textureManager.getReadTexture('terrain');
    const sedimentTarget = this.textureManager.getWriteTarget('sediment');
    
    if (!terrainTex || !sedimentTarget) return;
    
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
          fragColor = vec4(data.b, 0.0, 0.0, 1.0);
        }
      `,
      glslVersion: THREE.GLSL3
    });
    
    const oldMaterial = quad.material;
    quad.material = extractMaterial;
    renderer.setRenderTarget(sedimentTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    quad.material = oldMaterial;
    extractMaterial.dispose();
  }
}
