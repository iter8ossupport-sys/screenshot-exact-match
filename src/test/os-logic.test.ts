import { describe, expect, it } from "vitest";
import { initialState, newDraft, recommendTasks } from "@/lib/os/seed";
import { approvePlan, emergencyPause, finishTask, pauseTask, startTask, elapsed } from "@/lib/os/logic";

const approved = () => approvePlan({ ...initialState, draft: { ...newDraft(), tasks: recommendTasks(initialState.priorities) } });

describe("execution rules", () => {
  it("approval saves the plan without starting a task", () => {
    const s = approved();
    expect(s.plan).not.toBeNull();
    expect(s.activeTaskId).toBeNull();
    expect(s.plan!.tasks.every((t) => t.status === "pending")).toBe(true);
  });
  it("pause/resume accumulates time", () => {
    let s = approved(); const id = s.plan!.tasks[0].id;
    s = startTask(s, id, 0); s = pauseTask(s, id, 60000); s = startTask(s, id, 100000);
    expect(elapsed(s.plan!.tasks[0], 130000)).toBe(90000);
  });
  it("emergency switch preserves interrupted task time", () => {
    let s = approved(); const id = s.plan!.tasks[0].id;
    s = startTask(s, id, 0); s = emergencyPause(s, 30000);
    expect(s.interruptedTaskId).toBe(id);
    expect(s.plan!.tasks[0]).toMatchObject({ status: "paused", elapsedMs: 30000 });
  });
  it("finishing records output separately from outcome", () => {
    let s = approved(); const id = s.plan!.tasks[0].id;
    s = finishTask(s, id, { Note: "done" }, false);
    expect(s.plan!.tasks[0]).toMatchObject({ status: "done", outcomeAchieved: false, output: { Note: "done" } });
  });
});
