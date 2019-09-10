import {isInt} from './utils';

interface textStyle {
  text?: string,
  size?: string,
  color?: string,
  x?: number,
  y?: number,
  length?: number,
}

type lineCap = 'butt' | 'round' | 'square'

interface Options {
  el: string | HTMLElement
  size?: number,
  arcStart?: number,
  arcEnd?: number,
  progress: number,
  text?: string,
  thickness?: number,
  emptyColor?: string,
  fillColor?: string,
  lineCap?: lineCap,
  textStyle?: textStyle,
  customText?: textStyle[],
  speed?: number,
  animation?: boolean | number,
  animationEnd?: (any) => void,
  observer?: (progress?: number, text?: string) => void;
}


const PI = Math.PI;
let lastNumber: number = 0;

class ArcProgress {
  public size: number;
  public el: string | HTMLElement;
  public canvas: HTMLCanvasElement;
  public ctx: any;
  public arcStart: number;
  public arcEnd: number;
  public progress: number;
  public text: string;
  public animation: boolean | number;
  public textStyle: textStyle;
  public customText: textStyle[];
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
  private lineCap: lineCap = 'round';
  private currentText: string;
  private increaseValue: number = 0;
  private frequency: number = 0;

  constructor({size, el, textStyle = {}, arcStart = 144, arcEnd = 396, progress, text, thickness, emptyColor, fillColor, lineCap, animation, speed = 0, customText, animationEnd = () => {}, observer}: Options) {
    this.size = (size || 200) * 2; // HD mode
    this.arcStart = arcStart;
    this.arcEnd = arcEnd;
    this.progress = progress * 100;
    this.text = text;
    this.el = el;
    this.thickness = (thickness || 12) * 2;
    this.animationEnd = animationEnd;
    this.emptyColor = emptyColor || this.emptyColor;
    this.fillColor = fillColor || this.fillColor;
    this.lineCap = lineCap || this.lineCap;
    this.animation = animation || true;
    this.textStyle = {size: '18px', color: '#000', x: this.size/4, y: this.size/4, ...textStyle};
    this.customText = customText || [];
    this.observer = observer;

    this.init();
  }

  private init(notCreate?: boolean): void {
    this.createCanvas(notCreate);
    this.setSpeed();
    this.setIncreaseValue();
    this.drawProgressAnimate();
  }

  private createCanvas(notCreate?: boolean): void {
    const el = typeof this.el === 'string' ? <HTMLElement>document.querySelector(this.el) : <HTMLElement>this.el;

    if (!notCreate) {
      this.canvas = document.createElement('canvas');
    }

    const originalSize = this.size / 2;
    el.style.width = `${originalSize}px`;
    el.style.height = `${originalSize}px`;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.width = `${originalSize}px`;
    this.canvas.style.height = `${originalSize}px`;
    this.canvas.style.width = 'block';

    if (!notCreate) {
      el.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
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
    const conversionRate = 180; //  360/2

    const start = this.arcStart / conversionRate;
    const end = this.arcEnd / conversionRate;

    const degreeCount = end - start;
    const progress = degreeCount * (this.percentage/100) + start;
    const endPI = progress * PI;

    const startPI = start * PI;

    return {start: startPI, end: endPI};
  }

  private setSpeed(): void {
    const {speed, animation, progress} = this;
    if (animation && typeof animation === 'number') {
      this.speed = progress / (animation / (1000/60));
    } else if (speed) {
      if (speed > 0) {
        this.speed += speed / 40;
      } else {
        this.speed += speed / 101;
      }
    }

    this.frequency = this.progress / this.speed;
  }

  private setIncreaseValue(): void {
    const {frequency} = this;
    const numberText = Number(this.text);
    let increaseValue = numberText / frequency;
    const isIntValue = isInt(this.text);

    if (isIntValue && !(Math.floor(increaseValue) % 2) && numberText > frequency) {
      increaseValue = increaseValue - 1 > 0 ? increaseValue -= 1 : 1;
    }
    this.increaseValue = increaseValue;
  }

  private computedText(): string {
    let decimal = this.text.split('.')[1].length;

    const isIntValue = isInt(this.text);

    if (this.type === 'increase') {
      this.textValue += this.increaseValue;
    } else {
      this.textValue -= this.increaseValue;
    }

    if (this.isEnd) {
      return this.text;
    } else if (!isIntValue) {
      lastNumber = lastNumber === 9 ? 0 : lastNumber += 1;
      if (decimal > 1) {
        return this.textValue.toFixed(decimal - 1) + lastNumber;
      }
      return this.textValue.toFixed(0) + `.${lastNumber}`;
    } else {
      return String(Math.floor(this.textValue));
    }
  }

  private setFillColor(ctx: CanvasRenderingContext2D): void {
    const gradientColors = this.fillColor.split(' ');
    if (gradientColors.length > 1) {
      const grad = ctx.createLinearGradient(0, 0, this.size, 0);
      const length = gradientColors.length;
      const part = 1/length;
      let partCount = 0;
      for (let i = 0; i < length; i++) {
        grad.addColorStop(partCount, gradientColors[i]);
        partCount += part;
      }
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = this.fillColor;
    }
  }

  private drawProgress(): void {
    const ctx = this.ctx;
    const halfSize = this.size / 2;
    const {start, end} = this.computedArc();

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.lineCap = this.lineCap;

    this.setFillColor(ctx);
    ctx.arc(halfSize, halfSize, halfSize - this.thickness, start, end, false);

    ctx.stroke();
    ctx.closePath();

    if (this.isEnd) {
      this.animationEnd(this);
    }
  }

  private setText(ctx: CanvasRenderingContext2D, fontSetting: textStyle): void {
    const {text, size = '14px', color = '#000', x = 10, y = 10} = fontSetting;
    const fontSize = parseInt(size) * 2;
    const unit = size.substring(String(fontSize).length) || 'px';

    ctx.font = `${fontSize}${unit} sans-seri`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x * 2, y * 2);
  }

  private drawText(): void {
    const ctx = this.ctx;
    const text = this.computedText();
    this.currentText = text;

    const textContent =  <textStyle>[{text, ...this.textStyle}, ...this.customText];
    for (let i = 0; i < textContent.length; i++) {
      this.setText(ctx, textContent[i]);
    }
  }

  private requestAnimationFrame(cb) {
    return window.requestAnimationFrame(cb);
  }

  private accumulation(): void {
    if (this.type === 'increase') {
      this.percentage += this.speed;
      if (this.percentage > this.progress)
        this.percentage = this.progress;
    } else {
      this.percentage -= this.speed;
      if (this.percentage < this.progress)
        this.percentage = this.progress;
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
    } else if (this.type === 'decrease' && this.percentage > this.progress) {
      this.accumulation();
      this.requestAnimationFrame(this.drawProgressAnimate);
    }
  }

  private resetOptions = (option: any): void => {
    const {progress, thickness, textStyle, size} = option || {};
    if (typeof progress === 'number') {
      const setProgress = progress * 100;
      this.type = setProgress > this.progress ? 'increase' : 'decrease';
      this.progress = setProgress;
    }
    if (thickness)
      this.thickness = thickness * 2;
    if (textStyle)
      this.textStyle = {...this.textStyle, ...textStyle};
    if (size)
      this.size = size * 2; // HD mode
  }

  public updateProgress(updateOption: Omit<Options, 'el'>): void {
    if (!this.isEnd) return;
    const {progress, thickness, textStyle, size, ...restOption} = updateOption;

    this.resetOptions({progress, thickness, textStyle, size});
    Object.keys(restOption || {}).forEach(key => this[key] = restOption[key]);

    this.init(true)
  }

  public destroy(): void {
    const container = this.canvas.parentNode;

    if (container) {
      container.removeChild(this.canvas);
    }
  }

}

export default ArcProgress;
