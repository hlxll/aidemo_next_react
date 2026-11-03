import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  // StrictMode 在开发模式会检查组件是否渲染了两次
  <StrictMode>
    <App />
  </StrictMode>,
);
