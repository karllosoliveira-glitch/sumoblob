import { useEffect, useRef } from "react";

export function useKeyboard() {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const touchKey = (e: Event) => {
      const { code, pressed } = (e as CustomEvent<{ code: string; pressed: boolean }>).detail || {};
      if (!code) return;
      if (pressed) keys.current.add(code); else keys.current.delete(code);
    };
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("sumo:key", touchKey as EventListener);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("sumo:key", touchKey as EventListener);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return keys;
}
