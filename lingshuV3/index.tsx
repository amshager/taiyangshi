// 这是一个“桥接”文件，用于欺骗 React 构建工具加载我们的原生资源
// This is a bridge file to trick the React bundler into loading our vanilla assets

// 引入全局样式 (Bundler 会自动处理并注入)
import './style.css';

// 引入主程序逻辑 (Bundler 会打包这些 JS)
// @ts-ignore (忽略类型检查，因为我们直接引入的是 .js 文件)
import './js/app.js';

console.log('Lingshu System Bridge Loaded');
