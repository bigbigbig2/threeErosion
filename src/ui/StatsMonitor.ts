/**
 * 性能监控器
 * 使用 stats-gl 显示 FPS 和性能信息
 */

import StatsGl from 'stats-gl';

export class StatsMonitor {
  private stats: StatsGl;
  
  constructor() {
    this.stats = new StatsGl({
      trackGPU: true,
      trackHz: true,
      trackCPU: true,
      minimal: false
    });
    
    // 设置样式
    this.stats.dom.style.position = 'fixed';
    this.stats.dom.style.left = '0px';
    this.stats.dom.style.top = '0px';
    this.stats.dom.style.zIndex = '9999';
    
    document.body.appendChild(this.stats.dom);
    
    console.log('✅ 性能监控初始化完成');
  }
  
  /**
   * 开始测量
   */
  public begin(): void {
    this.stats.begin();
  }
  
  /**
   * 结束测量
   */
  public end(): void {
    this.stats.end();
  }
  
  /**
   * 更新（每帧调用）
   */
  public update(): void {
    this.stats.update();
  }
  
  /**
   * 显示/隐藏
   */
  public setVisible(visible: boolean): void {
    this.stats.dom.style.display = visible ? 'block' : 'none';
  }
  
  /**
   * 销毁
   */
  public dispose(): void {
    if (this.stats.dom.parentElement) {
      this.stats.dom.parentElement.removeChild(this.stats.dom);
    }
  }
}
