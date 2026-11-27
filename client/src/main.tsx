import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { App } from './App.tsx';
import Layout from './component/Layout';
import AddEmbeddPage from './component/AddEmbeddPage';
import ThreePage from './component/ThreePage';
createRoot(document.getElementById('root')!).render(
  // StrictMode 在开发模式会检查组件是否渲染了两次
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 无 path 的父路由：只做布局，子路由渲染到 Layout 的 Outlet 里 */}
        <Route element={<Layout />}>
          <Route path="/" element={<App />} />
          <Route path="/addEmbedd" element={<AddEmbeddPage />} />
        </Route>
        <Route path="/three" element={<ThreePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
