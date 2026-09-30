import { useState } from "react";
import { Icon } from "./Primitives";
const steps = [
  {
    title: "Receive a request",
    key: "trigger.http",
    detail: "A custom route starts the Flow with the incoming request.",
    icon: "globe",
    tone: "lavender",
  },
  {
    title: "Require authentication",
    key: "auth.require",
    detail:
      "Check for an authenticated user before accessing application data.",
    icon: "shield",
    tone: "peach",
  },
  {
    title: "Look up the record",
    key: "resource.get",
    detail:
      "Read a resource using the Flow’s configured resource and record ID.",
    icon: "database",
    tone: "sky",
  },
  {
    title: "Choose the next step",
    key: "control.if",
    detail: "Evaluate a condition. Continue down the true or false output.",
    icon: "flow",
    tone: "butter",
  },
  {
    title: "Dispatch background work",
    key: "queue.flow",
    detail: "Queue another Flow so the request does not wait for that work.",
    icon: "stack",
    tone: "mint",
  },
  {
    title: "Send the response",
    key: "response.return",
    detail: "Return a configured status and body to the caller.",
    icon: "code",
    tone: "lavender",
  },
] as const;
export function FlowVisualization() {
  const [active, setActive] = useState(0);
  return (
    <div className="flow-visual">
      <div className="flow-toolbar">
        <span>
          <i className="live-dot" /> REQUEST → BACKGROUND WORK
        </span>
        <span>Illustrative flow</span>
      </div>
      <div className="flow-nodes">
        {steps.map((s, i) => (
          <button
            className={`flow-node ${active === i ? "selected" : ""}`}
            key={s.key}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
          >
            <span className={`feature-icon ${s.tone}`}>
              <Icon name={s.icon} />
            </span>
            <span>
              <small>{s.key}</small>
              <b>{s.title}</b>
            </span>
            <span className="node-number">0{i + 1}</span>
          </button>
        ))}
      </div>
      <div className="flow-explanation" aria-live="polite">
        <span className="eyebrow">BLOCK {active + 1} / 6</span>
        <p>{steps[active].detail}</p>
        <button onClick={() => setActive((active + 1) % steps.length)}>
          Explore next block <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}
