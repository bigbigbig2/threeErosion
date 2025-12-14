/**
 * MacCormack 平流 Pass（误差修正步骤）
 * 三步法减少数值扩散：
 * 1. 前向平流 (AdvectionPass with multiplier=1)
 * 2. 反向平流 (AdvectionPass with multiplier=-1)
 * 3. 误差修正 (MacCormackPass)
 */

import * as THREE from 'three';
import { BaseSimPass } from './BaseSimPass';
import type { TextureManager } from '../TextureManager';

const fragmentShader = `
precision highp float;

uniform sampler2D vel;
uniform sampler2D sedi;
uniform sampler2D sediadvecta;
uniform sampler2D sediadvectb;

uniform float u_SimRes;
uniform float u_timestep;
uniform float unif_advectionSpeedScale;

in vec2 vUv;

layout(location = 0) out vec4 writeSediment;

void main() {
    vec2 curuv = vUv;
    vec4 curvel = texture(vel, curuv);
    vec4 cursedi = texture(sedi, curuv);

    // 计算目标位置
    vec2 targetPos = curuv * u_SimRes - u_timestep * curvel.xy;

    // 获取周围四个节点
    vec4 st;
    st.xy = floor(targetPos - 0.5) + 0.5;
    st.zw = st.xy + 1.0;

    float nodeVal[4];
    nodeVal[0] = texture(sedi, st.xy / u_SimRes).x;
    nodeVal[1] = texture(sedi, st.zy / u_SimRes).x;
    nodeVal[2] = texture(sedi, st.xw / u_SimRes).x;
    nodeVal[3] = texture(sedi, st.zw / u_SimRes).x;

    // 计算钳位范围（防止产生新的极值）
    float clampMin = min(min(min(nodeVal[0], nodeVal[1]), nodeVal[2]), nodeVal[3]);
    float clampMax = max(max(max(nodeVal[0], nodeVal[1]), nodeVal[2]), nodeVal[3]);

    float sediment = texture(sedi, curuv).x;

    // MacCormack 误差修正公式：
    // φ_new = φ' + 0.5 * (φ - φ'')
    // φ' = 前向平流结果 (sediadvecta)
    // φ'' = 反向平流结果 (sediadvectb)
    // φ = 原始值 (sediment)
    float res = texture(sediadvecta, curuv).x + 0.5 * (sediment - texture(sediadvectb, curuv).x);

    // 钳位到合理范围
    sediment = max(min(res, clampMax), clampMin);

    writeSediment = vec4(sediment, 0.0, 0.0, 1.0);
}
`;

export class MacCormackPass extends BaseSimPass {
  constructor(textureManager: TextureManager) {
    super(textureManager, 'MacCormackPass');
  }
  
  protected initUniforms(): void {
    this.uniforms = {
      vel: { value: null },
      sedi: { value: null },
      sediadvecta: { value: null },
      sediadvectb: { value: null },
      u_SimRes: { value: 1024 },
      u_timestep: { value: 0.05 },
      unif_advectionSpeedScale: { value: 1.0 }
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
    this.uniforms.vel.value = this.textureManager.getReadTexture('velocity');
    this.uniforms.sedi.value = this.textureManager.getReadTexture('sediment');
    this.uniforms.sediadvecta.value = this.textureManager.getReadTexture('sedimentAdvectA');
    this.uniforms.sediadvectb.value = this.textureManager.getReadTexture('sedimentAdvectB');
  }
  
  protected getRenderTarget(): THREE.WebGLRenderTarget | null {
    return this.textureManager.getWriteTarget('sediment');
  }
}
