import { useEffect, useRef, useState } from "react";

// Smoothly chases a target object of numbers so the car morphs fluidly
// instead of jumping when a slider changes.
export default function useAnimatedValues(target, speed = 10) {
  const [current, setCurrent] = useState(target);
  const currentRef = useRef(target);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
    let frame = null;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const blend = 1 - Math.exp(-speed * dt);
      const goal = targetRef.current;
      const value = currentRef.current;
      const next = {};
      let settled = true;

      for (const key of Object.keys(goal)) {
        const from = value[key] ?? goal[key];
        const moved = from + (goal[key] - from) * blend;
        if (Math.abs(goal[key] - moved) < 0.0004) {
          next[key] = goal[key];
        } else {
          next[key] = moved;
          settled = false;
        }
      }

      currentRef.current = next;
      setCurrent(next);
      if (!settled) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, speed]);

  return current;
}
