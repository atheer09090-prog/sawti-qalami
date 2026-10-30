import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ token: "", get: vi.fn(), save: vi.fn() }));
vi.mock("./api", () => ({ getToken: () => api.token, clearToken: () => { api.token = ""; }, getMyStudentRecord: api.get, saveMyStudentRecord: api.save }));
const key = "sawti_qalami_v2_state";
function token(sub: string) { return `x.${btoa(JSON.stringify({ sub }))}.x`; }
let store: typeof import("./store");
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  const data = new Map<string,string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string,v: string) => data.set(k,v), removeItem: (k: string) => data.delete(k) });
  api.token = token("student-a"); api.get.mockReset(); api.save.mockReset(); api.save.mockResolvedValue(true);
  store = await import("./store");

});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("student progress isolation and recovery", () => {
  it("never saves a previous student's queued progress with a new student's token", async () => {
    store.setState(prev => ({ ...prev, name: "A", points: 75 }));
    store.logout(); api.token = token("student-b");
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.save).not.toHaveBeenCalled();
  });
  it("does not silently replace failed server restoration with zero progress", async () => {
    localStorage.setItem(key, JSON.stringify({ name: "A", points: 80 }));
    api.get.mockRejectedValue(new Error("offline"));
    await expect(store.loadMyStudentFromServer("B", "السادس", "boy1")).rejects.toThrow("offline");
    expect(store.getState().points).toBe(80);
  });
  it("restores all nested defaults for records saved before new counters existed", () => {
    localStorage.setItem(key, JSON.stringify({ selfLearning: { completedActivities: 2 } }));
    expect(store.getState().selfLearning.helpRequests).toBe(0);
    expect(store.getState().selfLearning.completedActivities).toBe(2);
  });
  it("retains an identified owner's cached progress while offline", async () => {
    api.get.mockResolvedValue({ name: "A", points: 45 });
    await store.loadMyStudentFromServer("A", "السادس", "boy1");
    api.get.mockRejectedValue(new Error("offline"));
    expect((await store.loadMyStudentFromServer("A", "السادس", "boy1")).points).toBe(45);
  });
  it("ignores a record response if the account changed during loading", async () => {
    let resolve!: (record: object) => void;
    api.get.mockReturnValue(new Promise(r => { resolve = r; }));
    const pending = store.loadMyStudentFromServer("A", "السادس", "boy1");
    api.token = token("student-b"); resolve({ points: 99 });
    await expect(pending).rejects.toThrow();
    expect(store.getState().points).toBe(0);
  });
  it("keeps unsynced progress instead of replacing it with an older server record", async () => {
    api.get.mockResolvedValue({ name: "A", points: 5 });
    await store.loadMyStudentFromServer("A", "السادس", "boy1");
    api.save.mockResolvedValue(false);
    store.setState(prev => ({ ...prev, points: 80 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect((await store.loadMyStudentFromServer("A", "السادس", "boy1")).points).toBe(80);
  });

  it("does not start restoring progress after its request has been cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(store.loadMyStudentFromServer("A", "السادس", "boy1", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(api.get).not.toHaveBeenCalled();
  });
  it("does not overwrite cached progress when a restoration is cancelled in flight", async () => {
    localStorage.setItem(key, JSON.stringify({ name: "A", points: 80 }));
    let resolveRecord: (value: object) => void = () => {};
    api.get.mockImplementation(() => new Promise(resolve => { resolveRecord = resolve; }));
    const controller = new AbortController();
    const pending = store.loadMyStudentFromServer("A", "السادس", "boy1", controller.signal);
    controller.abort();
    resolveRecord({ points: 5 });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(store.getState().points).toBe(80);
  });
  it("discards a prefetched record if newer local progress must be saved first", async () => {
    api.get.mockResolvedValue({ points: 5 });
    await store.loadMyStudentFromServer("A", "السادس", "boy1");
    const oldRecord = Promise.resolve({ points: 5 });
    store.setState(prev => ({ ...prev, points: 80 }));
    api.get.mockResolvedValue({ points: 80 });
    const restored = await store.loadMyStudentFromServer("A", "السادس", "boy1", undefined, oldRecord);
    expect(restored.points).toBe(80);
    expect(api.save).toHaveBeenCalled();
  });

});
