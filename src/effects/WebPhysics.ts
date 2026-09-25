interface Point {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function distance(a: Pick<Point, "x" | "y">, b: Pick<Point, "x" | "y">): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export class WebPhysics {
  private overlay: SVGSVGElement | null = null;
  private core: SVGPathElement | null = null;
  private filament: SVGPathElement | null = null;
  private ribs: SVGPathElement | null = null;
  private splat: SVGGElement | null = null;
  private points: Point[] = [];
  private hero: HTMLElement | null = null;
  private candidate: HTMLElement | null = null;
  private latched: HTMLElement | null = null;
  private pointer = { x: 0, y: 0 };
  private pointerVelocity = { x: 0, y: 0 };
  private dragging = false;
  private frame = 0;
  private releasedAt = 0;
  private restLength = 16;
  private readonly segmentCount = 20;

  start(event: PointerEvent, hero: HTMLElement): void {
    this.cancel();
    this.hero = hero;
    this.dragging = true;
    this.pointer = { x: event.clientX, y: event.clientY };
    const origin = this.heroOrigin();
    const target = { x: event.clientX, y: event.clientY };
    const totalDistance = Math.max(100, distance(origin, target));
    this.restLength = totalDistance * 0.82 / this.segmentCount;
    this.points = Array.from({ length: this.segmentCount + 1 }, (_, index) => {
      const ratio = index / this.segmentCount;
      const x = origin.x + (target.x - origin.x) * ratio;
      const y = origin.y + (target.y - origin.y) * ratio;
      return { x, y, oldX: x, oldY: y };
    });
    this.createOverlay();
    hero.classList.add("web-physics-active");
    window.addEventListener("pointermove", this.move, { passive: false });
    window.addEventListener("pointerup", this.release, { once: true });
    window.addEventListener("pointercancel", this.release, { once: true });
    this.frame = requestAnimationFrame(this.tick);
  }

  fireFromKeyboard(hero: HTMLElement): void {
    const rect = hero.getBoundingClientRect();
    const synthetic = {
      clientX: rect.left + rect.width * 0.2,
      clientY: rect.top + rect.height * 0.15,
    } as PointerEvent;
    this.start(synthetic, hero);
    this.pointerVelocity = { x: -7, y: -13 };
    this.dragging = false;
    this.releasedAt = performance.now();
  }

  cancel(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.release);
    window.removeEventListener("pointercancel", this.release);
    this.candidate?.classList.remove("web-latch-target");
    this.latched?.classList.remove("web-pulled");
    this.clearPull(this.latched);
    this.clearPull(this.hero);
    this.hero?.classList.remove("web-physics-active");
    this.overlay?.remove();
    this.overlay = null;
    this.core = null;
    this.filament = null;
    this.ribs = null;
    this.splat = null;
    this.points = [];
    this.hero = null;
    this.candidate = null;
    this.latched = null;
    this.dragging = false;
  }

  private createOverlay(): void {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("web-physics-layer");
    svg.setAttribute("viewBox", `0 0 ${innerWidth} ${innerHeight}`);
    svg.setAttribute("aria-hidden", "true");
    const glow = document.createElementNS(SVG_NS, "filter");
    glow.id = "web-physics-glow";
    glow.innerHTML = '<feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>';
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.appendChild(glow);
    svg.appendChild(defs);

    this.filament = document.createElementNS(SVG_NS, "path");
    this.filament.classList.add("web-physics-filament");
    this.ribs = document.createElementNS(SVG_NS, "path");
    this.ribs.classList.add("web-physics-ribs");
    this.core = document.createElementNS(SVG_NS, "path");
    this.core.classList.add("web-physics-core");
    this.splat = document.createElementNS(SVG_NS, "g");
    this.splat.classList.add("web-physics-splat");
    this.splat.innerHTML = `
      <circle r="20"/>
      <path d="M-28 0H28M0-28V28M-20-20L20 20M20-20L-20 20"/>
      <circle r="5" class="web-splat-core"/>
    `;
    svg.append(this.filament, this.ribs, this.core, this.splat);
    document.body.appendChild(svg);
    this.overlay = svg;
  }

  private readonly move = (event: PointerEvent): void => {
    event.preventDefault();
    this.pointerVelocity.x = event.clientX - this.pointer.x;
    this.pointerVelocity.y = event.clientY - this.pointer.y;
    this.pointer = { x: event.clientX, y: event.clientY };
    const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const candidate = element?.closest<HTMLElement>(".nav-card,.home-mission,.hero-badge,.chip") ?? null;
    if (candidate !== this.candidate) {
      this.candidate?.classList.remove("web-latch-target");
      this.candidate = candidate;
      this.candidate?.classList.add("web-latch-target");
    }
  };

  private readonly release = (): void => {
    if (!this.overlay) return;
    this.dragging = false;
    this.releasedAt = performance.now();
    if (this.candidate) {
      this.latched = this.candidate;
      this.latched.classList.remove("web-latch-target");
      this.latched.classList.add("web-pulled");
      this.candidate = null;
    } else {
      const end = this.points.at(-1);
      if (end) {
        end.oldX = end.x - this.pointerVelocity.x * 1.7;
        end.oldY = end.y - this.pointerVelocity.y * 1.7;
      }
    }
  };

  private readonly tick = (now: number): void => {
    if (!this.overlay || !this.hero || !this.points.length) return;
    const origin = this.heroOrigin();
    const first = this.points[0]!;
    first.x = origin.x;
    first.y = origin.y;
    first.oldX = origin.x;
    first.oldY = origin.y;

    const end = this.points[this.points.length - 1]!;
    if (this.dragging) {
      end.x = this.pointer.x;
      end.y = this.pointer.y;
      end.oldX = end.x;
      end.oldY = end.y;
    } else if (this.latched) {
      const rect = this.latched.getBoundingClientRect();
      end.x = rect.left + rect.width / 2;
      end.y = rect.top + rect.height / 2;
      end.oldX = end.x;
      end.oldY = end.y;
      if (now - this.releasedAt > 1900) {
        this.latched.classList.remove("web-pulled");
        this.clearPull(this.latched);
        this.latched = null;
        end.oldX = end.x + (end.x - origin.x) * 0.08;
        end.oldY = end.y + (end.y - origin.y) * 0.08 - 8;
      }
    }

    for (let index = 1; index < this.points.length; index++) {
      const point = this.points[index]!;
      if (index === this.points.length - 1 && (this.dragging || this.latched)) continue;
      const velocityX = (point.x - point.oldX) * 0.985;
      const velocityY = (point.y - point.oldY) * 0.985;
      point.oldX = point.x;
      point.oldY = point.y;
      point.x += velocityX;
      point.y += velocityY + 0.48;
    }

    for (let pass = 0; pass < 7; pass++) this.constrain();
    this.draw();
    this.applyPull();

    const endOutOfBounds = end.y > innerHeight + 180 || end.x < -180 || end.x > innerWidth + 180;
    const expired = !this.dragging && !this.latched && now - this.releasedAt > 2600;
    if (endOutOfBounds || expired) {
      this.cancel();
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private constrain(): void {
    for (let index = 0; index < this.points.length - 1; index++) {
      const a = this.points[index]!;
      const b = this.points[index + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const current = Math.max(0.001, Math.hypot(dx, dy));
      const correction = (current - this.restLength) / current;
      const offsetX = dx * correction * 0.5;
      const offsetY = dy * correction * 0.5;
      if (index !== 0) {
        a.x += offsetX;
        a.y += offsetY;
      }
      if (index + 1 !== this.points.length - 1 || (!this.dragging && !this.latched)) {
        b.x -= offsetX;
        b.y -= offsetY;
      }
    }
  }

  private draw(): void {
    if (!this.core || !this.filament || !this.ribs || !this.splat) return;
    const path = this.smoothPath(this.points);
    this.core.setAttribute("d", path);
    const offset = this.points.map((point, index) => {
      const previous = this.points[Math.max(0, index - 1)]!;
      const next = this.points[Math.min(this.points.length - 1, index + 1)]!;
      const length = Math.max(1, Math.hypot(next.x - previous.x, next.y - previous.y));
      return { ...point, x: point.x - (next.y - previous.y) / length * 3.2, y: point.y + (next.x - previous.x) / length * 3.2 };
    });
    this.filament.setAttribute("d", this.smoothPath(offset));
    const ribPath: string[] = [];
    for (let index = 2; index < this.points.length - 1; index += 3) {
      const a = this.points[index - 1]!;
      const b = this.points[index + 1]!;
      const length = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const normalX = -(b.y - a.y) / length * 7;
      const normalY = (b.x - a.x) / length * 7;
      const point = this.points[index]!;
      ribPath.push(`M${point.x - normalX},${point.y - normalY}Q${point.x},${point.y + 3} ${point.x + normalX},${point.y + normalY}`);
    }
    this.ribs.setAttribute("d", ribPath.join(" "));
    const end = this.points[this.points.length - 1]!;
    this.splat.setAttribute("transform", `translate(${end.x} ${end.y}) rotate(${performance.now() * 0.06})`);
  }

  private smoothPath(points: Point[]): string {
    if (points.length < 2) return "";
    let path = `M${points[0]!.x},${points[0]!.y}`;
    for (let index = 1; index < points.length - 1; index++) {
      const point = points[index]!;
      const next = points[index + 1]!;
      path += ` Q${point.x},${point.y} ${(point.x + next.x) / 2},${(point.y + next.y) / 2}`;
    }
    const end = points[points.length - 1]!;
    return `${path} T${end.x},${end.y}`;
  }

  private applyPull(): void {
    if (!this.hero || !this.points.length) return;
    const origin = this.points[0]!;
    const end = this.points[this.points.length - 1]!;
    const dx = end.x - origin.x;
    const dy = end.y - origin.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ropeLength = this.restLength * this.segmentCount;
    const tension = Math.min(1, Math.max(0, (length - ropeLength) / 130));
    const pullX = dx / length * tension;
    const pullY = dy / length * tension;
    this.hero.style.setProperty("--web-pull-x", `${pullX * 12}px`);
    this.hero.style.setProperty("--web-pull-y", `${pullY * 8}px`);
    if (this.latched) {
      this.latched.style.setProperty("--web-pull-x", `${-pullX * 16}px`);
      this.latched.style.setProperty("--web-pull-y", `${-pullY * 12}px`);
      this.latched.style.setProperty("--web-pull-rotate", `${-pullX * 2.5}deg`);
    }
  }

  private heroOrigin(): { x: number; y: number } {
    const rect = this.hero?.getBoundingClientRect();
    return rect
      ? { x: rect.left + rect.width * 0.66, y: rect.top + rect.height * 0.52 }
      : { x: innerWidth / 2, y: innerHeight / 2 };
  }

  private clearPull(element: HTMLElement | null): void {
    if (!element) return;
    element.style.removeProperty("--web-pull-x");
    element.style.removeProperty("--web-pull-y");
    element.style.removeProperty("--web-pull-rotate");
  }
}
