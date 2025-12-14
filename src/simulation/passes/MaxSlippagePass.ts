/**
 * MaxSlippagePass - 计算最大允许高度差（基于滑坡角）
 * 对应原版: maxslippageheight-frag.glsl
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export class MaxSlippagePass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'MaxSlippagePass');
  }

  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      u_SimRes: { value: 1024 },
      u_PipeLen: { value: 0.8 },
      u_timestep: { value: 0.05 },
      u_PipeArea: { value: 0.6 },
      unif_thermalErosionScale: { value: 1.0 },
      unif_TalusScale: { value: 8.0 },
      unif_rainMode: { value: 0 }
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
        uniform float u_SimRes;
        uniform float u_PipeLen;
        uniform float u_timestep;
        uniform float u_PipeArea;
        uniform float unif_thermalErosionScale;
        uniform float unif_TalusScale;
        uniform int unif_rainMode;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          vec2 curuv = vUv;
          float div = 1.0 / u_SimRes;
          float _maxHeightDiff = unif_TalusScale;
          
          vec4 terraintop = texture(readTerrain, curuv + vec2(0.0, div));
          vec4 terrainright = texture(readTerrain, curuv + vec2(div, 0.0));
          vec4 terrainbottom = texture(readTerrain, curuv + vec2(0.0, -div));
          vec4 terrainleft = texture(readTerrain, curuv + vec2(-div, 0.0));
          vec4 terraincur = texture(readTerrain, curuv);
          
          float maxLocalDiff = _maxHeightDiff * 0.01;
          float avgDiff = (terraintop.x + terrainright.x + terrainbottom.x + terrainleft.x) * 0.25 - terraincur.x;
          avgDiff = 10.0 * max(abs(avgDiff) - maxLocalDiff, 0.0);
          
          fragColor = vec4(max(_maxHeightDiff - avgDiff, 0.0), 0.0, 0.0, 1.0);
        }
      `,
      glslVersion: THREE.GLSL3
    });
  }

  protected setupInputTextures(): void {
    this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('maxSlippage');
  }
}
