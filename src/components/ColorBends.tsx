import { useEffect, useRef } from "react";

/**
 * ColorBends (padrão EFCSYS) — versão leve em WebGL puro, sem three.js.
 * Mesmas props do preset React Bits: color, speed, frequency, noise, bandWidth,
 * rotation, fadeTop, iterations, intensity.
 * - Pausa fora da tela (IntersectionObserver) e com a aba oculta.
 * - prefers-reduced-motion: renderiza um quadro estático.
 * - DPR limitado e intensidade reduzida em telas pequenas.
 */
export type ColorBendsProps = {
  color?: string;
  speed?: number;
  frequency?: number;
  noise?: number;
  bandWidth?: number;
  rotation?: number;
  fadeTop?: number;
  iterations?: number;
  intensity?: number;
  className?: string;
};

/** Preset roxo EFCSYS (premium / tecnologia), adaptado ao violeta do logo. */
export const COLOR_BENDS_PURPLE: ColorBendsProps = {
  color: "#8B3DFF",
  speed: 0.2,
  frequency: 1.0,
  noise: 0.15,
  bandWidth: 0.14,
  rotation: 90,
  fadeTop: 0.75,
  iterations: 1,
  intensity: 1.3,
};

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision mediump float;
uniform vec2 uRes;uniform float uTime;uniform vec3 uColor;uniform float uFreq;uniform float uNoise;
uniform float uBand;uniform float uRot;uniform float uFade;uniform float uIntensity;uniform int uIter;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes;vec2 q=uv-.5;q.x*=uRes.x/uRes.y;
 float c=cos(uRot),s=sin(uRot);q=mat2(c,-s,s,c)*q;
 float acc=0.;
 for(int k=0;k<3;k++){ if(k>=uIter) break;
  float fk=float(k);
  float n=vnoise(q*3.+uTime*.15+fk*7.)*uNoise;
  float w=sin((q.x+n)*6.2831*uFreq+uTime*(1.+fk*.35)+sin(q.y*3.+uTime*.6+fk)*1.3);
  acc+=smoothstep(1.-uBand*2.2,1.,w*.5+.5);
 }
 acc/=float(uIter);
 vec3 deep=uColor*.18;vec3 hot=mix(uColor,vec3(1.,.35,.6),.25);
 vec3 col=mix(deep,hot,acc*uIntensity);
 col+=uColor*.12*(1.-length(q));
 float fade=smoothstep(1.,1.-uFade,uv.y);
 gl_FragColor=vec4(col*fade,fade);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function ColorBends({
  color = "#8B3DFF",
  speed = 0.2,
  frequency = 1,
  noise = 0.15,
  bandWidth = 0.14,
  rotation = 90,
  fadeTop = 0.75,
  iterations = 1,
  intensity = 1.3,
  className,
}: ColorBendsProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return; // sem WebGL: o fundo em CSS do container continua visível

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const small = window.matchMedia("(max-width: 640px)").matches;
    gl.uniform3fv(u("uColor"), hexToRgb(color));
    gl.uniform1f(u("uFreq"), frequency);
    gl.uniform1f(u("uNoise"), small ? noise * 0.6 : noise);
    gl.uniform1f(u("uBand"), bandWidth);
    gl.uniform1f(u("uRot"), (rotation * Math.PI) / 180);
    gl.uniform1f(u("uFade"), fadeTop);
    gl.uniform1f(u("uIntensity"), small ? intensity * 0.85 : intensity);
    gl.uniform1i(u("uIter"), Math.max(1, Math.min(3, small ? 1 : iterations)));
    const uRes = u("uRes");
    const uTime = u("uTime");

    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5);
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const draw = (now: number) => {
      gl.uniform1f(uTime, ((now - start) / 1000) * speed * 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && visible && !reduce) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [color, speed, frequency, noise, bandWidth, rotation, fadeTop, iterations, intensity]);

  return <canvas ref={ref} aria-hidden className={className} style={{ width: "100%", height: "100%", display: "block" }} />;
}
