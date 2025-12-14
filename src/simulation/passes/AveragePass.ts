/**
 * AveragePass - 平滑地形以避免尖锐特征
 * 对应原版: average-frag.glsl
 * 
 * 这个 Pass 用于平滑尖锐的山脊和峡谷，防止引入腐败
 * 参考: https://github.com/Huw-man/Interactive-Erosion-Simulator-on-GPU
 *       https://github.com/karhu/terrain-erosion
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export class AveragePass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'AveragePass');
  }

  protected initUniforms(): void {
    this.uniforms = {
      readTerrain: { value: null },
      readSedi: { value: null },
      u_SimRes: { value: 1024 },
      unif_ErosionMode: { value: 0 },
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
        uniform sampler2D readSedi;
        uniform float u_SimRes;
        uniform int unif_ErosionMode;
        uniform int unif_rainMode;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        vec3 calnor(vec2 uv) {
          float eps = 1.0 / u_SimRes;
          vec4 cur = texture(readTerrain, uv);
          vec4 r = texture(readTerrain, uv + vec2(eps, 0.0));
          vec4 t = texture(readTerrain, uv + vec2(0.0, eps));
          vec4 b = texture(readTerrain, uv + vec2(0.0, -eps));
          vec4 l = texture(readTerrain, uv + vec2(-eps, 0.0));
          
          vec3 nor = vec3(l.x - r.x, 2.0, t.x - b.x);
          nor = -normalize(nor);
          return nor;
        }
        
        void main() {
          float diagonalWeight = 0.707;
          float threathhold = 0.1;
          float div = 1.0 / u_SimRes;
          vec2 curuv = vUv;
          vec4 cur = texture(readTerrain, curuv);
          vec3 nor = calnor(curuv);
          
          vec4 top = texture(readTerrain, curuv + vec2(0.0, div));
          vec4 topright = texture(readTerrain, curuv + vec2(div, div));
          vec4 right = texture(readTerrain, curuv + vec2(div, 0.0));
          vec4 bottomright = texture(readTerrain, curuv + vec2(div, -div));
          vec4 bottom = texture(readTerrain, curuv + vec2(0.0, -div));
          vec4 bottomleft = texture(readTerrain, curuv + vec2(-div, -div));
          vec4 left = texture(readTerrain, curuv + vec2(-div, 0.0));
          vec4 topleft = texture(readTerrain, curuv + vec2(-div, div));
          
          float t_d = cur.x - top.x;
          float r_d = cur.x - right.x;
          float b_d = cur.x - bottom.x;
          float l_d = cur.x - left.x;
          float tr_d = cur.x - topright.x;
          float br_d = cur.x - bottomright.x;
          float bl_d = cur.x - bottomleft.x;
          float tl_d = cur.x - topleft.x;
          
          float avg_hdiff = t_d + r_d + b_d + l_d + (tr_d + br_d + bl_d + tl_d) * diagonalWeight;
          avg_hdiff /= (4.0 * (1.0 + diagonalWeight));
          avg_hdiff = abs(avg_hdiff);
          
          float avg_hdiff_4 = t_d + r_d + b_d + l_d;
          avg_hdiff_4 /= 4.0;
          avg_hdiff_4 = abs(avg_hdiff_4);
          
          // Mountain erosion mode: flatter plains and sharper ridges
          if (unif_ErosionMode == 1) {
            threathhold = avg_hdiff / 2.0;
          }
          // Polygonal terrain mode
          else if (unif_ErosionMode == 2) {
            threathhold = pow(avg_hdiff, 3.0);
          }
          
          float cur_h = cur.x;
          float col = 0.0;
          float curWeight = 8.0;
          
          // Eight direction average
          if (((abs(r_d) > threathhold && abs(l_d) > threathhold) && r_d * l_d > 0.0) ||
              ((abs(t_d) > threathhold && abs(b_d) > threathhold) && t_d * b_d > 0.0) ||
              ((abs(tr_d) > threathhold && abs(bl_d) > threathhold) && tr_d * bl_d > 0.0) ||
              ((abs(tl_d) > threathhold && abs(br_d) > threathhold) && tl_d * br_d > 0.0)) {
            cur_h = (cur.x * curWeight + top.x + right.x + bottom.x + left.x + 
                     topright.x * diagonalWeight + topleft.x * diagonalWeight + 
                     bottomleft.x * diagonalWeight + bottomright.x * diagonalWeight) / 
                    (4.0 * (1.0 + diagonalWeight) + curWeight);
            col = 1.0;
          }
          
          fragColor = vec4(cur_h, cur.y, cur.z, cur.w);
        }
      `,
      glslVersion: THREE.GLSL3
    });
  }

  protected setupInputTextures(): void {
    this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
    this.uniforms.readSedi.value = this.textureManager.getReadTexture('sediment');
  }

  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }
}
