import React from 'react';
import DOMPurify from 'dompurify';

const MarkdownContent = ({ content }) => {
  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
};

export default MarkdownContent;
