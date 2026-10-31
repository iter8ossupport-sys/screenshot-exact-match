import { useState } from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import { useOS } from "@/lib/os/store";
import type { Metric, PriorityId } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { Badge, Button, Input, Label, Modal, PriorityIcon, Progress, Textarea, priorityTone } from "./ui";

function MetricsEditor({ metrics, onChange }: { metrics: Metric[]; onChange: (m: Metric[]) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {metrics.map((m, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-2">
          <Input aria-label="Metric" value={m.label} onChange={(e) => onChange(metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <Input aria-label="Target" placeholder="Target" value={m.target} onChange={(e) => onChange(metrics.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} />
          <Input aria-label="Current" placeholder="Current" value={m.current} onChange={(e) => onChange(metrics.map((x, j) => (j === i ? { ...x, current: e.target.value } : x)))} />
        </div>
      ))}
    </div>
  );
}

function Node({ title, sub, children, defaultOpen }: { title: string; sub: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="relative pl-8">
      <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background glow" />
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 text-left">
        <div>
          <div className="font-display font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{sub}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-4 animate-in fade-in slide-in-from-top-2">{children}</div>}
    </div>
  );
}

export function GoalsPanel() {
  const { state, update, goalsOpen, setGoalsOpen } = useOS();
  const g = state.goals;
  const setG = (fn: (x: typeof g) => typeof g) => update((s) => ({ ...s, goals: fn(s.goals) }));

  return (
    <Modal open={goalsOpen} onClose={() => setGoalsOpen(false)} title="Goals & Milestones" wide>
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">Your direction → next milestone → each priority's contribution. Proposed values stay unapproved until you confirm them.</p>
      <div className="relative space-y-8 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
        <Node title="North Star" sub={state.foundation.northStar} defaultOpen>
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-4 text-sm">
            <Star className="mt-0.5 h-4 w-4 text-cyan" />
            <div>{state.foundation.northStarLong}<div className="mt-1 text-xs text-muted-foreground">$1T represents the long-term company-value ambition.</div></div>
          </div>
        </Node>

        <Node title={`Level A — ${g.periodMonths}-Month Goal`} sub={g.levelA.text}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="mb-0">Goal period: {g.periodMonths} months</Label>
              <input type="range" min={1} max={12} value={g.periodMonths} onChange={(e) => setG((x) => ({ ...x, periodMonths: +e.target.value }))} className="w-48" aria-label="Goal period" />
              {g.levelA.approved ? <Badge className="text-success">Approved</Badge> : <Badge className="text-warning">Proposed</Badge>}
            </div>
            <Textarea value={g.levelA.text} onChange={(e) => setG((x) => ({ ...x, levelA: { ...x.levelA, text: e.target.value, approved: false } }))} />
            <MetricsEditor metrics={g.levelA.metrics} onChange={(m) => setG((x) => ({ ...x, levelA: { ...x.levelA, metrics: m, approved: false } }))} />
            <Button variant={g.levelA.approved ? "success" : "primary"} size="sm" onClick={() => setG((x) => ({ ...x, levelA: { ...x.levelA, approved: !x.levelA.approved } }))}>
              <Check className="h-3.5 w-3.5" />{g.levelA.approved ? "Approved — click to reopen" : "Approve Level A"}
            </Button>
          </div>
        </Node>

        <Node title={`Level B — Nearest Milestone (${g.levelB.days} days)`} sub={g.levelB.text}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="mb-0">Window: {g.levelB.days} days</Label>
              <input type="range" min={14} max={90} value={g.levelB.days} onChange={(e) => setG((x) => ({ ...x, levelB: { ...x.levelB, days: +e.target.value } }))} className="w-48" aria-label="Milestone window" />
              {g.levelB.approved ? <Badge className="text-success">Approved</Badge> : <Badge className="text-warning">Proposed</Badge>}
            </div>
            <Textarea value={g.levelB.text} onChange={(e) => setG((x) => ({ ...x, levelB: { ...x.levelB, text: e.target.value, approved: false } }))} />
            <MetricsEditor metrics={g.levelB.metrics} onChange={(m) => setG((x) => ({ ...x, levelB: { ...x.levelB, metrics: m, approved: false } }))} />
            <Button variant={g.levelB.approved ? "success" : "primary"} size="sm" onClick={() => setG((x) => ({ ...x, levelB: { ...x.levelB, approved: !x.levelB.approved } }))}>
              <Check className="h-3.5 w-3.5" />{g.levelB.approved ? "Approved — click to reopen" : "Approve Level B"}
            </Button>
          </div>
        </Node>

        <Node title="Level C — Priority Milestones" sub="One current milestone per permanent priority">
          <div className="grid gap-3 md:grid-cols-3">
            {state.priorities.map((p) => {
              const c = g.levelC[p.id as PriorityId];
              const setC = (patch: Partial<typeof c>) => setG((x) => ({ ...x, levelC: { ...x.levelC, [p.id]: { ...c, ...patch } } }));
              return (
                <div key={p.id} className="space-y-3 rounded-2xl bg-secondary/40 p-4">
                  <div className="flex items-center gap-3"><PriorityIcon id={p.id} /><div><div className="text-sm font-semibold">#{p.id} {p.name}</div><div className="text-xs text-muted-foreground">{p.project}</div></div></div>
                  <div><Label>Milestone target</Label><Textarea rows={2} value={c.target} onChange={(e) => setC({ target: e.target.value })} /></div>
                  <div><Label>Deadline</Label><Input type="date" value={c.deadline} onChange={(e) => setC({ deadline: e.target.value })} /></div>
                  <div><Label>Current evidence</Label><Input value={c.evidence} placeholder="What's been proven?" onChange={(e) => setC({ evidence: e.target.value })} /></div>
                  <div><Label>Progress: {c.progress}% (self-assessed)</Label><input type="range" min={0} max={100} step={5} value={c.progress} onChange={(e) => setC({ progress: +e.target.value })} className="w-full" aria-label="Progress" /><Progress value={c.progress} tone={priorityTone(p.id)} /></div>
                  <div className="text-xs text-muted-foreground">Bottleneck: {p.bottleneck || "—"}</div>
                </div>
              );
            })}
          </div>
        </Node>
      </div>
    </Modal>
  );
}
