import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import DocsPage from './components/DocsPage';

const MenuToggle = ({ onClick }) => (
  <button className="menu-toggle" onClick={onClick}>
    <svg viewBox="0 0 24 24">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  </button>
);

const App = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <Router>
      <div className="app-container">
        <MenuToggle onClick={toggleSidebar} />
        
        {/* 遮罩层 */}
        <div 
          className={`sidebar-overlay ${sidebarVisible ? 'show' : ''}`}
          onClick={closeSidebar}
        />
        
        {/* 侧边栏 */}
        <aside className={`sidebar ${sidebarVisible ? 'show' : ''}`}>
          <Home />
        </aside>

        <main className="main-content" onClick={closeSidebar}>
          <Routes>
            <Route path="/docs/:slug" element={<DocsPage />} />
            <Route path="/" element={
              <div className="welcome-message">
                <h1>欢迎访问文档中心</h1>
                <p>请从左侧选择要阅读的文档</p>
              </div>
            } />
          </Routes>
        </main>
        
        <div className="ad-sidebar">
          {/* <div className="ad-placeholder">
            广告位置预留
          </div> */}
        </div>
      </div>
    </Router>
  );
};

export default App;
