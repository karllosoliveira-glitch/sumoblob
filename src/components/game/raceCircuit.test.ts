import { describe, it, expect } from "vitest";
import { advanceRace, emptyRaceProgress, getCircuit, raceCanEnd, compareRacers, RACE_LAPS } from "./raceCircuit";

describe("corridas de 2 a 3 minutos", () => {
  it("não encerra antes de 2 minutos mesmo com chegada", () => {
    expect(raceCanEnd(119_999, true)).toBe(false);
    expect(raceCanEnd(120_000, true)).toBe(true);
  });
  it("encerra aos 3 minutos mesmo sem chegada", () => {
    expect(raceCanEnd(179_999, false)).toBe(false);
    expect(raceCanEnd(180_000, false)).toBe(true);
  });
  it("todos os mapas são circuitos maiores que 600 metros", () => {
    for (const mode of ["corrida", "carros", "motos", "kart"] as const) expect(getCircuit(mode).length).toBeGreaterThan(600);
  });
  it("exige 3 voltas e portais em ordem", () => {
    let s = emptyRaceProgress();
    for (let lap = 0; lap < 3; lap++) {
      for (let i = 1; i <= 100; i++) s = advanceRace(s, (i % 100) / 100, lap * 1000 + i);
      expect(s.lap).toBe(lap + 1);
      expect(Boolean(s.finishedAt)).toBe(lap === 2);
    }
    expect(s.progress).toBe(RACE_LAPS);
  });
  it("não conta cruzar a largada de ré ou pular portais", () => {
    let s = advanceRace(emptyRaceProgress(), .99, 1);
    s = advanceRace(s, .01, 2);
    expect(s.lap).toBe(0);
    s = advanceRace(s, .7, 3);
    expect(s.cp).toBe(0);
  });
  it("classifica por percurso, não pela coordenada x", () => {
    expect(compareRacers({ id: "a", progress: 2.2 }, { id: "b", progress: 1.9 })).toBeLessThan(0);
    expect(compareRacers({ id: "a", progress: 3, finishedAt: 100 }, { id: "b", progress: 3, finishedAt: 200 })).toBeLessThan(0);
  });
});