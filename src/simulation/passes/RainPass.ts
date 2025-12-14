/**
 * 降雨 Pass
 * 增加水量到地形
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

const fragmentShader = `
precision highp float;

uniform sampler2D readTerrain;
uniform float u_Time;
uniform float u_RainDegree;

varying vec2 vUv;

// 简单的随机函数
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

// FBM
float fbm(in vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for(int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.53;
    }
    return value;
}

void main() {
    vec2 uv = vUv;
    
    // 读取当前地形数据
    vec4 terrain = texture2D(readTerrain, uv);
    float height = terrain.r;  // 地形高度
    float water = terrain.g;   // 当前水深
    
    // 计算降雨量（使用噪声让降雨不均匀）
    float rainNoise = fbm(uv * 1.0 + vec2(sin(u_Time * 5.0), cos(u_Time * 15.0)));
    // 降雨量需要足够大才能看到效果
    float rain = rainNoise * u_RainDegree * 0.1;
    
    // 增加水量
    float newWater = water + rain;
    
    // 输出：R = 高度（不变）, G = 新的水深
    gl_FragColor = vec4(height, newWater, 0.0, 1.0);
}
`;

export class RainPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'RainPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      u_Time: { value: 0.0 },
      u_RainDegree: { value: 4.5 }
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
    this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }
}
