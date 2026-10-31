import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useOS, fmtMin } from "@/lib/os/store";
import { approvePlan } from "@/lib/os/logic";
import { newDraft, recommendOutcomes, recommendTasks } from "@/lib/os/seed";
import type { DayType, Energy, Plan, PriorityId, Task } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Glass, Input, Label, PageHeader, PriorityIcon, Progress, Segmented, Textarea } from "@/components/os/ui";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan — Yash OS" },
      { name: "description", content: "Seven-step workflow to turn daily reality into an approved plan." },
      { property: "og:title", content: "Plan — Yash OS" },
      { property: "og:description", content: "Turn reality into an approved plan." },
    ],
  }),
  component: PlanPage,
});

const STAGES = [
  ["Daily Context", "Understand your day"],
  ["Priority Context", "3 permanent priorities"],
  ["Time Allocation", "Distribute work hours"],
  ["Daily Outcomes", "One outcome per priority"],
  ["Task Recommendations", "3 tasks per priority"],
  ["Planned Workload", "Select & organise tasks"],
  ["Final Approval", "Confirm and save plan"],
] as const;
const DAY_TYPES = ["College Day", "Non-College Day", "Weekend/Holiday", "Custom"] as const;
const ENERGY = ["Low", "Medium", "High"] as const;
const IDS: PriorityId[] = [1, 2, 3];

function PlanPage() {
  const { state, update } = useOS();
  const nav = useNavigate();
  const draft = state.draft;
  const stage = state.draftStage;

  const setDraft = (fn: (d: Plan) => Plan) => update((s) => ({ ...s, draft: s.draft ? fn(s.draft) : s.draft }));
  const setStage = (n: number) => update((s) => ({ ...s, draftStage: n }));
  const setTask = (id: string, patch: Partial<Task>) => setDraft((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  if (!draft) {
    return (
      <div>
        <PageHeader eyebrow="Pre-think" title="Plan — 7 Step Workflow" subtitle="Turn reality into an approved plan." />
        <Glass className="p-8 text-center">
          <h2 className="text-xl font-semibold">{state.plan ? "Today's plan is approved." : "No plan in progress."}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{state.plan ? "Starting a new plan will replace the approved one once you approve it." : "Start with your daily context."}</p>
          <Button variant="primary" className="mt-6" onClick={() => update((s) => ({ ...s, draft: newDraft({ hours: s.prefs.dayTypeHours["Non-College Day"] }), draftStage: 1 }))}>
            <Sparkles className="h-4 w-4" /> Start planning
          </Button>
        </Glass>
      </div>
    );
  }

  const ctx = draft.context;
  const allocated = IDS.reduce((s, i) => s + draft.allocation[i], 0);
  const sel = draft.tasks.filter((t) => t.selected);
  const selMin = sel.reduce((s, t) => s + t.duration, 0);
  const perPriorityOk = IDS.every((i) => { const n = sel.filter((t) => t.priorityId === i).length; return n >= 1 && n <= 3; });

  const canNext =
    stage === 4 ? IDS.every((i) => draft.outcomes[i].trim()) :
    stage === 5 ? draft.tasks.length > 0 :
    stage === 6 ? perPriorityOk : true;

  const next = () => {
    if (stage === 3 && !IDS.some((i) => draft.outcomes[i])) setDraft((d) => ({ ...d, outcomes: recommendOutcomes(state.priorities) }));
    if (stage === 4 && draft.tasks.length === 0) setDraft((d) => ({ ...d, tasks: recommendTasks(state.priorities) }));
    setStage(stage + 1);
  };

  const approve = () => {
    update((s) => approvePlan(s));
    toast.success("Plan approved and saved. Start a task when you're ready.");
    nav({ to: "/execute" });
  };

  return (
    <div>
      <PageHeader eyebrow="Pre-think" title="Plan — 7 Step Workflow" subtitle="Turn reality into an approved plan."
        actions={<Button variant="ghost" size="sm" onClick={() => update((s) => ({ ...s, draft: null, draftStage: 1 }))}>Discard draft</Button>} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Glass className="h-fit p-3">
          <ol className="space-y-1">
            {STAGES.map(([t, sub], i) => {
              const n = i + 1;
              return (
                <li key={t}>
                  <button disabled={n > stage} onClick={() => setStage(n)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition", n === stage ? "bg-gradient-primary text-primary-foreground glow" : n < stage ? "hover:bg-accent" : "opacity-50")}>
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", n === stage ? "border-primary-foreground/50" : "border-glass-border")}>
                      {n < stage ? <Check className="h-3.5 w-3.5" /> : n}
                    </span>
                    <span><span className="block text-sm font-medium">{t}</span><span className={cn("block text-[11px]", n === stage ? "opacity-80" : "text-muted-foreground")}>{sub}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Glass>

        <Glass className="p-6" key={stage}>
          <div className="fade-up">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{STAGES[stage - 1][0]}</h2>
              <Badge>Step {stage} of 7</Badge>
            </div>

            {stage === 1 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Date</Label><Input type="date" value={ctx.date} onChange={(e) => setDraft((d) => ({ ...d, context: { ...d.context, date: e.target.value } }))} /></div>
                </div>
                <div><Label>Day type</Label>
                  <Segmented value={ctx.dayType} options={DAY_TYPES} onChange={(v: DayType) => setDraft((d) => ({ ...d, context: { ...d.context, dayType: v, hours: state.prefs.dayTypeHours[v] } }))} />
                </div>
                <div>
                  <div className="flex justify-between"><Label>Available usable work hours</Label><span className="text-sm font-semibold">{ctx.hours} hours</span></div>
                  <input type="range" min={0} max={14} step={0.5} value={ctx.hours} aria-label="Available hours" className="w-full"
                    onChange={(e) => setDraft((d) => ({ ...d, context: { ...d.context, hours: +e.target.value } }))} />
                </div>
                <div><Label>Energy level</Label><Segmented value={ctx.energy} options={ENERGY} onChange={(v: Energy) => setDraft((d) => ({ ...d, context: { ...d.context, energy: v } }))} /></div>
                <div><Label>Fixed commitments (optional)</Label><Textarea placeholder="e.g. College, meetings, family, travel…" value={ctx.commitments} onChange={(e) => setDraft((d) => ({ ...d, context: { ...d.context, commitments: e.target.value } }))} /></div>
              </div>
            )}

            {stage === 2 && (
              <div className="space-y-3">
                {state.priorities.map((p) => (
                  <div key={p.id} className="flex gap-4 rounded-2xl bg-secondary/40 p-4">
                    <PriorityIcon id={p.id} />
                    <div className="grid flex-1 gap-1 text-sm">
                      <div className="font-semibold">#{p.id} {p.name} <Badge className="ml-2">{p.status}</Badge></div>
                      <div className="text-xs text-muted-foreground">{p.purpose}</div>
                      <div><span className="text-muted-foreground">Project:</span> {p.project} · <span className="text-muted-foreground">Milestone:</span> {p.milestone}</div>
                      <div><span className="text-muted-foreground">Main bottleneck:</span> {p.bottleneck || "—"}</div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Edit priority context in Settings → Foundation.</p>
              </div>
            )}

            {stage === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[["Available", ctx.hours], ["Allocated", allocated], ["Remaining", +(ctx.hours - allocated).toFixed(1)]].map(([l, v]) => (
                    <div key={l} className="rounded-2xl bg-secondary/40 p-4"><div className={cn("font-display text-2xl font-semibold", l === "Remaining" && +v < 0 && "text-destructive")}>{v}h</div><div className="text-xs text-muted-foreground">{l}</div></div>
                  ))}
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <PriorityIcon id={p.id} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm"><span>{p.name}</span><span className="font-semibold">{draft.allocation[p.id]}h</span></div>
                      <input type="range" min={0} max={ctx.hours} step={0.5} value={draft.allocation[p.id]} aria-label={`${p.name} hours`} className="w-full"
                        onChange={(e) => setDraft((d) => ({ ...d, allocation: { ...d.allocation, [p.id]: +e.target.value } }))} />
                    </div>
                  </div>
                ))}
                {allocated > ctx.hours && <p className="text-sm text-destructive">You've allocated more than your available hours.</p>}
              </div>
            )}

            {stage === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Proposed from your project context and milestones. Edit before approving.</p>
                  <Button size="sm" onClick={() => setDraft((d) => ({ ...d, outcomes: recommendOutcomes(state.priorities) }))}><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id} className="flex gap-4">
                    <PriorityIcon id={p.id} />
                    <div className="flex-1"><Label>#{p.id} {p.name} — {draft.allocation[p.id]}h</Label>
                      <Textarea rows={2} value={draft.outcomes[p.id]} onChange={(e) => setDraft((d) => ({ ...d, outcomes: { ...d.outcomes, [p.id]: e.target.value } }))} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stage === 5 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Three proposed tasks per priority (template suggestions — AI-ready).</p>
                  <Button size="sm" onClick={() => setDraft((d) => ({ ...d, tasks: recommendTasks(state.priorities) }))}><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><PriorityIcon id={p.id} className="h-7 w-7" />#{p.id} {p.name}</div>
                    <div className="space-y-2">{draft.tasks.filter((t) => t.priorityId === p.id).map((t) => <TaskCard key={t.id} t={t} />)}</div>
                  </div>
                ))}
              </div>
            )}

            {stage === 6 && (
              <div className="space-y-2">
                <p className="mb-3 text-sm text-muted-foreground">Choose 1–3 tasks per priority, edit them, and arrange execution order.</p>
                {draft.tasks.map((t, i) => (
                  <div key={t.id} className={cn("grid items-center gap-3 rounded-2xl border border-glass-border p-3 transition md:grid-cols-[auto_auto_1fr_90px_130px_auto]", t.selected ? "bg-secondary/50" : "opacity-50")}>
                    <input type="checkbox" checked={t.selected} aria-label={`Select ${t.title}`} onChange={(e) => setTask(t.id, { selected: e.target.checked })} className="h-4 w-4 accent-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">#{t.priorityId}</span>
                    <Input value={t.title} aria-label="Task title" onChange={(e) => setTask(t.id, { title: e.target.value })} />
                    <Input type="number" min={5} step={5} value={t.duration} aria-label="Duration minutes" onChange={(e) => setTask(t.id, { duration: +e.target.value || 0 })} />
                    <Input value={t.timeBlock} aria-label="Time block" onChange={(e) => setTask(t.id, { timeBlock: e.target.value })} />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => setDraft((d) => { const a = [...d.tasks]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...d, tasks: a }; })}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === draft.tasks.length - 1} onClick={() => setDraft((d) => { const a = [...d.tasks]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return { ...d, tasks: a }; })}><ArrowDown className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-4 pt-3 text-sm">
                  <span>Selected: <b>{sel.length}</b></span><span>Planned: <b>{fmtMin(selMin)}</b></span>
                  <span className={selMin > ctx.hours * 60 ? "text-destructive" : ""}>Available: <b>{ctx.hours}h</b></span>
                  {!perPriorityOk && <span className="text-destructive">Each priority needs 1–3 selected tasks.</span>}
                </div>
              </div>
            )}

            {stage === 7 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[["Date", ctx.date], ["Tasks", sel.length], ["Planned", fmtMin(selMin)], ["Remaining", fmtMin(Math.max(0, ctx.hours * 60 - selMin))]].map(([l, v]) => (
                    <div key={l} className="rounded-2xl bg-secondary/40 p-4"><div className="font-display text-xl font-semibold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
                  ))}
                </div>
                {state.priorities.map((p) => (
                  <div key={p.id} className="rounded-2xl bg-secondary/40 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><PriorityIcon id={p.id} className="h-7 w-7" />#{p.id} {p.name}</div>
                    <Textarea rows={2} className="mt-3" value={draft.outcomes[p.id]} aria-label="Outcome" onChange={(e) => setDraft((d) => ({ ...d, outcomes: { ...d.outcomes, [p.id]: e.target.value } }))} />
                  </div>
                ))}
                <div>
                  <Label>Execution order</Label>
                  <ol className="space-y-1 text-sm">{sel.map((t, i) => <li key={t.id} className="flex justify-between rounded-xl bg-secondary/30 px-3 py-2"><span>{i + 1}. #{t.priorityId} {t.title}</span><span className="text-muted-foreground">{t.timeBlock} · {fmtMin(t.duration)}</span></li>)}</ol>
                </div>
                <p className="text-xs text-muted-foreground">Approving saves the plan. It will not start any task automatically.</p>
              </div>
            )}

            <div className="mt-8 flex justify-between gap-3">
              <Button disabled={stage === 1} onClick={() => setStage(stage - 1)}><ArrowLeft className="h-4 w-4" />Back</Button>
              {stage < 7 ? <Button variant="primary" disabled={!canNext} onClick={next}>Next Step <ArrowRight className="h-4 w-4" /></Button>
                : <Button variant="primary" onClick={approve}><Check className="h-4 w-4" />Approve plan</Button>}
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

function TaskCard({ t }: { t: Task }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-glass-border bg-secondary/40 p-3">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
        <div><div className="text-sm font-medium">{t.title}</div><div className="text-xs text-muted-foreground">{fmtMin(t.duration)} · {t.timeBlock} · Output: {t.expectedOutput}</div></div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 grid gap-2 text-xs animate-in fade-in slide-in-from-top-1 sm:grid-cols-2">
          <div><b>Success criteria:</b> {t.successCriteria}</div><div><b>What:</b> {t.what}</div>
          <div><b>How:</b> {t.how}</div><div><b>Where:</b> {t.where}</div>
        </div>
      )}
      <Progress value={0} className="hidden" />
    </div>
  );
}
