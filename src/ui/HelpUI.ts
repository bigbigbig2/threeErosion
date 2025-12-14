/**
 * 操作提示 UI
 */

export class HelpUI {
  private container: HTMLDivElement;
  private isVisible: boolean = true;
  
  constructor() {
    this.container = this.createHelpPanel();
    document.body.appendChild(this.container);
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.hide();
    }, 5000);
    
    console.log('✅ 操作提示 UI 初始化完成');
  }
  
  private createHelpPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'help-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.8;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      transition: opacity 0.3s, transform 0.3s;
      max-width: 500px;
    `;
    
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">🎮 操作指南</h3>
        <button id="close-help" style="
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 0.2s;
        ">✕</button>
      </div>
      
      <div style="display: grid; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-weight: 500; min-width: 120px;">🖱️ 左键拖拽</span>
          <span style="opacity: 0.9;">旋转视角</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-weight: 500; min-width: 120px;">🖱️ 右键拖拽</span>
          <span style="opacity: 0.9;">平移视角</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-weight: 500; min-width: 120px;">🖱️ 滚轮</span>
          <span style="opacity: 0.9;">缩放视角</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-weight: 500; min-width: 120px;">⌨️ Space</span>
          <span style="opacity: 0.9;">暂停/继续模拟</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-weight: 500; min-width: 120px;">⌨️ R</span>
          <span style="opacity: 0.9;">重置地形</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-weight: 500; min-width: 120px;">⌨️ H</span>
          <span style="opacity: 0.9;">显示/隐藏此面板</span>
        </div>
      </div>
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; opacity: 0.7; text-align: center;">
        💡 右侧面板可调整模拟参数
      </div>
    `;
    
    // 关闭按钮事件
    const closeBtn = panel.querySelector('#close-help') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0.7';
    });
    
    return panel;
  }
  
  public show(): void {
    this.isVisible = true;
    this.container.style.opacity = '1';
    this.container.style.transform = 'translateX(-50%) translateY(0)';
    this.container.style.pointerEvents = 'auto';
  }
  
  public hide(): void {
    this.isVisible = false;
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateX(-50%) translateY(-20px)';
    this.container.style.pointerEvents = 'none';
  }
  
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  public destroy(): void {
    this.container.remove();
  }
}
