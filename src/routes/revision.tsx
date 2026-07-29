import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, GraduationCap, Network, ListChecks, FileText, Target, Clock, Layers, Gauge, Star } from "lucide-react";
import { loadStudyMaterial } from "../lib/study-store";
import type { StudyMaterial, HierarchyNode, Concept } from "../lib/generate.functions";

export const Route = createFileRoute("/revision")({
  head: () => ({
    meta: [
      { title: "Revision — Quizenix" },
      { name: "description", content: "One-page summary, cheat sheet, mind map and exam & interview questions." },
      { property: "og:title", content: "Revision — Quizenix" },
      { property: "og:description", content: "One-page summary, cheat sheet, mind map and exam & interview questions." },
    ],
  }),
  component: RevisionPage,
});

function RevisionPage() {
  const [m, setM] = useState<StudyMaterial | null>(null);
  useEffect(() => {
    setM(loadStudyMaterial());
  }, []);

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="text-lg font-semibold">
            Revision pack
          </h1>
        </header>

        {!m ? (
          <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No study kit yet.</p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Generate one
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {m.title && (
              <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">
                {m.title}
              </h2>
            )}

            {m.analysis && (
              <Section icon={<Gauge className="h-4 w-4" />} title="AI analysis">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat icon={<Clock className="h-4 w-4" />} label="Est. study time" value={m.analysis.totalStudyMinutes ? `${m.analysis.totalStudyMinutes} min` : "—"} />
                  <Stat icon={<Gauge className="h-4 w-4" />} label="Overall difficulty" value={m.analysis.overallDifficulty ?? "—"} />
                  <Stat icon={<Layers className="h-4 w-4" />} label="Concepts detected" value={String(m.concepts?.length ?? m.analysis.knowledgeGraph?.nodes?.length ?? 0)} />
                </div>
                {m.analysis.overview && (
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">{m.analysis.overview}</p>
                )}
                {m.analysis.learningObjectives?.length ? (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Target className="h-3.5 w-3.5" /> Learning objectives
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {m.analysis.learningObjectives.map((o, i) => (
                        <li key={i} className="flex gap-2"><span className="text-primary">✓</span><span>{o}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {m.analysis.hierarchy && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" /> Concept hierarchy
                    </div>
                    <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                      <Hierarchy node={m.analysis.hierarchy} />
                    </div>
                  </div>
                )}
                {m.analysis.knowledgeGraph?.edges?.length ? (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Network className="h-3.5 w-3.5" /> Knowledge graph (prerequisites & links)
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {m.analysis.knowledgeGraph.edges.slice(0, 30).map((e, i) => (
                        <li key={i} className="font-mono">
                          <span className="text-foreground">{e.from}</span>
                          <span className="mx-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase text-primary">{e.relation ?? "→"}</span>
                          <span className="text-foreground">{e.to}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>
            )}

            {m.summary && (
              <Section icon={<FileText className="h-4 w-4" />} title="One-page summary">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{m.summary}</p>
              </Section>
            )}

            {m.cheatSheet?.length ? (
              <Section icon={<ListChecks className="h-4 w-4" />} title="Cheat sheet">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {m.cheatSheet.map((c, i) => (
                    <li key={i} className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                      • {c}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {m.formulaSheet?.length ? (
              <Section icon={<ListChecks className="h-4 w-4" />} title="Formulas & rules">
                <ul className="space-y-1.5">
                  {m.formulaSheet.map((f, i) => (
                    <li key={i} className="rounded-lg bg-background/40 px-3 py-2 font-mono text-sm">
                      {f}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {m.mindMap && (
              <Section icon={<Network className="h-4 w-4" />} title="Mind map">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <div className="mb-3 font-semibold text-primary">{m.mindMap.root}</div>
                  <ul className="space-y-2">
                    {m.mindMap.branches?.map((b, i) => (
                      <li key={i}>
                        <span className="font-medium">↳ {b.name}</span>
                        {b.children?.length ? (
                          <ul className="ml-6 mt-1 list-disc text-muted-foreground">
                            {b.children.map((c, j) => (
                              <li key={j}>{c}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            )}

            {m.concepts?.length ? (
              <Section icon={<BookOpen className="h-4 w-4" />} title="Core concepts">
                <div className="grid gap-2 sm:grid-cols-2">
                  {m.concepts.map((c, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background/40 p-3">
                      <div className="font-semibold">{c.name}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {m.examQuestions?.length ? (
              <Section icon={<GraduationCap className="h-4 w-4" />} title="Exam mode">
                <div className="space-y-3">
                  {m.examQuestions.map((q, i) => (
                    <details key={i} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                      <summary className="cursor-pointer">
                        <span className="mr-2 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                          {q.marks}m
                        </span>
                        {q.question}
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{q.answer}</p>
                    </details>
                  ))}
                </div>
              </Section>
            ) : null}

            {m.interviewQuestions?.length ? (
              <Section icon={<GraduationCap className="h-4 w-4" />} title="Interview questions">
                <div className="space-y-3">
                  {m.interviewQuestions.map((q, i) => (
                    <details key={i} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                      <summary className="cursor-pointer">
                        <span className="mr-2 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold uppercase text-primary">
                          {q.level}
                        </span>
                        {q.question}
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{q.answer}</p>
                    </details>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}
