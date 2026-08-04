import { GROCERY_CATEGORY_ORDER, type GroceryCategory, type PlanDetail } from "shared";
import { useParams } from "wouter";
import { FolioHeader } from "@/components/plans/folio-header";
import { PlanNav } from "@/components/plans/plan-nav";
import { PrintButton } from "@/components/plans/print-button";
import { MealSup } from "@/components/inline-markdown";
import { PagePlaceholder, QueryError } from "@/components/page-states";
import { formatWeek, mealSuperscripts } from "@/lib/format";
import { useDocumentTitle, usePlan } from "@/lib/hooks";
import { getIngredientIcon } from "@/lib/ingredient-icons";

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: "Produce",
  proteins: "Suggested Proteins",
  dairy_eggs: "Dairy & Eggs",
  cheese: "Cheese",
  frozen: "Frozen",
  refrigerated: "Refrigerated",
  shelf_stable: "Shelf-Stable",
  bakery: "Bakery",
  other: "Other",
};

function GroceryRow({ item }: { item: PlanDetail["grocery"][number] }) {
  const icon = getIngredientIcon(item.name);
  return (
    <li className={icon ? "has-mark leading-[1.7]" : "leading-[1.7]"}>
      {icon && <span className="ing-mark">{icon}</span>}
      {item.name} <span className="qty">({item.quantityText})</span>
      {item.mealNumbers.length > 0 && <MealSup refs={mealSuperscripts(item.mealNumbers)} />}
      {item.note && <span className="ml-2 text-[0.9375rem] text-ink-faint">— {item.note}</span>}
    </li>
  );
}

/** Meal-number key, derived from the plan instead of an authored KEY block. */
export function MealKey({ plan }: { plan: PlanDetail }) {
  return (
    <div className="slab-sunk my-10 px-5 py-4">
      <p className="label mb-3 text-ink">Key</p>
      <div className="data space-y-1.5 text-ink-muted">
        {plan.meals.map((meal) => (
          <div key={meal.id}>
            <MealSup refs={mealSuperscripts([meal.mealNumber])} /> = {meal.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroceryPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: plan, isPending, error } = usePlan(slug);
  useDocumentTitle(plan ? `Grocery — ${plan.theme}` : undefined);

  if (isPending) return <PagePlaceholder />;
  if (error) return <QueryError error={error} />;

  const staples = plan.grocery.filter((item) => !item.isOptional);
  const optional = plan.grocery.filter((item) => item.isOptional);

  return (
    <div>
      <FolioHeader
        kicker={plan.theme}
        title="Grocery list"
        actions={<PrintButton label="Print list" />}
        meta={[<>Week of {formatWeek(plan.weekOf)}</>, <>{plan.grocery.length} items</>, <>one shop, by aisle</>]}
      />

      <PlanNav slug={slug} />

      <div className="editorial">
        {GROCERY_CATEGORY_ORDER.map((category) => {
          const items = staples.filter((item) => item.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} aria-label={CATEGORY_LABELS[category]}>
              <h2 className="mt-12 mb-4 first:mt-0">
                <span className="label section-tab">{CATEGORY_LABELS[category]}</span>
              </h2>
              <ul className="bullets measure my-4 space-y-1.5">
                {items.map((item) => (
                  <GroceryRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          );
        })}

        {optional.length > 0 && (
          <section aria-label="Optional">
            <h2 className="mt-12 mb-4">
              <span className="label section-tab">Optional</span>
            </h2>
            <ul className="bullets measure my-4 space-y-1.5">
              {optional.map((item) => (
                <GroceryRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <MealKey plan={plan} />
    </div>
  );
}
