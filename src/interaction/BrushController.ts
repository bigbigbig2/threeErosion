/**
 * BrushController - 笔刷控制器
 * 
 * 职责：处理鼠标和键盘输入，计算笔刷参数
 * 
 * 功能：
 * 1. 射线检测与地形相交
 * 2. 计算 UV 坐标
 * 3. 处理鼠标事件
 * 4. 处理键盘快捷键
 */

import * as THREE from 'three';
import type { BrushParams } from '../simulation/passes/BrushPass';

export class BrushController {
  private camera: THREE.Camera;
  private terrainMesh: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  // 笔刷参数
  private brushParams: BrushParams = {
    active: false,
    position: new THREE.Vector2(0.5, 0.5),
    size: 0.05,
    strength: 0.1,
    type: 0,
    operation: 0
  };
  
  // 状态
  private isMouseDown: boolean = false;
  private isCKeyPressed: boolean = false;
  private permanentBrush: boolean = false;
  
  constructor(camera: THREE.Camera, terrainMesh: THREE.Mesh) {
    this.camera = camera;
    this.terrainMesh = terrainMesh;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    console.log('✅ 笔刷控制器初始化完成');
  }
  
  /**
   * 处理鼠标移动事件
   */
  public onMouseMove(event: MouseEvent): void {
    // 归一化鼠标坐标到 [-1, 1]
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 射线检测
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrainMesh);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      
      // 计算 UV 坐标
      if (intersect.uv) {
        this.brushParams.position.copy(intersect.uv);
      }
    }
  }
  
  /**
   * 处理鼠标按下事件
   */
  public onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // 左键
      this.isMouseDown = true;
      this.updateBrushActive();
    }
  }
  
  /**
   * 处理鼠标释放事件
   */
  public onMouseUp(event: MouseEvent): void {
    if (event.button === 0) { // 左键
      this.isMouseDown = false;
      this.updateBrushActive();
    }
  }
  
  /**
   * 处理键盘按下事件
   */
  public onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyC':
        // C 键：按住应用笔刷
        this.isCKeyPressed = true;
        this.updateBrushActive();
        break;
      case 'KeyR':
        // R 键：切换永久笔刷
        this.permanentBrush = !this.permanentBrush;
        this.updateBrushActive();
        console.log(this.permanentBrush ? '🖌️ 永久笔刷已启用' : '🖌️ 永久笔刷已关闭');
        break;
      case 'KeyP':
        // P 键：关闭永久笔刷
        this.permanentBrush = false;
        this.updateBrushActive();
        console.log('🖌️ 永久笔刷已关闭');
        break;
    }
  }
  
  /**
   * 处理键盘释放事件
   */
  public onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'KeyC') {
      this.isCKeyPressed = false;
      this.updateBrushActive();
    }
  }
  
  /**
   * 更新笔刷激活状态
   */
  private updateBrushActive(): void {
    this.brushParams.active = 
      this.permanentBrush || 
      (this.isMouseDown && this.isCKeyPressed);
  }
  
  /**
   * 设置笔刷类型
   */
  public setBrushType(type: number): void {
    this.brushParams.type = type;
  }
  
  /**
   * 设置笔刷大小
   */
  public setBrushSize(size: number): void {
    this.brushParams.size = size;
  }
  
  /**
   * 设置笔刷强度
   */
  public setBrushStrength(strength: number): void {
    this.brushParams.strength = strength;
  }
  
  /**
   * 设置笔刷操作
   */
  public setBrushOperation(operation: number): void {
    this.brushParams.operation = operation;
  }
  
  /**
   * 获取当前笔刷参数
   */
  public getBrushParams(): BrushParams {
    return { ...this.brushParams };
  }
  
  /**
   * 清理资源
   */
  public dispose(): void {
    // 清理事件监听器由外部管理
    console.log('🧹 笔刷控制器已清理');
  }
}
