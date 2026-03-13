/*! webpage-pet | Your Name | Copyright (c) MIT License */

import './index.scss';
import type { RequiredDeep } from './utils';
import type { WebpagePetCharacter, WebpagePetState } from './characters';
import { ResizeObserver } from '@juggle/resize-observer';
import characters from './characters';
import { svgClose, svgGitHub, svgPerson, svgSync, svgMuted, svgNoMuted } from './icons';
import { cloneDeep, mergeDeep, throttle, getCanvasCtx } from './utils';

// 音效
const Voices = {
  gugugaga: null as any,
  isMute: true
};

const initVoices = (audioPath: string = '') => {
  const path = audioPath || '';
  Voices.gugugaga = new Audio(`${path}gugugaga.mp3`);
  Voices.gugugaga.volume = 0.8;
  Voices.gugugaga.muted = Voices.isMute;
};

interface WebpagePetOptions {
  /**
   * widget size, default to `200`
   */
  size?: number;
  /**
   * auto fit size (120px minimum), default to `false`
   */
  autoFit?: boolean;
  /**
   * default character, default to `zmdEndministrator`
   */
  character?: 'zmdEndministrator' | string;
  /**
   * controls bar, default to `true`
   */
  controls?: boolean;
  /**
   * show spring rod, default to `true`
   */
  rod?: boolean;
  /**
   * character draggable, default to `true`
   */
  draggable?: boolean;
  /**
   * canvas stroke settings, default to `#b4b4b4` & `10`
   */
  stroke?: {
    color?: string;
    width?: number;
  };
  /**
   * motion stop threshold, default to `0.1`
   */
  threshold?: number;
  /**
   * rotate origin, default to `0`
   */
  rotate?: number;
  /**
   * enable accessibility title feature, default to `false`
   */
  title?: boolean;
  /**
   * enable sound effect, default to `false`
   */
  sound?: boolean;
  /**
   * audio file path, default to `''`
   */
  audioPath?: string;
}

const defaultOptions: WebpagePetOptions = {
  size: 200,
  autoFit: false,
  character: 'zmdEndministrator',
  controls: true,
  rod: true,
  draggable: true,
  stroke: {
    color: '#b4b4b4',
    width: 10,
  },
  threshold: 0.1,
  rotate: 0,
  title: false,
  sound: false,
  audioPath: '',
};

// register default characters
let _characters: { [key: string]: WebpagePetCharacter } = null as any;
function _initCharacters() {
  if (_characters) return;
  _characters = {};
  (Object.keys(characters) as Array<keyof typeof characters>).forEach((key) => {
    const _char = characters[key];
    _characters[key] = cloneDeep(_char);
  });
}

/**
 * widget instance class
 */
class WebpagePet {
  private _options: RequiredDeep<WebpagePetOptions>;

  // app metadata
  private _imageSize!: number;
  private _canvasSize!: number;
  private _limit!: { maxR: number; maxY: number; minY: number };
  private _lastRunUnix = Date.now();
  private _frameUnix = 1000 / 60; // default to speed of 60 fps
  private _running = true;
  private _magicForceTimeout = 0;
  private _magicForceEnabled = false;
  private _gyroEnabled = false;
  private _lastAcceleration = { x: 0, y: 0, z: 0 };
  private _lastShakeTime = 0;

  // character related
  private _char!: string;
  private _image!: string;
  private _state!: WebpagePetState;

  // dom element related
  private _domWrapper!: HTMLDivElement; // this is needed for resize observer
  private _domApp!: HTMLDivElement; // actual app element
  private _domCanvas!: HTMLCanvasElement;
  private _domCanvasCtx!: CanvasRenderingContext2D;
  private _domMain!: HTMLDivElement;
  private _domImage!: HTMLDivElement;
  private _domCtrlPerson!: HTMLDivElement;
  private _domCtrlMagic!: HTMLDivElement;
  private _domCtrlClose!: HTMLDivElement;
  private _domCtrlMuted!: HTMLDivElement;
  private _resizeObserver: ResizeObserver | null = null;

  /**
   * @public
   * @static
   * get data of a registered character
   */
  static getCharacter = (name: string): WebpagePetCharacter | null => {
    if (_characters == null) {
      _initCharacters();
    }
    const _char = _characters[name];
    return _char ? cloneDeep(_char) : null;
  };

  /**
   * @public
   * @static
   * get all registered character
   */
  static getCharacters = () => {
    if (_characters == null) {
      _initCharacters();
    }
    return cloneDeep(_characters);
  };

  /**
   * @public
   * @static
   * registered a new character
   */
  static registerCharacter = (
    name: string,
    character: WebpagePetCharacter
  ) => {
    const _char = cloneDeep(character);
    // validate inertia
    let inertia = _char.initialState.i;
    inertia = Math.min(0.5, Math.max(0, inertia));
    _char.initialState.i = inertia;
    // register character
    _characters[name] = _char;
  };

  constructor(options: WebpagePetOptions = {}) {
    if (_characters == null) {
      _initCharacters();
    }

    this._options = cloneDeep(
      defaultOptions
    ) as RequiredDeep<WebpagePetOptions>;
    this._options = mergeDeep(this._options, options);

    // init voices
    initVoices(this._options.audioPath);

    // init default character
    this.setCharacter(this._options.character);

    // init dom
    this._updateDom();
    this._updateSize(this._options.size);
    this._updateLimit(this._options.size);
  }

  /**
   * @private
   * calculate limit and update from size
   */
  private _updateLimit = (size: number) => {
    // 参考 sakana-main 的参数
    const maxR = 60; // 最大角度
    const maxY = 110; // 最大高度
    const minY = -maxY;
    this._limit = { maxR, maxY, minY };
  };

  /**
   * @private
   * refresh widget size
   */
  private _updateSize = (size: number) => {
    this._options.size = size;
    // different image size for different characters
    if (this._char === 'liuying') {
      this._imageSize = this._options.size / 0.9; // liuying 角色更大
    } else if (this._char === 'frieren') {
      this._imageSize = this._options.size / 1.15; // frieren 角色稍大
    } else {
      this._imageSize = this._options.size / 1.25; // 默认大小
    }
    this._canvasSize = this._options.size * 1.5;

    // widget root app
    this._domApp.style.width = `${size}px`;
    this._domApp.style.height = `${size}px`;

    // canvas stroke palette
    this._domCanvas.style.width = `${this._canvasSize}px`;
    this._domCanvas.style.height = `${this._canvasSize}px`;
    const ctx = getCanvasCtx(this._domCanvas, this._canvasSize);
    if (!ctx) {
      throw new Error('Invalid canvas context');
    }
    this._domCanvasCtx = ctx;
    this._draw(); // refresh canvas

    // widget main container
    this._domMain.style.width = `${size}px`;
    this._domMain.style.height = `${size}px`;

    // widget image
    this._domImage.style.width = `${this._imageSize}px`;
    this._domImage.style.height = `${this._imageSize}px`;
    this._domImage.style.transformOrigin = `50% ${size}px`; // use the bottom center of widget as trans origin
  };

  /**
   * @private
   * create widget dom elements
   */
  private _updateDom = () => {
    // wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'sakana-widget-wrapper';
    this._domWrapper = wrapper;

    // widget root app
    const app = document.createElement('div');
    app.className = 'sakana-widget-app';
    this._domApp = app;
    wrapper.appendChild(app);

    // canvas stroke palette
    const canvas = document.createElement('canvas');
    canvas.className = 'sakana-widget-canvas';
    this._domCanvas = canvas;
    app.appendChild(canvas);

    // widget main container
    const main = document.createElement('div');
    main.className = 'sakana-widget-main';
    this._domMain = main;
    app.appendChild(main);

    // widget image
    const img = document.createElement('div');
    img.className = 'sakana-widget-img';
    img.style.backgroundImage = `url('${this._image}')`;
    // set initial bottom position based on character
    if (this._char === 'aigirl') {
      img.style.bottom = '40px'; // 增大 aigirl 的底部间距
      img.style.transform = 'translateX(-70%)'; // aigirl 往左一点
    } else if (this._char === 'frieren') {
      img.style.bottom = '60px'; // frieren 底部间距 60px
      img.style.transform = 'translateX(-50%)'; // 居中
    } else if (this._char === 'liuying') {
      img.style.bottom = '40px'; // liuying 底部间距 40px
      img.style.transform = 'translateX(-50%)'; // 居中
    } else {
      img.style.bottom = '80px';
      img.style.transform = 'translateX(-50%)'; // 保持其他角色居中
    }
    this._domImage = img;
    main.appendChild(img);

    // control bar
    const ctrl = document.createElement('div');
    ctrl.className = 'sakana-widget-ctrl';
    if (this._options.controls) {
      main.appendChild(ctrl);
    }
    // add drag functionality to control bar
    if (this._options.controls) {
      ctrl.addEventListener('mousedown', this._onCtrlMouseDown);
      ctrl.addEventListener('touchstart', this._onCtrlTouchStart);
    }
    const itemClass = 'sakana-widget-ctrl-item';
    // 1. 切换角色
    const person = document.createElement('div');
    person.className = itemClass;
    person.innerHTML = svgPerson;
    person.role = 'button';
    person.tabIndex = 0;
    person.title = '切换角色';
    this._domCtrlPerson = person;
    ctrl.appendChild(person);
    // 2. 自动模式
    const magic = document.createElement('div');
    magic.className = itemClass;
    magic.innerHTML = svgSync;
    magic.role = 'button';
    magic.tabIndex = 0;
    magic.title = '自动模式';
    this._domCtrlMagic = magic;
    ctrl.appendChild(magic);
    // 3. 静音
    const muted = document.createElement('div');
    muted.className = itemClass;
    muted.innerHTML = Voices.isMute ? svgMuted : svgNoMuted;
    muted.role = 'button';
    muted.tabIndex = 0;
    muted.title = Voices.isMute ? '取消静音' : '静音';
    this._domCtrlMuted = muted;
    ctrl.appendChild(muted);
    // 4. GitHub 仓库
    const github = document.createElement('a');
    github.className = itemClass;
    github.href = '//github.com/YUME-0721/webpage-pet';
    github.target = '_blank';
    github.innerHTML = svgGitHub;
    github.title = 'GitHub 仓库';
    ctrl.appendChild(github);
    // 5. 关闭
    const close = document.createElement('div');
    close.className = itemClass;
    close.innerHTML = svgClose;
    close.role = 'button';
    close.tabIndex = 0;
    close.title = '关闭';
    this._domCtrlClose = close;
    ctrl.appendChild(close);
  };

  /**
   * @private
   * calculate center of the image
   */
  private _calcCenterPoint = (
    degree: number,
    radius: number,
    x: number,
    y: number
  ) => {
    const radian = (Math.PI / 180) * degree;
    const cos = Math.cos(radian);
    const sin = Math.sin(radian);
    const nx = sin * radius + cos * x - sin * y;
    const ny = cos * radius - cos * y - sin * x;
    return { nx, ny };
  };

  /**
   * @private
   * draw a frame
   */
  private _draw = () => {
    const { r, y } = this._state;
    const { size, controls, stroke } = this._options;
    const img = this._domImage;
    const imgSize = this._imageSize;
    const ctx = this._domCanvasCtx;

    // move the image
    const x = r * 1;
    img.style.transform = `translateX(-50%) rotate(${r}deg) translateX(${x}px) translateY(${y}px)`;

    // draw the canvas line
    ctx.clearRect(0, 0, this._canvasSize, this._canvasSize);
    ctx.save();
    // use the bottom center of widget as axis origin
    // note that canvas is 1.5 times larger than widget
    ctx.translate(this._canvasSize / 2, size + (this._canvasSize - size) / 2);
    ctx.strokeStyle = stroke.color;
    // different stroke width for liuying
    if (this._char === 'liuying') {
      ctx.lineWidth = stroke.width * 0.8; // liuying 弹簧杆稍细
    } else {
      ctx.lineWidth = stroke.width;
    }
    ctx.lineCap = 'round';
    if (this._options.rod) {
      ctx.beginPath();
    }
    // use the middle of control bar as start of the line
    // different spring rod length for different characters
    let startY = -50; // 控制栏高度中间位置
    let curveY = -100; // 曲线高度
    let radiusMultiplier = 2.5 / 3; // 角色高度比例
    
    if (this._char === 'aigirl') {
      startY = -40; // 控制栏高度中间位置，aigirl 离控制台更近
      curveY = -70; // 曲线高度，aigirl 弹簧杆更短
      radiusMultiplier = 2 / 3; // 角色高度比例
    } else if (this._char === 'frieren') {
      startY = -45; // 控制栏高度中间位置，frieren 离控制台较近
      curveY = -85; // 曲线高度，frieren 弹簧杆适中
      radiusMultiplier = 2.2 / 3; // 角色高度比例
    } else if (this._char === 'liuying') {
      startY = -40; // 控制栏高度中间位置，liuying 离控制台更近
      curveY = -90; // 曲线高度，liuying 弹簧杆更短且终点更上
      radiusMultiplier = 1.8 / 3; // 角色高度比例，终点更上
    }
    
    ctx.moveTo(0, startY);
    if (this._options.rod) {
      const radius = imgSize * radiusMultiplier;
      const { nx, ny } = this._calcCenterPoint(r, radius, x, y);
      // 使用二次贝塞尔曲线绘制弹簧杆，更接近 sakana-main 的效果
      ctx.quadraticCurveTo(0, curveY, nx, -ny);
      ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * @private
   * run the widget in animation frame
   */
  private _run = () => {
    let originRotate = this._options.rotate;
    originRotate = Math.min(120, Math.max(0, originRotate));
    const cut = this._options.threshold;
    if (!this._running) {
      return;
    }
    let { r, y, t, w } = this._state;
    const { d, i } = this._state;
    const thisRunUnix = Date.now();
    let _inertia = i;

    // ignore if frame diff is above 16ms (60fps)
    const lastRunUnixDiff = thisRunUnix - this._lastRunUnix;
    if (lastRunUnixDiff < 16) {
      _inertia = (i / this._frameUnix) * lastRunUnixDiff;
    }
    this._lastRunUnix = thisRunUnix;

    w = w - r * 2 - originRotate;
    r = r + w * _inertia * 1.2;
    this._state.w = w * d;
    this._state.r = r;
    t = t - y * 2;
    y = y + t * _inertia * 2;
    this._state.t = t * d;
    this._state.y = y;

    // stop if motion is too little
    if (
      Math.max(
        Math.abs(this._state.w),
        Math.abs(this._state.r),
        Math.abs(this._state.t),
        Math.abs(this._state.y)
      ) < cut
    ) {
      this._running = false;
      return;
    }

    this._draw();
    requestAnimationFrame(this._run);
  };

  /**
   * @private
   * manually move the widget
   */
  private _move = (x: number, y: number) => {
    const { maxR, maxY, minY } = this._limit;
    let r = x * this._state.s;
    r = Math.max(-maxR, r);
    r = Math.min(maxR, r);
    y = y * this._state.s * 2;
    y = Math.max(minY, y);
    y = Math.min(maxY, y);
    this._state.r = r;
    this._state.y = y;
    this._state.w = 0;
    this._state.t = 0;
    this._draw();
  };

  /**
   * @private
   * handle mouse down event
   */
  private _onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this._running = false;
    const { pageY } = e;
    const _downPageY = pageY;
    this._state.w = 0;
    this._state.t = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = this._domMain.getBoundingClientRect();
      const leftCenter = rect.left + rect.width / 2;
      const { pageX, pageY } = e;
      const x = pageX - leftCenter;
      const y = pageY - _downPageY;
      this._move(x, y);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this._running = true;
      this._playVoice();
      requestAnimationFrame(this._run);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  /**
   * @private
   * handle touch start event
   */
  private _onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this._running = false;
    if (!e.touches[0]) {
      return;
    }
    const { pageY } = e.touches[0];
    const _downPageY = pageY;
    this._state.w = 0;
    this._state.t = 0;

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) {
        return;
      }
      const rect = this._domMain.getBoundingClientRect();
      const leftCenter = rect.left + rect.width / 2;
      const { pageX, pageY } = e.touches[0];
      const x = pageX - leftCenter;
      const y = pageY - _downPageY;
      this._move(x, y);
    };

    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      this._running = true;
      this._playVoice();
      requestAnimationFrame(this._run);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  };

  /**
   * @private
   * do a force on widget (for auto mode)
   */
  private _magicForce = () => {
    // 0.1 probability to randomly switch character
    if (Math.random() < 0.1) {
      const available = Object.keys(_characters);
      const index = Math.floor(Math.random() * available.length);
      const _char = available[index];
      this.setCharacter(_char);
    } else {
      // 参考 sakana-main 的自走模式，施加随机大小的力
      this._state.t = this._state.t + (Math.random() - 0.5) * 180;
      this._state.w = this._state.w + (Math.random() - 0.5) * 220;
    }

    if (!this._running) {
      this._running = true;
      requestAnimationFrame(this._run);
    }
    // 参考 sakana-main 的随机间隔
    this._magicForceTimeout = window.setTimeout(
      this._magicForce,
      Math.random() * 4000 + 1000
    );
  };

  /**
   * @private
   * play voice effect based on character state
   */
  private _playVoice = () => {
    if (Voices.isMute || !this._options.sound) return;
    
    // 拖拽后播放 gugugaga 音效
    Voices.gugugaga.play();
  };

  /**
   * @private
   * handle control bar mouse down event for dragging
   */
  private _onCtrlMouseDown = (e: MouseEvent) => {
    // 防止事件冒泡到其他元素
    e.stopPropagation();
    
    const { pageX, pageY } = e;
    const _downPageX = pageX;
    const _downPageY = pageY;
    
    const rect = this._domWrapper.getBoundingClientRect();
    const startX = rect.left;
    const startY = rect.top;

    const onMouseMove = (e: MouseEvent) => {
      const { pageX, pageY } = e;
      const deltaX = pageX - _downPageX;
      const deltaY = pageY - _downPageY;
      
      const newX = startX + deltaX;
      const newY = startY + deltaY;
      
      this._domWrapper.style.position = 'fixed';
      this._domWrapper.style.left = `${newX}px`;
      this._domWrapper.style.top = `${newY}px`;
      this._domWrapper.style.right = 'auto';
      this._domWrapper.style.bottom = 'auto';
      this._domWrapper.style.zIndex = '9999';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  /**
   * @private
   * handle control bar touch start event for dragging
   */
  private _onCtrlTouchStart = (e: TouchEvent) => {
    // 防止事件冒泡到其他元素
    e.stopPropagation();
    
    if (!e.touches[0]) {
      return;
    }
    
    const { pageX, pageY } = e.touches[0];
    const _downPageX = pageX;
    const _downPageY = pageY;
    
    const rect = this._domWrapper.getBoundingClientRect();
    const startX = rect.left;
    const startY = rect.top;

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) {
        return;
      }
      
      const { pageX, pageY } = e.touches[0];
      const deltaX = pageX - _downPageX;
      const deltaY = pageY - _downPageY;
      
      const newX = startX + deltaX;
      const newY = startY + deltaY;
      
      this._domWrapper.style.position = 'fixed';
      this._domWrapper.style.left = `${newX}px`;
      this._domWrapper.style.top = `${newY}px`;
      this._domWrapper.style.right = 'auto';
      this._domWrapper.style.bottom = 'auto';
      this._domWrapper.style.zIndex = '9999';
    };

    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  };

  /**
   * @private
   * request gyroscope permission
   */
  private _requestGyroPermission = async () => {
    if (!('DeviceMotionEvent' in window)) {
      console.log('DeviceMotionEvent is not supported');
      return false;
    }

    const deviceMotionEvent = window.DeviceMotionEvent as any;
    if (typeof deviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await deviceMotionEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.log('Gyroscope permission denied:', error);
        return false;
      }
    }

    // For browsers that don't require permission
    return true;
  };

  /**
   * @private
   * handle gyroscope data
   */
  private _handleGyro = (event: DeviceMotionEvent) => {
    if (!this._gyroEnabled) return;

    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    this._detectShake(acceleration);
  };

  /**
   * @private
   * detect shake motion
   */
  private _detectShake = (acceleration: DeviceAcceleration) => {
    const now = Date.now();
    const timeDiff = now - this._lastShakeTime;

    // Only check shake every 100ms
    if (timeDiff < 100) return;

    const x = acceleration.x || 0;
    const y = acceleration.y || 0;
    const z = acceleration.z || 0;
    const { x: lastX, y: lastY, z: lastZ } = this._lastAcceleration;

    // Calculate acceleration difference
    const deltaX = Math.abs(x - lastX);
    const deltaY = Math.abs(y - lastY);
    const deltaZ = Math.abs(z - lastZ);

    // Detect shake (threshold can be adjusted)
    const shakeThreshold = 15;
    if (deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold) {
      // Apply force to the character
      this._state.t = this._state.t + (Math.random() - 0.5) * 200;
      this._state.w = this._state.w + (Math.random() - 0.5) * 250;

      if (!this._running) {
        this._running = true;
        requestAnimationFrame(this._run);
      }

      this._lastShakeTime = now;
    }

    this._lastAcceleration = { x, y, z };
  };

  /**
   * @public
   * enable gyroscope and shake detection
   */
  enableGyro = async () => {
    const granted = await this._requestGyroPermission();
    if (granted) {
      this._gyroEnabled = true;
      window.addEventListener('devicemotion', this._handleGyro);
    }
    return granted;
  };

  /**
   * @public
   * disable gyroscope and shake detection
   */
  disableGyro = () => {
    this._gyroEnabled = false;
    window.removeEventListener('devicemotion', this._handleGyro);
  };

  /**
   * @public
   * switch the auto mode
   */
  triggerAutoMode = () => {
    this._magicForceEnabled = !this._magicForceEnabled;

    // toggle icon rotate
    const icon = this._domCtrlMagic.querySelector('svg') as SVGSVGElement;
    if (this._magicForceEnabled) {
      icon.classList.add('sakana-widget-icon--rotate');
    } else {
      icon.classList.remove('sakana-widget-icon--rotate');
    }

    // clear the timer or start a timer
    clearTimeout(this._magicForceTimeout);
    if (this._magicForceEnabled) {
      this._magicForceTimeout = window.setTimeout(
        this._magicForce,
        Math.random() * 1000 + 500
      );
    }
  };

  /**
   * @public
   * toggle mute state
   */
  toggleMute = () => {
    Voices.isMute = !Voices.isMute;
    Voices.gugugaga.muted = Voices.isMute;
    
    // update icon
    this._domCtrlMuted.innerHTML = Voices.isMute ? svgMuted : svgNoMuted;
    
    // update title
    this._domCtrlMuted.title = Voices.isMute ? '取消静音' : '静音';
  };

  /**
   * @public
   * set current state of widget
   */
  setState = (state: Partial<WebpagePetState>) => {
    if (!this._state) {
      this._state = {} as WebpagePetState;
    }
    this._state = mergeDeep(this._state, cloneDeep(state));
    return this;
  };

  /**
   * @public
   * set current character of widget
   */
  setCharacter = (name: string) => {
    const targetChar = _characters[name];
    if (!targetChar) {
      throw new Error(`invalid character ${name}`);
    }
    this._char = name;
    this._image = targetChar.image;
    this.setState(targetChar.initialState);

    // refresh the widget image
    if (this._domImage) {
      this._domImage.style.backgroundImage = `url('${this._image}')`;
      // set different bottom position for aigirl
      if (name === 'aigirl') {
        this._domImage.style.bottom = '40px'; // 增大 aigirl 的底部间距
        this._domImage.style.transform = 'translateX(-70%)'; // aigirl 往左一点
      } else if (name === 'frieren') {
        this._domImage.style.bottom = '60px'; // frieren 底部间距 60px
        this._domImage.style.transform = 'translateX(-50%)'; // 居中
      } else if (name === 'liuying') {
        this._domImage.style.bottom = '40px'; // liuying 底部间距 40px
        this._domImage.style.transform = 'translateX(-50%)'; // 居中
      } else {
        this._domImage.style.bottom = '80px';
        this._domImage.style.transform = 'translateX(-50%)'; // 保持其他角色居中
      }
      // update image size for different characters
      if (name === 'liuying') {
        this._imageSize = this._options.size / 0.9; // liuying 角色更大
      } else if (name === 'frieren') {
        this._imageSize = this._options.size / 1.15; // frieren 角色稍大
      } else {
        this._imageSize = this._options.size / 1.25; // 默认大小
      }
      this._domImage.style.width = `${this._imageSize}px`;
      this._domImage.style.height = `${this._imageSize}px`;
    }
    return this;
  };

  /**
   * @public
   * set to next character of widget
   */
  nextCharacter = () => {
    const _chars = Object.keys(WebpagePet.getCharacters()).sort();
    const curCharIdx = _chars.indexOf(this._char);
    const nextCharIdx = (curCharIdx + 1) % _chars.length;
    const nextChar = _chars[nextCharIdx];
    this.setCharacter(nextChar);
    return this;
  };

  /**
   * @private
   * handle widget resize
   */
  _onResize = (rect: DOMRect) => {
    let newSize = Math.min(rect.width, rect.height);
    newSize = Math.max(120, newSize); // at least 120
    this._updateSize(newSize);
    this._updateLimit(newSize);
  };

  /**
   * @public
   * mount the widget
   */
  mount = (el: HTMLElement | string) => {
    // pre check
    let _el: HTMLElement | null;
    if (typeof el === 'string') {
      _el = document.querySelector(el);
    } else {
      _el = el;
    }
    if (!_el) {
      throw new Error('Invalid mounting element');
    }
    const parent = _el.parentNode;
    if (!parent) {
      throw new Error('Invalid mounting element parent');
    }

    // append event listeners
    if (this._options.draggable) {
      this._domImage.addEventListener('mousedown', this._onMouseDown);
      this._domImage.addEventListener('touchstart', this._onTouchStart);
    }

    this._domCtrlPerson.addEventListener('click', this.nextCharacter);
    this._domCtrlMagic.addEventListener('click', this.triggerAutoMode);
    this._domCtrlMuted.addEventListener('click', this.toggleMute);
    this._domCtrlClose.addEventListener('click', this.unmount);

    // if auto fit mode
    if (this._options.autoFit) {
      // initial resize
      this._onResize(this._domWrapper.getBoundingClientRect());
      // handle future resize
      this._resizeObserver = new ResizeObserver(
        throttle((entries) => {
          if (!entries || !entries[0]) return;
          this._onResize(entries[0].contentRect);
        })
      );
      this._resizeObserver.observe(this._domWrapper);
    }

    // mount node
    const _newEl = _el.cloneNode(false) as HTMLElement;
    _newEl.appendChild(this._domWrapper);
    parent.replaceChild(_newEl, _el);
    requestAnimationFrame(this._run);
    
    // Try to enable gyroscope
    this.enableGyro().catch(err => {
      console.log('Failed to enable gyroscope:', err);
    });
    
    return this;
  };

  /**
   * @public
   * unmount the widget
   */
  unmount = () => {
    // remove event listeners
    this._domImage.removeEventListener('mousedown', this._onMouseDown);
    this._domImage.removeEventListener('touchstart', this._onTouchStart);
    this._domCtrlPerson.removeEventListener('click', this.nextCharacter);
    this._domCtrlMagic.removeEventListener('click', this.triggerAutoMode);
    this._domCtrlMuted.removeEventListener('click', this.toggleMute);
    this._domCtrlClose.removeEventListener('click', this.unmount);
    // remove control bar drag event listeners
    if (this._options.controls && this._domCtrlPerson.parentNode) {
      const ctrl = this._domCtrlPerson.parentNode as HTMLElement;
      ctrl.removeEventListener('mousedown', this._onCtrlMouseDown as unknown as EventListener);
      ctrl.removeEventListener('touchstart', this._onCtrlTouchStart as unknown as EventListener);
    }

    // disable gyroscope
    this.disableGyro();

    // if auto fit mode
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    // unmount node
    const _el = this._domWrapper.parentNode;
    if (!_el) {
      throw new Error('Invalid mounting element');
    }
    _el.removeChild(this._domWrapper);
    return this;
  };
}

export default WebpagePet;
export type { WebpagePetCharacter, WebpagePetState, WebpagePetOptions };