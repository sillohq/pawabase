import { useEffect, useRef, useState } from "react";
import { Brand } from "./components/Primitives";

function StudioFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (motion) video.current?.play().catch(() => {});
    else video.current?.pause();
  }, [motion]);

  return (
    <div className="studio-film">
      <video
        ref={video}
        src={motion ? "/media/overview.mp4" : undefined}
        poster="/media/overview.webp"
        width="1440"
        height="900"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Pawabase Studio showing application traffic, latency, and Flow activity"
      />
    </div>
  );
}

export function Home() {
  return (
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <Brand />
        <h1 id="hero-title">
          One backend. Every system your application needs,
          <span> already working together.</span>
        </h1>
        <StudioFilm />
      </section>
    </main>
  );
}
