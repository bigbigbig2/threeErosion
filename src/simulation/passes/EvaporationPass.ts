/**
 * EvaporationPass - 蒸发水分
 * 对应原版: eva-frag.glsl
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export class EvaporationPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'EvaporationPass');
  }

  protected initUniforms(): void {
    this.uniforms = {
      terrain: { value: null },
      evapod: { value: 0.003 }
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
        
        uniform sampler2D terrain;
        uniform float evapod;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          float Ke = 0.4;
          vec2 curuv = vUv;
          vec4 cur = texture(terrain, curuv);
          float eva = 1.0 - evapod;
          fragColor = vec4(cur.x, cur.y * eva, cur.z, cur.w);
        }
      `,
      glslVersion: THREE.GLSL3
    });
  }

  protected setupInputTextures(): void {
    this.uniforms.terrain.value = this.textureManager.getReadTexture('terrain');
  }

  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }
}
