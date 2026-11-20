"use client";

import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type SVGProps,
  useSyncExternalStore,
} from "react";
import { motion, type Variants } from "motion/react";

/**
 * The project's own icon set (no icon library), in an "offset duotone" style:
 *  - a bold 2.25px outline in the text colour (round caps and joins), and
 *  - a solid colour blob of the main shape, shifted down-right behind the outline,
 *    like a slightly misregistered print. Its colour comes from the CSS variable
 *    --icon-fill (set per section), falling back to a faint tint of the icon's own colour.
 * Line-only glyphs (arrows, chevrons, check) have no blob.
 *
 * Pass `animate` to draw the icon when it scrolls into view (Motion): the outline draws
 * itself, then the blob slides into its offset. `delay` staggers icons in a row. It plays
 * once, and users who prefer reduced motion get the finished icon straight away.
 */

export type IconProps = SVGProps<SVGSVGElement> & { animate?: boolean; delay?: number };
export type IconComponent = (props: IconProps) => React.JSX.Element;

const STROKE = 2.25;
const OFFSET = 2.6; // blob offset, in 24-grid units (about a tenth of the icon)

/* Reduced-motion preference. The server and the first client render both see `false`
   (so hydration matches); React then re-renders with the real value. */
const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

const drawable = {
  path: motion.path,
  rect: motion.rect,
  circle: motion.circle,
  ellipse: motion.ellipse,
} as const;

/** Swap plain SVG shapes for Motion ones so their outlines can draw in. */
function toMotion(node: ReactNode, variants: Variants): ReactNode {
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<Record<string, unknown>>;
  if (el.type === Fragment)
    return Children.map(el.props.children as ReactNode, (child) => toMotion(child, variants));
  const Tag = drawable[el.type as keyof typeof drawable];
  if (!Tag) return node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Shape = Tag as any;
  return <Shape {...el.props} key={el.key ?? undefined} variants={variants} />;
}

function make(name: string, fill: ReactNode, line: ReactNode) {
  function Icon({ "aria-label": label, animate = false, delay = 0, style, ...props }: IconProps) {
    const reduce = usePrefersReducedMotion();
    const run = animate && !reduce;

    const draw: Variants = {
      hidden: { pathLength: 0, opacity: 0 },
      shown: {
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { duration: 0.75, delay, ease: [0.65, 0, 0.35, 1] },
          opacity: { duration: 0.01, delay },
        },
      },
    };
    const blob: Variants = {
      hidden: { x: 0, y: 0, opacity: 0 },
      shown: {
        x: OFFSET,
        y: OFFSET,
        opacity: 1,
        transition: { delay: delay + 0.45, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
      },
    };

    const svgProps = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "-1 -1 27.5 27.5",
      width: 24,
      height: 24,
      fill: "none",
      role: label ? "img" : undefined,
      "aria-label": label,
      "aria-hidden": label ? undefined : true,
      style: { overflow: "visible", ...style },
      ...props,
    };
    const strokeProps = {
      stroke: "currentColor",
      strokeWidth: STROKE,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
    };
    // Sections set --icon-fill; elsewhere the blob is a faint tint of the icon's own colour.
    const fillStyle = {
      fill: "var(--icon-fill, color-mix(in srgb, currentColor 18%, transparent))",
    };

    if (!run) {
      return (
        <svg {...svgProps}>
          {fill ? (
            <g style={fillStyle} stroke="none" transform={`translate(${OFFSET} ${OFFSET})`}>
              {fill}
            </g>
          ) : null}
          <g {...strokeProps}>{line}</g>
        </svg>
      );
    }
    return (
      <motion.svg
        {...(svgProps as object)}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.6 }}
      >
        {fill ? (
          <motion.g style={fillStyle} stroke="none" variants={blob}>
            {fill}
          </motion.g>
        ) : null}
        <g {...strokeProps}>{toMotion(<>{line}</>, draw)}</g>
      </motion.svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

/* ── Content icons (duotone) ─────────────────────── */

export const IconMic = make(
  "IconMic",
  <rect x="8.5" y="2.75" width="7" height="12" rx="3.5" />,
  <>
    <rect x="8.5" y="2.75" width="7" height="12" rx="3.5" />
    <path d="M5 11.5a7 7 0 0 0 14 0M12 18.5v2.75M9 21.25h6" />
  </>,
);

export const IconImage = make(
  "IconImage",
  <rect x="3" y="4" width="18" height="16" rx="3.5" />,
  <>
    <rect x="3" y="4" width="18" height="16" rx="3.5" />
    <circle cx="8.75" cy="9.25" r="1.75" />
    <path d="M3.5 17.5 9 12.5l3.5 3 3-2.5 5 4.25" />
  </>,
);

export const IconMemory = make(
  "IconMemory",
  <path d="M7 3.5h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4.5L7.5 21v-3.5H7a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4Z" />,
  <>
    <path d="M7 3.5h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-4.5L7.5 21v-3.5H7a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4Z" />
    <path d="M12 7.25v3.5l2.25 1.5" />
  </>,
);

export const IconCode = make(
  "IconCode",
  <rect x="3" y="4" width="18" height="16" rx="3.5" />,
  <>
    <rect x="3" y="4" width="18" height="16" rx="3.5" />
    <path d="m10 9-3 3 3 3M14 9l3 3-3 3" />
  </>,
);

export const IconComputer = make(
  "IconComputer",
  <rect x="3" y="4" width="18" height="12.5" rx="3" />,
  <>
    <rect x="3" y="4" width="18" height="12.5" rx="3" />
    <path d="M12 16.5V20M8 20.25h8" />
  </>,
);

export const IconContacts = make(
  "IconContacts",
  <rect x="4.5" y="3" width="15" height="18" rx="3" />,
  <>
    <rect x="4.5" y="3" width="15" height="18" rx="3" />
    <circle cx="12" cy="10" r="2.25" />
    <path d="M8.5 16.25a3.5 3.5 0 0 1 7 0M2.75 8h1.75M2.75 12h1.75M2.75 16h1.75" />
  </>,
);

export const IconHeadset = make(
  "IconHeadset",
  <>
    <rect x="3" y="12" width="4.5" height="6.5" rx="2" />
    <rect x="16.5" y="12" width="4.5" height="6.5" rx="2" />
  </>,
  <>
    <path d="M4 13.5V12a8 8 0 0 1 16 0v1.5" />
    <rect x="3" y="12" width="4.5" height="6.5" rx="2" />
    <rect x="16.5" y="12" width="4.5" height="6.5" rx="2" />
    <path d="M19 18.5v.5a2.75 2.75 0 0 1-2.75 2.75H13.5" />
  </>,
);

export const IconDatabase = make(
  "IconDatabase",
  <path d="M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3v12c0 1.66-3.58 3-8 3s-8-1.34-8-3V6Z" />,
  <>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </>,
);

export const IconRecap = make(
  "IconRecap",
  <path d="M6.5 3H14l5 5v10.5a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z" />,
  <>
    <path d="M6.5 3H14l5 5v10.5a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z" />
    <path d="M14 3v3.5A1.5 1.5 0 0 0 15.5 8H19M8 12.5h8M8 16h5" />
  </>,
);

export const IconRepo = make(
  "IconRepo",
  <>
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="6.5" cy="6" r="2.5" />
    <circle cx="17.5" cy="7" r="2.5" />
  </>,
  <>
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="6.5" cy="6" r="2.5" />
    <circle cx="17.5" cy="7" r="2.5" />
    <path d="M6.5 8.5v7M17.5 9.5c0 3.5-3 5.25-7.25 6.5L8.5 16.6" />
  </>,
);

export const IconGroup = make(
  "IconGroup",
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0Z" />
  </>,
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.25A5.75 5.75 0 0 1 21.25 20" />
  </>,
);

export const IconShield = make(
  "IconShield",
  <path d="M12 3 19 5.75v5.5c0 4.5-3 8.25-7 9.75-4-1.5-7-5.25-7-9.75v-5.5L12 3Z" />,
  <>
    <path d="M12 3 19 5.75v5.5c0 4.5-3 8.25-7 9.75-4-1.5-7-5.25-7-9.75v-5.5L12 3Z" />
    <path d="m9 12 2.25 2.25L15.25 10" />
  </>,
);

export const IconRestart = make(
  "IconRestart",
  <circle cx="12" cy="12.5" r="8" />,
  <>
    <path d="M19.75 12.5A7.75 7.75 0 1 1 17.5 7" />
    <path d="M19.5 3.5V7.5h-4M12 9.5v6M9 12.5h6" />
  </>,
);

export const IconVerified = make(
  "IconVerified",
  <path d="m12 2.5 2.5 1.75 3 .25.9 2.9L20.75 9.2l-.9 2.8.9 2.8-2.35 1.8-.9 2.9-3 .25L12 21.5l-2.5-1.75-3-.25-.9-2.9-2.35-1.8.9-2.8-.9-2.8L5.6 7.4l.9-2.9 3-.25L12 2.5Z" />,
  <>
    <path d="m12 2.5 2.5 1.75 3 .25.9 2.9L20.75 9.2l-.9 2.8.9 2.8-2.35 1.8-.9 2.9-3 .25L12 21.5l-2.5-1.75-3-.25-.9-2.9-2.35-1.8.9-2.8-.9-2.8L5.6 7.4l.9-2.9 3-.25L12 2.5Z" />
    <path d="m8.75 12 2.25 2.25 4.25-4.5" />
  </>,
);

export const IconWallet = make(
  "IconWallet",
  <rect x="3" y="6.5" width="18" height="14" rx="3" />,
  <>
    <rect x="3" y="6.5" width="18" height="14" rx="3" />
    <path d="M6 6.5V5.25A2.25 2.25 0 0 1 8.25 3h8.5M21 11.5h-4a2 2 0 0 0 0 4h4" />
    <path d="M17 13.5h.01" />
  </>,
);

export const IconReply = make(
  "IconReply",
  <path d="M10 4.5 3 10.75 10 17v-3.75c5 0 8.5 1.5 11 5.25-.75-6-4.25-10.25-11-10.25V4.5Z" />,
  <path d="M10 4.5 3 10.75 10 17v-3.75c5 0 8.5 1.5 11 5.25-.75-6-4.25-10.25-11-10.25V4.5Z" />,
);

export const IconRobot = make(
  "IconRobot",
  <rect x="4" y="8" width="16" height="12" rx="3.5" />,
  <>
    <rect x="4" y="8" width="16" height="12" rx="3.5" />
    <path d="M12 4.75V8M9.5 16.5h5M2 12.5v3M22 12.5v3" />
    <circle cx="12" cy="3.75" r="1" />
    <path d="M9 12.5h.01M15 12.5h.01" strokeWidth={3.25} />
  </>,
);

export const IconRoute = make(
  "IconRoute",
  <>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
  </>,
  <>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8.5 18h6.75a3 3 0 0 0 0-6h-6.5a3 3 0 0 1 0-6h6.75" />
  </>,
);

export const IconServer = make(
  "IconServer",
  <>
    <rect x="3" y="3.5" width="18" height="7.5" rx="2.5" />
    <rect x="3" y="13" width="18" height="7.5" rx="2.5" />
  </>,
  <>
    <rect x="3" y="3.5" width="18" height="7.5" rx="2.5" />
    <rect x="3" y="13" width="18" height="7.5" rx="2.5" />
    <path d="M11 7.25h6M11 16.75h6" />
    <path d="M7 7.25h.01M7 16.75h.01" strokeWidth={3.25} />
  </>,
);

/** A chat bubble (stands in for WhatsApp without using its logo). */
export const IconChat = make(
  "IconChat",
  <path d="M12 3a9 9 0 0 0-7.75 13.55L3 21l4.6-1.2A9 9 0 1 0 12 3Z" />,
  <>
    <path d="M12 3a9 9 0 0 0-7.75 13.55L3 21l4.6-1.2A9 9 0 1 0 12 3Z" />
    <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth={3} />
  </>,
);

export const IconBag = make(
  "IconBag",
  <path d="M5.5 8h13l-1 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5.5 8Z" />,
  <>
    <path d="M5.5 8h13l-1 11a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5.5 8Z" />
    <path d="M9 10.5V6.75a3 3 0 0 1 6 0v3.75" />
  </>,
);

export const IconClipboard = make(
  "IconClipboard",
  <rect x="4.5" y="4.5" width="15" height="17" rx="3" />,
  <>
    <rect x="4.5" y="4.5" width="15" height="17" rx="3" />
    <rect x="8.5" y="2.75" width="7" height="3.5" rx="1.25" />
    <path d="M8.5 11.5h7M8.5 15h4.5" />
  </>,
);

export const IconCalendar = make(
  "IconCalendar",
  <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" />,
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" />
    <path d="M8 2.75v3.5M16 2.75v3.5M3 9.75h18" />
    <path d="m9 15 2 2 4-4" />
  </>,
);

export const IconLanguage = make(
  "IconLanguage",
  <path d="M6.5 3.5h11a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5H12l-5 4v-4h-.5A3.5 3.5 0 0 1 3 13V7a3.5 3.5 0 0 1 3.5-3.5Z" />,
  <>
    <path d="M6.5 3.5h11a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5H12l-5 4v-4h-.5A3.5 3.5 0 0 1 3 13V7a3.5 3.5 0 0 1 3.5-3.5Z" />
    <path d="M8 7.75h5M10.5 6.75v1M12 7.75c-.5 2.25-2 3.75-4 4.5M9.5 9.75c.75 1 1.75 1.75 3 2.25M14 13.5l1.75-4.25 1.75 4.25M14.5 12.25h2.5" />
  </>,
);

/* ── Interface icons ─────────────────────────────── */

export const IconInfo = make(
  "IconInfo",
  <circle cx="12" cy="12" r="9" />,
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.25M12 7.75h.01" />
  </>,
);

export const IconQr = make(
  "IconQr",
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.75" />
    <rect x="14" y="3" width="7" height="7" rx="1.75" />
    <rect x="3" y="14" width="7" height="7" rx="1.75" />
  </>,
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.75" />
    <rect x="14" y="3" width="7" height="7" rx="1.75" />
    <rect x="3" y="14" width="7" height="7" rx="1.75" />
    <path d="M14 14h3v3M21 14v.01M14 21h.01M17.5 21H21v-3.5" />
  </>,
);

export const IconCopy = make(
  "IconCopy",
  <rect x="8" y="8" width="13" height="13" rx="2.75" />,
  <>
    <rect x="8" y="8" width="13" height="13" rx="2.75" />
    <path d="M16 8V5.75A2.75 2.75 0 0 0 13.25 3h-7.5A2.75 2.75 0 0 0 3 5.75v7.5A2.75 2.75 0 0 0 5.75 16H8" />
  </>,
);

export const IconSend = make(
  "IconSend",
  <path d="M21 3 3 10.75l7.25 3L13.25 21 21 3Z" />,
  <path d="M21 3 3 10.75l7.25 3L13.25 21 21 3ZM10.25 13.75 21 3" />,
);

export const IconRefresh = make(
  "IconRefresh",
  null,
  <path d="M20 11A8 8 0 0 0 5.4 7M4 3.5V7.5h4M4 13a8 8 0 0 0 14.6 4M20 20.5v-4h-4" />,
);

export const IconLoader = make(
  "IconLoader",
  null,
  <>
    <circle cx="12" cy="12" r="8.5" strokeOpacity={0.25} />
    <path d="M12 3.5A8.5 8.5 0 0 1 20.5 12" />
  </>,
);

export const IconCheck = make("IconCheck", null, <path d="m5 12.5 4.5 4.5L19 7.5" />);

export const IconArrowRight = make("IconArrowRight", null, <path d="M5 12h14M13 6l6 6-6 6" />);

export const IconArrowUpRight = make(
  "IconArrowUpRight",
  null,
  <path d="M7 17 17 7M8.5 7H17v8.5" />,
);

export const IconChevronDown = make("IconChevronDown", null, <path d="m6 9 6 6 6-6" />);

export const IconChevronUp = make("IconChevronUp", null, <path d="m6 15 6-6 6 6" />);
