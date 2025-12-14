/**
 * ThermalApplyPass - 应用热力侵蚀流动到地形
 * 对应原版: thermalapply-frag.glsl
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

export class ThermalApplyPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'ThermalApplyPass');
  }

  protected initUniforms(): void {
    this.uniforms = {
      readTerrainFlux: { value: null },
      readTerrain: { value: null },
      u_SimRes: { value: 1024 },
      u_PipeLen: { value: 0.8 },
      u_timestep: { value: 0.05 },
      u_PipeArea: { value: 0.6 },
      unif_thermalErosionScale: { value: 1.0 }
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
        
        uniform sampler2D readTerrainFlux;
        uniform sampler2D readTerrain;
        uniform float u_SimRes;
        uniform float u_PipeLen;
        uniform float u_timestep;
        uniform float u_PipeArea;
        uniform float unif_thermalErosionScale;
        
        in vec2 vUv;
        out vec4 fragColor;
        
        void main() {
          vec2 curuv = vUv;
          float div = 1.0 / u_SimRes;
          float thermalErosionScale = unif_thermalErosionScale;
          
          vec4 topflux = texture(readTerrainFlux, curuv + vec2(0.0, div));
          vec4 rightflux = texture(readTerrainFlux, curuv + vec2(div, 0.0));
          vec4 bottomflux = texture(readTerrainFlux, curuv + vec2(0.0, -div));
          vec4 leftflux = texture(readTerrainFlux, curuv + vec2(-div, 0.0));
          
          vec4 inputflux = vec4(topflux.z, rightflux.w, bottomflux.x, leftflux.y);
          vec4 outputflux = texture(readTerrainFlux, curuv);
          
          float vol = inputflux.x + inputflux.y + inputflux.z + inputflux.w 
                    - outputflux.x - outputflux.y - outputflux.z - outputflux.w;
          
          float tdelta = min(50.0, u_timestep * thermalErosionScale) * vol;
          
          vec4 curTerrain = texture(readTerrain, curuv);
          
          fragColor = vec4(curTerrain.x + tdelta, curTerrain.y, curTerrain.z, curTerrain.w);
        }
      `,
      glslVersion: THREE.GLSL3
    });
  }

  protected setupInputTextures(): void {
    this.uniforms.readTerrainFlux.value = this.textureManager.getReadTexture('terrainFlux');
    this.uniforms.readTerrain.value = this.textureManager.getReadTexture('terrain');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('terrain');
  }
}
