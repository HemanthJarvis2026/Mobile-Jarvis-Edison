/* ---------- WEATHER ---------- */
const WMO = {
  0:"clear sky",1:"mainly clear",2:"partly cloudy",3:"overcast",45:"foggy",48:"foggy",
  51:"light drizzle",53:"drizzle",55:"heavy drizzle",56:"freezing drizzle",57:"freezing drizzle",
  61:"light rain",63:"moderate rain",65:"heavy rain",66:"freezing rain",67:"freezing rain",
  71:"light snow",73:"moderate snow",75:"heavy snow",77:"snow grains",
  80:"light rain showers",81:"rain showers",82:"violent rain showers",
  85:"snow showers",86:"heavy snow showers",95:"thunderstorm",96:"thunderstorm with hail",99:"thunderstorm with heavy hail"
};
const compass = d => ["N","NE","E","SE","S","SW","W","NW"][Math.round(d / 45) % 8];
const hhmm = iso => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location is not supported on this device."));
    navigator.geolocation.getCurrentPosition(resolve,
      () => reject(new Error("I need location permission for weather.")),
      { timeout: 10000, maximumAge: 300000 });
  });
}

async function cityName(lat, lon) {
  try {
    const d = await (await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
      lat + "&longitude=" + lon + "&localityLanguage=en")).json();
    return d.city || d.locality || d.principalSubdivision || "your location";
  } catch { return "your location"; }
}

async function getWeather(text) {
  try {
    let lat, lon, place;

    // "weather in Mumbai" -> look up that city; otherwise use GPS
    const m = text.match(/weather\s+(?:in|at|for|of)\s+([\p{L}\s.'-]+?)(?:\s+(?:today|now|tomorrow|right now))?\s*[?.!]*$/iu);
    if (m && m[1].trim()) {
      const g = await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
        encodeURIComponent(m[1].trim()))).json();
