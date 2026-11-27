import { API_BASE_URL } from '../../api';

const ThreePage = () => {
  // 后端 /three 直接返回一整页 HTML，用 iframe 嵌进来
  const threeURL = `${API_BASE_URL}/three`;

  return (
    <div>
      <iframe
        src={threeURL}
        title="Three.js 场景"
        style={{ width: '100vw', height: '100vh', border: 'none'}}
      />
    </div>
  );
};

export default ThreePage;
