import { ESSENTIAL_GROUP_ORDER, type EssentialGroup } from "shared";
import { useParams } from "wouter";
import { FolioHeader } from "@/components/plans/folio-header";
import { PlanNav } from "@/components/plans/plan-nav";
import { PrintButton } from "@/components/plans/print-button";
import { MealSup } from "@/components/inline-markdown";
import { PagePlaceholder, QueryError } from "@/components/page-states";
import { MealKey } from "@/pages/grocery";
import { formatWeek, mealSuperscripts } from "@/lib/format";
import { useDocumentTitle, usePlan } from "@/lib/hooks";
import { getIngredientIcon } from "@/lib/ingredient-icons";

const GROUP_LABELS: Record<EssentialGroup, string> = {
  fats: "Fats",
  spices_aromatics: "Spices & Aromatics",
  other: "Other",
  tools: "Tools",
};

export function EssentialsPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: plan, isPending, error } = usePlan(slug);
  useDocumentTitle(plan ? `Essentials — ${plan.theme}` : undefined);

  if (isPending) return <PagePlaceholder />;
  if (error) return <QueryError error={error} />;

  const savedSections = [...new Set(plan.timeSavers.map((saver) => saver.storeSection))];

  return (
    <div>
      <FolioHeader
        kicker={plan.theme}
        title="Essentials & time savers"
        standfirst="Assume you have these on hand — and the shortcuts, no judgment."
        actions={<PrintButton label="Print list" />}
        meta={[<>Week of {formatWeek(plan.weekOf)}</>]}
      />

      <PlanNav slug={slug} />

      <div className="editorial">
        {ESSENTIAL_GROUP_ORDER.map((group) => {
          const items = plan.essentials.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} aria-label={GROUP_LABELS[group]}>
              <h2 className="mt-12 mb-4 first:mt-0">
                <span className="label section-tab">{GROUP_LABELS[group]}</span>
              </h2>
              <ul className="bullets measure my-4 space-y-1.5">
                {items.map((item) => {
                  const icon = group === "tools" ? null : getIngredientIcon(item.name);
                  return (
                    <li key={item.id} className={icon ? "has-mark leading-[1.7]" : "leading-[1.7]"}>
                      {icon && <span className="ing-mark">{icon}</span>}
                      {item.name}
                      {item.mealNumbers.length > 0 && <MealSup refs={mealSuperscripts(item.mealNumbers)} />}
                      {item.note && <span className="ml-2 text-[0.9375rem] text-ink-faint">— {item.note}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {plan.timeSavers.length > 0 && (
          <section aria-label="Time savers">
            <h2 className="mt-14 mb-2">
              <span className="label section-tab">Time Savers</span>
            </h2>
            <p className="measure mb-6 text-[0.9375rem] text-ink-faint">
              Optional shortcuts — strike the listed items from the grocery run if you take one.
            </p>

            {savedSections.map((section) => {
              const savers = plan.timeSavers.filter((saver) => saver.storeSection === section);
              return (
                <div key={section}>
                  <h3 className="display mt-8 mb-3 text-[1.375rem] text-ink">{section}</h3>
                  <ul className="bullets measure my-4 space-y-3">
                    {savers.map((saver) => (
                      <li key={saver.id} className="leading-[1.7]">
                        {saver.name}
                        {saver.note && <span className="ml-2 text-[0.9375rem] text-ink-faint">— {saver.note}</span>}
                        {saver.replaces.length > 0 && (
                          <ul className="my-1.5 ml-[0.1rem] space-y-1 border-l-2 border-rule pl-4 text-[0.9375rem]">
                            {saver.replaces.map((replaced, index) => (
                              <li key={index}>
                                <del className="text-ink-faint line-through decoration-ink-faint/60">{replaced}</del>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}
      </div>

      <MealKey plan={plan} />
    </div>
  );
}
