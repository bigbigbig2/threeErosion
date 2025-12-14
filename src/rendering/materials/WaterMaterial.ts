import * as THREE from 'three';

export class WaterMaterial extends THREE.ShaderMaterial {
  constructor() {
    const uniforms = {
      // Textures
      hightmap: { value: null },
      sedimap: { value: null },
      sceneDepth: { value: null },
      
      // Simulation parameters
      u_SimRes: { value: 512.0 },
      
      // Rendering parameters
      u_WaterTransparency: { value: 0.5 },
      
      // Light parameters
      unif_LightPos: { value: new THREE.Vector3(0.4, 0.8, 0.0) },
      
      // Camera parameters
      u_Eye: { value: new THREE.Vector3(30, 20, 30) },
      u_near: { value: 0.1 },
      u_far: { value: 1000.0 },
      
      // Screen dimensions
      u_Dimensions: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };

    super({
      uniforms,
      vertexShader: WaterMaterial.vertexShader(),
      fragmentShader: WaterMaterial.fragmentShader(),
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending
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
        
        // Water surface height = terrain height + sediment + water depth
        // Scale by 50 to match the terrain mesh scale
        float heightY = ((yval + sval + wval) / u_SimRes) * 50.0;
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
      uniform sampler2D sedimap;
      uniform sampler2D sceneDepth;

      uniform float u_WaterTransparency;
      uniform float u_SimRes;
      uniform vec2 u_Dimensions;
      uniform vec3 unif_LightPos;
      uniform vec3 u_Eye;
      uniform float u_far;
      uniform float u_near;

      out vec4 fragColor;

      // Calculate normal from height map
      vec3 calnor(vec2 uv) {
        float eps = 1.0 / u_SimRes;
        vec4 cur = texture(hightmap, uv);
        vec4 r = texture(hightmap, uv + vec2(eps, 0.0));
        vec4 t = texture(hightmap, uv + vec2(0.0, eps));

        vec3 n1 = normalize(vec3(-1.0, cur.y + cur.x - r.y - r.x, 0.0));
        vec3 n2 = normalize(vec3(-1.0, t.x + t.y - r.y - r.x, 1.0));

        vec3 nor = -cross(n1, n2);
        nor = normalize(nor);
        return nor;
      }

      // Sky color interpolation
      vec3 sky(in vec3 rd) {
        return mix(vec3(0.6, 0.6, 0.6), vec3(0.3, 0.5, 0.9), clamp(rd.y, 0.0, 1.0));
      }

      // Linear depth calculation
      float linearDepth(float depthSample) {
        depthSample = 2.0 * depthSample - 1.0;
        float zLinear = 2.0 * u_near * u_far / (u_far + u_near - depthSample * (u_far - u_near));
        return zLinear;
      }

      void main() {
        // Calculate screen UV
        vec2 uv = vec2(gl_FragCoord.xy / u_Dimensions);
        
        // Sample terrain depth from scene depth texture
        float terrainDepth = texture(sceneDepth, uv).x;
        
        // Sample sediment concentration
        float sediment = texture(sedimap, fs_Uv).x;
        
        // Current fragment depth
        float waterDepth = gl_FragCoord.z;

        // Convert to linear depth
        terrainDepth = linearDepth(terrainDepth);
        waterDepth = linearDepth(waterDepth);

        // Calculate depth difference for edge fading
        float dpVal = 180.0 * max(0.0, terrainDepth - waterDepth);
        dpVal = clamp(dpVal, 0.0, 4.0);
        dpVal = 1.0 - exp(-dpVal * 1.0); // Exponential decay

        // Fresnel reflection parameters
        float fbias = 0.2;
        float fscale = 0.2;
        float fpow = 22.0;
        vec3 sundir = normalize(unif_LightPos);

        // Calculate water surface normal
        vec3 nor = -calnor(fs_Uv);
        
        // View direction
        vec3 viewdir = normalize(u_Eye - fs_Pos);
        
        // Light direction
        vec3 lightdir = normalize(sundir);
        
        // Halfway vector
        vec3 halfway = normalize(lightdir + viewdir);
        
        // Sky reflection color
        vec3 reflectedSky = sky(halfway);
        
        // Specular highlight
        float spec = pow(max(dot(nor, halfway), 0.0), 333.0);

        // Fresnel reflection intensity
        float R = max(0.0, min(1.0, fbias + fscale * pow(1.0 + dot(viewdir, -nor), fpow)));

        // Sample water depth for color mixing
        float wval = texture(hightmap, fs_Uv).y;
        wval /= 1.0;

        // Water color based on sediment (red-blue interpolation)
        vec3 watercolor = mix(vec3(0.8, 0.0, 0.0), vec3(0.0, 0.0, 0.8), sediment * 2.0);
        
        // Specular highlight color
        vec3 watercolorspec = vec3(1.0);
        watercolorspec *= spec;

        // Check if there's actually water at this point
        // wval is water depth from heightmap G channel
        if (wval < 0.01) {
          // No water, make fully transparent
          discard;
        }
        
        // Water visibility based on water depth
        float waterAlpha = min(wval * 0.5, 1.0);
        
        // Final color: base water color + reflected sky + specular
        // Alpha: transparency controlled by water depth and transparency parameter
        fragColor = vec4(
          vec3(0.0, 0.3, 0.5) + R * reflectedSky + watercolorspec,
          waterAlpha * u_WaterTransparency
        );
      }
    `;
  }

  // Parameter update methods
  setTransparency(value: number): void {
    this.uniforms.u_WaterTransparency.value = value;
  }

  setLightPosition(pos: THREE.Vector3): void {
    this.uniforms.unif_LightPos.value.copy(pos);
  }

  setCameraParams(eye: THREE.Vector3, near: number, far: number): void {
    this.uniforms.u_Eye.value.copy(eye);
    this.uniforms.u_near.value = near;
    this.uniforms.u_far.value = far;
  }

  setSimulationResolution(res: number): void {
    this.uniforms.u_SimRes.value = res;
  }

  setScreenDimensions(width: number, height: number): void {
    this.uniforms.u_Dimensions.value.set(width, height);
  }
}
