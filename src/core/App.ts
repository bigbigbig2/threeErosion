/**
 * 主应用类
 * 负责整个应用的初始化、更新和渲染循环
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUIManager } from '../ui/GUIManager';
import { StatsMonitor } from '../ui/StatsMonitor';
import { SimulationEngine } from '../simulation/SimulationEngine';

export class App {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  
  // 模拟引擎
  private simulationEngine!: SimulationEngine;
  
  // UI 和监控
  private guiManager!: GUIManager;
  private stats!: StatsMonitor;
  
  // 调试
  private debugPlaneMaterial: THREE.ShaderMaterial | null = null;
  
  // 状态管理
  private clock: THREE.Clock;
  private isPaused: boolean = false;
  
  constructor(canvas: HTMLCanvasElement) {
    this.clock = new THREE.Clock();
    
    this.initRenderer(canvas);
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initSimulation();
    this.addDebugPlane(); // 添加调试平面
    this.initUI();
    this.setupEventListeners();
    
    console.log('✅ App 初始化完成');
  }
  
  /**
   * 初始化 WebGL 渲染器
   */
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
  
  /**
   * 初始化场景
   */
  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // 天空蓝
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    
    console.log('✅ 场景初始化完成');
  }
  
  /**
   * 初始化相机和控制器
   */
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
    
    console.log('✅ 相机初始化完成');
  }
  
  /**
   * 初始化模拟引擎
   */
  private initSimulation(): void {
    this.simulationEngine = new SimulationEngine(this.renderer, {
      resolution: 1024,
      speed: 3
    });
    
    console.log('✅ 模拟引擎初始化完成');
  }
  
  /**
   * 初始化光照
   */
  private initLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // 方向光（太阳光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 30);
    directionalLight.castShadow = true;
    
    // 配置阴影
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    this.scene.add(directionalLight);
    
    // 添加测试立方体
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    const material = new THREE.MeshStandardMaterial({ color: 0x44aa88 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 2.5;
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);
    
    // 添加地面
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    console.log('✅ 光照初始化完成');
  }
  
  /**
   * 添加调试平面（显示模拟纹理）
   */
  private addDebugPlane(): void {
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    
    // 使用自定义着色器来可视化纹理
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        terrainTexture: { value: null } // 先设置为 null
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D terrainTexture;
        varying vec2 vUv;
        
        void main() {
          vec4 terrain = texture2D(terrainTexture, vUv);
          
          // 显示所有通道用于调试
          // R = 高度, G = 水深, B = 可视化高度
          float height = terrain.b;
          
          // 如果高度为0，显示红色表示有问题
          if(height < 0.001) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
          } else {
            // 显示灰度高度图
            gl_FragColor = vec4(height, height, height, 1.0);
          }
        }
      `,
      side: THREE.DoubleSide
    });
    
    this.debugPlaneMaterial = planeMaterial;
    
    const debugPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    debugPlane.position.set(0, 10, 0);
    debugPlane.rotation.x = -Math.PI / 2;
    this.scene.add(debugPlane);
    
    console.log('✅ 调试平面已添加');
  }
  
  /**
   * 初始化 UI
   */
  private initUI(): void {
    // GUI 控制面板
    this.guiManager = new GUIManager(this);
    
    // 性能监控
    this.stats = new StatsMonitor();
    
    console.log('✅ UI 初始化完成');
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // 键盘事件
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        this.togglePause();
      }
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
  }
  
  /**
   * 启动应用
   */
  public start(): void {
    console.log('🚀 启动渲染循环...');
    this.animate();
  }
  
  /**
   * 主渲染循环
   */
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    // 更新性能监控
    this.stats.begin();
    
    // 更新控制器
    this.controls.update();
    
    // 执行物理模拟
    const delta = this.clock.getDelta();
    if (!this.isPaused) {
      this.simulationEngine.update(delta);
    }
    
    // 更新调试平面的纹理引用
    if (this.debugPlaneMaterial) {
      const terrainTexture = this.simulationEngine.getTerrainTexture();
      if (terrainTexture) {
        this.debugPlaneMaterial.uniforms.terrainTexture.value = terrainTexture;
      }
    }
    
    // 渲染场景
    this.renderer.render(this.scene, this.camera);
    
    this.stats.end();
  }
  
  /**
   * 暂停/恢复模拟
   */
  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.simulationEngine.togglePause();
    console.log(this.isPaused ? '⏸️ 已暂停' : '▶️ 已恢复');
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
    this.renderer.dispose();
    this.controls.dispose();
    
    console.log('🧹 资源已清理');
  }
}
