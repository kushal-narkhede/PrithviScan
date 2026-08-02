/**
 * Nearby market / mandi suggestions from a curated India list.
 * Distances are great-circle estimates — verify hours, fees, and today’s rates locally.
 */

export const MARKETS = [
  { id: "azadpur-delhi", name: "Azadpur Mandi", place: "Delhi", lat: 28.7103, lon: 77.1722, goods: "Vegetables, fruits", type: "APMC / wholesale" },
  { id: "narela-delhi", name: "Narela Grain Market", place: "Delhi", lat: 28.8529, lon: 77.0932, goods: "Wheat, grains", type: "APMC" },
  { id: "ghazipur-delhi", name: "Ghazipur Mandi", place: "Delhi", lat: 28.625, lon: 77.328, goods: "Vegetables, fruits", type: "APMC" },
  { id: "karnal", name: "Karnal Grain Market", place: "Haryana", lat: 29.6857, lon: 76.9905, goods: "Wheat, paddy, maize", type: "APMC" },
  { id: "ambala", name: "Ambala Mandi", place: "Haryana", lat: 30.3782, lon: 76.7767, goods: "Wheat, paddy", type: "APMC" },
  { id: "hisar", name: "Hisar Grain Market", place: "Haryana", lat: 29.1492, lon: 75.7217, goods: "Cotton, wheat, mustard", type: "APMC" },
  { id: "sirsa", name: "Sirsa Mandi", place: "Haryana", lat: 29.5321, lon: 75.0318, goods: "Cotton, wheat", type: "APMC" },
  { id: "ludhiana", name: "Ludhiana Grain Market", place: "Punjab", lat: 30.901, lon: 75.8573, goods: "Wheat, paddy", type: "APMC" },
  { id: "amritsar", name: "Amritsar Mandi", place: "Punjab", lat: 31.634, lon: 74.8723, goods: "Wheat, paddy", type: "APMC" },
  { id: "bathinda", name: "Bathinda Mandi", place: "Punjab", lat: 30.211, lon: 74.9455, goods: "Cotton, wheat", type: "APMC" },
  { id: "jaipur", name: "Muhana Mandi", place: "Jaipur, Rajasthan", lat: 26.8467, lon: 75.79, goods: "Vegetables, grains", type: "APMC" },
  { id: "kota", name: "Kota Grain Market", place: "Rajasthan", lat: 25.2138, lon: 75.8648, goods: "Soybean, coriander, wheat", type: "APMC" },
  { id: "sri-ganganagar", name: "Sri Ganganagar Mandi", place: "Rajasthan", lat: 29.9038, lon: 73.8772, goods: "Cotton, wheat, mustard", type: "APMC" },
  { id: "ahmedabad", name: "Jamalpur / APMC Ahmedabad", place: "Gujarat", lat: 23.0225, lon: 72.5714, goods: "Cotton, groundnut, veggies", type: "APMC" },
  { id: "rajkot", name: "Rajkot APMC", place: "Gujarat", lat: 22.3039, lon: 70.8022, goods: "Groundnut, cotton, spices", type: "APMC" },
  { id: "indore", name: "Indore Grain Mandi", place: "Madhya Pradesh", lat: 22.7196, lon: 75.8577, goods: "Soybean, wheat, pulses", type: "APMC" },
  { id: "bhopal", name: "Bhopal Mandi", place: "Madhya Pradesh", lat: 23.2599, lon: 77.4126, goods: "Wheat, soybean, gram", type: "APMC" },
  { id: "nagpur", name: "Kalamna / Nagpur Mandi", place: "Maharashtra", lat: 21.1458, lon: 79.0882, goods: "Orange, cotton, grains", type: "APMC" },
  { id: "pune", name: "Market Yard Pune", place: "Maharashtra", lat: 18.5204, lon: 73.8567, goods: "Vegetables, onion, grains", type: "APMC" },
  { id: "nashik", name: "Nashik APMC", place: "Maharashtra", lat: 19.9975, lon: 73.7898, goods: "Onion, grapes, veggies", type: "APMC" },
  { id: "solapur", name: "Solapur Mandi", place: "Maharashtra", lat: 17.6599, lon: 75.9064, goods: "Jowar, pulses, veggies", type: "APMC" },
  { id: "hyderabad", name: "Gudimalkapur / Bowenpally", place: "Telangana", lat: 17.385, lon: 78.4867, goods: "Vegetables, fruits", type: "Wholesale" },
  { id: "warangal", name: "Warangal Grain Market", place: "Telangana", lat: 17.9689, lon: 79.5941, goods: "Paddy, cotton, chilli", type: "APMC" },
  { id: "vijayawada", name: "Vijayawada Agricultural Market", place: "Andhra Pradesh", lat: 16.5062, lon: 80.648, goods: "Paddy, chilli, mango", type: "APMC" },
  { id: "bengaluru", name: "Yeshwanthpur / KR Market area", place: "Karnataka", lat: 12.9916, lon: 77.5712, goods: "Vegetables, flowers, grains", type: "APMC / wholesale" },
  { id: "hubballi", name: "Hubballi APMC", place: "Karnataka", lat: 15.3647, lon: 75.124, goods: "Cotton, chilli, jowar", type: "APMC" },
  { id: "chennai", name: "Koyambedu Market", place: "Tamil Nadu", lat: 13.0694, lon: 80.1948, goods: "Vegetables, fruits", type: "Wholesale" },
  { id: "coimbatore", name: "Coimbatore Market Committee", place: "Tamil Nadu", lat: 11.0168, lon: 76.9558, goods: "Coconut, veggies, cotton", type: "APMC" },
  { id: "madurai", name: "Madurai Mattuthavani area markets", place: "Tamil Nadu", lat: 9.9252, lon: 78.1198, goods: "Vegetables, jasmine, grains", type: "Wholesale" },
  { id: "kochi", name: "Ernakulam / Kochi markets", place: "Kerala", lat: 9.9312, lon: 76.2673, goods: "Spices, coconut, veggies", type: "Wholesale" },
  { id: "kolkata", name: "Mechua / Howrah wholesale belt", place: "West Bengal", lat: 22.5726, lon: 88.3639, goods: "Vegetables, potato, rice", type: "Wholesale" },
  { id: "siliguri", name: "Siliguri Regulated Market", place: "West Bengal", lat: 26.7271, lon: 88.3953, goods: "Tea, veggies, maize", type: "APMC" },
  { id: "patna", name: "Patna Agricultural Market", place: "Bihar", lat: 25.5941, lon: 85.1376, goods: "Vegetables, grains", type: "APMC" },
  { id: "muzaffarpur", name: "Muzaffarpur Mandi", place: "Bihar", lat: 26.1209, lon: 85.3647, goods: "Litchi, veggies, maize", type: "APMC" },
  { id: "lucknow", name: "Lucknow Mandi Parishad yards", place: "Uttar Pradesh", lat: 26.8467, lon: 80.9462, goods: "Wheat, veggies, mango", type: "APMC" },
  { id: "kanpur", name: "Kanpur Grain Market", place: "Uttar Pradesh", lat: 26.4499, lon: 80.3319, goods: "Wheat, oilseeds", type: "APMC" },
  { id: "varanasi", name: "Varanasi Mandi", place: "Uttar Pradesh", lat: 25.3176, lon: 82.9739, goods: "Vegetables, grains", type: "APMC" },
  { id: "agra", name: "Agra Mandi", place: "Uttar Pradesh", lat: 27.1767, lon: 78.0081, goods: "Potato, wheat, veggies", type: "APMC" },
  { id: "raipur", name: "Raipur Agricultural Market", place: "Chhattisgarh", lat: 21.2514, lon: 81.6296, goods: "Paddy, pulses", type: "APMC" },
  { id: "ranchi", name: "Ranchi Vegetable / Grain markets", place: "Jharkhand", lat: 23.3441, lon: 85.3096, goods: "Vegetables, maize", type: "Wholesale" },
  { id: "bhubaneswar", name: "Bhubaneswar / Cuttack mandis", place: "Odisha", lat: 20.2961, lon: 85.8245, goods: "Paddy, veggies", type: "APMC" },
  { id: "guwahati", name: "Guwahati Wholesale Markets", place: "Assam", lat: 26.1445, lon: 91.7362, goods: "Vegetables, rice, tea", type: "Wholesale" },
  { id: "chandigarh", name: "Chandigarh Grain / Sector markets", place: "Chandigarh / Tricity", lat: 30.7333, lon: 76.7794, goods: "Wheat, veggies", type: "APMC / wholesale" },
  { id: "dehradun", name: "Dehradun Mandi", place: "Uttarakhand", lat: 30.3165, lon: 78.0322, goods: "Vegetables, fruits", type: "APMC" },
  { id: "shimla", name: "Shimla / Solan produce belt", place: "Himachal Pradesh", lat: 31.1048, lon: 77.1734, goods: "Apple, veggies", type: "Wholesale" },
];

function toRad(d) {
  return (d * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return nearest markets, optionally biased toward crop keywords. */
export function nearestMarkets(lat, lon, { limit = 6, cropHint = "" } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  const hint = String(cropHint || "").toLowerCase();
  return MARKETS.map((m) => {
    const km = haversineKm(lat, lon, m.lat, m.lon);
    const goods = (m.goods || "").toLowerCase();
    const relevance = hint && goods.includes(hint) ? 1 : 0;
    return { ...m, km, relevance };
  })
    .sort((a, b) => b.relevance - a.relevance || a.km - b.km)
    .slice(0, limit)
    .map(({ relevance, ...rest }) => rest);
}

export function mapsLink(lat, lon, name) {
  const q = encodeURIComponent(`${name} ${lat},${lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
