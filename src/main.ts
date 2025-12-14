import { App } from './core/App';

window.addEventListener('DOMContentLoaded', () => {
  
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  
  console.log('Canvas:', canvas);
  console.log('Loading:', loading);
  
  if (!canvas) {
    console.error(' Canvas element not found!');
    if (loading) {
      loading.innerHTML = '<div style="color: #ff4444;">Canvas 元素未找到</div>';
    }
    return;
  }

  try {
    
    const app = new App(canvas);
    
    
    app.start();
    
    setTimeout(() => {
      loading?.classList.add('hidden');
    }, 500);
    
  } catch (error) {
    console.error(error);
    if (loading) {
      loading.innerHTML = '<div style="color: #ff4444;">: ' + error + '</div>';
    }
  }
});
