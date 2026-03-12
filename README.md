# Webpage Pet 说明文档

## 项目介绍

Webpage Pet 是一个基于 Sakana Widget 实现的网页宠物小组件，可在静态博客或网站上添加一个可交互的宠物形象。

本项目借鉴了 [itorr/sakana](https://github.com/itorr/sakana) 「Sakana!」石蒜模拟器的实现思路和动画效果，感谢原作者的开源贡献。

## 功能特性

- 支持自定义角色图片
- 自动调整大小，最小 120px
- 按压并拖动角色，释放后会向相反方向弹动
- 使用控制栏切换角色和使用其他功能
- 自动模式，在随机间隔施加随机大小的力
- 音效支持，拖拽后播放音效
- 支持 CDN/NPM 引入，自定义参数，链式调用

## 快速开始

### 方法一：CDN 直接引入

```html
<!-- 引入 CSS -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/webpage-pet@1.0.0/lib/webpage-pet.min.css"
/>

<!-- 添加容器 -->
<div id="webpage-pet"></div>

<!-- 引入 JS 并初始化 -->
<script>
  function initWebpagePet() {
    new WebpagePet().mount('#webpage-pet');
  }
</script>
<script
  async
  onload="initWebpagePet()"
  src="https://cdn.jsdelivr.net/npm/webpage-pet@1.0.0/lib/webpage-pet.min.js"
></script>
```

### 方法二：NPM 安装

```bash
npm install --save webpage-pet
```

```typescript
import 'webpage-pet/lib/index.css';
import WebpagePet from 'webpage-pet';

new WebpagePet().mount('#webpage-pet');
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| size | number | 200 | 组件大小 |
| autoFit | boolean | false | 自动调整大小（最小 120px） |
| character | string | 'zmdEndministrator' | 默认角色 |
| controls | boolean | true | 显示控制栏 |
| rod | boolean | true | 显示弹簧杆 |
| draggable | boolean | true | 角色可拖动 |
| stroke | object | { color: '#b4b4b4', width: 10 } | 弹簧颜色和宽度 |
| threshold | number | 0.1 | 运动停止阈值 |
| rotate | number | 0 | 旋转原点 |
| title | boolean | false | 启用无障碍标题功能 |
| sound | boolean | false | 启用音效 |
| audioPath | string | '' | 音频文件路径 |

## 示例代码

### 基本使用

```javascript
new WebpagePet().mount('#webpage-pet');
```

### 启用音效

```javascript
new WebpagePet({
  sound: true,
  audioPath: 'https://example.com/audio/'
}).mount('#webpage-pet');
```

### 自定义配置

```javascript
new WebpagePet({
  size: 250,
  autoFit: true,
  character: 'zmdEndministrator',
  controls: true,
  rod: true,
  draggable: true,
  sound: true,
  stroke: {
    color: '#ff6b6b',
    width: 8
  }
}).mount('#webpage-pet');
```

### 固定在页面角落

```html
<style>
  #webpage-pet {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 9999;
  }
</style>

<div id="webpage-pet"></div>

<script>
  new WebpagePet().mount('#webpage-pet');
</script>
```

## 控制栏功能

控制栏提供以下功能按钮：

- **切换角色** (👤)：切换到下一个可用角色
- **自动模式** (🔄)：开启/关闭自动模式，角色会自动摆动
- **GitHub** (🐙)：访问项目仓库
- **静音** (🔊/🔇)：开启/关闭音效
- **关闭** (✕)：关闭组件

## API

### 静态方法

#### `WebpagePet.getCharacter(name: string): WebpagePetCharacter | null`
获取已注册角色的数据

#### `WebpagePet.getCharacters()`
获取所有已注册角色

#### `WebpagePet.registerCharacter(name: string, character: WebpagePetCharacter)`
注册新角色

### 实例方法

#### `setState(state: Partial<WebpagePetState>)`
设置组件当前状态

#### `setCharacter(name: string)`
设置当前角色

#### `nextCharacter()`
切换到下一个角色

#### `triggerAutoMode()`
切换自动模式

#### `toggleMute()`
切换静音状态

#### `mount(el: HTMLElement | string)`
挂载组件到指定元素

#### `unmount()`
卸载组件

## 浏览器兼容性

- 支持现代浏览器（Chrome, Firefox, Safari, Edge）
- 需要 Canvas 支持
- 支持触摸设备

## 本地开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建项目

```bash
# 构建 NPM 包
npm run build

# 构建示例站点
npm run build:docs
```

## 许可证

MIT License
