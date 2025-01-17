const express = require('express');
const path = require('path');
const fs = require('fs');
const marked = require('marked');
const helmet = require('helmet');
const { SitemapStream, streamToPromise } = require('sitemap');

const app = express();
app.use(helmet());
app.use(express.static('public'));

const dir = process.argv[2] ? process.argv[2].split('=')[1] : './docs';

app.use('/docs', express.static(dir));

// 解析目录结构，返回文件树
function parseDirectory(dirPath) {
  const result = [];
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 如果是目录，递归处理
      result.push({
        type: 'directory',
        name: item,
        path: fullPath,
        children: parseDirectory(fullPath)
      });
    } else if (path.extname(item) === '.md') {
      // 如果是 markdown 文件，添加到结果中
      result.push({
        type: 'file',
        name: item,
        path: fullPath
      });
    }
  });

  return result;
}

// 生成站点地图
async function generateSitemap(directory) {
  const smStream = new SitemapStream({ hostname: 'http://localhost:3000' });
  const items = parseDirectory(directory);

  // 递归添加所有文件到站点地图
  function addItemsToSitemap(items) {
    items.forEach(item => {
      if (item.type === 'file') {
        const url = item.path.replace(dir, '').replace(/\\/g, '/').replace('.md', '');
        smStream.write({ url, changefreq: 'daily', priority: 0.7 });
      } else if (item.type === 'directory') {
        addItemsToSitemap(item.children);
      }
    });
  }

  addItemsToSitemap(items);
  smStream.end();
  return await streamToPromise(smStream);
}

// 生成文档目录
function generateToc(html) {
  const headings = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g) || [];
  return headings.map(heading => {
    const level = heading.match(/<h([1-6])/)[1];
    const text = heading.replace(/<[^>]+>/g, '');
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');
    return { level, text, id };
  });
}

// API 路由处理
app.get('/api/markdown/*', (req, res) => {
  // 处理 markdown 文件请求
  const filePath = path.join(dir, req.params[0] + '.md');
  
  if (fs.existsSync(filePath)) {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const html = marked.parse(markdown);
    const toc = generateToc(html);
    res.json({ html, toc });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/docs/*', (req, res, next) => {
  const filePath = path.join(dir, req.params[0]);
  
  // 检查请求的是否是图片
  if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: '图片不存在' });
    }
  } else {
    // 不是图片请求，传递给下一个处理器
    next();
  }
});

app.get('/api/docs/images/*', (req, res) => {
  try {
    const imagePath = path.join(dir, req.params[0]);
    if (fs.existsSync(imagePath)) {
      res.sendFile(imagePath);
    } else {
      res.status(404).json({ error: '图片不存在' });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: '图片加载失败' });
  }
});

app.get('/api/docs/content/:slug', (req, res) => {
  try {
    const decodedSlug = decodeURIComponent(req.params.slug).replace(/\%/g, '');
    
    function findFile(items, targetSlug) {
      for (const item of items) {
        if (item.type === 'file') {
          const itemSlug = path.basename(item.path, '.md');
          if (itemSlug === decodedSlug) {
            return item.path;
          }
        } else if (item.type === 'directory') {
          const found = findFile(item.children, targetSlug);
          if (found) return found;
        }
      }
      return null;
    }

    const files = parseDirectory(dir);
    const filePath = findFile(files, decodedSlug);

    if (!filePath) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 读取并解析 Markdown 文件
    const markdown = fs.readFileSync(filePath, 'utf8');
    
    // 处理图片路径
    const fileDir = path.dirname(filePath);
    
    // 修改 marked 的渲染器来处理图片路径
    const renderer = new marked.Renderer();
    renderer.image = (href, title, text) => {
      try {
        // 处理 href 是对象的情况
        const imageHref = href?.href || href;
        
        if (!imageHref) {
          console.warn('Image href is empty:', { text, title });
          return `<span class="image-error">图片链接无效</span>`;
        }

        // 检查是否是外部链接
        if (imageHref.startsWith('http://') || imageHref.startsWith('https://')) {
          return `<img src="${imageHref}" alt="${text || ''}"${title ? ` title="${title}"` : ''}>`;
        }

        // 处理相对路径
        const articleDir = path.dirname(filePath);
        // 移除路径中的 ./
        const cleanHref = imageHref.replace(/^\.\//, '');
        const imagePath = path.join(articleDir, cleanHref);
        const relativePath = path.relative(dir, imagePath);
        const imgUrl = `/docs/${relativePath.replace(/\\/g, '/')}`;

        console.log('Generated image path:', imgUrl);

        return `<img src="${imgUrl}" alt="${text || ''}"${title ? ` title="${title}"` : ''}>`;
      } catch (error) {
        console.error('Error processing image:', {
          error,
          href,
          title,
          text,
          filePath
        });
        return `<span class="image-error">图片处理错误: ${error.message}</span>`;
      }
    };

    // 设置 marked 选项
    const options = {
      renderer,
      headerIds: true,
      gfm: true,
      breaks: true,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    };

    const content = marked.parse(markdown, options);
    
    res.json({ content });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    res.status(500).json({ error: '文章加载失败' });
  }
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = await generateSitemap(dir);
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (e) {
    res.status(500).end();
  }
});

app.get('/api/docs', (req, res) => {
  try {
    const files = parseDirectory(dir);
    res.json(files);
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Failed to read documents' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(3000, () => {
  console.log(`Server running at http://localhost:3000`);
  console.log(`Rendering markdown files from: ${dir}`);
});
