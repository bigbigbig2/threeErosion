/**
 * FPS 监控器
 * 简单的帧率显示
 */

export class FPSMonitor {
  private container: HTMLDivElement;
  private fpsText: HTMLSpanElement;
  private frames: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;
  
  constructor() {
    this.container = this.createFPSPanel();
    document.body.appendChild(this.container);
    
    console.log('✅ FPS 监控器初始化完成');
  }
  
  private createFPSPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'fps-monitor';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 360px;
      background: rgba(0, 0, 0, 0.75);
      color: #0f0;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      user-select: none;
    `;
    
    this.fpsText = document.createElement('span');
    this.fpsText.textContent = 'FPS: --';
    panel.appendChild(this.fpsText);
    
    return panel;
  }
  
  /**
   * 更新 FPS（每帧调用）
   */
  public update(): void {
    this.frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;
    
    // 每 500ms 更新一次显示
    if (elapsed >= 500) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.fpsText.textContent = `FPS: ${this.fps}`;
      
      // 根据帧率改变颜色
      if (this.fps >= 50) {
        this.fpsText.style.color = '#0f0'; // 绿色：好
      } else if (this.fps >= 30) {
        this.fpsText.style.color = '#ff0'; // 黄色：一般
      } else {
        this.fpsText.style.color = '#f00'; // 红色：差
      }
      
      this.frames = 0;
      this.lastTime = currentTime;
    }
  }
  
  /**
   * 获取当前 FPS
   */
  public getFPS(): number {
    return this.fps;
  }
  
  /**
   * 显示
   */
  public show(): void {
    this.container.style.display = 'block';
  }
  
  /**
   * 隐藏
   */
  public hide(): void {
    this.container.style.display = 'none';
  }
  
  /**
   * 销毁
   */
  public destroy(): void {
    this.container.remove();
  }
}
