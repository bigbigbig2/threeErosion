import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { TerrainMesh } from '../rendering/TerrainMesh';
import { WaterMesh } from '../rendering/WaterMesh';
import { SceneDepthPass } from '../rendering/postprocessing/SceneDepthPass';
import { BrushController } from '../interaction/BrushController';
import { DebugUI } from '../ui/DebugUI';
import { HelpUI } from '../ui/HelpUI';
import { FPSMonitor } from '../ui/FPSMonitor';

export class App {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  
  // 模拟引擎
  private simulationEngine!: SimulationEngine;
  
  // 地形渲染
  private terrainMesh!: TerrainMesh;
  
  // 水体渲染
  private waterMesh!: WaterMesh;
  private sceneDepthPass!: SceneDepthPass;
  
  // 笔刷交互
  private brushController!: BrushController;
  
  // UI 和监控
  private helpUI: any;
  private fpsMonitor!: FPSMonitor;
  
  // 状态管理
  private clock: THREE.Clock;
  private isPaused: boolean = true;  // 默认暂停，防止启动时淹没
  
  constructor(canvas: HTMLCanvasElement) {
    this.clock = new THREE.Clock();
    
    this.initRenderer(canvas);
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initSimulation();
    this.addTerrainMesh(); // 添加地形网格
    this.initWaterRendering(); // 初始化水体渲染
    this.initBrushController(); // 初始化笔刷控制器
    this.initUI();
    this.setupEventListeners();
  }
  

  private initRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // 检查 WebGL2 支持
    const gl = this.renderer.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) {
      throw new Error('WebGL2 不支持！');
    }
    
    // 检查浮点纹理扩展
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.warn('⚠️ EXT_color_buffer_float 不支持，模拟可能无法正常工作');
    }
    
    console.log('✅ 渲染器初始化完成');
  }
  

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x211d25);
    this.scene.fog = new THREE.Fog(0x211d25, 50, 200);
  }
  

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(30, 20, 30);
    this.camera.lookAt(0, 0, 0);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
  }
  

  private initSimulation(): void {
    this.simulationEngine = new SimulationEngine(this.renderer, {
      resolution: 1024,
      speed: 1  // 降低默认速度以提高性能
    });
  }
  
  /**
   * 添加地形网格
   */
  private addTerrainMesh(): void {
    // 网格细分度 256，模拟分辨率 1024
    this.terrainMesh = new TerrainMesh(256, 1024);
    this.scene.add(this.terrainMesh.getMesh());
  }
  
  /**
   * 初始化水体渲染系统
   */
  private initWaterRendering(): void {
    // 创建场景深度渲染通道
    this.sceneDepthPass = new SceneDepthPass(
      window.innerWidth,
      window.innerHeight
    );
    
    this.waterMesh = new WaterMesh(256, 1024);
    this.scene.add(this.waterMesh.getMesh());
  }
  

  private initBrushController(): void {
    this.brushController = new BrushController(
      this.camera,
      this.terrainMesh.getMesh()
    );
  }
  
 
  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 30);
    directionalLight.castShadow = true;
    
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    this.scene.add(directionalLight);
    
  }
  

  
  /**
   * 初始化 UI
   */
  private initUI(): void {
    // 调试 GUI 面板（传递水体网格和笔刷控制器）
    new DebugUI(this.simulationEngine, this.terrainMesh, this.waterMesh, this.brushController);
    
    // 操作提示面板
    this.helpUI = new HelpUI();
    
    // FPS 监控器
    this.fpsMonitor = new FPSMonitor();
    
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // 鼠标事件（笔刷）
    window.addEventListener('mousemove', (e) => {
      this.brushController.onMouseMove(e);
    });
    window.addEventListener('mousedown', (e) => {
      this.brushController.onMouseDown(e);
    });
    window.addEventListener('mouseup', (e) => {
      this.brushController.onMouseUp(e);
    });
    
    // 键盘事件
    window.addEventListener('keydown', (e) => {
      // 空格键：暂停/继续
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePause();
      }
      // R 键：重置地形（但不是笔刷的 R 键）
      else if (e.code === 'KeyR' && !e.ctrlKey && !e.shiftKey) {
        // 先传递给笔刷控制器
        this.brushController.onKeyDown(e);
      }
      // H 键：显示/隐藏帮助面板
      else if (e.code === 'KeyH') {
        e.preventDefault();
        this.helpUI.toggle();
      }
      // C, P 键：笔刷控制
      else if (e.code === 'KeyC' || e.code === 'KeyP') {
        this.brushController.onKeyDown(e);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.brushController.onKeyUp(e);
    });
  }
  
  /**
   * 窗口大小改变处理
   */
  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    // 更新深度渲染通道尺寸
    this.sceneDepthPass.setSize(width, height);
    
    // 更新水体材质的屏幕尺寸
    this.waterMesh.setScreenDimensions(width, height);
  }
  
 
  public start(): void {
    this.animate();
  }
  
 
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    // 更新 FPS 监控
    this.fpsMonitor.update();
    this.controls.update();
    
    // 执行物理模拟（即使暂停也要调用 update，因为它会处理初始化）
    const delta = this.clock.getDelta();
    this.simulationEngine.update(delta);
    
    // 应用笔刷编辑（即使暂停也可以编辑）
    const brushParams = this.brushController.getBrushParams();
    if (brushParams.active) {
      this.simulationEngine.applyBrush(brushParams);
    }
    
    // 更新地形材质的笔刷参数（用于显示笔刷光标）
    this.terrainMesh.setBrushParams(brushParams);
    
    // 从 SimulationEngine 获取所有纹理
    const textures = this.simulationEngine.getTextures();
    
    // 更新地形网格的所有纹理
    this.terrainMesh.updateTextures({
      heightMap: textures.terrain.read || undefined,
      normalMap: textures.terrainNormal.read || undefined,
      sedimentMap: textures.sediment.read || undefined,
      velocityMap: textures.velocity.read || undefined,
      fluxMap: textures.flux.read || undefined,
      terrainFluxMap: textures.terrainFlux.read || undefined,
      maxSlippageMap: textures.maxSlippage.read || undefined,
      sedimentBlendMap: textures.sedimentBlend.read || undefined
    });
    
    // === 水体渲染流程 ===
    
    // 1. 渲染地形深度
    this.sceneDepthPass.execute(this.renderer, this.scene, this.camera, this.terrainMesh.getMesh());
    
    // 2. 更新水体纹理
    this.waterMesh.updateTextures({
      heightMap: textures.terrain.read || undefined,
      sedimentMap: textures.sediment.read || undefined,
      sceneDepth: this.sceneDepthPass.getDepthTexture()
    });
    
    // 3. 更新水体相机参数
    this.waterMesh.setCameraParams(
      this.camera.position,
      this.camera.near,
      this.camera.far
    );
    
    // 4. 渲染最终场景（地形 + 水体）
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * 暂停/恢复模拟
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.simulationEngine.togglePause();
  }
  
  /**
   * 获取模拟引擎（供 GUI 使用）
   */
  public getSimulationEngine(): SimulationEngine {
    return this.simulationEngine;
  }
  
  /**
   * 获取场景（供 GUI 使用）
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * 获取相机（供 GUI 使用）
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    this.simulationEngine.dispose();
    this.terrainMesh.dispose();
    this.waterMesh.dispose();
    this.sceneDepthPass.dispose();
    this.brushController.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}
