import type { DayRecord, OSState, Plan, PriorityId, Task } from "./types";

export const elapsed = (t: Task, now = Date.now()) =>
  t.elapsedMs + (t.status === "active" && t.startedAt ? now - t.startedAt : 0);

export const selectedTasks = (p: Plan | null) => (p ? p.tasks.filter((t) => t.selected) : []);

export const plannedMinutes = (p: Plan | null) =>
  selectedTasks(p).reduce((s, t) => s + t.duration, 0);

const mapTask = (s: OSState, id: string, fn: (t: Task) => Task): OSState =>
  s.plan ? { ...s, plan: { ...s.plan, tasks: s.plan.tasks.map((t) => (t.id === id ? fn(t) : t)) } } : s;

const pauseT = (t: Task, now: number): Task =>
  t.status === "active" ? { ...t, status: "paused", elapsedMs: elapsed(t, now), startedAt: undefined } : t;

/** Approving saves the plan but never starts a task. */
export function approvePlan(s: OSState, now = new Date()): OSState {
  if (!s.draft) return s;
  const plan: Plan = {
    ...s.draft,
    tasks: s.draft.tasks.map((t) => ({ ...t, status: "pending", elapsedMs: 0, startedAt: undefined })),
    approvedAt: now.toISOString(),
  };
  return { ...s, plan, draft: null, draftStage: 1, activeTaskId: null, interruptedTaskId: null };
}

/** Start/resume a task; any other running task is paused (only one active at a time). */
export function startTask(s: OSState, id: string, now = Date.now()): OSState {
  if (!s.plan) return s;
  const tasks = s.plan.tasks.map((t) =>
    t.id === id
      ? t.status === "done" ? t : { ...t, status: "active" as const, startedAt: now }
      : pauseT(t, now),
  );
  return { ...s, plan: { ...s.plan, tasks }, activeTaskId: id };
}

export function pauseTask(s: OSState, id: string, now = Date.now()): OSState {
  return mapTask(s, id, (t) => pauseT(t, now));
}

export function finishTask(s: OSState, id: string, output: Record<string, string> = {}, outcomeAchieved = false, now = Date.now()): OSState {
  const next = mapTask(s, id, (t) => ({
    ...t,
    status: "done",
    elapsedMs: elapsed(t, now),
    startedAt: undefined,
    output,
    outcomeAchieved,
  }));
  return { ...next, activeTaskId: next.activeTaskId === id ? null : next.activeTaskId };
}

/** Emergency switch: pause current task, preserving its time/output, and remember it. */
export function emergencyPause(s: OSState, now = Date.now()): OSState {
  if (!s.activeTaskId) return s;
  const next = pauseTask(s, s.activeTaskId, now);
  return { ...next, interruptedTaskId: s.activeTaskId, activeTaskId: null };
}

export function moveTask(s: OSState, id: string, dir: -1 | 1): OSState {
  if (!s.plan) return s;
  const tasks = [...s.plan.tasks];
  const sel = tasks.filter((t) => t.selected);
  const i = sel.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sel.length) return s;
  const a = tasks.indexOf(sel[i]);
  const b = tasks.indexOf(sel[j]);
  [tasks[a], tasks[b]] = [tasks[b], tasks[a]];
  return { ...s, plan: { ...s.plan, tasks } };
}

export function buildDayRecord(p: Plan, learning: string, now = Date.now()): DayRecord {
  const sel = selectedTasks(p);
  const z = (): Record<PriorityId, number> => ({ 1: 0, 2: 0, 3: 0 });
  const plannedMin = z();
  const actualMin = z();
  sel.forEach((t) => {
    plannedMin[t.priorityId] += t.duration;
    actualMin[t.priorityId] += Math.round(elapsed(t, now) / 60000);
  });
  const done = sel.filter((t) => t.status === "done");
  return {
    date: p.context.date,
    plannedMin,
    actualMin,
    tasksDone: done.length,
    tasksPlanned: sel.length,
    outputs: done
      .filter((t) => t.output && Object.values(t.output).some(Boolean))
      .map((t) => ({ title: t.title, priorityId: t.priorityId, text: Object.values(t.output!).filter(Boolean).join(" · ") })),
    outcomesAchieved: ([1, 2, 3] as PriorityId[]).filter((id) => done.some((t) => t.priorityId === id && t.outcomeAchieved)),
    unfinished: sel.filter((t) => t.status !== "done").map((t) => t.title),
    learning,
  };
}

export function closeDay(s: OSState, learning: string, now = Date.now()): OSState {
  if (!s.plan) return s;
  const rec = buildDayRecord(s.plan, learning, now);
  return {
    ...s,
    history: [...s.history.filter((h) => h.date !== rec.date), rec],
    plan: null,
    activeTaskId: null,
    interruptedTaskId: null,
  };
}
