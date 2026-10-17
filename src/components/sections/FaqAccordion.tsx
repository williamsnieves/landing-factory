import { useState } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

/** Example React island: hydrate with client:visible only where interaction is needed. */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-line border-line divide-y border-y">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                id={`faq-button-${index}`}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-lg font-medium"
              >
                {item.question}
                <span aria-hidden="true" className="text-primary text-2xl">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${index}`}
              role="region"
              aria-labelledby={`faq-button-${index}`}
              hidden={!isOpen}
              className="text-ink-soft pb-6"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
