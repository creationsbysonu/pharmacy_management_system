import { cn } from "@/lib/utils";

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

/**
 * Slot-machine headline.
 *
 * Each word is its own clipped rail; every character rolls up into place from
 * below, slightly after the one before it. The whole thing is CSS: no client
 * JavaScript, no layout thrash, and it collapses to plain text under
 * `prefers-reduced-motion`.
 */
export function SlotText({
  text,
  className,
  delay = 0,
  rolls = 4,
  step = 42,
}: {
  text: string;
  className?: string;
  /** Milliseconds before the first character starts moving. */
  delay?: number;
  /** How many character-heights the rail travels before landing. */
  rolls?: number;
  /** Milliseconds between adjacent characters. */
  step?: number;
}) {
  const words = text.split(" ");
  // Character offsets are computed up front; mutating a counter inside JSX
  // would make the animation order depend on render timing.
  const starts = words.reduce<number[]>((acc, word, wordIndex) => {
    const previous = wordIndex === 0 ? -1 : wordIndex - 1;
    acc.push(previous < 0 ? 0 : acc[previous] + words[previous].length);
    return acc;
  }, []);

  return (
    <span className={cn("inline", className)} aria-label={text}>
      <span className="sr-only">{text}</span>
      {words.map((word, wordIndex) => {
        const start = starts[wordIndex];
        return (
          <span key={`${word}-${wordIndex}`} aria-hidden className="inline-block whitespace-nowrap">
            {word.split("").map((char, charIndex) => (
              <span
                key={`${char}-${charIndex}`}
                className="slot"
                style={
                  {
                    "--slot-index": start + charIndex,
                    "--slot-rolls": rolls,
                    "--slot-travel": "1.05em",
                    "--slot-delay": `${delay}ms`,
                  } as CSSVars
                }
              >
                <span
                  className="slot-char"
                  style={{ animationDelay: `${delay + (start + charIndex) * step}ms` }}
                >
                  {char}
                </span>
              </span>
            ))}
            {wordIndex < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
          </span>
        );
      })}
    </span>
  );
}

/**
 * A number that ticks over digit by digit, the way an odometer settles. Values
 * are pre-formatted on the server so the markup that ships is already correct;
 * the animation only moves the glyphs.
 */
export function SlotNumber({
  value,
  kind = "number",
  className,
}: {
  value: number;
  kind?: "number" | "currency" | "compact";
  className?: string;
}) {
  const formatted =
    kind === "currency"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(value)
      : kind === "compact"
        ? new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

  return (
    <span className={cn("numeric inline-flex", className)} aria-label={formatted}>
      <span className="sr-only">{formatted}</span>
      {formatted.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          aria-hidden
          className={/[\d]/.test(char) ? "slot-digit" : "inline-block whitespace-pre"}
          style={/[\d]/.test(char) ? ({ "--digit-index": index } as CSSVars) : undefined}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
