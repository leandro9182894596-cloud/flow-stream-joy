import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

// FLOW TV — Navegação por controle remoto de TV / TV Box.
// TVs enviam as teclas direcionais (setas), OK/Enter e Voltar do controle como
// eventos de teclado padrão. Navegadores/WebViews de TV nem sempre movem o foco
// com as setas, então implementamos navegação espacial: ao pressionar uma seta,
// movemos o foco para o elemento focável mais próximo naquela direção.

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  ".focusable",
].join(",");

type Dir = "up" | "down" | "left" | "right";

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  // Precisa estar (ou estar perto de estar) na tela.
  return rect.bottom > -10 && rect.top < window.innerHeight + 10;
}

function getFocusables(): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter(isVisible);
}

function center(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Encontra o melhor candidato de foco na direção desejada.
function findNext(current: HTMLElement, dir: Dir): HTMLElement | null {
  const from = current.getBoundingClientRect();
  const fc = center(from);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of getFocusables()) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const c = center(r);
    const dx = c.x - fc.x;
    const dy = c.y - fc.y;

    let primary: number;
    let cross: number;
    switch (dir) {
      case "up":
        if (dy >= -2) continue;
        primary = -dy;
        cross = Math.abs(dx);
        break;
      case "down":
        if (dy <= 2) continue;
        primary = dy;
        cross = Math.abs(dx);
        break;
      case "left":
        if (dx >= -2) continue;
        primary = -dx;
        cross = Math.abs(dy);
        break;
      case "right":
        if (dx <= 2) continue;
        primary = dx;
        cross = Math.abs(dy);
        break;
    }
    // Penaliza desvio lateral para priorizar alinhamento na direção.
    const score = primary + cross * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

export function TvRemoteNavigation() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextInput =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable === true;

      // Voltar (controle de TV envia "BrowserBack"/"GoBack"/keyCode 10009).
      if (
        key === "BrowserBack" ||
        key === "GoBack" ||
        (e as KeyboardEvent & { keyCode?: number }).keyCode === 10009
      ) {
        e.preventDefault();
        router.history.back();
        return;
      }

      const dirMap: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = dirMap[key];
      if (!dir) return;

      // Em campos de texto, deixa as setas funcionarem normalmente (cursor),
      // exceto cima/baixo que servem para sair do campo.
      if (isTextInput && (dir === "left" || dir === "right")) return;

      const active =
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
          ? document.activeElement
          : null;

      // Sem foco atual: foca o primeiro elemento disponível.
      if (!active) {
        const first = getFocusables()[0];
        if (first) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      const next = findNext(active, dir);
      if (next) {
        e.preventDefault();
        next.focus();
        next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
