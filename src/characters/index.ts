import _zmdEndministrator from './zmd-endministrator.png';
import _aigirl from './02-aigirl.png';
import _frieren from './Frieren.png';
import _liuying from './liuying.png';

export interface WebpagePetState {
  /**
   * inertia
   */
  i: number;
  /**
   * stickiness
   */
  s: number;
  /**
   * decay
   */
  d: number;
  /**
   * angle
   */
  r: number;
  /**
   * height
   */
  y: number;
  /**
   * vertical speed
   */
  t: number;
  /**
   * horizontal speed
   */
  w: number;
}

export interface WebpagePetCharacter {
  image: string;
  initialState: WebpagePetState;
}

const zmdEndministrator: WebpagePetCharacter = {
  image: _zmdEndministrator,
  initialState: {
    i: 0.08,
    s: 0.1,
    d: 0.99,
    r: 1,
    y: 40,
    t: 0,
    w: 0,
  },
};

const aigirl: WebpagePetCharacter = {
  image: _aigirl,
  initialState: {
    i: 0.08,
    s: 0.1,
    d: 0.99,
    r: 1,
    y: 40,
    t: 0,
    w: 0,
  },
};

const frieren: WebpagePetCharacter = {
  image: _frieren,
  initialState: {
    i: 0.08,
    s: 0.1,
    d: 0.99,
    r: 1,
    y: 40,
    t: 0,
    w: 0,
  },
};

const liuying: WebpagePetCharacter = {
  image: _liuying,
  initialState: {
    i: 0.08,
    s: 0.1,
    d: 0.99,
    r: 1,
    y: 40,
    t: 0,
    w: 0,
  },
};

export default {
  zmdEndministrator,
  aigirl,
  frieren,
  liuying,
};