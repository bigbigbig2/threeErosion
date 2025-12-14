import * as THREE from 'three';

export interface BrushParams {
  position: THREE.Vector2;
  size: number;
  strength: number;
  type: number; // 0: none, 1: terrain, 2: water
  operation: number; // 0: add, 1: subtract
}

export class TerrainMaterial extends THREE.ShaderMaterial {
  constructor() {
    const uniforms = {
      // Textures
      hightmap: { value: null },
      normap: { value: null },
      sedimap: { value: null },
      velmap: { value: null },
      fluxmap: { value: null },
      terrainfluxmap: { value: null },
      maxslippagemap: { value: null },
      sediBlend: { value: null },
      shadowMap: { value: null },
      sceneDepth: { value: null },
      
      // Simulation parameters
      u_SimRes: { value: 512.0 },
      
      // Rendering parameters
      u_TerrainDebug: { value: 0 },
      u_SedimentTrace: { value: 1 }, // 0: on, 1: off
      u_FlowTrace: { value: 1 }, // 0: on, 1: off
      u_TerrainPlatte: { value: 0 }, // 0: alpine, 1: desert, 2: jungle
      u_SnowRange: { value: 1.0 },
      u_ForestRange: { value: 1.0 },
      
      // Brush parameters
      u_BrushType: { value: 0 },
      u_BrushSize: { value: 4.0 },
      u_BrushPos: { value: new THREE.Vector2(0, 0) },
      u_pBrushOn: { value: 0 },
      u_permanentPos: { value: new THREE.Vector2(0, 0) },
      u_PBrushData: { value: new THREE.Vector2(4.0, 0.25) },
      
      // Light parameters
      unif_LightPos: { value: new THREE.Vector3(0.4, 0.8, 0.0) },
      
      // Mouse world position (for brush)
      u_MouseWorldPos: { value: new THREE.Vector4(0, 0, 0, 0) },
      u_MouseWorldDir: { value: new THREE.Vector3(0, 0, 0) },
      
    };

    super({
      uniforms,
      vertexShader: TerrainMaterial.vertexShader(),
      fragmentShader: TerrainMaterial.fragmentShader(),
      glslVersion: THREE.GLSL3
    });
  }

  private static vertexShader(): string {
    return `
      // Custom uniforms (Three.js provides modelMatrix, viewMatrix, projectionMatrix, position, uv automatically)
      uniform sampler2D hightmap;
      uniform sampler2D sedimap;
      uniform float u_SimRes;

      out vec3 fs_Pos;
      out vec2 fs_Uv;

      void main() {
        fs_Uv = uv;
        float sval = texture(sedimap, uv).x;
        float yval = texture(hightmap, uv).x;
        float wval = texture(hightmap, uv).y;
        
        // Calculate height displacement from texture
        // yval is terrain height, typically 0-200+ range
        // Divide by u_SimRes (1024) to normalize to 0-0.2 range
        // Then multiply by plane size (50) to match the XZ scale
        float heightY = (yval / u_SimRes) * 50.0;
        
        // After rotation: position is (x, y, z) where y is the up direction
        // We need to add height to the Y component
        vec3 displacedPosition = position + vec3(0.0, heightY, 0.0);
        fs_Pos = displacedPosition;
        
        // Apply Three.js's built-in transformation matrices
        vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
        vec4 viewPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * viewPosition;
      }
    `;
  }

  private static fragmentShader(): string {
    return `
      precision highp float;

      in vec3 fs_Pos;
      in vec2 fs_Uv;

      uniform sampler2D hightmap;
      uniform sampler2D normap;
      uniform sampler2D sedimap;
      uniform sampler2D velmap;
      uniform sampler2D fluxmap;
      uniform sampler2D terrainfluxmap;
      uniform sampler2D maxslippagemap;
      uniform sampler2D sediBlend;
      uniform sampler2D shadowMap;
      uniform sampler2D sceneDepth;

      uniform int u_TerrainDebug;
      uniform int u_SedimentTrace;
      uniform int u_FlowTrace;
      uniform int u_TerrainPlatte;
      uniform float u_SnowRange;
      uniform float u_ForestRange;
      uniform float u_SimRes;
      uniform vec3 unif_LightPos;
      
      uniform int u_BrushType;
      uniform float u_BrushSize;
      uniform vec2 u_BrushPos;
      uniform vec4 u_MouseWorldPos;
      uniform vec3 u_MouseWorldDir;
      uniform int u_pBrushOn;
      uniform vec2 u_permanentPos;
      uniform vec2 u_PBrushData;

      out vec4 fragColor;

      #define PI 3.1415926
      #define OCTAVES 12

      // Normal calculation function
      vec3 calnor(vec2 uv) {
        float eps = 1.0 / u_SimRes;
        vec4 cur = texture(hightmap, uv);
        vec4 r = texture(hightmap, uv + vec2(eps, 0.0));
        vec4 t = texture(hightmap, uv + vec2(0.0, eps));
        vec4 b = texture(hightmap, uv + vec2(0.0, -eps));
        vec4 l = texture(hightmap, uv + vec2(-eps, 0.0));

        vec3 nor = vec3(l.x - r.x, 2.0, t.x - b.x);
        nor = -normalize(nor);
        return nor;
      }

      // Random function
      float random(in vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      // Noise function
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

      // FBM function
      float fbm(in vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0;
        
        for (int i = 0; i < OCTAVES; i++) {
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= 0.33;
        }
        return value;
      }

      void main() {
        vec3 sundir = normalize(unif_LightPos);
        float angle = dot(sundir, vec3(0.0, 1.0, 0.0));
        vec3 hue = mix(vec3(1.0), vec3(1.0, 0.47, 0.078), 1.0 - angle);

        // Shadow calculation (simplified - no shadow map for now)
        float shadowVal = 1.0;
        vec3 shadowCol = vec3(1.0);
        vec3 ambientCol = vec3(0.01);

        // Color palette
        vec3 forestcol = vec3(0.148, 0.608, 0.027) * 0.6;
        vec3 mtncolor = vec3(0.99);
        vec3 dirtcol = vec3(0.45);
        vec3 grass = vec3(0.757, 0.922, 0.106);
        vec3 sand = vec3(0.839, 0.722, 0.376);
        vec3 watercol = vec3(0.1, 0.3, 0.8);
        vec3 permanentCol = vec3(0.8, 0.1, 0.2);

        // Brush visualization
        vec3 addcol = vec3(0.0);
        if (u_BrushType != 0) {
          vec2 pointOnPlane = u_BrushPos;
          float pdis2fragment = distance(pointOnPlane, fs_Uv);
          if (pdis2fragment < 0.01 * u_BrushSize && pdis2fragment >= u_BrushSize * 0.01 - 0.003) {
            if (u_BrushType == 1) {
              addcol = sand * 0.8;
            } else if (u_BrushType == 2) {
              addcol = watercol * 0.8;
            }
          }
        }

        // Permanent brush visualization
        if (u_pBrushOn != 0) {
          vec2 pointOnPlane = u_permanentPos;
          float pdis2fragment = distance(pointOnPlane, fs_Uv);
          if (pdis2fragment < 0.01 * u_PBrushData.x) {
            float dens = (0.01 * u_PBrushData.x - pdis2fragment) / (0.01 * u_PBrushData.x);
            addcol = permanentCol * 0.8 * dens * 5.0;
          }
        }

        // Calculate normal
        vec3 slopesin = texture(normap, fs_Uv).xyz;
        vec3 nor = -calnor(fs_Uv);

        // Lambert lighting
        float lamb = dot(nor, vec3(sundir.x, sundir.y, -sundir.z));

        // Get height and water values
        vec4 fH = texture(hightmap, fs_Uv);
        float yval = fH.x * 4.0;
        float wval = fH.y;
        float sval = texture(sediBlend, fs_Uv).x;

        vec3 finalcol = vec3(0.0);

        // Height thresholds
        float lowH = 0.0;
        float midH = 300.0;
        float highH = 600.0;

        // Terrain palette adjustments
        if (u_TerrainPlatte == 1) {
          forestcol = mtncolor;
        } else if (u_TerrainPlatte == 2) {
          highH = 2000.0;
        }

        // Height-based coloring
        if (yval <= midH) {
          finalcol = forestcol;
        } else if (yval > midH && yval <= highH) {
          finalcol = mix(forestcol, mtncolor, (yval - midH) / (highH - midH));
        } else if (yval > highH) {
          finalcol = mtncolor;
        }

        // Forest range blending
        finalcol = mix(mtncolor, finalcol, clamp(pow(abs(nor.y), u_ForestRange), 0.0, 1.0));

        // Slope-based coloring (steep slopes show dirt/rock)
        if (abs(nor.y) < 0.75) {
          finalcol = mix(dirtcol, finalcol, pow(abs(nor.y) / 0.75, u_SnowRange));
        }

        // Apply lighting
        vec3 normal = lamb * finalcol + ambientCol;
        vec3 fcol = normal;
        bool debug = true;

        // Debug modes
        if (u_TerrainDebug == 0) {
          fcol = normal;
          debug = false;
        } else if (u_TerrainDebug == 1) {
          // Sediment view
          fcol = texture(sedimap, fs_Uv).xyz * 2.0;
        } else if (u_TerrainDebug == 2) {
          // Velocity view
          fcol = abs(texture(velmap, fs_Uv).xyz / 20.0);
        } else if (u_TerrainDebug == 9) {
          // Velocity heatmap
          float velSize = length(texture(velmap, fs_Uv).xyz) / 5.0;
          velSize = 1.0 - exp(-velSize);
          float midVelBlend = 0.5;
          float highVelBlend = 1.0;
          
          if (velSize <= midVelBlend && velSize >= 0.0) {
            fcol = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), velSize / midVelBlend);
          } else if (velSize >= midVelBlend) {
            fcol = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (velSize - midVelBlend) / (highVelBlend - midVelBlend));
          }
          
          if (wval < 0.0001) {
            fcol = vec3(0.0);
          }
        } else if (u_TerrainDebug == 3) {
          // Terrain height view
          fcol = texture(hightmap, fs_Uv).xyz;
          fcol.xy /= 200.0;
          fcol.y *= 80.0;
        } else if (u_TerrainDebug == 4) {
          // Flux view
          fcol = texture(fluxmap, fs_Uv).xyz / 3.0;
          if (fcol == vec3(0.0)) {
            fcol = vec3(texture(fluxmap, fs_Uv).w) / 3.0;
          }
        } else if (u_TerrainDebug == 5) {
          // Terrain flux view
          fcol = texture(terrainfluxmap, fs_Uv).xyz * 100000.0;
        } else if (u_TerrainDebug == 6) {
          // Max slippage view
          fcol = texture(maxslippagemap, fs_Uv).xyz / 13.0;
        } else if (u_TerrainDebug == 7) {
          // Sediment blend view
          fcol = vec3(sval * 300.0);
        } else if (u_TerrainDebug == 8) {
          // Normal view
          fcol = slopesin;
        }

        fcol = clamp(fcol, vec3(0.0), vec3(1.0));

        // Sediment and flow traces (only in normal mode)
        vec3 lightSedimentCol = vec3(0.0, 0.5, 0.3);
        vec3 mediumSedimentCol = vec3(0.0, 0.5, 0.5);
        vec3 deepSedimentCol = vec3(0.0, 0.0, 0.99);

        if (!debug) {
          // Flow traces
          if (u_FlowTrace == 0) {
            float sedimentTrace = 1.0 - exp(-sval * 300.0);
            fcol = mix(fcol, vec3(0.941, 0.902, 0.549) * lamb + ambientCol, sedimentTrace * 1.5);
          }

          // Sediment traces
          if (u_SedimentTrace == 0) {
            float ssval = texture(sedimap, fs_Uv).x;
            ssval = 1.0 - exp(-ssval * 7.0);
            vec3 ss = fcol;
            float small = 0.4;
            float large = 0.7;
            
            if (ssval <= small) {
              ss = mix(ss, lightSedimentCol, ssval / small);
            } else if (ssval > small && ssval <= large) {
              ss = mix(lightSedimentCol, mediumSedimentCol, (ssval - small) / (large - small));
            } else if (ssval > large) {
              ss = mix(mediumSedimentCol, deepSedimentCol, (ssval - large) / (1.0 - large));
            }
            
            fcol = mix(fcol, max(ss * lamb, vec3(0.0)), ssval);
          }

          fcol *= shadowCol * hue;
        }

        // Add brush visualization
        fcol += addcol;

        fragColor = vec4(fcol, 1.0);
      }
    `;
  }

  // Parameter update methods
  setDebugMode(mode: number): void {
    this.uniforms.u_TerrainDebug.value = mode;
  }

  setSedimentTrace(enabled: boolean): void {
    this.uniforms.u_SedimentTrace.value = enabled ? 0 : 1;
  }

  setFlowTrace(enabled: boolean): void {
    this.uniforms.u_FlowTrace.value = enabled ? 0 : 1;
  }

  setTerrainPalette(palette: number): void {
    this.uniforms.u_TerrainPlatte.value = palette;
  }

  setSnowRange(range: number): void {
    this.uniforms.u_SnowRange.value = range;
  }

  setForestRange(range: number): void {
    this.uniforms.u_ForestRange.value = range;
  }

  setBrushParams(params: BrushParams): void {
    this.uniforms.u_BrushType.value = params.type;
    this.uniforms.u_BrushSize.value = params.size;
    this.uniforms.u_BrushPos.value.copy(params.position);
  }

  setLightPosition(pos: THREE.Vector3): void {
    this.uniforms.unif_LightPos.value.copy(pos);
  }

  setSimulationResolution(res: number): void {
    this.uniforms.u_SimRes.value = res;
  }

  setPermanentBrush(enabled: boolean, pos?: THREE.Vector2, size?: number, strength?: number): void {
    this.uniforms.u_pBrushOn.value = enabled ? 1 : 0;
    if (pos) this.uniforms.u_permanentPos.value.copy(pos);
    if (size !== undefined && strength !== undefined) {
      this.uniforms.u_PBrushData.value.set(size, strength);
    }
  }
}
