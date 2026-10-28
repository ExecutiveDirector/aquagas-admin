import React from 'react';

/**
 * AquaGas animated logo loader.
 * A colour ring spins around the logo; the letters of "AquaGas" flip one after
 * another, the wave ripples and a shine sweeps across. Pure CSS, no libraries.
 *
 *   <LogoLoader />                 inline, 120px
 *   <LogoLoader size={80} />       smaller
 *   <LogoLoader fullScreen />      centred on a full-page backdrop
 */
const LETTERS = [
  { x: 30, w: 173 },
  { x: 203, w: 135 },
  { x: 338, w: 124 },
  { x: 462, w: 136 },
  { x: 598, w: 143 },
  { x: 741, w: 121 },
  { x: 862, w: 138 },
];
const SRC_W = 1020;
const SRC_H = 370;
const CUT = 215; // letters above this line, the wave below it
const WAVE_STRIPS = 28;

const CSS = `
.agl-wrap{position:relative;display:inline-block;flex:none}
.agl-ring{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(rgba(0,166,81,0) 0%,#00bcd4 30%,#1e88e5 60%,#00a651 84%,rgba(0,166,81,0) 84.2%);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--agl-t)),#000 calc(100% - var(--agl-t) + 1px));
          mask:radial-gradient(farthest-side,transparent calc(100% - var(--agl-t)),#000 calc(100% - var(--agl-t) + 1px));
  animation:agl-spin 1.2s linear infinite}
.agl-disc{position:absolute;inset:8%;border-radius:50%;background:#fff;
  box-shadow:0 6px 18px rgba(15,23,42,.12);overflow:hidden}
.agl-wm{position:absolute;left:50%;top:50%;width:80%;aspect-ratio:${SRC_W}/${SRC_H};transform:translate(-50%,-50%)}
.agl-l{position:absolute;top:0;height:${(CUT / SRC_H) * 100}%;transform-origin:50% 60%;
  animation:agl-flip 2.4s ease-in-out infinite}
.agl-l img{display:block;width:100%;height:100%}
.agl-ws{position:absolute;top:${(CUT / SRC_H) * 100}%;bottom:0;background-repeat:no-repeat;
  animation:agl-ripple 1.2s ease-in-out infinite}
.agl-shine{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.75) 50%,transparent 60%);
  transform:translateX(-120%);animation:agl-shine 2.4s ease-in-out infinite}
@keyframes agl-spin{to{transform:rotate(360deg)}}
@keyframes agl-flip{
  0%{transform:scaleX(1) translateY(0)}
  7.5%{transform:scaleX(.05) translateY(-6%)}
  15%{transform:scaleX(1) translateY(-10%)}
  22.5%{transform:scaleX(.05) translateY(-5%)}
  30%,100%{transform:scaleX(1) translateY(0)}}
@keyframes agl-ripple{0%,100%{transform:translateY(-3.5%)}50%{transform:translateY(3.5%)}}
@keyframes agl-shine{0%{transform:translateX(-120%)}60%,100%{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){
  .agl-l,.agl-ws,.agl-shine{animation:none}
  .agl-ring{animation-duration:3s}}
`;

export interface LogoLoaderProps {
  /** Outer diameter in px (default 120). */
  size?: number;
  /** Centre on a full-screen backdrop. */
  fullScreen?: boolean;
  className?: string;
}

export function LogoLoader({ size = 120, fullScreen = false, className = '' }: LogoLoaderProps) {
  const ring = Math.max(3, Math.round(size * 0.05));
  // Wordmark is 80% of the disc, which is 84% of the loader: exact px keeps the
  // wave strips seamless while they ripple.
  const wmW = size * 0.84 * 0.8;
  const stripW = wmW / WAVE_STRIPS;
  const loader = (
    <div
      className={`agl-wrap ${className}`}
      style={{ width: size, height: size, ['--agl-t' as string]: `${ring}px` }}
      role="status"
      aria-label="Loading"
    >
      <style>{CSS}</style>
      <div className="agl-ring" />
      <div className="agl-disc">
        <div className="agl-wm">
          {LETTERS.map((l, i) => (
            <div
              key={i}
              className="agl-l"
              style={{
                left: `${(l.x / SRC_W) * 100}%`,
                width: `${(l.w / SRC_W) * 100}%`,
                animationDelay: `${i * 0.13}s`,
              }}
            >
              <img src={`/loader/l${i}.png`} alt="" draggable={false} />
            </div>
          ))}
          {Array.from({ length: WAVE_STRIPS }, (_, i) => (
            <div
              key={`w${i}`}
              className="agl-ws"
              style={{
                left: i * stripW,
                width: stripW + 0.6,
                backgroundImage: 'url(/loader/wave.png)',
                backgroundSize: `${wmW}px 100%`,
                backgroundPosition: `${-i * stripW}px 0`,
                animationDelay: `${-i * 0.09}s`,
              }}
            />
          ))}
          <div className="agl-shine" />
        </div>
      </div>
    </div>
  );

  if (!fullScreen) return loader;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      {loader}
    </div>
  );
}

export default LogoLoader;
