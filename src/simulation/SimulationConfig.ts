/**
 * 模拟参数配置
 */

export interface SimulationConfig {
  // 基础参数
  resolution: number;           // 模拟分辨率
  speed: number;                // 模拟速度（每帧执行的步数）
  
  // 地形生成参数
  terrainScale?: number;        // 地形缩放
  terrainHeight?: number;       // 地形高度
  
  // 水流参数
  pipeLength: number;           // 管道长度
  pipeArea: number;             // 管道横截面积
  timestep: number;             // 时间步长
  
  // 侵蚀常数
  Kc: number;                   // 输运能力常数
  Ks: number;                   // 溶解常数（侵蚀速率）
  Kd: number;                   // 沉积常数
  
  // 降雨参数
  rainEnabled: boolean;         // 是否启用降雨
  rainDegree: number;           // 降雨强度
  evaporationConstant: number;  // 蒸发常数
  
  // 热力侵蚀参数
  thermalRate: number;          // 热力侵蚀速率
  thermalTalusAngleScale: number; // 滑坡角缩放
  thermalErosionScale: number;  // 热力侵蚀缩放
  
  // 速度参数
  velocityMultiplier: number;   // 速度倍增器
  velocityAdvectionMag: number; // 速度自平流强度
  advectionMethod: number;      // 平流方法（0: 半拉格朗日, 1: MacCormack）
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  resolution: 1024,
  speed: 3,
  
  terrainScale: 3.2,
  terrainHeight: 2.0,
  
  pipeLength: 0.8,
  pipeArea: 0.6,
  timestep: 0.05,
  
  Kc: 0.06,
  Ks: 0.036,
  Kd: 0.006,
  
  rainEnabled: false,
  rainDegree: 4.5,
  evaporationConstant: 0.003,
  
  thermalRate: 0.5,
  thermalTalusAngleScale: 8.0,
  thermalErosionScale: 1.0,
  
  velocityMultiplier: 1.0,
  velocityAdvectionMag: 0.2,
  advectionMethod: 1
};
