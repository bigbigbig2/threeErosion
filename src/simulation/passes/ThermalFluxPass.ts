/**
 * ThermalFluxPass - 计算热力侵蚀的物质流动
 * 对应原版: thermalterrainflux-frag.glsl
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export class ThermalFluxPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'ThermalFluxPass');
  }

  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      readMaxSlippage: { value: null },
      u_SimRes: { value: 1024 },
      u_PipeLen: { value: 0.8 },
      u_timestep: { value: 0.05 },
      u_PipeArea: { value: 0.6 },
      unif_thermalRate: { value: 0.5 }
    };
  }

  protected initMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        out vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        
        uniform sampler2D readTerrain;
        uniform sampler2D readMaxSlippage;
        uniform float u_SimRes;
        uniform float u_PipeLen;
        uniform float u_timestep;
        uniform float u_PipeArea;
        uniform float unif_thermalRate;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          vec2 curuv = vUv;
          float div = 1.0 / u_SimRes;
          float thermalRate = unif_thermalRate;
          float hardness = 1.0;
          
          vec4 terraintop = texture(readTerrain, curuv + vec2(0.0, div));
          vec4 terrainright = texture(readTerrain, curuv + vec2(div, 0.0));
          vec4 terrainbottom = texture(readTerrain, curuv + vec2(0.0, -div));
          vec4 terrainleft = texture(readTerrain, curuv + vec2(-div, 0.0));
          vec4 terraincur = texture(readTerrain, curuv);
          
          float slippagetop = texture(readMaxSlippage, curuv + vec2(0.0, div)).x;
          float slippageright = texture(readMaxSlippage, curuv + vec2(div, 0.0)).x;
          float slippagebottom = texture(readMaxSlippage, curuv + vec2(0.0, -div)).x;
          float slippageleft = texture(readMaxSlippage, curuv + vec2(-div, 0.0)).x;
          float slippagecur = texture(readMaxSlippage, curuv).x;
          
          vec4 diff;
          diff.x = terraincur.x - terraintop.x - (slippagecur + slippagetop) * 0.5;
          diff.y = terraincur.x - terrainright.x - (slippagecur + slippageright) * 0.5;
          diff.z = terraincur.x - terrainbottom.x - (slippagecur + slippagebottom) * 0.5;
          diff.w = terraincur.x - terrainleft.x - (slippagecur + slippageleft) * 0.5;
          
          diff = max(vec4(0.0), diff);
          
          vec4 newFlow = diff * 1.2;
          
          float outfactor = (newFlow.x + newFlow.y + newFlow.z + newFlow.w) * u_timestep;
          
          if (outfactor > 1e-5) {
            outfactor = terraincur.x / outfactor;
            if (outfactor > 1.0) outfactor = 1.0;
            newFlow = newFlow * outfactor;
          }
          
          fragColor = newFlow;
        }
      `,
      glslVersion: THREE.GLSL3
    });
  }

  protected setupInputTextures(): void {
    this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
    this.uniforms.readMaxSlippage.value = this.textureManager.getReadTexture('maxSlippage');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrainFlux');
  }
}
