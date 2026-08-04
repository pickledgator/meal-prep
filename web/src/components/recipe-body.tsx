import type { IngredientLine, StepLine } from "shared";
import { InlineMarkdown } from "@/components/inline-markdown";
import { getIngredientIcon } from "@/lib/ingredient-icons";
import { groupBySection } from "@/lib/sections";

/**
 * The two structured blocks shared by recipe and component pages. Section
 * headings come from the data (StepLine.section / IngredientLine.section);
 * the CSS step counter is continued across sections via counter-reset.
 */

export function IngredientList({ ingredients, slug }: { ingredients: (IngredientLine & { id: string })[]; slug: string }) {
  const groups = groupBySection(ingredients);

  return (
    <section className="editorial" aria-label="Ingredients">
      <h2 className="mt-12 mb-4 first:mt-0">
        <span className="label section-tab">Ingredients</span>
      </h2>
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.section && <h3 className="display mt-9 mb-3 text-[1.375rem] text-ink">{group.section}</h3>}
          <ul className="bullets measure my-4 space-y-1.5">
            {group.items.map((line) => {
              const icon = getIngredientIcon(line.text);
              return (
                <li key={line.id} className={icon ? "has-mark leading-[1.7]" : "leading-[1.7]"}>
                  {icon && <span className="ing-mark">{icon}</span>}
                  <InlineMarkdown text={line.text} slug={slug} quantities />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function StepList({ steps, slug }: { steps: (StepLine & { id: string })[]; slug: string }) {
  const groups = groupBySection(steps);

  // Step numbers run continuously across section headings, exactly like the
  // authored recipes. Prefer the stored displayNumber; otherwise continue the
  // running count.
  let running = 0;
  const numbered = groups.map((group) => {
    const start = group.items[0]?.displayNumber !== undefined ? group.items[0].displayNumber - 1 : running;
    running = start + group.items.length;
    return { ...group, start };
  });

  return (
    <section className="editorial" aria-label="Instructions">
      <h2 className="mt-12 mb-4 first:mt-0">
        <span className="label section-tab">Instructions</span>
      </h2>
      {numbered.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.section && <h3 className="display mt-9 mb-3 text-[1.375rem] text-ink">{group.section}</h3>}
          <ol className="steps measure my-5 space-y-4" style={{ counterReset: `step ${group.start}` }}>
            {group.items.map((line) => (
              <li key={line.id} className="leading-[1.7]">
                {line.label && <strong className="font-semibold text-ink">{line.label} </strong>}
                <InlineMarkdown text={line.text} slug={slug} />
                {line.footnote && (
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
                    <InlineMarkdown text={line.footnote} slug={slug} />
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

export function HotTip({ text, slug }: { text: string; slug: string }) {
  return (
    <blockquote className="measure my-7 border-l-[5px] border-primary bg-accent/28 px-6 py-5 text-ink">
      <strong className="font-semibold text-ink">Hot Tip: </strong>
      <InlineMarkdown text={text} slug={slug} />
    </blockquote>
  );
}
