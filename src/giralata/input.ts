/**
 * GiralataInput — converte mouse, toque e teclado no mesmo estado lógico
 * de mira do mundo. Um dedo basta: puxar, mirar, soltar.
 */
import { CONFIG } from "./config";
import { len, sub, type Vec2 } from "./math";
import type { GiralataWorld } from "./world";

export type ScreenToWorld = (clientX: number, clientY: number) => Vec2 | null;

export function attachGiralataInput(
  canvas: HTMLCanvasElement,
  world: GiralataWorld,
  screenToWorld: ScreenToWorld
): () => void {
  let activePointer: number | null = null;
  let downPoint: Vec2 | null = null;

  const onPointerDown = (e: PointerEvent): void => {
    if (activePointer !== null || !world.canAim()) return;
    const w = screenToWorld(e.clientX, e.clientY);
    if (!w || len(w) > CONFIG.launch.GRAB_RADIUS) return;
    activePointer = e.pointerId;
    downPoint = w;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* alguns navegadores não suportam captura em canvas */
    }
    world.beginAim();
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer || !downPoint) return;
    const w = screenToWorld(e.clientX, e.clientY);
    if (!w) return;
    world.updateAim(sub(w, downPoint));
    e.preventDefault();
  };

  const endPointer = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    downPoint = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* já libertado */
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    endPointer(e);
    world.release();
    e.preventDefault();
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== activePointer) return;
    endPointer(e);
    world.cancelAim();
  };

  // touchcancel (interrupções do navegador) devolve a tampinha ao centro
  const onTouchCancel = (): void => {
    activePointer = null;
    downPoint = null;
    world.cancelAim();
  };

  const onBlur = (): void => {
    activePointer = null;
    downPoint = null;
    world.cancelAim();
  };

  const isTypingTarget = (t: EventTarget | null): boolean => {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A" || t.isContentEditable;
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = isTypingTarget(e.target);
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        if (typing) return;
        world.nudgeAim(0, 1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        if (typing) return;
        world.nudgeAim(0, -1);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        if (typing) return;
        world.nudgeAim(-1, 0);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        if (typing) return;
        world.nudgeAim(1, 0);
        break;
      case "Enter":
      case " ":
        if (typing) return;
        world.keyboardLaunch();
        break;
      case "Escape":
        if (world.phase === "playing" && world.capState === "aiming") world.cancelAim();
        else if (world.phase === "help") world.closeHelp();
        else world.togglePause();
        break;
      case "p":
      case "P":
        if (typing) return;
        world.togglePause();
        break;
      case "r":
      case "R":
        if (typing) return;
        if (world.phase === "playing" || world.phase === "paused" || world.phase === "result") world.restart();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onPointerCancel);
  canvas.addEventListener("touchcancel", onTouchCancel);
  window.addEventListener("blur", onBlur);
  window.addEventListener("keydown", onKeyDown);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("lostpointercapture", onPointerCancel);
    canvas.removeEventListener("touchcancel", onTouchCancel);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("keydown", onKeyDown);
  };
}
