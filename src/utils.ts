export type RequiredDeep<T> = T extends object
  ? { [P in keyof T]-?: RequiredDeep<T[P]> }
  : T;

export function cloneDeep<T>(source: T): T {
  if (source === null || typeof source !== 'object') {
    return source;
  }
  if (source instanceof Date) {
    return new Date(source.getTime()) as unknown as T;
  }
  if (source instanceof Array) {
    return source.map((item) => cloneDeep(item)) as unknown as T;
  }
  if (typeof source === 'object') {
    const target = {} as T;
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = cloneDeep(source[key]);
      }
    }
    return target;
  }
  return source;
}

export function mergeDeep<T>(target: T, source: any): T {
  if (target === null || typeof target !== 'object') {
    return source;
  }
  if (source === null || typeof source !== 'object') {
    return target;
  }
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] && typeof source[key] === 'object') {
        if (!target[key as keyof T]) {
          (target as any)[key] = {} as any;
        }
        mergeDeep((target as any)[key], source[key]);
      } else {
        (target as any)[key] = source[key];
      }
    }
  }
  return target;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 100
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (!timeout) {
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    }
  };
}

export function getCanvasCtx(
  canvas: HTMLCanvasElement,
  size: number
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    canvas.width = size;
    canvas.height = size;
  }
  return ctx;
}