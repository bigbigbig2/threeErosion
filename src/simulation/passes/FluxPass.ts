/**
 * 水流通量 Pass
 * 根据高度差计算四个方向的水流通量
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

const fragmentShader = `
precision highp float;

uniform sampler2D readTerrain;
uniform sampler2D readFlux;
uniform sampler2D readSedi;

uniform float u_SimRes;
uniform float u_PipeLen;
uniform float u_timestep;
uniform float u_PipeArea;

varying vec2 vUv;

void main() {
    vec2 curuv = vUv;
    float div = 1.0 / u_SimRes;
    float g = 0.80;
    float pipelen = u_PipeLen;
    
    // 采样邻居
    vec4 top = texture2D(readTerrain, curuv + vec2(0.0, div));
    vec4 right = texture2D(readTerrain, curuv + vec2(div, 0.0));
    vec4 bottom = texture2D(readTerrain, curuv + vec2(0.0, -div));
    vec4 left = texture2D(readTerrain, curuv + vec2(-div, 0.0));
    
    float damping = 1.0;
    vec4 curTerrain = texture2D(readTerrain, curuv);
    vec4 curFlux = texture2D(readFlux, curuv) * damping;
    
    // 计算高度差（地形 + 水深）
    float Htopout = (curTerrain.y + curTerrain.x) - (top.y + top.x);
    float Hrightout = (curTerrain.y + curTerrain.x) - (right.y + right.x);
    float Hbottomout = (curTerrain.y + curTerrain.x) - (bottom.x + bottom.y);
    float Hleftout = (curTerrain.y + curTerrain.x) - (left.y + left.x);
    
    // 计算流出通量
    float ftopout = max(0.0, curFlux.x + (u_timestep * g * u_PipeArea * Htopout) / pipelen);
    float frightout = max(0.0, curFlux.y + (u_timestep * g * u_PipeArea * Hrightout) / pipelen);
    float fbottomout = max(0.0, curFlux.z + (u_timestep * g * u_PipeArea * Hbottomout) / pipelen);
    float fleftout = max(0.0, curFlux.w + (u_timestep * g * u_PipeArea * Hleftout) / pipelen);
    
    // 计算总流出量
    float waterOut = u_timestep * (ftopout + frightout + fbottomout + fleftout);
    
    // 缩放因子，防止流出量超过当前水量
    float k = min(1.0, (curTerrain.y * u_PipeLen * u_PipeLen) / waterOut);
    
    // 重新缩放流出通量
    ftopout *= k;
    frightout *= k;
    fbottomout *= k;
    fleftout *= k;
    
    // 边界条件
    if(curuv.x <= div) fleftout = 0.0;
    if(curuv.x >= 1.0 - 2.0 * div) frightout = 0.0;
    if(curuv.y <= div) ftopout = 0.0;
    if(curuv.y >= 1.0 - 2.0 * div) fbottomout = 0.0;
    
    if(curuv.x <= div || curuv.x >= 1.0 - 2.0 * div || curuv.y <= div || curuv.y >= 1.0 - 2.0 * div) {
        ftopout = 0.0;
        frightout = 0.0;
        fbottomout = 0.0;
        fleftout = 0.0;
    }
    
    gl_FragColor = vec4(ftopout, frightout, fbottomout, fleftout);
}
`;

export class FluxPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'FluxPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      readFlux: { value: null },
      readSedi: { value: null },
      u_SimRes: { value: 1024 },
      u_PipeLen: { value: 0.8 },
      u_timestep: { value: 0.05 },
      u_PipeArea: { value: 0.6 }
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
    this.uniforms.readFlux.value = this.textureManager.getReadTexture('flux');
    this.uniforms.readSedi.value = this.textureManager.getReadTexture('sediment');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('flux');
  }
}
