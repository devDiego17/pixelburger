// Pixel art 16x16 de los peluches/hamburguesas (mismo arte del juego de la garra).
export const PAL: Record<string, string> = {
  k: "#15131F", b: "#E8A33D", B: "#C47F22", s: "#FFF1C9", g: "#5BC25B", y: "#FFC83D", m: "#7A4330",
  r: "#D2384A", R: "#9E2236", w: "#F5F1E8", p: "#FF4F8B", o: "#FFD24A", O: "#C9921A", h: "#E8613A", c: "#FFF6E0",
};

const CLASICA = [
  "................", "....kkkkkkkk....", "..kkbbbbbbbbkk..", ".kbbbsbbbbsbbbk.", ".kbbbbbbbbbbbbk.",
  "kbbwkbbbbbbwkbbk", "kbbkkbbbbbbkkbbk", "kbbbbbbkkbbbbbbk", "kggggggggggggggk", "kyyyyyyyyyyyyyyk",
  "kmmmmmmmmmmmmmmk", "kmmmmmmmmmmmmmmk", "kBbbbbbbbbbbbbBk", ".kBbbbbbbbbbbBk.", "..kkkkkkkkkkkk..", "................",
];
const MONTANERA = CLASICA.slice(); MONTANERA[9] = "khghhhhhghhhhghk"; MONTANERA[10] = "krrRrrmmmmrrRrrk";
const CHEESE = CLASICA.slice(); CHEESE[8] = "kyyyyyyyyyyyyyyk"; CHEESE[10] = "kmymmmymmmmymmmk"; CHEESE[13] = ".kBbbybbbbbybBk.";
const CHORIZO = [
  "................", "................", "................", "...kkkkkkkkkk...", "..krrrrrrrrrrk..",
  ".krrRrrrrrrRrrk.", "krrrwkrrrrwkrrrk", "krrrkkrrrrkkrrrk", "krRrrrrkkrrrrRrk", "krrrrrrrrrrrrrrk",
  ".krrRrrrrrrRrrk.", "..krrrrrrrrrrk..", "...kkkkkkkkkk...", "................", "................", "................",
];
const BYTE = CLASICA.slice(); BYTE[5] = "kbkkkkkkkkkkkkbk"; BYTE[6] = "kbkkwkbbbkkwkkbk"; BYTE[7] = "kbbkkkbbbbkkkbbk"; BYTE[14] = "..kkkkkkkkkkkk.."; BYTE[15] = "...pp......pp...";
const DORADA = CLASICA.map((row, i) => (i >= 5 && i <= 7) ? row.replace(/b/g, "o").replace(/B/g, "O") :
  row.replace(/[bgym]/g, "o").replace(/B/g, "O").replace(/s/g, "w"));

export const SPRITES: Record<string, string[]> = { clasica: CLASICA, montanera: MONTANERA, cheese: CHEESE, chorizo: CHORIZO, byte: BYTE, dorada: DORADA };
