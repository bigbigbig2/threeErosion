/**
 * GUI 管理器
 * 使用 lil-gui 创建调试面板
 */

import GUI from 'lil-gui';
import type { App } from '../core/App';

export class GUIManager {
  private gui: GUI;
  private app: App;
  
  // GUI 参数
  private params = {
    // 模拟控制
    pause: false,
    reset: () => this.reset(),
    
    // 渲染参数
    showWireframe: false,
    showStats: true,
    
    // 相机参数
    cameraFov: 45,
    
    // 测试参数
    testValue: 0.5
  };
  
  constructor(app: App) {
    this.app = app;
    this.gui = new GUI({ title: '地形侵蚀控制面板' });
    
    this.setupGUI();
    
    console.log('✅ GUI 初始化完成');
  }
  
  /**
   * 设置 GUI 面板
   */
  private setupGUI(): void {
    // 模拟控制文件夹
    const simulationFolder = this.gui.addFolder('模拟控制');
    simulationFolder.add(this.params, 'pause').name('暂停').onChange((value: boolean) => {
      if (value) {
        this.app.togglePause();
      }
    });
    simulationFolder.add(this.params, 'reset').name('重置');
    simulationFolder.open();
    
    // 渲染参数文件夹
    const renderFolder = this.gui.addFolder('渲染参数');
    renderFolder.add(this.params, 'showWireframe').name('显示线框');
    renderFolder.add(this.params, 'showStats').name('显示性能');
    renderFolder.open();
    
    // 相机参数文件夹
    const cameraFolder = this.gui.addFolder('相机参数');
    cameraFolder.add(this.params, 'cameraFov', 30, 90).name('视场角').onChange((value: number) => {
      const camera = this.app.getCamera();
      camera.fov = value;
      camera.updateProjectionMatrix();
    });
    
    // 测试参数
    this.gui.add(this.params, 'testValue', 0, 1).name('测试值');
  }
  
  /**
   * 重置模拟
   */
  private reset(): void {
    console.log('🔄 重置模拟');
    // TODO: 实现重置逻辑
  }
  
  /**
   * 销毁 GUI
   */
  public dispose(): void {
    this.gui.destroy();
  }
}
