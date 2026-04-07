/**
 * location.js — Geolocalización y colores de bandera por país
 * Obtiene el país del usuario y devuelve hasta 6 colores hex.
 * Si hay menos de 6, completa con complementos RGB.
 */

// Colores tradicionales del cubo de Rubik (orden estándar: U=blanco, D=amarillo, F=rojo, B=naranja, L=verde, R=azul)
export const CLASSIC_COLORS = ['#FFFFFF','#FFFF00','#FF0000','#FF8C00','#009B48','#0046AD'];

const FLAG_COLORS = {
  AR: ['#74ACDF','#FFFFFF','#F6B40E'],           // Argentina
  BR: ['#009C3B','#FFDF00','#002776','#FFFFFF'],  // Brasil
  US: ['#B22234','#FFFFFF','#3C3B6E'],            // EE.UU.
  MX: ['#006847','#FFFFFF','#CE1126'],            // México
  ES: ['#AA151B','#F1BF00'],                      // España
  FR: ['#002395','#FFFFFF','#ED2939'],            // Francia
  DE: ['#000000','#DD0000','#FFCE00'],            // Alemania
  IT: ['#009246','#FFFFFF','#CE2B37'],            // Italia
  GB: ['#012169','#FFFFFF','#C8102E'],            // Reino Unido
  JP: ['#FFFFFF','#BC002D'],                      // Japón
  CN: ['#DE2910','#FFDE00'],                      // China
  RU: ['#FFFFFF','#0039A6','#D52B1E'],            // Rusia
  CA: ['#FF0000','#FFFFFF'],                      // Canadá
  AU: ['#00008B','#FFFFFF','#FF0000'],            // Australia
  IN: ['#FF9933','#FFFFFF','#138808','#000080'],  // India
  KR: ['#FFFFFF','#CD2E3A','#0047A0','#000000'],  // Corea del Sur
  PT: ['#006600','#FF0000','#FFFF00'],            // Portugal
  CL: ['#D52B1E','#FFFFFF','#003087'],            // Chile
  CO: ['#FCD116','#003087','#CE1126'],            // Colombia
  PE: ['#D91023','#FFFFFF'],                      // Perú
  VE: ['#CF142B','#00247D','#009E60','#FFFF00'],  // Venezuela
  UY: ['#FFFFFF','#0038A8','#FCD116'],            // Uruguay
  PY: ['#D52B1E','#FFFFFF','#0038A8'],            // Paraguay
  BO: ['#D52B1E','#F4E400','#007A3D'],            // Bolivia
  EC: ['#FFD100','#003893','#FF0000'],            // Ecuador
  ZA: ['#007A4D','#FFB81C','#DE3831','#002395','#FFFFFF','#000000'], // Sudáfrica
  NG: ['#008751','#FFFFFF'],                      // Nigeria
  EG: ['#CE1126','#FFFFFF','#000000'],            // Egipto
  SA: ['#006C35','#FFFFFF'],                      // Arabia Saudita
  TR: ['#E30A17','#FFFFFF'],                      // Turquía
  PL: ['#FFFFFF','#DC143C'],                      // Polonia
  NL: ['#AE1C28','#FFFFFF','#21468B'],            // Países Bajos
  SE: ['#006AA7','#FECC02'],                      // Suecia
  NO: ['#EF2B2D','#FFFFFF','#002868'],            // Noruega
  CH: ['#FF0000','#FFFFFF'],                      // Suiza
  UA: ['#005BBB','#FFD500'],                      // Ucrania
  DEFAULT: ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF'],
};

// Complemento RGB de un color hex
function complementHex(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const toHex = n => n.toString(16).padStart(2,'0');
  return `#${toHex(255-r)}${toHex(255-g)}${toHex(255-b)}`;
}

// Asegura exactamente 6 colores únicos
function ensureSixColors(colors) {
  const result = [...colors];
  let i = 0;
  while (result.length < 6) {
    const comp = complementHex(result[i % result.length]);
    if (!result.includes(comp)) result.push(comp);
    else result.push(`#${Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0')}`);
    i++;
  }
  return result.slice(0, 6);
}

// Obtener país desde coordenadas usando la API de geocoding abierta
async function getCountryFromCoords(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    return data?.address?.country_code?.toUpperCase() || null;
  } catch {
    return null;
  }
}

// Flujo principal: pide geolocalización y devuelve { colors, country }
export async function resolveColors() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ colors: ensureSixColors(FLAG_COLORS.DEFAULT), country: 'DEFAULT' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const country = await getCountryFromCoords(latitude, longitude);
        const base = FLAG_COLORS[country] || FLAG_COLORS.DEFAULT;
        resolve({ colors: ensureSixColors(base), country: country || 'DEFAULT' });
      },
      () => {
        // Usuario denegó o error
        resolve({ colors: ensureSixColors(FLAG_COLORS.DEFAULT), country: 'DEFAULT' });
      },
      { timeout: 8000 }
    );
  });
}

export { ensureSixColors, FLAG_COLORS };

// Devuelve un país al azar de la paleta (excluye DEFAULT)
export function randomCountry() {
  const keys = Object.keys(FLAG_COLORS).filter(k => k !== 'DEFAULT');
  const code = keys[Math.floor(Math.random() * keys.length)];
  return { colors: ensureSixColors(FLAG_COLORS[code]), country: code };
}
