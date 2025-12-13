/**
 * 地形初始化 Pass
 * 使用噪声生成初始地形
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

// 导入着色器
const fragmentShader = `
// 地形初始化着色器 - 使用噪声生成初始地形
precision highp float;

uniform float u_Time;
uniform float u_TerrainScale;
uniform float u_TerrainHeight;
uniform int u_terrainBaseType;
uniform int u_TerrainMask;

varying vec2 vUv;

// 随机函数
float random(in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Value Noise
float noise(in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM (Fractional Brownian Motion)
float fbm(in vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for(int i = 0; i < 12; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.47;
    }
    return value;
}

// 圆形遮罩
float circleMask(vec2 p) {
    return max(0.5 - distance(p, vec2(0.5)), 0.0);
}

void main() {
    vec2 uv = vUv;
    
    float c_mask = circleMask(uv);
    vec2 cpos = 1.5 * uv * u_TerrainScale;
    cpos = cpos + vec2(
        1.0 * sin(u_Time / 3.0) + 2.1,
        1.0 * cos(u_Time / 17.0) + 3.6
    );
    
    float terrain_height = fbm(cpos * 2.0) * 1.1;
    terrain_height = pow(terrain_height, 3.0);
    terrain_height *= u_TerrainHeight * 120.0;
    
    // 应用球形遮罩
    if(u_TerrainMask == 1) {
        terrain_height *= 2.0 * pow(c_mask, 1.0);
    }
    
    // 归一化到 0-1 范围用于可视化
    float visualHeight = terrain_height / 255.0;
    
    float rainfall = 0.0;
    
    // 输出：R = 高度, G = 水深（初始为0）, B = 可视化高度
    gl_FragColor = vec4(terrain_height, rainfall, visualHeight, 1.0);
}
`;

export class InitialTerrainPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'InitialTerrainPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      u_Time: { value: 0.0 },
      u_TerrainScale: { value: 3.2 },
      u_TerrainHeight: { value: 2.0 },
      u_terrainBaseType: { value: 0 },
      u_TerrainMask: { value: 1 } // 默认使用球形遮罩
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
      fragmentShader
    });
  }
  
  protected setupInputTextures(): void {
    // 初始化 Pass 不需要输入纹理
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }
}
