import type { PrepTaskDetail } from "shared";
import { Link, useParams } from "wouter";
import { FolioHeader } from "@/components/plans/folio-header";
import { PlanNav } from "@/components/plans/plan-nav";
import { PrintButton } from "@/components/plans/print-button";
import { Arrow, InlineMarkdown, JarMark, MealSup } from "@/components/inline-markdown";
import { PagePlaceholder, QueryError } from "@/components/page-states";
import { PrepCheckbox } from "@/components/prep/prep-checkbox";
import { formatWeek, mealSuperscripts } from "@/lib/format";
import { useDocumentTitle, usePlan, usePrepState } from "@/lib/hooks";
import { getIngredientIcon } from "@/lib/ingredient-icons";

const COMPONENT_LINK_CLASS =
  "font-medium text-primary underline decoration-primary/35 decoration-1 underline-offset-[3px] transition-colors hover:decoration-primary";

function AllocationList({ task, slug }: { task: PrepTaskDetail; slug: string }) {
  return (
    <ul className="space-y-1.5">
      {task.allocations.map((allocation) => (
        <li key={allocation.id} className="leading-[1.7]">
          <span className="qty">{allocation.quantityText}</span>
          {allocation.prepText && (
            <>
              <Arrow />
              {allocation.prepText}
            </>
          )}
          <Arrow />
          {allocation.destination.kind === "component" ? (
            <Link href={`/plans/${slug}/components/${allocation.destination.componentSlug}`} className={COMPONENT_LINK_CLASS}>
              <ComponentName slug={slug} componentSlug={allocation.destination.componentSlug} />
            </Link>
          ) : allocation.destination.kind === "storage" ? (
            <span className="text-ink">&ldquo;{allocation.destination.storageLabel}&rdquo;</span>
          ) : (
            <InlineMarkdown text={allocation.destination.text} slug={slug} />
          )}
          {allocation.mealNumbers.length > 0 && <MealSup refs={mealSuperscripts(allocation.mealNumbers)} />}
          {allocation.sundayConsumed && <JarMark />}
        </li>
      ))}
    </ul>
  );
}

function ComponentName({ slug, componentSlug }: { slug: string; componentSlug: string }) {
  const { data: plan } = usePlan(slug); // cache hit — never a second fetch
  const component = plan?.components.find((c) => c.slug === componentSlug);
  return <>{component?.name ?? componentSlug}</>;
}

function TaskTitle({ task }: { task: PrepTaskDetail }) {
  const icon = task.taskType === "ingredient" ? getIngredientIcon(task.title) : null;
  return (
    <>
      {icon && <span className="ing-mark">{icon}</span>}
      {task.title}
      {task.quantityText && <span className="qty"> — {task.quantityText}</span>}
      {task.mealNumbers.length > 0 && <MealSup refs={mealSuperscripts(task.mealNumbers)} />}
    </>
  );
}

function TaskDetail({ task, slug }: { task: PrepTaskDetail; slug: string }) {
  if (task.allocations.length > 0) return <AllocationList task={task} slug={slug} />;
  if (task.componentSlug) {
    return (
      <p>
        {task.stepRangeText ? `${task.stepRangeText} in ` : "see "}
        <Link href={`/plans/${slug}/components/${task.componentSlug}`} className={COMPONENT_LINK_CLASS}>
          <ComponentName slug={slug} componentSlug={task.componentSlug} />
        </Link>
      </p>
    );
  }
  if (task.body) {
    return (
      <p className="leading-[1.7]">
        <InlineMarkdown text={task.body} slug={slug} />
      </p>
    );
  }
  return null;
}

export function PrepPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: plan, isPending, error } = usePlan(slug);
  const prep = usePrepState(slug);
  useDocumentTitle(plan ? `Sunday prep — ${plan.theme}` : undefined);

  if (isPending) return <PagePlaceholder />;
  if (error) return <QueryError error={error} />;

  return (
    <div>
      <FolioHeader
        kicker={plan.theme}
        title="Sunday prep list"
        actions={<PrintButton label="Print prep" />}
        meta={[
          <>Week of {formatWeek(plan.weekOf)}</>,
          <>{plan.components.length} components</>,
          <>{plan.difficulty} prep</>,
        ]}
      />

      <PlanNav slug={slug} />

      <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2" data-print="hide">
        <p className="label text-ink-faint">Tap a task to cross it off — checks are saved on this device</p>
        {prep.checkedCount > 0 && (
          <button
            type="button"
            onClick={prep.reset}
            className="label rounded-md border border-rule px-2.5 py-1.5 text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
          >
            Reset checks
          </button>
        )}
      </div>

      <div className="editorial">
        {plan.prepSections.map((section) =>
          section.kind === "break" ? (
            <div key={section.id} className="my-10 flex items-center justify-center gap-4">
              <span className="ornament" aria-hidden>
                <span />
              </span>
              <p className="display-quiet italic text-ink-muted">{section.title}</p>
              <span className="ornament" aria-hidden>
                <span />
              </span>
            </div>
          ) : (
            <section key={section.id} aria-label={section.title}>
              <h2 className="mt-12 mb-5 flex flex-wrap items-baseline gap-x-3 first:mt-0">
                <span className="label section-tab">{section.title}</span>
                {section.timeEstimate && <span className="data text-ink-faint">⏱ {section.timeEstimate}</span>}
              </h2>
              <div className="measure space-y-1">
                {section.tasks.map((task) => (
                  <PrepCheckbox
                    key={task.id}
                    checked={prep.isChecked(task.id)}
                    onCheckedChange={() => prep.toggle(task.id)}
                    title={<TaskTitle task={task} />}
                    detail={<TaskDetail task={task} slug={slug} />}
                  />
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
