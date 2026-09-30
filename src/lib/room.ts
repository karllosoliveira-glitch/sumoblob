export function readRoomFromUrl(): string | null {
  const url = new URL(window.location.href);
  const existing = url.searchParams.get("room");
  return existing ? existing.toUpperCase() : null;
}

export function randomRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function setRoomInUrl(code: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  window.history.replaceState(null, "", url);
}

export function shareLink(code: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}
