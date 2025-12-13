/**
 * Three.js 地形侵蚀模拟 - 主入口
 * 
 * 这是使用 Three.js 重构的版本，相比原版：
 * - 使用 Three.js 管理 WebGL 资源
 * - 模块化设计，更易维护
 * - 使用 Vite 构建，开发体验更好
 */

console.log('🚀 main.ts 开始执行');

import { App } from './core/App';

console.log('✅ App 类导入成功');

// 等待 DOM 加载完成
window.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM 加载完成');
  
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  
  console.log('Canvas:', canvas);
  console.log('Loading:', loading);
  
  if (!canvas) {
    console.error('❌ Canvas element not found!');
    if (loading) {
      loading.innerHTML = '<div style="color: #ff4444;">Canvas 元素未找到</div>';
    }
    return;
  }

  try {
    console.log('🔧 开始创建 App 实例...');
    
    // 创建应用实例
    const app = new App(canvas);
    
    console.log('▶️ 启动应用...');
    
    // 启动应用
    app.start();
    
    // 隐藏加载界面
    setTimeout(() => {
      console.log('🎉 隐藏 loading 界面');
      loading?.classList.add('hidden');
    }, 500);
    
    console.log('✅ 应用启动成功');
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    if (loading) {
      loading.innerHTML = '<div style="color: #ff4444;">启动失败: ' + error + '</div>';
    }
  }
});

console.log('✅ 事件监听器已注册');
