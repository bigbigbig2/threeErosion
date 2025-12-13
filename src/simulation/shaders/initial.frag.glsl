// 地形初始化着色器 - 使用噪声生成初始地形
precision highp float;

uniform float u_Time;
uniform float u_TerrainScale;
uniform float u_TerrainHeight;
uniform int u_terrainBaseType;
uniform int u_TerrainMask;

varying vec2 vUv;

// Voronoi 噪声
vec3 hash3(vec2 p) {
    vec3 q = vec3(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3)),
        dot(p, vec2(419.2, 371.9))
    );
    return fract(sin(q) * 43758.5453);
}

float iqnoise(in vec2 x, float u, float v) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    
    float k = 1.0 + 63.0 * pow(1.0 - v, 4.0);
    
    float va = 0.0;
    float wt = 0.0;
    for(int j = -2; j <= 2; j++) {
        for(int i = -2; i <= 2; i++) {
            vec2 g = vec2(float(i), float(j));
            vec3 o = hash3(p + g) * vec3(u, u, 1.0);
            vec2 r = g - f + o.xy;
            float d = dot(r, r);
            float ww = pow(1.0 - smoothstep(0.0, 1.414, sqrt(d)), k);
            va += o.z * ww;
            wt += ww;
        }
    }
    
    return va / wt;
}

// 随机函数
vec2 random2(vec2 st) {
    st = vec2(
        dot(st, vec2(127.1, 311.7)),
        dot(st, vec2(269.5, 183.3))
    );
    return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
}

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

// FBM (Fractional Brownian Motion)
#define OCTAVES 12

float fbm(in vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for(int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.47;
    }
    return value;
}

// Voronoi
float voroni(in vec2 ss) {
    return iqnoise(ss * 2.0, 2.0, 2.0);
}

// 梯田效果
float terrace(float h) {
    float W = 0.04; // 梯田带宽度
    float k = floor(h / W);
    float f = (h - k * W) / W;
    float s = min(100.0 * f, 1.0);
    return (k + s) * W;
}

// 域扭曲
float domainWarp(vec2 p) {
    return fbm(p + fbm(p + fbm(p)));
}

// 山脊噪声
float ridgeNoise(float p) {
    return 0.8 * (0.3 - abs(0.3 - p));
}

// 圆形遮罩
float circleMask(vec2 p) {
    return max(0.5 - distance(p, vec2(0.5)), 0.0);
}

void main() {
    vec2 uv = vUv;
    
    float c_mask = circleMask(uv);
    vec2 cpos = 1.5 * uv * u_TerrainScale;
    cpos = cpos + vec2(
        1.0 * sin(u_Time / 3.0) + 2.1,
        1.0 * cos(u_Time / 17.0) + 3.6
    );
    
    float terrain_height = fbm(cpos * 2.0) * 1.1;
    
    terrain_height = pow(terrain_height, 3.0);
    
    // 根据地形类型应用不同的噪声
    if(u_terrainBaseType == 2) {
        // 梯田
        terrain_height = terrace(terrain_height / 1.2);
    } else if(u_terrainBaseType == 1) {
        // 域扭曲
        terrain_height = domainWarp(cpos * 2.0);
    } else if(u_terrainBaseType == 3) {
        // Voronoi
        terrain_height = voroni(cpos * 2.0) / 3.0;
    } else if(u_terrainBaseType == 4) {
        // 山脊噪声
        terrain_height = ridgeNoise(pow(fbm(cpos * 1.5), 2.0));
    }
    
    terrain_height *= u_TerrainHeight * 120.0;
    
    // 应用遮罩
    if(u_TerrainMask == 1) {
        // 球形遮罩
        terrain_height *= 2.0 * pow(c_mask, 1.0);
    } else if(u_TerrainMask == 2) {
        // 斜坡遮罩
        terrain_height *= (uv.x + uv.y) * 1.0;
    }
    
    float rainfall = 0.0;
    
    // 输出：R = 高度, G = 水深（初始为0）
    gl_FragColor = vec4(terrain_height, rainfall, 0.0, 1.0);
}
