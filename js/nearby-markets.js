/**
 * Nearby market suggestions — India APMC/mandi + US elevators / wholesale.
 * Distances are great-circle estimates — verify hours, fees, and today’s rates locally.
 */

import { detectRegion } from "./region.js";

export const MARKETS_IN = [
  { id: "azadpur-delhi", name: "Azadpur Mandi", place: "Delhi", lat: 28.7103, lon: 77.1722, goods: "Vegetables, fruits", type: "APMC / wholesale", region: "IN" },
  { id: "narela-delhi", name: "Narela Grain Market", place: "Delhi", lat: 28.8529, lon: 77.0932, goods: "Wheat, grains", type: "APMC", region: "IN" },
  { id: "ghazipur-delhi", name: "Ghazipur Mandi", place: "Delhi", lat: 28.625, lon: 77.328, goods: "Vegetables, fruits", type: "APMC", region: "IN" },
  { id: "karnal", name: "Karnal Grain Market", place: "Haryana", lat: 29.6857, lon: 76.9905, goods: "Wheat, paddy, maize", type: "APMC", region: "IN" },
  { id: "ambala", name: "Ambala Mandi", place: "Haryana", lat: 30.3782, lon: 76.7767, goods: "Wheat, paddy", type: "APMC", region: "IN" },
  { id: "hisar", name: "Hisar Grain Market", place: "Haryana", lat: 29.1492, lon: 75.7217, goods: "Cotton, wheat, mustard", type: "APMC", region: "IN" },
  { id: "sirsa", name: "Sirsa Mandi", place: "Haryana", lat: 29.5321, lon: 75.0318, goods: "Cotton, wheat", type: "APMC", region: "IN" },
  { id: "ludhiana", name: "Ludhiana Grain Market", place: "Punjab", lat: 30.901, lon: 75.8573, goods: "Wheat, paddy", type: "APMC", region: "IN" },
  { id: "amritsar", name: "Amritsar Mandi", place: "Punjab", lat: 31.634, lon: 74.8723, goods: "Wheat, paddy", type: "APMC", region: "IN" },
  { id: "bathinda", name: "Bathinda Mandi", place: "Punjab", lat: 30.211, lon: 74.9455, goods: "Cotton, wheat", type: "APMC", region: "IN" },
  { id: "jaipur", name: "Muhana Mandi", place: "Jaipur, Rajasthan", lat: 26.8467, lon: 75.79, goods: "Vegetables, grains", type: "APMC", region: "IN" },
  { id: "kota", name: "Kota Grain Market", place: "Rajasthan", lat: 25.2138, lon: 75.8648, goods: "Soybean, coriander, wheat", type: "APMC", region: "IN" },
  { id: "sri-ganganagar", name: "Sri Ganganagar Mandi", place: "Rajasthan", lat: 29.9038, lon: 73.8772, goods: "Cotton, wheat, mustard", type: "APMC", region: "IN" },
  { id: "ahmedabad", name: "Jamalpur / APMC Ahmedabad", place: "Gujarat", lat: 23.0225, lon: 72.5714, goods: "Cotton, groundnut, veggies", type: "APMC", region: "IN" },
  { id: "rajkot", name: "Rajkot APMC", place: "Gujarat", lat: 22.3039, lon: 70.8022, goods: "Groundnut, cotton, spices", type: "APMC", region: "IN" },
  { id: "indore", name: "Indore Grain Mandi", place: "Madhya Pradesh", lat: 22.7196, lon: 75.8577, goods: "Soybean, wheat, pulses", type: "APMC", region: "IN" },
  { id: "bhopal", name: "Bhopal Mandi", place: "Madhya Pradesh", lat: 23.2599, lon: 77.4126, goods: "Wheat, soybean, gram", type: "APMC", region: "IN" },
  { id: "nagpur", name: "Kalamna / Nagpur Mandi", place: "Maharashtra", lat: 21.1458, lon: 79.0882, goods: "Orange, cotton, grains", type: "APMC", region: "IN" },
  { id: "pune", name: "Market Yard Pune", place: "Maharashtra", lat: 18.5204, lon: 73.8567, goods: "Vegetables, onion, grains", type: "APMC", region: "IN" },
  { id: "nashik", name: "Nashik APMC", place: "Maharashtra", lat: 19.9975, lon: 73.7898, goods: "Onion, grapes, veggies", type: "APMC", region: "IN" },
  { id: "solapur", name: "Solapur Mandi", place: "Maharashtra", lat: 17.6599, lon: 75.9064, goods: "Jowar, pulses, veggies", type: "APMC", region: "IN" },
  { id: "hyderabad", name: "Gudimalkapur / Bowenpally", place: "Telangana", lat: 17.385, lon: 78.4867, goods: "Vegetables, fruits", type: "Wholesale", region: "IN" },
  { id: "warangal", name: "Warangal Grain Market", place: "Telangana", lat: 17.9689, lon: 79.5941, goods: "Paddy, cotton, chilli", type: "APMC", region: "IN" },
  { id: "vijayawada", name: "Vijayawada Agricultural Market", place: "Andhra Pradesh", lat: 16.5062, lon: 80.648, goods: "Paddy, chilli, mango", type: "APMC", region: "IN" },
  { id: "bengaluru", name: "Yeshwanthpur / KR Market area", place: "Karnataka", lat: 12.9916, lon: 77.5712, goods: "Vegetables, flowers, grains", type: "APMC / wholesale", region: "IN" },
  { id: "hubballi", name: "Hubballi APMC", place: "Karnataka", lat: 15.3647, lon: 75.124, goods: "Cotton, chilli, jowar", type: "APMC", region: "IN" },
  { id: "chennai", name: "Koyambedu Market", place: "Tamil Nadu", lat: 13.0694, lon: 80.1948, goods: "Vegetables, fruits", type: "Wholesale", region: "IN" },
  { id: "coimbatore", name: "Coimbatore Market Committee", place: "Tamil Nadu", lat: 11.0168, lon: 76.9558, goods: "Coconut, veggies, cotton", type: "APMC", region: "IN" },
  { id: "madurai", name: "Madurai Mattuthavani area markets", place: "Tamil Nadu", lat: 9.9252, lon: 78.1198, goods: "Vegetables, jasmine, grains", type: "Wholesale", region: "IN" },
  { id: "kochi", name: "Ernakulam / Kochi markets", place: "Kerala", lat: 9.9312, lon: 76.2673, goods: "Spices, coconut, veggies", type: "Wholesale", region: "IN" },
  { id: "kolkata", name: "Mechua / Howrah wholesale belt", place: "West Bengal", lat: 22.5726, lon: 88.3639, goods: "Vegetables, potato, rice", type: "Wholesale", region: "IN" },
  { id: "siliguri", name: "Siliguri Regulated Market", place: "West Bengal", lat: 26.7271, lon: 88.3953, goods: "Tea, veggies, maize", type: "APMC", region: "IN" },
  { id: "patna", name: "Patna Agricultural Market", place: "Bihar", lat: 25.5941, lon: 85.1376, goods: "Vegetables, grains", type: "APMC", region: "IN" },
  { id: "muzaffarpur", name: "Muzaffarpur Mandi", place: "Bihar", lat: 26.1209, lon: 85.3647, goods: "Litchi, veggies, maize", type: "APMC", region: "IN" },
  { id: "lucknow", name: "Lucknow Mandi Parishad yards", place: "Uttar Pradesh", lat: 26.8467, lon: 80.9462, goods: "Wheat, veggies, mango", type: "APMC", region: "IN" },
  { id: "kanpur", name: "Kanpur Grain Market", place: "Uttar Pradesh", lat: 26.4499, lon: 80.3319, goods: "Wheat, oilseeds", type: "APMC", region: "IN" },
  { id: "varanasi", name: "Varanasi Mandi", place: "Uttar Pradesh", lat: 25.3176, lon: 82.9739, goods: "Vegetables, grains", type: "APMC", region: "IN" },
  { id: "agra", name: "Agra Mandi", place: "Uttar Pradesh", lat: 27.1767, lon: 78.0081, goods: "Potato, wheat, veggies", type: "APMC", region: "IN" },
  { id: "raipur", name: "Raipur Agricultural Market", place: "Chhattisgarh", lat: 21.2514, lon: 81.6296, goods: "Paddy, pulses", type: "APMC", region: "IN" },
  { id: "ranchi", name: "Ranchi Vegetable / Grain markets", place: "Jharkhand", lat: 23.3441, lon: 85.3096, goods: "Vegetables, maize", type: "Wholesale", region: "IN" },
  { id: "bhubaneswar", name: "Bhubaneswar / Cuttack mandis", place: "Odisha", lat: 20.2961, lon: 85.8245, goods: "Paddy, veggies", type: "APMC", region: "IN" },
  { id: "guwahati", name: "Guwahati Wholesale Markets", place: "Assam", lat: 26.1445, lon: 91.7362, goods: "Vegetables, rice, tea", type: "Wholesale", region: "IN" },
  { id: "chandigarh", name: "Chandigarh Grain / Sector markets", place: "Chandigarh / Tricity", lat: 30.7333, lon: 76.7794, goods: "Wheat, veggies", type: "APMC / wholesale", region: "IN" },
  { id: "dehradun", name: "Dehradun Mandi", place: "Uttarakhand", lat: 30.3165, lon: 78.0322, goods: "Vegetables, fruits", type: "APMC", region: "IN" },
  { id: "shimla", name: "Shimla / Solan produce belt", place: "Himachal Pradesh", lat: 31.1048, lon: 77.1734, goods: "Apple, veggies", type: "Wholesale", region: "IN" },
];

/** Major US grain elevators, terminals, and produce wholesale hubs */
export const MARKETS_US = [
  { id: "chicago-cbot", name: "Chicago Board of Trade / river elevators", place: "Illinois", lat: 41.8781, lon: -87.6298, goods: "Corn, soybeans, wheat", type: "Terminal / futures hub", region: "US" },
  { id: "kansas-city", name: "Kansas City Board of Trade belt", place: "Missouri / Kansas", lat: 39.0997, lon: -94.5786, goods: "Wheat, corn, sorghum", type: "Terminal elevator", region: "US" },
  { id: "minneapolis", name: "Minneapolis grain exchange area", place: "Minnesota", lat: 44.9778, lon: -93.265, goods: "Wheat, soybeans, corn", type: "Terminal elevator", region: "US" },
  { id: "omaha", name: "Omaha / Council Bluffs elevators", place: "Nebraska", lat: 41.2565, lon: -95.9345, goods: "Corn, soybeans, cattle feed", type: "River elevator", region: "US" },
  { id: "des-moines", name: "Des Moines area elevators", place: "Iowa", lat: 41.5868, lon: -93.625, goods: "Corn, soybeans", type: "Country elevator", region: "US" },
  { id: "indianapolis", name: "Indianapolis grain terminals", place: "Indiana", lat: 39.7684, lon: -86.1581, goods: "Corn, soybeans, wheat", type: "Terminal elevator", region: "US" },
  { id: "st-louis", name: "St. Louis Mississippi elevators", place: "Missouri", lat: 38.627, lon: -90.1994, goods: "Corn, soybeans, wheat", type: "River terminal", region: "US" },
  { id: "memphis", name: "Memphis cotton / grain hub", place: "Tennessee", lat: 35.1495, lon: -90.049, goods: "Cotton, soybeans, rice", type: "Cotton / grain hub", region: "US" },
  { id: "new-orleans", name: "New Orleans export elevators", place: "Louisiana", lat: 29.9511, lon: -90.0715, goods: "Corn, soybeans, wheat export", type: "Export terminal", region: "US" },
  { id: "houston", name: "Houston Port / Gulf grain", place: "Texas", lat: 29.7604, lon: -95.3698, goods: "Cotton, sorghum, corn", type: "Export terminal", region: "US" },
  { id: "amarillo", name: "Amarillo / High Plains elevators", place: "Texas", lat: 35.222, lon: -101.8313, goods: "Wheat, cattle, sorghum", type: "Country elevator", region: "US" },
  { id: "wichita", name: "Wichita wheat elevators", place: "Kansas", lat: 37.6872, lon: -97.3301, goods: "Wheat, sorghum", type: "Country elevator", region: "US" },
  { id: "fargo", name: "Fargo / Red River elevators", place: "North Dakota", lat: 46.8772, lon: -96.7898, goods: "Wheat, soybeans, sugarbeet", type: "Country elevator", region: "US" },
  { id: "sioux-falls", name: "Sioux Falls elevators", place: "South Dakota", lat: 43.5446, lon: -96.7311, goods: "Corn, soybeans, wheat", type: "Country elevator", region: "US" },
  { id: "lincoln", name: "Lincoln elevators", place: "Nebraska", lat: 40.8136, lon: -96.7026, goods: "Corn, soybeans", type: "Country elevator", region: "US" },
  { id: "champaign", name: "Champaign–Urbana elevators", place: "Illinois", lat: 40.1164, lon: -88.2434, goods: "Corn, soybeans", type: "Country elevator", region: "US" },
  { id: "topeka", name: "Topeka elevators", place: "Kansas", lat: 39.0473, lon: -95.6752, goods: "Wheat, corn", type: "Country elevator", region: "US" },
  { id: "fresno", name: "Fresno produce markets", place: "California", lat: 36.7378, lon: -119.7871, goods: "Vegetables, nuts, fruit", type: "Wholesale produce", region: "US" },
  { id: "salinas", name: "Salinas Valley shippers", place: "California", lat: 36.6777, lon: -121.6555, goods: "Lettuce, berries, veggies", type: "Cooling / shipper hub", region: "US" },
  { id: "yakima", name: "Yakima Valley packers", place: "Washington", lat: 46.6021, lon: -120.5059, goods: "Apples, hops, cherries", type: "Packing / wholesale", region: "US" },
  { id: "idaho-falls", name: "Idaho Falls potato belt", place: "Idaho", lat: 43.4917, lon: -112.0339, goods: "Potatoes, barley, wheat", type: "Packing / elevator", region: "US" },
  { id: "grand-island", name: "Grand Island elevators", place: "Nebraska", lat: 40.9264, lon: -98.342, goods: "Corn, cattle feed", type: "Country elevator", region: "US" },
  { id: "lubbock", name: "Lubbock cotton / grain", place: "Texas", lat: 33.5779, lon: -101.8552, goods: "Cotton, sorghum, wheat", type: "Cotton / elevator", region: "US" },
  { id: "jonesboro", name: "Jonesboro rice elevators", place: "Arkansas", lat: 35.8423, lon: -90.7043, goods: "Rice, soybeans, cotton", type: "Rice dryer / elevator", region: "US" },
  { id: "columbia-sc", name: "Columbia regional markets", place: "South Carolina", lat: 34.0007, lon: -81.0348, goods: "Cotton, peanuts, veggies", type: "Regional wholesale", region: "US" },
  { id: "raleigh", name: "Raleigh / eastern NC markets", place: "North Carolina", lat: 35.7796, lon: -78.6382, goods: "Tobacco, sweet potato, soy", type: "Regional wholesale", region: "US" },
  { id: "lansing", name: "Lansing / MI elevators", place: "Michigan", lat: 42.7325, lon: -84.5555, goods: "Corn, soybeans, dry beans", type: "Country elevator", region: "US" },
  { id: "madison", name: "Madison / WI dairy–grain", place: "Wisconsin", lat: 43.0731, lon: -89.4012, goods: "Corn, dairy, soybeans", type: "Regional market", region: "US" },
  { id: "boise", name: "Boise Treasure Valley", place: "Idaho", lat: 43.615, lon: -116.2023, goods: "Potatoes, onions, wheat", type: "Packing / elevator", region: "US" },
  { id: "phoenix", name: "Phoenix produce terminals", place: "Arizona", lat: 33.4484, lon: -112.074, goods: "Lettuce, cotton, citrus", type: "Wholesale produce", region: "US" },
];

/** Combined list (backward compatible) */
export const MARKETS = [...MARKETS_IN, ...MARKETS_US];

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

export function marketsForRegion(region) {
  if (region === "US") return MARKETS_US;
  return MARKETS_IN;
}

/** Return nearest markets for the field's region, optionally biased toward crop keywords. */
export function nearestMarkets(lat, lon, { limit = 6, cropHint = "", region } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  const reg = region || detectRegion(lat, lon);
  const pool = marketsForRegion(reg);
  const hint = String(cropHint || "").toLowerCase();
  return pool
    .map((m) => {
      const km = haversineKm(lat, lon, m.lat, m.lon);
      const goods = (m.goods || "").toLowerCase();
      const relevance = hint && goods.includes(hint) ? 1 : 0;
      return { ...m, km, relevance, region: reg };
    })
    .sort((a, b) => b.relevance - a.relevance || a.km - b.km)
    .slice(0, limit)
    .map(({ relevance, ...rest }) => rest);
}

export function mapsLink(lat, lon, name) {
  const q = encodeURIComponent(`${name} ${lat},${lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function formatDistance(km, region = "IN") {
  if (region === "US") {
    const mi = km * 0.621371;
    return `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
  }
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
