import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'FAQ 助手' },
  { to: '/addEmbedd', label: '入库 Embedding' },
];

/** 所有页面共用的外壳：顶部导航 + <Outlet /> 渲染当前路由匹配到的页面 */
export default function Layout() {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <nav className="navBar">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            // end: "/" 只在精确匹配时才高亮，否则任何路径都会命中 "/"
            end={it.to === '/'}
            className={({ isActive }) => (isActive ? 'nav-active' : '')}
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
