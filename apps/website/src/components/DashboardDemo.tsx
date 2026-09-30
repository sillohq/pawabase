import { useEffect, useRef, useState } from "react";
import { ProductWindow } from "./Primitives";
export function VideoDemo({
  name,
  label,
  eager = false,
}: {
  name: string;
  label: string;
  eager?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const paused = useRef(false);
  useEffect(() => {
    if (loaded && !paused.current) ref.current?.play().catch(() => {});
  }, [loaded]);
  useEffect(() => {
    const video = ref.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduced.matches && !paused.current) {
          setLoaded(true);
          video.play().catch(() => {});
        } else video.pause();
      },
      { threshold: 0.3 },
    );
    const stop = () => {
      if (reduced.matches) video.pause();
    };
    observer.observe(video);
    reduced.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", stop);
    };
  }, []);
  return (
    <div className="video-demo">
      <video
        ref={ref}
        src={loaded ? `/media/${name}.mp4` : undefined}
        poster={`/media/${name}.webp`}
        width="1440"
        height="900"
        muted
        loop
        playsInline
        preload={eager ? "metadata" : "none"}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <div className="demo-control">
        <span>
          <i className="live-dot" />
          {label}
        </span>
        {!failed && (
          <button
            onClick={async () => {
              if (playing) {
                paused.current = true;
                ref.current?.pause();
              } else {
                paused.current = false;
                setLoaded(true);
                requestAnimationFrame(() =>
                  ref.current?.play().catch(() => {}),
                );
              }
            }}
            aria-label={`${playing ? "Pause" : "Play"} ${label}`}
          >
            {playing ? "Ⅱ Pause" : "▷ Play"}
          </button>
        )}
      </div>
    </div>
  );
}
const views = [
  {
    name: "overview",
    label: "Your workspace",
    caption:
      "Projects, environments and backend building blocks. Together in Studio.",
  },
  {
    name: "flows",
    label: "Visual logic",
    caption:
      "Inspect a real Flow: triggers, data operations, conditions and responses.",
  },
  {
    name: "resources",
    label: "Data & APIs",
    caption:
      "Explore the resources behind an application, without leaving the workspace.",
  },
] as const;
export function DashboardDemo() {
  const [active, setActive] = useState(0);
  return (
    <div className="dashboard-demo">
      <div className="demo-tabs" role="tablist" aria-label="Explore Studio">
        {views.map((v, i) => (
          <button
            id={`demo-tab-${i}`}
            key={v.name}
            role="tab"
            aria-selected={active === i}
            aria-controls="demo-panel"
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 2
                      : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                setActive(next);
                document.getElementById(`demo-tab-${next}`)?.focus();
              }
            }}
          >
            <span>0{i + 1}</span>
            {v.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="demo-panel"
        aria-labelledby={`demo-tab-${active}`}
      >
        <ProductWindow title="Your application / development">
          <VideoDemo
            key={views[active].name}
            name={views[active].name}
            label="Recorded in Pawabase Studio"
            eager
          />
        </ProductWindow>
        <p className="demo-caption">
          {views[active].caption}
          <span>REAL PRODUCT. REAL WORKFLOWS.</span>
        </p>
      </div>
    </div>
  );
}
