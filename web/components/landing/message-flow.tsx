"use client";

import { useEffect, useRef, useState } from "react";
import { IconReply, IconRobot, IconRoute, IconServer, IconChat } from "@/components/icons";

/**
 * "How it works": the path of one message as a zigzag. On wide screens the stops sit on one
 * horizontal rail with cards alternating above and below it; on narrow screens they stack beside
 * a vertical rail. Only the agent is the reader's code.
 *
 * A message "travels" the path on a loop: each beat the next stop becomes current, the rail fills
 * up to it and its card lifts. It runs only while visible, and never under reduced motion.
 */
const STEPS = [
  {
    icon: IconChat,
    name: "WhatsApp",
    body: "Someone messages the account you linked.",
    tag: "Their phone",
  },
  {
    icon: IconServer,
    name: "WAHA",
    body: "Receives it and forwards a signed webhook.",
    tag: "Included",
  },
  {
    icon: IconRoute,
    name: "Adapter",
    body: "Checks it, handles media and finds the sender’s thread.",
    tag: "Included",
  },
  {
    icon: IconRobot,
    name: "Your agent",
    body: "LangGraph runs your instructions and tools.",
    tag: "Your code",
    yours: true,
  },
  {
    icon: IconReply,
    name: "Same chat",
    body: "The reply goes back to the sender. The model never picks the recipient.",
    tag: "Included",
  },
];

const BEAT_MS = 1100; // time at each stop
const HOLD_MS = 1600; // pause with every stop filled
const RESET_MS = 700; // empty rail before the next loop

export function MessageFlow() {
  // -1: nothing reached yet. 0..4: the current stop. 5: every stop done.
  const [step, setStep] = useState<number | null>(null);
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = -1;
    const tick = () => {
      current = current >= STEPS.length ? -1 : current + 1;
      setStep(current);
      const wait = current === STEPS.length ? HOLD_MS : current === -1 ? RESET_MS : BEAT_MS;
      timer = setTimeout(tick, wait);
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !timer) {
          current = -1;
          setStep(-1);
          timer = setTimeout(tick, RESET_MS);
        } else if (!entry.isIntersecting) {
          stop();
          setStep(null); // off screen: show the static diagram
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  return (
    <ol
      ref={ref}
      className="wa-zz"
      aria-label="The path of one message"
      data-animating={step === null ? undefined : ""}
    >
      {STEPS.map((s, i) => (
        <li
          key={s.name}
          data-pos={i % 2 ? "below" : "above"}
          data-yours={s.yours ? "" : undefined}
          data-state={step === null || step < i ? undefined : step === i ? "current" : "done"}
        >
          <div className="wa-zz-card">
            <span className="wa-zz-tag">{s.tag}</span>
            <h3>
              <span className="sr-only">Step {i + 1}: </span>
              {s.name}
            </h3>
            <p>{s.body}</p>
          </div>
          <span className="wa-zz-rail" aria-hidden="true">
            <span className="wa-zz-node">
              <s.icon />
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
