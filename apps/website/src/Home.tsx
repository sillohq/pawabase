import { useEffect, useRef, useState } from "react";
import { Icon } from "./components/Primitives";
import { dashboard, docs, github } from "./config";

function StudioFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!preference.matches);
    sync(); preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  useEffect(() => { if (motion) video.current?.play().catch(() => {}); else video.current?.pause(); }, [motion]);
  return <div className="studio-film"><video ref={video} src={motion ? "/media/overview.mp4" : undefined} poster="/media/overview.webp" width="1440" height="900" muted loop playsInline preload="metadata" aria-label="Pawabase Studio showing application traffic, latency, and Flow activity" /></div>;
}

export function Home() {
  return <main id="main" className="isolate">
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-current" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path className="current-line current-line-one" d="M-90 700C210 455 330 755 605 492S1062 198 1510 -34" />
          <path className="current-line current-line-two" d="M-130 818C165 565 378 830 650 566S1124 250 1560 38" />
          <path className="current-line current-line-three" d="M-80 564C200 330 366 591 618 362S1018 118 1498 -88" />
          <path className="current-line current-line-four" d="M-140 876C150 630 380 900 672 626S1100 318 1570 90" />
          <path className="current-line current-line-five" d="M-115 506C168 264 394 534 652 292S1077 65 1555 -136" />
          <path className="current-line current-line-six" d="M-130 445C174 210 404 465 675 228S1091 4 1552 -162" />
          <path className="current-line current-line-seven" d="M-85 760C226 512 364 804 635 536S1099 226 1510 22" />
          <path className="current-line current-line-eight" d="M-100 640C192 402 346 672 622 425S1044 152 1518 -58" />
          <path className="current-line current-line-nine" d="M-106 934C196 675 392 940 692 688S1115 382 1546 162" />
          <path className="current-line current-line-ten" d="M-100 385C174 155 419 402 685 174S1097 -34 1545 -190" />
          <path className="current-line current-line-eleven" d="M-128 992C150 742 412 1010 717 742S1132 440 1560 210" />
        </svg>
      </div>
      <div className="hero-shell">
        <div className="hero-copy max-w-[420px]">
          <h1 id="hero-title">The backend,<br />already <em>connected.</em></h1>
          <p className="hero-lede">Data, auth, APIs, flows and realtime. One workspace. More time for your product.</p>
          <div className="hero-actions"><a className="button" href={dashboard || docs("installation/docker")}>{dashboard ? "Open Studio" : "Start building"} <Icon name="arrow" /></a><a className="hero-github" href={github} aria-label="Pawabase on GitHub" target="_blank" rel="noreferrer"><img src="/integrations/github.svg" alt="" width="20" height="20" /></a></div>
        </div>
        <div className="hero-product"><StudioFilm /></div>
      </div>
      <div className="wordmark-band" aria-hidden="true"><span>pawabase</span></div>
    </section>
  </main>;
}
