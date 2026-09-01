import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const home = read('index.html');
const bolivar = read('nfts/bolivar1936/index.html');
const protectedSources = [
  'index.html',
  'css/styles.css',
  'css/gallery.css',
  'nfts/bolivar1936/index.html',
  'nfts/copiaiatalicum1918/index.html',
  'nfts/aa-1936-01/index.html',
  'nfts/aa-1965-01/index.html',
  'nfts/aa-1980-01/index.html',
];

const failures = [];
const requireMatch = (condition, message) => {
  if (!condition) failures.push(message);
};

requireMatch(
  /<h1>\s*Anima Argenta\s*<\/h1>/.test(home),
  'La portada debe conservar el nombre “Anima Argenta” sin estilos incrustados.',
);
requireMatch(
  /h1\s*\{[^}]*color:\s*white;[^}]*font-family:\s*Arial,\s*sans-serif;[^}]*font-size:\s*4rem;/s.test(home),
  'El nombre de la portada debe conservar su color blanco, tipografía Arial y tamaño original.',
);
requireMatch(
  /\.ficha\s*\{[^}]*background:\s*#222;/s.test(bolivar),
  'La ficha de Bolívar debe conservar el fondo oscuro #222.',
);

for (const path of protectedSources) {
  const source = read(path);
  requireMatch(
    !/background(?:-color)?\s*:\s*(?:red|#f00(?:000)?|rgb\(\s*255\s*,\s*0\s*,\s*0\s*\))\b/i.test(source),
    `${path} contiene un fondo rojo no autorizado.`,
  );
}

if (failures.length) {
  console.error('Publicación bloqueada por una regresión visual:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Contrato visual verificado.');
