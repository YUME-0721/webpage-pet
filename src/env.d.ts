/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.mp3' {
  const content: string;
  export default content;
}

declare module '*.m4a' {
  const content: string;
  export default content;
}

declare interface DeviceMotionEvent {
  requestPermission?: () => Promise<string>;
}

declare interface DeviceAcceleration {
  x: number | null;
  y: number | null;
  z: number | null;
}

declare module '*.scss' {
  const content: string;
  export default content;
}