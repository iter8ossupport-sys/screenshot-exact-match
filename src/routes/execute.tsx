import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Pause, Play, Power, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import { useOS, useNow, fmtMin, fmtTime } from "@/lib/os/store";
import { buildDayRecord, closeDay, elapsed, emergencyPause, finishTask, moveTask, pauseTask, selectedTasks, startTask } from "@/lib/os/logic";
import type { Task } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Glass, Input, Label, Modal, PageHeader, PriorityIcon, Progress, Textarea, priorityTone } from "@/components/os/ui";

type Search = { emergency?: number; closeout?: number };
export const Route = createFileRoute("/execute")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    emergency: s.emergency ? 1 : undefined,
    closeout: s.closeout ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Execute — Yash OS" },
      { name: "description", content: "Focused workspace to execute the approved plan and record outputs." },
      { property: "og:title", content: "Execute — Yash OS" },
      { property: "og:description", content: "Minimal, clear and action-oriented execution." },
    ],
  }),
  component: ExecutePage,
});

function ExecutePage() {
  const { state, update, setGoalsOpen } = useOS();
  const search = Route.useSearch();
  const nav = useNavigate();
  const plan = state.plan;
  const sel = selectedTasks(plan);
  const active = sel.find((t) => t.id === state.activeTaskId);
  const now = useNow(!!active);
  const [finishing, setFinishing] = useState<Task | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [closeout, setCloseout] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [ctxOpen, setCtxOpen] = useState(false);

  useEffect(() => {
    if (!plan) return;
    if (search.emergency) { triggerEmergency(); nav({ to: "/execute", search: {}, replace: true }); }
    if (search.closeout) { setCloseout(true); nav({ to: "/execute", search: {}, replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.emergency, search.closeout, !!plan]);

  function triggerEmergency() {
    update((s) => emergencyPause(s));
    setEmergency(true);
  }

  if (!plan) {
    return (
      <div>
        <PageHeader eyebrow="Act" title="Execute — Focused Workspace" subtitle="Minimal, clear and action-oriented." />
        <Glass className="p-10 text-center">
          <h2 className="text-xl font-semibold">No approved plan yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Execution loads the plan you approve in the Plan workflow.</p>
          <Link to="/plan"><Button variant="primary" className="mt-6">Plan today</Button></Link>
        </Glass>
      </div>
    );
  }

  const current = active ?? sel.find((t) => t.id === state.interruptedTaskId && t.status !== "done") ?? sel.find((t) => t.status === "paused") ?? sel.find((t) => t.status === "pending");
  const interrupted = sel.find((t) => t.id === state.interruptedTaskId && t.status !== "done");
  const done = sel.filter((t) => t.status === "done").length;
  const g = state.goals;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Act" title="Execute — Focused Workspace" subtitle={`${plan.context.date} · ${done}/${sel.length} tasks done · ${fmtMin(sel.reduce((s, t) => s + t.duration, 0))} planned`}
        actions={<>
          <Button variant="danger" onClick={triggerEmergency}><Zap className="h-4 w-4" />Emergency Switch</Button>
          <Button onClick={() => setCloseout(true)}><Power className="h-4 w-4" />Daily closeout</Button>
        </>} />

      <Glass className="p-4">
        <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setCtxOpen(!ctxOpen)} aria-expanded={ctxOpen}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span><span className="text-muted-foreground">Level A:</span> {g.periodMonths}-month goal</span>
            <span><span className="text-muted-foreground">Level B:</span> Nearest milestone ({g.levelB.days}d)</span>
            <span><span className="text-muted-foreground">Level C:</span> 3 priority milestones</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", ctxOpen && "rotate-180")} />
        </button>
        {ctxOpen && (
          <div className="mt-4 grid gap-3 animate-in fade-in md:grid-cols-3">
            <div className="rounded-2xl bg-secondary/40 p-3 text-xs">{g.levelA.text}</div>
            <div className="rounded-2xl bg-secondary/40 p-3 text-xs">{g.levelB.text}</div>
            <div className="space-y-1 rounded-2xl bg-secondary/40 p-3 text-xs">{state.priorities.map((p) => <div key={p.id}>#{p.id} {g.levelC[p.id].target}</div>)}</div>
            <Button size="sm" className="md:col-span-3 md:w-fit" onClick={() => setGoalsOpen(true)}><Target className="h-3.5 w-3.5" />View Goals & Milestones</Button>
          </div>
        )}
      </Glass>

      {current && (
        <Glass strong className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>#{current.priorityId} {state.priorities[current.priorityId - 1].name}</Badge>
                <Badge>{state.priorities[current.priorityId - 1].project}</Badge>
                <Badge className={current.status === "active" ? "text-success" : ""}>{current.status === "active" ? "In progress" : current.status === "paused" ? "Paused" : "Up next"}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold md:text-3xl">{current.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Outcome: {plan.outcomes[current.priorityId]}</p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><Label>Expected output</Label>{current.expectedOutput}</div>
                <div><Label>Success criteria</Label>{current.successCriteria}</div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              {state.prefs.timer && (
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 border-primary/60 glow">
                  <div className="font-display text-3xl font-semibold tabular-nums">{fmtTime(elapsed(current, now))}</div>
                  <div className="text-xs text-muted-foreground">of {fmtMin(current.duration)}</div>
                </div>
              )}
              <div className="flex gap-2">
                {current.status === "active"
                  ? <Button onClick={() => update((s) => pauseTask(s, current.id))}><Pause className="h-4 w-4" />Pause</Button>
                  : <Button variant="primary" onClick={() => update((s) => ({ ...startTask(s, current.id), interruptedTaskId: s.interruptedTaskId === current.id ? null : s.interruptedTaskId }))}><Play className="h-4 w-4" />{current.status === "paused" ? "Resume" : "Start"}</Button>}
                <Button variant="success" onClick={() => setFinishing(current)}><Check className="h-4 w-4" />Finish</Button>
              </div>
            </div>
          </div>
        </Glass>
      )}

      {!current && (
        <Glass className="p-8 text-center">
          <h2 className="text-xl font-semibold">All approved tasks are finished.</h2>
          <Button variant="primary" className="mt-4" onClick={() => setCloseout(true)}>Run daily closeout</Button>
        </Glass>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {state.priorities.map((p) => {
          const ts = sel.filter((t) => t.priorityId === p.id);
          const d = ts.filter((t) => t.status === "done").length;
          return (
            <Glass key={p.id} className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <PriorityIcon id={p.id} className="h-8 w-8" />
                <div className="flex-1"><div className="text-sm font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.project}</div></div>
                <span className="text-xs text-muted-foreground">{d}/{ts.length}</span>
              </div>
              <Progress value={ts.length ? (d / ts.length) * 100 : 0} tone={priorityTone(p.id)} className="mb-3" />
              <div className="space-y-2">
                {ts.map((t) => (
                  <div key={t.id} className={cn("rounded-xl border border-glass-border p-3 transition", t.id === current?.id ? "border-primary/50 bg-primary/10" : "bg-secondary/30")}>
                    <div className="flex items-start gap-2">
                      <button className="flex-1 text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
                        <div className={cn("text-sm", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</div>
                        <div className="text-[11px] text-muted-foreground">{t.timeBlock} · plan {fmtMin(t.duration)} · actual {fmtMin(Math.round(elapsed(t, now) / 60000))} · {t.status}</div>
                      </button>
                      <div className="flex">
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move up" onClick={() => update((s) => moveTask(s, t.id, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move down" onClick={() => update((s) => moveTask(s, t.id, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {open === t.id && (
                      <div className="mt-3 space-y-1 text-xs animate-in fade-in">
                        <div><b>What:</b> {t.what}</div><div><b>How:</b> {t.how}</div><div><b>Where:</b> {t.where}</div>
                        <div><b>Expected:</b> {t.expectedOutput}</div><div><b>Success:</b> {t.successCriteria}</div>
                        {t.output && <div className="text-success"><b>Recorded:</b> {Object.values(t.output).filter(Boolean).join(" · ") || "Completed"}</div>}
                        {t.status !== "done" && (
                          <div className="flex gap-2 pt-2">
                            {t.status === "active" ? <Button size="sm" onClick={() => update((s) => pauseTask(s, t.id))}><Pause className="h-3 w-3" />Pause</Button>
                              : <Button size="sm" variant="primary" onClick={() => update((s) => startTask(s, t.id))}><Play className="h-3 w-3" />{t.status === "paused" ? "Resume" : "Start"}</Button>}
                            <Button size="sm" variant="success" onClick={() => setFinishing(t)}><Check className="h-3 w-3" />Finish</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Glass>
          );
        })}
      </div>

      <FinishDialog task={finishing} onClose={() => setFinishing(null)} onSave={(out, ach) => { update((s) => finishTask(s, finishing!.id, out, ach)); setFinishing(null); toast.success("Output recorded"); }} />

      <Modal open={emergency} onClose={() => setEmergency(false)} title="Emergency Switch">
        <p className="text-sm text-muted-foreground">{interrupted ? <>Paused <b className="text-foreground">{interrupted.title}</b> at {fmtTime(interrupted.elapsedMs)}. Its time and output are preserved.</> : "No task was running."}</p>
        <div className="mt-4 space-y-2">
          <Label>Remaining approved workload — choose what to switch to</Label>
          {sel.filter((t) => t.status !== "done").map((t) => (
            <button key={t.id} onClick={() => { update((s) => startTask(s, t.id)); setEmergency(false); toast(`Switched to: ${t.title}`); }}
              className="flex w-full items-center justify-between rounded-xl border border-glass-border bg-secondary/40 p-3 text-left text-sm transition hover:bg-accent">
              <span>#{t.priorityId} {t.title}{t.id === interrupted?.id && <Badge className="ml-2">Interrupted</Badge>}</span>
              <span className="text-xs text-muted-foreground">{fmtMin(t.duration)}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end"><Button onClick={() => setEmergency(false)}>Handle outside the plan</Button></div>
      </Modal>

      <CloseoutDialog open={closeout} onClose={() => setCloseout(false)} />
    </div>
  );
}

function FinishDialog({ task, onClose, onSave }: { task: Task | null; onClose: () => void; onSave: (o: Record<string, string>, achieved: boolean) => void }) {
  const [o, setO] = useState<Record<string, string>>({});
  const [ach, setAch] = useState(false);
  useEffect(() => { setO({}); setAch(false); }, [task?.id]);
  if (!task) return null;
  const fields = task.kind === "validation" ? ["Actual result", "Evidence", "User feedback", "Metrics", "Blockers", "Learning"] : task.kind === "measurable" ? ["Actual output", "Metric / number", "Notes"] : [];
  return (
    <Modal open onClose={onClose} title={`Finish: ${task.title}`}>
      {fields.length === 0 && <p className="text-sm text-muted-foreground">Simple task — one-click completion. Add a note if you like.</p>}
      <div className="space-y-3">
        {fields.map((f) => <div key={f}><Label>{f}</Label><Input value={o[f] ?? ""} onChange={(e) => setO({ ...o, [f]: e.target.value })} /></div>)}
        <div><Label>Free-text note</Label><Textarea value={o.Note ?? ""} onChange={(e) => setO({ ...o, Note: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ach} onChange={(e) => setAch(e.target.checked)} className="accent-primary" />This also achieved the priority's daily outcome</label>
        <p className="text-xs text-muted-foreground">Task completion and outcome achievement are tracked separately.</p>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave(o, ach)}><Check className="h-4 w-4" />Complete task</Button></div>
    </Modal>
  );
}

function CloseoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, update } = useOS();
  const [learning, setLearning] = useState("");
  const nav = useNavigate();
  if (!open || !state.plan) return null;
  const rec = buildDayRecord(state.plan, learning);
  return (
    <Modal open onClose={onClose} title="Daily Closeout" wide>
      <div className="grid gap-3 md:grid-cols-3">
        {state.priorities.map((p) => (
          <div key={p.id} className="rounded-2xl bg-secondary/40 p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold"><PriorityIcon id={p.id} className="h-7 w-7" />{p.name}</div>
            <div>Planned {fmtMin(rec.plannedMin[p.id])} · Actual {fmtMin(rec.actualMin[p.id])}</div>
            <div className={rec.outcomesAchieved.includes(p.id) ? "text-success" : "text-muted-foreground"}>Outcome {rec.outcomesAchieved.includes(p.id) ? "achieved" : "not marked achieved"}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><Label>Outputs ({rec.outputs.length})</Label><ul className="space-y-1 text-sm">{rec.outputs.length ? rec.outputs.map((o, i) => <li key={i}>#{o.priorityId} {o.title}: <span className="text-muted-foreground">{o.text}</span></li>) : <li className="text-muted-foreground">No outputs recorded.</li>}</ul></div>
        <div><Label>Unfinished ({rec.unfinished.length})</Label><ul className="space-y-1 text-sm text-muted-foreground">{rec.unfinished.map((u) => <li key={u}>{u}</li>)}</ul></div>
      </div>
      <div className="mt-4"><Label>Most important learning today</Label><Textarea value={learning} onChange={(e) => setLearning(e.target.value)} /></div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Not yet</Button>
        <Button variant="primary" onClick={() => { update((s) => closeDay(s, learning)); onClose(); toast.success("Done for today. Saved to Reviews."); nav({ to: "/reviews" }); }}><Check className="h-4 w-4" />Done for Today</Button>
      </div>
    </Modal>
  );
}
