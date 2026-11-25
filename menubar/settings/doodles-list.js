/**
 * Colección de Doodles animados integrada (optimizada para 60fps y vista previa fiel).
 */
export const DOODLES_LIST = [
  {
    "id": "bosque-luciernagas",
    "name": "Luciérnagas del Bosque ✨",
    "template": ":doodle {\n  @grid: 1x18 / 100vw 100vh;\n  background: #04120c;\n  overflow: hidden;\n}\n@size: @r(6px, 16px);\nborder-radius: 50%;\nposition: absolute;\nleft: @r(5%, 95%);\ntop: @r(5%, 95%);\n--dx: @r(-24px, 24px);\n--dy: @r(-24px, 24px);\nbackground: radial-gradient(circle, @p(#34d399, #6ee7b7, #fde047, #10b981) 0%, transparent 70%);\nbox-shadow: 0 0 @r(10px, 24px) @p(#34d399, #10b981, #fde047);\nopacity: @r(0.45, 0.95);\nanimation: firefly @r(6s, 14s) ease-in-out infinite alternate;\nanimation-delay: -@r(10s);\n@keyframes firefly {\n  0% { transform: translate(0, 0) scale(0.75); opacity: 0.35; }\n  50% { opacity: 1; }\n  100% { transform: translate(var(--dx), var(--dy)) scale(1.25); opacity: 0.45; }\n}"
  },
  {
    "id": "aurora-esmeralda",
    "name": "Aurora Esmeralda",
    "template": ":doodle {\n  @grid: 1x4 / 100vw 100vh;\n  background: #030a0c;\n  overflow: hidden;\n}\n@size: 130% @r(35%, 55%);\nposition: absolute;\nleft: -15%;\ntop: @r(-10%, 60%);\nrotate: @r(-12deg, 12deg);\nbackground: linear-gradient(90deg, transparent, @p(rgba(16,185,129,0.32), rgba(52,211,153,0.28), rgba(6,182,212,0.25), rgba(99,102,241,0.22)), transparent);\nfilter: blur(24px);\nanimation: aurora-drift @r(16s, 28s) ease-in-out infinite alternate;\nanimation-delay: -@r(12s);\n@keyframes aurora-drift {\n  0% { transform: translateY(-10px) scaleX(1); }\n  100% { transform: translateY(16px) scaleX(1.15); }\n}"
  },
  {
    "id": "lluvia-estrellas",
    "name": "Lluvia de Estrellas 🌠",
    "template": ":doodle {\n  @grid: 1x20 / 100vw 100vh;\n  background: #040711;\n  overflow: hidden;\n}\n@size: 2px @r(35px, 85px);\nposition: absolute;\nleft: @r(5%, 100%);\ntop: @r(-10%, 90%);\nrotate: 35deg;\nbackground: linear-gradient(to bottom, transparent, @p(#ffffff, #a5f3fc, #93c5fd, #6ee7b7));\nborder-radius: 999px;\nopacity: @r(0.4, 0.95);\nanimation: meteor @r(2.5s, 6s) linear infinite;\nanimation-delay: -@r(6s);\n@keyframes meteor {\n  0% { transform: translateY(-30px); opacity: 0; }\n  25% { opacity: 1; }\n  100% { transform: translateY(160px); opacity: 0; }\n}"
  },
  {
    "id": "ondas-esmeralda",
    "name": "Ondas Sonar",
    "template": ":doodle {\n  @grid: 1x6 / 100vw 100vh;\n  background: #050d0b;\n  overflow: hidden;\n}\n@size: @r(55px, 140px);\nborder-radius: 50%;\nposition: absolute;\nleft: @r(15%, 85%);\ntop: @r(15%, 85%);\nborder: 1.5px solid @p(rgba(52,211,153,0.48), rgba(16,185,129,0.38), rgba(110,231,183,0.3));\nbox-shadow: 0 0 18px rgba(52,211,153,0.14);\nanimation: sonar @r(6s, 11s) ease-out infinite;\nanimation-delay: -@r(8s);\n@keyframes sonar {\n  0% { transform: translate(-50%, -50%) scale(0.25); opacity: 0.9; }\n  100% { transform: translate(-50%, -50%) scale(1.7); opacity: 0; }\n}"
  },
  {
    "id": "constelacion-geom",
    "name": "Geometría Orbital",
    "template": ":doodle {\n  @grid: 1x10 / 100vw 100vh;\n  background: #070913;\n  overflow: hidden;\n}\n@size: @r(36px, 110px);\nposition: absolute;\nleft: @r(12%, 88%);\ntop: @r(12%, 88%);\nborder: 1px solid hsla(@r(150, 260), 75%, 65%, @r(0.22, 0.5));\nborder-radius: @p(50%, 16%, 4px);\nanimation: orbit @r(18s, 35s) linear infinite;\n@keyframes orbit {\n  from { transform: translate(-50%, -50%) rotate(0deg); }\n  to { transform: translate(-50%, -50%) rotate(360deg); }\n}"
  },
  {
    "id": "sakura-nocturna",
    "name": "Sakura Nocturna 🌸",
    "template": ":doodle {\n  @grid: 1x18 / 100vw 100vh;\n  background: #0e0712;\n  overflow: hidden;\n}\n@size: @r(8px, 15px) @r(5px, 10px);\nborder-radius: 80% 10% 80% 10%;\nposition: absolute;\nleft: @r(5%, 95%);\ntop: @r(-5%, 90%);\nbackground: @p(#fda4af, #f472b6, #fbcfe8, #e879f9);\nopacity: @r(0.4, 0.85);\nanimation: petal @r(7s, 14s) ease-in-out infinite;\nanimation-delay: -@r(10s);\n@keyframes petal {\n  0% { transform: translate(0, -12px) rotate(0deg); }\n  50% { transform: translate(18px, 45px) rotate(140deg); }\n  100% { transform: translate(-10px, 105px) rotate(280deg); opacity: 0.25; }\n}"
  },
  {
    "id": "hiperespacio",
    "name": "Hiperespacio",
    "template": ":doodle {\n  @grid: 1x24 / 100vw 100vh;\n  background: #03050b;\n  overflow: hidden;\n}\nposition: absolute;\nleft: 50%;\ntop: 50%;\n@size: @r(18%, 42%) 2px;\nbackground: linear-gradient(90deg, transparent, @p(#38bdf8, #818cf8, #34d399, #f472b6));\ntransform-origin: left center;\nrotate: @calc(@i * 15deg);\nopacity: @r(0.45, 0.9);\nanimation: warp @r(2.2s, 4.5s) ease-in infinite;\nanimation-delay: -@r(4s);\n@keyframes warp {\n  0% { transform: translateX(8%) scaleX(0.4); opacity: 0; }\n  40% { opacity: 1; }\n  100% { transform: translateX(120%) scaleX(1.6); opacity: 0; }\n}"
  },
  {
    "id": "panal-cyber",
    "name": "Panal Cibernético",
    "template": ":doodle {\n  @grid: 6x4 / 100vw 100vh;\n  background: #060912;\n  gap: 3px;\n  overflow: hidden;\n}\nclip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);\nbackground: hsla(@p(160, 195, 225, 260), 75%, 52%, @r(0.1, 0.3));\nanimation: hexpulse @r(3s, 7s) ease-in-out infinite alternate;\nanimation-delay: -@r(5s);\n@keyframes hexpulse {\n  0% { opacity: 0.3; transform: scale(0.9); }\n  100% { opacity: 0.95; transform: scale(1); }\n}"
  },
  {
    "id": "seda-galactica",
    "name": "Seda Galáctica ✨",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #05070a;\n  overflow: hidden;\n}\n\n@size: 100%;\nbackground-image: @doodle(\n  @grid: 1x15 / 100% 100%;\n  :after {\n    content: '';\n    @size: 100vw 4px;\n    position: absolute;\n    left: -50%;\n    top: @r(-10%, 110%);\n    background: linear-gradient(to right, transparent, @p(#6a11cb, #2575fc, #ff00cc, #00d2ff), transparent);\n    filter: blur(8px);\n    opacity: @r(0.25, 0.65);\n    transform: rotate(@r(-15deg, 15deg));\n    animation: silk-flow @r(20s, 40s) ease-in-out infinite alternate;\n    animation-delay: -@r(20s);\n  }\n);\n\n@keyframes silk-flow {\n  0% { transform: translateY(-20px) rotate(@r(-5deg, 5deg)) scaleX(1); }\n  100% { transform: translateY(20px) rotate(@r(-15deg, 15deg)) scaleX(1.2); }\n}"
  },
  {
    "id": "aura-boreal",
    "name": "Aura Boreal",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #02040a;\n  overflow: hidden;\n}\nbackground: \n  radial-gradient(circle at @r(0%, 100%) @r(0%, 100%), @p(#00d2ff, #3a7bd5, #6a11cb, #2575fc, #ff00cc) 0%, transparent @r(40%, 80%)),\n  radial-gradient(circle at @r(0%, 100%) @r(0%, 100%), @p(#00f2fe, #4facfe, #43e97b, #fa709a) 0%, transparent @r(30%, 70%));\nfilter: blur(40px);\nopacity: @r(0.35, 0.65);\nanimation: aura-move @r(30s, 50s) linear infinite alternate;\n@keyframes aura-move {\n  0% { transform: translate(-10%, -10%) scale(1.1) rotate(0deg); }\n  100% { transform: translate(10%, 10%) scale(1.3) rotate(10deg); }\n}"
  },
  {
    "id": "vortice-cuantico",
    "name": "Vórtice Cuántico",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #080a0f;\n  overflow: hidden;\n}\n@content: @svg(\n  viewBox: 0 0 100 100;\n  preserveAspectRatio: none;\n  path*50 {\n    stroke: hsla(@calc(200 + @n * 4), 80%, 70%, @r(0.35, 0.75));\n    stroke-width: @r(0.3, 0.7);\n    fill: none;\n    d: M @r(100) @r(100) Q @r(100) @r(100) @r(100) @r(100);\n    animation: spin @r(25s, 50s) linear infinite;\n  }\n);\n@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }"
  },
  {
    "id": "seda-wiphala",
    "name": "Seda Wiphala 🌈",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #030408;\n  overflow: hidden;\n}\n@size: 100%;\nbackground-image: @doodle(\n  @grid: 1x14 / 100% 100%;\n  :after {\n    content: '';\n    @size: 150vw @r(40px, 120px);\n    position: absolute;\n    left: -25%;\n    top: @r(-10%, 110%);\n    background: radial-gradient(ellipse at center, @p(#e63946, #f26419, #f6aa1c, #ffffff, #2a9d8f, #3a86ff, #7209b7) 0%, transparent 60%);\n    opacity: @r(0.35, 0.75);\n    mix-blend-mode: screen;\n    transform: rotate(@r(-20deg, 20deg));\n    animation: silk-flow @r(15s, 35s) ease-in-out infinite alternate;\n    animation-delay: -@r(20s);\n  }\n);\n@keyframes silk-flow {\n  0% { transform: translateY(-40px) rotate(@r(-10deg, 10deg)) scaleX(0.9); }\n  100% { transform: translateY(40px) rotate(@r(-25deg, 25deg)) scaleX(1.3); }\n}"
  },
  {
    "id": "bokeh-minimalista",
    "name": "Bokeh Minimalista ✨",
    "template": ":doodle {\n  @grid: 1x15 / 100vw 100vh;\n  background: #020408;\n  overflow: hidden;\n}\n@size: @r(150px, 400px);\nposition: absolute;\nleft: @r(-10%, 110%);\ntop: @r(-10%, 110%);\nbackground: radial-gradient(circle at center, @p(hsla(200, 100%, 70%, 0.22), hsla(280, 100%, 70%, 0.22), hsla(320, 100%, 70%, 0.22)) 0%, transparent 60%);\nopacity: @r(0.35, 0.85);\nanimation: float @r(20s, 40s) ease-in-out infinite alternate;\n@keyframes float {\n  0% { transform: translate(0, 0) scale(1); }\n  100% { transform: translate(@r(-100px, 100px), @r(-100px, 100px)) scale(@r(1.1, 1.4)); }\n}"
  },
  {
    "id": "lluvia-digital",
    "name": "Lluvia Digital",
    "template": ":doodle {\n  @grid: 1x20 / 100vw 100vh;\n  background: #040b07;\n  overflow: hidden;\n}\n:after {\n  content: @p('01', '10', '11', '00', '><', '{}', '[]', '/*');\n  color: #2ecc71;\n  font-family: monospace;\n  font-size: @r(14px, 22px);\n  position: absolute;\n  left: @r(0%, 100%);\n  top: @r(-10%, 75%);\n  text-shadow: 0 0 5px #2ecc71;\n  animation: rain @r(4s, 10s) linear infinite;\n  animation-delay: -@r(6s);\n}\n@keyframes rain { to { transform: translateY(115vh); opacity: 0; } }"
  },
  {
    "id": "marea-cosmica",
    "name": "Marea Cósmica 🌊",
    "template": ":doodle {\n  @grid: 1x3 / 100vw 100vh;\n  background: #050812;\n  overflow: hidden;\n}\n@size: 150vmax;\nposition: absolute;\nleft: 50%;\ntop: @p(60%, 65%, 70%);\nborder-radius: @p(42%, 44%, 46%);\nbackground: linear-gradient(hsla(@r(200, 250), 70%, 50%, 0.08), hsla(@r(250, 300), 70%, 50%, 0.22));\nanimation: wave @r(15s, 25s) linear infinite;\n@keyframes wave {\n  0% { transform: translateX(-50%) rotate(0deg); }\n  100% { transform: translateX(-50%) rotate(360deg); }\n}"
  },
  {
    "id": "celdas-organicas",
    "name": "Celdas Orgánicas",
    "template": ":doodle {\n  @grid: 1x5 / 100vw 100vh;\n  background: #0a0e14;\n  overflow: hidden;\n}\n@size: @r(50vw, 100vw);\nposition: absolute;\nleft: @r(-20%, 100%);\ntop: @r(-20%, 100%);\nbackground: radial-gradient(circle at center, hsla(@r(360), 70%, 60%, 0.2) 0%, transparent 60%);\nanimation: flow @r(30s, 60s) ease-in-out infinite alternate;\n@keyframes flow {\n  0% { transform: translate(0, 0) scale(1); }\n  100% { transform: translate(@r(-20vw, 20vw), @r(-20vh, 20vh)) scale(@r(1.2, 1.5)); }\n}"
  },
  {
    "id": "lineas-neon",
    "name": "Grid Neón",
    "template": ":doodle {\n  @grid: 10 / 100vw 100vh;\n  background: #060913;\n  overflow: hidden;\n}\nborder-left: 1px solid hsla(@r(200, 260), 70%, 60%, @r(0.15, 0.35));\nborder-top: 1px solid hsla(@r(200, 260), 70%, 60%, @r(0.15, 0.35));\n@random(.08) {\n  background: linear-gradient(hsla(@r(360), 80%, 70%, 0.35), transparent);\n  box-shadow: 0 0 10px hsla(@lr, 80%, 70%, 0.15);\n  animation: glow @r(4s, 8s) ease-in-out infinite alternate;\n}\n@keyframes glow { 0% { opacity: 0.4; } 100% { opacity: 0.9; } }"
  },
  {
    "id": "super-doodle-creativo",
    "name": "Super Doodle",
    "template": ":doodle {\n  @grid: 8x5 / 100vw 100vh;\n  background: #090b12;\n  overflow: hidden;\n}\n@size: @r(40px, 90px);\nposition: absolute;\nleft: @r(5%, 90%); top: @r(5%, 90%);\n@content: @p('🚀', '🪐', '👾', '🎨', '💡', '🤖', 'H', 'E', 'C', 'T', 'O', 'R');\nfont-size: @r(30px, 60px);\ncolor: @p(#ffbe0b, #fb5607, #ff006e, #8338ec, #3a86ff);\ntext-shadow: 0 0 10px rgba(255,255,255,0.2);\nanimation: bounce @r(6s, 12s) ease-in-out infinite;\n@keyframes bounce { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-40px) rotate(@r(-10deg, 10deg)); } }\n:hover { transform: scale(1.4) rotate(10deg); z-index: 100; }"
  },
  {
    "id": "none",
    "name": "Ninguno",
    "template": ""
  }
];
