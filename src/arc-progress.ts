import {isInt} from './utils';

interface options {
  size?: number,
  arcStart?: number,
  arcEnd?: number,
  progress: number,
  value?: string,
  thickness?: number,
  emptyColor?: string,
  fillColor?: string,
  lineCap?: string,
  speed?: number,
  el: string | HTMLElement,
  animation?: boolean | number,
  animationEnd?: (any) => void,
  observer?: (progress?: number, text?: string) => void;
}

interface updateOptions {
  size?: number,
  arcStart?: number,
  arcEnd?: number,
  progress: number,
  value?: string,
  el?: string | HTMLElement,
}

class ArcProgress {
  public size: number;
  public el: string | HTMLElement;
  public canvas: HTMLElement;
  public ctx: any;
  public arcStart: number;
  public arcEnd: number;
  public progress: number;
  public value: string;
  public animation: boolean | number;
  private percentage: number = 0;
  private speed: number = 1;
  private textValue: number = 0;
  private type: string = 'increase';
  private isEnd: boolean = false;
  private thickness: number;
  private animationEnd: (e: any) => void;
  private observer: (progress?: number, text?: string) => void;
  private emptyColor: string = '#efefef';
  private fillColor: string = '#6bd5c8';
  private lineCap: string = 'round';
  private currentText: string;

  constructor({size, el, arcStart = 144, arcEnd = 396, progress, value, thickness, emptyColor, fillColor, lineCap, animation, speed = 0, animationEnd = () => {}, observer}: options) {
    this.size = size || 200;
    this.arcStart = arcStart
    this.arcEnd = arcEnd
    this.progress = progress * 100;
    this.value = value;
    this.el = el;
    this.thickness = thickness || 12;
    this.animationEnd = animationEnd;
    this.emptyColor = emptyColor || this.emptyColor;
    this.fillColor = fillColor || this.fillColor;
    this.lineCap = lineCap || this.lineCap;
    this.animation = animation || true;
    this.observer = observer;
    this.setSpeed(speed);

    this.init();
  }

  private init(): void {
    const el = typeof this.el === 'string' ? document.querySelector(this.el) : this.el;
    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = this.size;
    canvas.height = this.size;
    el.appendChild(canvas);
    this.ctx = canvas.getContext('2d');

    this.drawProgressAnimate();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const PI = Math.PI;
    const size = this.size / 2;
    const conversionRate = 180; //  360/2
    const start = this.arcStart / conversionRate * PI;
    const end = this.arcEnd / conversionRate * PI;

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.lineCap = this.lineCap;
    ctx.strokeStyle = this.emptyColor;

    ctx.arc(size, size, size - this.thickness, start, end, false);
    ctx.stroke();
    ctx.closePath();
  }

  private computedArc(): {start: number, end: number} {
    const PI = Math.PI;
    const conversionRate = 180; //  360/2

    const start = this.arcStart / conversionRate;
    const end = this.arcEnd / conversionRate;

    const degreeCount = end - start;
    const progress = degreeCount * (this.percentage/100) + start;
    const endPI = progress * PI;

    const startPI = start * PI;

    return {start: startPI, end: endPI};
  }

  private setSpeed(speed: number): void {
    if (speed) {
      if (speed > 0) {
        this.speed += speed / 40;
      } else {
        this.speed += speed / 101;
      }
    }
  }

  private computedText(): string {
    const frequency = this.progress / this.speed;
    let increaseValue = Number(this.value) / frequency;
    let decimal: number;

    const isIntValue = isInt(this.value);
    if (isIntValue) {
      increaseValue = Math.floor(increaseValue);
      if (!(increaseValue % 5)) {
        increaseValue -= 1;
      }
    } else {
      decimal = this.value.split('.')[1].length;
      increaseValue = Number(increaseValue.toFixed(decimal));

      if (!(increaseValue * Math.pow(10, decimal) % 5)) {
        increaseValue -= 1 / Math.pow(10, decimal);
      }
    }

    if (this.type === 'increase') {
      this.textValue += increaseValue;
    } else {
      this.textValue -= increaseValue;
    }

    if (this.isEnd) {
      return this.value;
    } else if (!isIntValue) {
      return this.textValue.toFixed(decimal)
    } else {
      return String(this.textValue);
    }
  }

  private drawProgress(): void {
    const ctx = this.ctx;

    const halfSize = this.size / 2;
    const {start, end} = this.computedArc();

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.lineCap = this.lineCap;
    ctx.strokeStyle = this.fillColor;

    ctx.arc(halfSize, halfSize, halfSize - this.thickness, start, end, false);

    ctx.stroke();
    ctx.closePath();
    if (this.isEnd) {
      this.animationEnd(this);
    }
  }

  private drawText(): void {
    const ctx = this.ctx;
    const text = this.computedText();
    this.currentText = text;

    ctx.fillStyle = '#000000';
    ctx.font = '40px';
    ctx.textAlign = 'center';
    ctx.fillText(text, this.size/2, 75);
  }

  private requestAnimationFrame(cb) {
    return window.requestAnimationFrame(cb);
  }

  private accumulation(): void {
    if (this.animation && typeof this.animation === 'number') {
      this.speed = this.progress / (this.animation / (1000/60));
    }
    if (this.type === 'increase') {
      this.percentage += this.speed;
      if (this.percentage > this.progress)
        this.percentage = this.progress
    } else {
      this.percentage -= this.speed;
      if (this.percentage < this.progress)
        this.percentage = this.progress
    }
  }

  private drawProgressAnimate = (): void => {
    if (this.animation === false) {
      this.percentage = this.progress;
    }
    this.isEnd = this.percentage === this.progress;

    this.ctx.clearRect(0, 0, this.size, this.size);
    this.drawBackground();
    this.drawText();
    this.drawProgress();

    this.observer && this.observer(this.percentage, this.currentText);

    if (this.type === 'increase' && this.percentage < this.progress) {
      this.accumulation();
      this.requestAnimationFrame(this.drawProgressAnimate);
    } else if (this.type === 'reduce' && this.percentage > this.progress) {
      this.accumulation();
      this.requestAnimationFrame(this.drawProgressAnimate);
    }
  }

  public updateProgress({progress, value}: updateOptions): void {
    if (!this.isEnd) return;
    this.type = progress * 100 > this.progress ? 'increase' : 'reduce';

    this.progress = progress * 100;
    this.value = value;
    this.drawProgressAnimate();
  }

  public destroy(): void {
    const container = this.canvas.parentNode;

    if (container) {
      container.removeChild(this.canvas);
    }
  }

}

export default ArcProgress;
