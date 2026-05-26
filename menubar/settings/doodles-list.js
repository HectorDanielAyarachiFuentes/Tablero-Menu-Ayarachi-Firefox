/**
 * Colección de Doodles Premium integrada.
 */
export const DOODLES_LIST = [
  {
    "id": "seda-galactica",
    "name": "Seda Galáctica ✨ (Optimizado)",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #05070a;\n  overflow: hidden;\n}\n\n@size: 100%;\nbackground-image: @doodle(\n  @grid: 1x15 / 100% 100%;\n  :after {\n    content: '';\n    @size: 100vw 4px;\n    position: absolute;\n    left: -50%;\n    top: @r(-10%, 110%);\n    background: linear-gradient(to right, transparent, @p(#6a11cb, #2575fc, #ff00cc, #00d2ff), transparent);\n    filter: blur(8px);\n    opacity: @r(0.2, 0.5);\n    transform: rotate(@r(-15deg, 15deg));\n    animation: silk-flow @r(20s, 40s) ease-in-out infinite alternate;\n    animation-delay: -@r(20s);\n  }\n);\n\n@keyframes silk-flow {\n  0% { transform: translateY(-20px) rotate(@r(-5deg, 5deg)) scaleX(1); }\n  100% { transform: translateY(20px) rotate(@r(-15deg, 15deg)) scaleX(1.2); }\n}"
  },
  {
    "id": "aura-boreal",
    "name": "Aura Boreal (Optimizado)",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #02040a;\n  overflow: hidden;\n}\nbackground: \n  radial-gradient(circle at @r(0%, 100%) @r(0%, 100%), @p(#00d2ff, #3a7bd5, #6a11cb, #2575fc, #ff00cc) 0%, transparent @r(40%, 80%)),\n  radial-gradient(circle at @r(0%, 100%) @r(0%, 100%), @p(#00f2fe, #4facfe, #43e97b, #fa709a) 0%, transparent @r(30%, 70%));\nfilter: blur(40px);\nopacity: @r(0.2, 0.4);\nanimation: aura-move @r(30s, 50s) linear infinite alternate;\n@keyframes aura-move {\n  0% { transform: translate(-10%, -10%) scale(1.1) rotate(0deg); }\n  100% { transform: translate(10%, 10%) scale(1.3) rotate(10deg); }\n}"
  },
  {
    "id": "vortice-cuantico",
    "name": "Vórtice Cuántico (Optimizado)",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #080a0f;\n}\n@content: @svg(\n  viewBox: 0 0 100 100;\n  preserveAspectRatio: none;\n  path*50 {\n    stroke: hsla(@calc(200 + @n * 4), 80%, 70%, @r(0.3, 0.7));\n    stroke-width: @r(0.2, 0.6);\n    fill: none;\n    d: M @r(100) @r(100) Q @r(100) @r(100) @r(100) @r(100);\n    animation: spin @r(25s, 50s) linear infinite;\n  }\n);\n@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }"
  },
  {
    "id": "trazos-svg",
    "name": "Constelaciones (Optimizado)",
    "template": ":doodle {\n  @grid: 1 / 100vw 100vh;\n  background: #05070a;\n}\n@content: @svg(\n  viewBox: 0 0 100 100;\n  preserveAspectRatio: none;\n  line*50 {\n    draw: @r(10s, 20s);\n    opacity: @r(0.1, 0.4);\n    stroke: @p(#aeacfb, #ffffff, #4facfe);\n    stroke-width: .08;\n    x1: @r(100); y1: @r(100);\n    x2: @calc(@x1 + @r(-20, 20));\n    y2: @calc(@y1 + @r(-20, 20));\n  }\n  circle*40 {\n    r: @r(0.2, 0.5);\n    cx: @r(100); cy: @r(100);\n    fill: #fff;\n    animation: twinkle @r(3s, 8s) ease-in-out infinite alternate;\n  }\n);\n@keyframes twinkle { 0% { opacity: 0.3; } 100% { opacity: 0.9; } }"
  },
  {
    "id": "bokeh-minimalista",
    "name": "Bokeh Minimalista ✨",
    "template": ":doodle {\n  @grid: 1x15 / 100vw 100vh;\n  background: #020408;\n  overflow: hidden;\n}\n@size: @r(150px, 400px);\nposition: absolute;\nleft: @r(-10%, 110%);\ntop: @r(-10%, 110%);\nbackground: radial-gradient(circle at center, @p(hsla(200, 100%, 70%, 0.15), hsla(280, 100%, 70%, 0.15), hsla(320, 100%, 70%, 0.15)) 0%, transparent 60%);\nopacity: @r(0.3, 0.8);\nanimation: float @r(20s, 40s) ease-in-out infinite alternate;\n@keyframes float {\n  0% { transform: translate(0, 0) scale(1); }\n  100% { transform: translate(@r(-100px, 100px), @r(-100px, 100px)) scale(@r(1.1, 1.4)); }\n}"
  },
  {
    "id": "lluvia-digital",
    "name": "Lluvia Digital (Optimizado)",
    "template": ":doodle {\n  @grid: 1x20 / 100vw 100vh;\n}\n:after {\n  content: @p('01', '10', '11', '00', '><', '{}', '[]', '/*');\n  color: #2ecc71;\n  font-family: monospace;\n  font-size: @r(14px, 22px);\n  position: absolute;\n  left: @r(0%, 100%);\n  top: -10vh;\n  text-shadow: 0 0 5px #2ecc71;\n  animation: rain @r(4s, 10s) linear infinite;\n}\n@keyframes rain { to { transform: translateY(115vh); opacity: 0; } }"
  },
  {
    "id": "marea-cosmica",
    "name": "Marea Cósmica 🌊",
    "template": ":doodle {\n  @grid: 1x3 / 100vw 100vh;\n  background: #050812;\n  overflow: hidden;\n}\n@size: 150vmax;\nposition: absolute;\nleft: 50%;\ntop: @p(60%, 65%, 70%);\nborder-radius: @p(42%, 44%, 46%);\nbackground: linear-gradient(hsla(@r(200, 250), 70%, 50%, 0.05), hsla(@r(250, 300), 70%, 50%, 0.15));\nanimation: wave @r(15s, 25s) linear infinite;\n@keyframes wave {\n  0% { transform: translateX(-50%) rotate(0deg); }\n  100% { transform: translateX(-50%) rotate(360deg); }\n}"
  },
  {
    "id": "celdas-organicas",
    "name": "Celdas Orgánicas (Ultra Opt.)",
    "template": ":doodle {\n  @grid: 1x5 / 100vw 100vh;\n  background: #0a0e14;\n  overflow: hidden;\n}\n@size: @r(50vw, 100vw);\nposition: absolute;\nleft: @r(-20%, 100%);\ntop: @r(-20%, 100%);\nbackground: radial-gradient(circle at center, hsla(@r(360), 70%, 60%, 0.15) 0%, transparent 60%);\nanimation: flow @r(30s, 60s) ease-in-out infinite alternate;\n@keyframes flow {\n  0% { transform: translate(0, 0) scale(1); }\n  100% { transform: translate(@r(-20vw, 20vw), @r(-20vh, 20vh)) scale(@r(1.2, 1.5)); }\n}"
  },
  {
    "id": "lineas-neon",
    "name": "Grid Neón (Optimizado)",
    "template": ":doodle {\n  @grid: 10 / 100vw 100vh;\n}\nborder-left: 1px solid hsla(@r(200, 260), 70%, 60%, @r(0.1, 0.3));\nborder-top: 1px solid hsla(@r(200, 260), 70%, 60%, @r(0.1, 0.3));\n@random(.05) {\n  background: linear-gradient(hsla(@r(360), 80%, 70%, 0.3), transparent);\n  box-shadow: 0 0 10px hsla(@lr, 80%, 70%, 0.1);\n  animation: glow @r(4s, 8s) ease-in-out infinite alternate;\n}\n@keyframes glow { 0% { opacity: 0.4; } 100% { opacity: 0.8; } }"
  },
  {
    "id": "super-doodle-creativo",
    "name": "Super Doodle (Héctor Edition Opt.)",
    "template": ":doodle {\n  @grid: 8x5 / 100vw 100vh;\n}\n@size: @r(40px, 90px);\nposition: absolute;\nleft: @r(0%, 100%); top: @r(0%, 100%);\n@content: @p('🚀', '🪐', '👾', '🎨', '💡', '🤖', 'H', 'E', 'C', 'T', 'O', 'R');\nfont-size: @r(30px, 60px);\ncolor: @p(#ffbe0b, #fb5607, #ff006e, #8338ec, #3a86ff);\ntext-shadow: 0 0 10px rgba(255,255,255,0.2);\nanimation: bounce @r(6s, 12s) ease-in-out infinite;\n@keyframes bounce { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-40px) rotate(@r(-10deg, 10deg)); } }\n:hover { transform: scale(1.4) rotate(10deg); z-index: 100; }"
  },
  {
    "id": "none",
    "name": "Ninguno",
    "template": ""
  }
];
