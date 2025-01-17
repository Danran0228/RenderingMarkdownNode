import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState(new Set());

  // 检查目录是否包含 Markdown 文件
  const hasMarkdownFiles = (items) => {
    return items.some(item => {
      if (item.type === 'directory') {
        return hasMarkdownFiles(item.children);
      }
      return item.name.endsWith('.md');
    });
  };

  // 过滤并处理文档数据
  const filterDocs = (items) => {
    return items.filter(item => {
      if (item.type === 'directory') {
        // 递归过滤子目录
        const filteredChildren = filterDocs(item.children);
        // 如果过滤后的子目录中包含 Markdown 文件，则保留该目录
        if (filteredChildren.length > 0) {
          item.children = filteredChildren;
          return true;
        }
        return false;
      }
      // 只保留 Markdown 文件
      return item.name.endsWith('.md');
    });
  };

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched docs data:', data);
        const filteredData = filterDocs(data);
        console.log('Filtered docs data:', filteredData);
        setDocs(filteredData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching docs:', err);
        setError('Failed to load documents');
        setLoading(false);
      });
  }, []);

  const toggleDirectory = (path) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderDocs = (items) => {
    return items.map((item) => {
      if (!item || typeof item !== 'object') {
        console.error('Invalid item:', item);
        return null;
      }

      console.log('Rendering item:', item);

      if (item.type === 'directory') {
        const isExpanded = expandedDirs.has(item.path);
        return (
          <div key={item.path} className="directory">
            <h3 
              onClick={() => toggleDirectory(item.path)} 
              className={`directory-title ${isExpanded ? 'expanded' : ''}`}
            >
              {item.name}
            </h3>
            <div className={`directory-content ${isExpanded ? 'show' : ''}`}>
              {renderDocs(item.children)}
            </div>
          </div>
        );
      } else if (item.type === 'file') {
        if (!item.name) {
          console.error('File item missing name:', item);
          return null;
        }

        try {
          const docName = item.name.replace('.md', '');
          console.log('Creating link for doc:', docName);
          
          return (
            <div key={item.path} className="file">
              <Link to={`/docs/${encodeURIComponent(docName)}`}>
                {docName}
              </Link>
            </div>
          );
        } catch (error) {
          console.error('Error creating doc link:', error, item);
          return (
            <div className="error-message">
              错误的文档链接: {String(error)}
            </div>
          );
        }
      } else {
        console.error('Unknown item type:', item);
        return null;
      }
    }).filter(Boolean);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home">
      <h1>文章列表</h1>
      <div className="docs-list">
        {docs.length > 0 ? renderDocs(docs) : <div>没有找到文档</div>}
      </div>
    </div>
  );
};

export default Home;