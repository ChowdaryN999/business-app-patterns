# Motion

All of it is plain CSS plus one small React component. No animation library.

Use motion in two cases only: one moment when the overview loads, and a response to something the person did. Do not add entrance animations to every card or section.

## Rolling numbers

Each digit is a column showing one digit's height, with a reel of digits inside that slides to the value. The reel holds 0 to 9 twice, so every digit spins a full turn before it settles. Digits start one after another, left to right.

```tsx
const REEL = Array.from({ length: 20 }, (_, i) => i % 10)

function RollingNumber({ value }: { value: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const digits = String(value).split('')
  return (
    <span className="roll" role="img" aria-label={String(value)}>
      {digits.map((d, i) => (
        <span key={digits.length - i} className="roll-col" aria-hidden="true">
          <span
            className="roll-reel"
            style={{ transform: `translateY(-${on ? (10 + Number(d)) * 5 : 0}%)`, transitionDelay: `${150 + i * 140}ms` }}
          >
            {REEL.map((n, j) => <span key={j}>{n}</span>)}
          </span>
        </span>
      ))}
    </span>
  )
}
```

```css
.roll { display: inline-flex; }
.roll-col { display: inline-block; height: 1.1em; overflow: hidden; }
.roll-reel { display: flex; flex-direction: column; transition: transform 2.2s cubic-bezier(.2, .75, .2, 1); will-change: transform; }
.roll-reel > span { height: 1.1em; line-height: 1.1; text-align: center; }
```

Notes: the reel has 20 items, so each is 5% of its height; that is where `* 5` comes from. Use `font-variant-numeric: tabular-nums` on the number. The real value is in `aria-label`; the reels are hidden from screen readers.

## Status bar fill

The bar is revealed from left to right with `clip-path`, so the segments keep their true proportions throughout.

```css
.lanes { animation: lanes-fill 2.2s cubic-bezier(.25, .6, .25, 1) .15s both; }
@keyframes lanes-fill { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.lane { transition: opacity .15s, flex-grow .5s ease; }
.lane.dim { opacity: .25; }
```

## Timing

A first attempt at 0.9 seconds was judged too fast to notice. About 2.2 seconds, with the bar and the numbers on the same duration, reads as one deliberate moment. Keep responses to actions short: 0.12 to 0.2 seconds.

## Responses to actions

| Element | Motion |
|---|---|
| Side sheet | Slides in 32px from the right while fading in, 0.2s |
| Toast | Rises 8px while fading in, 0.18s |
| Choice card | The radio dot scales from 0 to 1, 0.12s |
| Switch | Thumb slides, 0.15s |
| Skeleton | Shimmer loop, 1.4s |
| Button | Moves down 1px while pressed |
| Phone drawer | Slides in, 0.2s |

The rail's collapse on desktop is instant on purpose.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

## When more is wanted

Page transitions, cards animating between board columns, or list reordering need a library (Motion, formerly Framer Motion). Add it only when the user asks for that kind of motion.
