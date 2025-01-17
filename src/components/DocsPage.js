import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import MarkdownContent from './MarkdownContent';

const DocsPage = () => {
  const { slug } = useParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 确保 slug 存在
        if (!slug) {
          throw new Error('文章不存在');
        }

        const response = await axios.get(`/api/docs/content/${slug}`);
        
        if (!response.data || !response.data.content) {
          throw new Error('文章内容获取失败');
        }

        setContent(response.data.content);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err.message || '文章加载失败');
        setLoading(false);
      }
    };

    fetchContent();
  }, [slug]); // 当 slug 改变时重新获取内容

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>正在加载文章...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <span>❌</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="docs-content">
      <MarkdownContent content={content} />
    </div>
  );
};

export default DocsPage; 