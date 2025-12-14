/**
 * 调试 UI - 使用 dat.GUI
 */

import * as dat from 'dat.gui';
import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { SimulationConfig } from '../simulation/SimulationConfig';
import type { TerrainMesh } from '../rendering/TerrainMesh';
import type { WaterMesh } from '../rendering/WaterMesh';
import type { BrushController } from '../interaction/BrushController';

export class DebugUI {
  private gui: dat.GUI;
  private config: SimulationConfig;
  private simulationEngine: SimulationEngine;
  private terrainMesh: TerrainMesh | null = null;
  private waterMesh: WaterMesh | null = null;
  private brushController: BrushController | null = null;
  
  // GUI 控制对象
  private controls = {
    // 模拟控制
    'Pause/Resume': () => this.simulationEngine.togglePause(),
    'Reset Terrain': () => this.simulationEngine.reset(),
    
    // 基础参数
    simulationSpeed: 3,
    resolution: 1024,
    
    // 地形参数
    terrainScale: 3.2,
    terrainHeight: 2.0,
    terrainBaseType: 0,
    terrainMask: 1,
    
    // 侵蚀模式
    erosionMode: 0,
    
    // 水流参数
    pipeLength: 0.8,
    pipeArea: 0.6,
    timestep: 0.05,
    
    // 侵蚀参数
    Kc: 0.06,
    Ks: 0.036,
    Kd: 0.006,
    
    // 降雨参数
    rainEnabled: false,
    rainDegree: 4.5,
    evaporationConstant: 0.003,
    
    // 速度参数
    velocityMultiplier: 1.0,
    velocityAdvectionMag: 0.2,
    
    // 平流参数
    advectionMethod: 1,
    advectionSpeedScale: 1.0,
    
    // 热力侵蚀参数
    thermalRate: 0.5,
    thermalTalusAngleScale: 8.0,
    thermalErosionScale: 1.0,
    terrainSmoothingEnabled: true,
    
    // 渲染参数
    debugMode: 0,
    sedimentTrace: false,
    flowTrace: false,
    terrainPalette: 0,
    snowRange: 1.0,
    forestRange: 1.0,
    
    // 水体参数
    waterTransparency: 0.5,
    
    // 笔刷参数
    brushType: 0,
    brushSize: 0.05,
    brushStrength: 0.1,
    brushOperation: 0
  };
  
  constructor(
    simulationEngine: SimulationEngine, 
    terrainMesh?: TerrainMesh, 
    waterMesh?: WaterMesh,
    brushController?: BrushController
  ) {
    this.simulationEngine = simulationEngine;
    this.terrainMesh = terrainMesh || null;
    this.waterMesh = waterMesh || null;
    this.brushController = brushController || null;
    this.config = simulationEngine.getConfig();
    
    // 初始化控制值
    Object.assign(this.controls, this.config);
    
    this.gui = new dat.GUI({ width: 320 });
    this.setupGUI();
    
    console.log('✅ 调试 UI 初始化完成');
  }
  
  private setupGUI(): void {
    // 模拟控制文件夹
    const controlFolder = this.gui.addFolder('模拟控制');
    controlFolder.add(this.controls, 'Pause/Resume').name('⏯️ 暂停/继续');
    controlFolder.add(this.controls, 'Reset Terrain').name('🔄 重置地形');
    controlFolder.add(this.controls, 'simulationSpeed', 1, 10, 1)
      .name('模拟速度')
      .onChange((value: number) => {
        this.updateConfig({ speed: value });
      });
    controlFolder.open();
    
    // 地形参数文件夹
    const terrainFolder = this.gui.addFolder('地形生成');
    terrainFolder.add(this.controls, 'terrainBaseType', {
      '普通 FBM': 0,
      '域扭曲': 1,
      '梯田': 2,
      'Voronoi': 3
    })
      .name('地形类型')
      .onChange((value: number) => {
        this.updateConfig({ terrainBaseType: value });
      });
    terrainFolder.add(this.controls, 'terrainMask', {
      '关闭': 0,
      '球形': 1
    })
      .name('地形遮罩')
      .onChange((value: number) => {
        this.updateConfig({ terrainMask: value });
      });
    terrainFolder.add(this.controls, 'terrainScale', 0.5, 10.0, 0.1)
      .name('地形缩放')
      .onChange((value: number) => {
        this.updateConfig({ terrainScale: value });
      });
    terrainFolder.add(this.controls, 'terrainHeight', 0.5, 5.0, 0.1)
      .name('地形高度')
      .onChange((value: number) => {
        this.updateConfig({ terrainHeight: value });
      });
    
    // 水流参数文件夹
    const waterFolder = this.gui.addFolder('水流参数');
    waterFolder.add(this.controls, 'pipeLength', 0.1, 2.0, 0.1)
      .name('管道长度')
      .onChange((value: number) => {
        this.updateConfig({ pipeLength: value });
      });
    waterFolder.add(this.controls, 'pipeArea', 0.1, 2.0, 0.1)
      .name('管道面积')
      .onChange((value: number) => {
        this.updateConfig({ pipeArea: value });
      });
    waterFolder.add(this.controls, 'timestep', 0.01, 0.2, 0.01)
      .name('时间步长')
      .onChange((value: number) => {
        this.updateConfig({ timestep: value });
      });
    waterFolder.open();
    
    // 侵蚀参数文件夹
    const erosionFolder = this.gui.addFolder('侵蚀参数');
    erosionFolder.add(this.controls, 'erosionMode', {
      '河流模式': 0,
      '山地模式': 1,
      '多边形模式': 2
    })
      .name('侵蚀模式')
      .onChange((value: number) => {
        this.updateConfig({ erosionMode: value });
      });
    erosionFolder.add(this.controls, 'Kc', 0.0, 0.2, 0.001)
      .name('Kc (输运能力)')
      .onChange((value: number) => {
        this.updateConfig({ Kc: value });
      });
    erosionFolder.add(this.controls, 'Ks', 0.0, 0.1, 0.001)
      .name('Ks (溶解速率)')
      .onChange((value: number) => {
        this.updateConfig({ Ks: value });
      });
    erosionFolder.add(this.controls, 'Kd', 0.0, 0.05, 0.001)
      .name('Kd (沉积速率)')
      .onChange((value: number) => {
        this.updateConfig({ Kd: value });
      });
    erosionFolder.open();
    
    // 降雨参数文件夹
    const rainFolder = this.gui.addFolder('降雨');
    rainFolder.add(this.controls, 'rainEnabled')
      .name('启用降雨')
      .onChange((value: boolean) => {
        this.updateConfig({ rainEnabled: value });
      });
    rainFolder.add(this.controls, 'rainDegree', 0.0, 10.0, 0.1)
      .name('降雨强度')
      .onChange((value: number) => {
        this.updateConfig({ rainDegree: value });
      });
    rainFolder.add(this.controls, 'evaporationConstant', 0.0, 0.01, 0.001)
      .name('蒸发常数')
      .onChange((value: number) => {
        this.updateConfig({ evaporationConstant: value });
      });
    
    // 速度参数文件夹
    const velocityFolder = this.gui.addFolder('速度');
    velocityFolder.add(this.controls, 'velocityMultiplier', 0.0, 5.0, 0.1)
      .name('速度倍增器')
      .onChange((value: number) => {
        this.updateConfig({ velocityMultiplier: value });
      });
    velocityFolder.add(this.controls, 'velocityAdvectionMag', 0.0, 1.0, 0.05)
      .name('平流强度')
      .onChange((value: number) => {
        this.updateConfig({ velocityAdvectionMag: value });
      });
    
    // 平流参数文件夹
    const advectionFolder = this.gui.addFolder('泥沙平流');
    advectionFolder.add(this.controls, 'advectionMethod', { 
      '半拉格朗日': 0, 
      'MacCormack': 1 
    })
      .name('平流方法')
      .onChange((value: number) => {
        this.updateConfig({ advectionMethod: value });
      });
    advectionFolder.add(this.controls, 'advectionSpeedScale', 0.1, 2.0, 0.1)
      .name('速度缩放')
      .onChange((value: number) => {
        this.updateConfig({ advectionSpeedScale: value });
      });
    
    // 热力侵蚀文件夹
    const thermalFolder = this.gui.addFolder('热力侵蚀');
    thermalFolder.add(this.controls, 'thermalRate', 0.0, 2.0, 0.1)
      .name('侵蚀速率')
      .onChange((value: number) => {
        this.updateConfig({ thermalRate: value });
      });
    thermalFolder.add(this.controls, 'thermalTalusAngleScale', 1.0, 20.0, 0.5)
      .name('滑坡角缩放')
      .onChange((value: number) => {
        this.updateConfig({ thermalTalusAngleScale: value });
      });
    thermalFolder.add(this.controls, 'thermalErosionScale', 0.0, 5.0, 0.1)
      .name('侵蚀缩放')
      .onChange((value: number) => {
        this.updateConfig({ thermalErosionScale: value });
      });
    thermalFolder.add(this.controls, 'terrainSmoothingEnabled')
      .name('地形平滑')
      .onChange((value: boolean) => {
        this.updateConfig({ terrainSmoothingEnabled: value });
      });
    
    // 渲染参数文件夹
    if (this.terrainMesh) {
      const renderFolder = this.gui.addFolder('渲染参数');
      renderFolder.add(this.controls, 'debugMode', {
        '正常渲染': 0,
        '泥沙浓度': 1,
        '速度场': 2,
        '地形高度': 3,
        '水流通量': 4,
        '热力通量': 5,
        '最大滑坡': 6,
        '泥沙混合': 7,
        '法线视图': 8,
        '速度热力图': 9
      })
        .name('调试模式')
        .onChange((value: number) => {
          this.terrainMesh?.setDebugMode(value);
        });
      
      renderFolder.add(this.controls, 'sedimentTrace')
        .name('泥沙痕迹')
        .onChange((value: boolean) => {
          this.terrainMesh?.setSedimentTrace(value);
        });
      
      renderFolder.add(this.controls, 'flowTrace')
        .name('流动痕迹')
        .onChange((value: boolean) => {
          this.terrainMesh?.setFlowTrace(value);
        });
      
      renderFolder.add(this.controls, 'terrainPalette', {
        '高山': 0,
        '沙漠': 1,
        '丛林': 2
      })
        .name('地形调色板')
        .onChange((value: number) => {
          this.terrainMesh?.setTerrainPalette(value);
        });
      
      renderFolder.add(this.controls, 'snowRange', 0.0, 10.0, 0.1)
        .name('雪线范围')
        .onChange((value: number) => {
          this.terrainMesh?.setSnowRange(value);
        });
      
      renderFolder.add(this.controls, 'forestRange', 0.0, 10.0, 0.1)
        .name('森林范围')
        .onChange((value: number) => {
          this.terrainMesh?.setForestRange(value);
        });
      
      // 水体透明度控制
      if (this.waterMesh) {
        renderFolder.add(this.controls, 'waterTransparency', 0.0, 1.0, 0.01)
          .name('水体透明度')
          .onChange((value: number) => {
            this.waterMesh?.setTransparency(value);
          });
      }
      
      renderFolder.open();
    }
    
    // 笔刷工具文件夹
    if (this.brushController) {
      const brushFolder = this.gui.addFolder('笔刷工具');
      brushFolder.add(this.controls, 'brushType', {
        '地形笔刷': 0,
        '水体笔刷': 1
      })
        .name('笔刷类型')
        .onChange((value: number) => {
          this.brushController?.setBrushType(value);
        });
      
      brushFolder.add(this.controls, 'brushSize', 0.01, 0.2, 0.01)
        .name('笔刷大小')
        .onChange((value: number) => {
          this.brushController?.setBrushSize(value);
        });
      
      brushFolder.add(this.controls, 'brushStrength', 0.01, 0.5, 0.01)
        .name('笔刷强度')
        .onChange((value: number) => {
          this.brushController?.setBrushStrength(value);
        });
      
      brushFolder.add(this.controls, 'brushOperation', {
        '添加': 0,
        '减去': 1
      })
        .name('笔刷操作')
        .onChange((value: number) => {
          this.brushController?.setBrushOperation(value);
        });
      
      brushFolder.open();
    }
  }
  
  private updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.simulationEngine.updateConfig(newConfig);
  }
  
  public show(): void {
    this.gui.show();
  }
  
  public hide(): void {
    this.gui.hide();
  }
  
  public destroy(): void {
    this.gui.destroy();
  }
}
