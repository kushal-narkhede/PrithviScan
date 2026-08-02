/**
 * PrithviScan Knowledge Base — farm products, fertilizers, soils, crops.
 * Educational reference only — always confirm with local extension advice.
 */

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "fertilizer", label: "Fertilizers" },
  { id: "amendment", label: "Soil amendments" },
  { id: "soil", label: "Soil types" },
  { id: "crop", label: "Crops" },
  { id: "input", label: "Farm inputs" },
];

export const ENTRIES = [
  // —— Fertilizers ——
  {
    id: "urea",
    category: "fertilizer",
    name: "Urea",
    tags: ["nitrogen", "N", "top-dress", "cereals"],
    summary: "High-concentration nitrogen fertilizer for leafy growth.",
    composition: [
      { nutrient: "Nitrogen (N)", value: "46%" },
      { nutrient: "Form", value: "Amide nitrogen (CO(NH₂)₂)" },
    ],
    pros: [
      "Highest N content among common solid fertilizers — cost-efficient per unit N",
      "Works well for wheat, rice, maize, and leafy vegetables",
      "Easy to store and broadcast or band-apply",
    ],
    cons: [
      "Can burn crops if placed on wet foliage or over-applied",
      "Volatile: surface application without incorporation loses N as ammonia",
      "Does not supply phosphorus or potassium",
    ],
    tips: [
      "Split doses around tillering / panicle initiation rather than one heavy dose",
      "Incorporate or irrigate soon after application to reduce volatilization",
      "Avoid mixing with seed in the furrow",
    ],
    bestFor: ["Wheat", "Rice", "Maize", "Leafy greens"],
  },
  {
    id: "dap",
    category: "fertilizer",
    name: "DAP (Diammonium phosphate)",
    tags: ["phosphorus", "nitrogen", "basal", "NP"],
    summary: "Basal NP fertilizer that jump-starts root growth.",
    composition: [
      { nutrient: "Nitrogen (N)", value: "18%" },
      { nutrient: "Phosphorus (P₂O₅)", value: "46%" },
    ],
    pros: [
      "Strong starter for roots and early vigor",
      "Common, widely available basal fertilizer",
      "Useful in phosphorus-deficient soils",
    ],
    cons: [
      "Low potassium — often needs muriate of potash alongside",
      "Acidifying over time with continuous use",
      "Less ideal as the only mid-season nitrogen source",
    ],
    tips: [
      "Place near seed/row at sowing for best uptake",
      "Pair with urea later for full nitrogen need",
      "Test soil P before heavy annual DAP use",
    ],
    bestFor: ["Wheat", "Pulses", "Oilseeds", "Vegetables"],
  },
  {
    id: "mop",
    category: "fertilizer",
    name: "MOP / Muriate of potash (KCl)",
    tags: ["potassium", "K", "potash"],
    summary: "Primary potassium source for strength, fruiting, and stress tolerance.",
    composition: [
      { nutrient: "Potassium (K₂O)", value: "60%" },
      { nutrient: "Chloride", value: "Present (KCl)" },
    ],
    pros: [
      "Improves stalk strength, fruit quality, and drought tolerance",
      "High K analysis — efficient for K-hungry crops",
      "Affordable relative to sulphate of potash",
    ],
    cons: [
      "Chloride can stress sensitive crops (tobacco, some fruits) in excess",
      "Does not supply nitrogen or phosphorus",
      "Leaches more in sandy soils with heavy rain",
    ],
    tips: [
      "Apply before or at flowering for fruiting crops",
      "Prefer SOP (sulphate of potash) for chloride-sensitive crops",
      "Combine with balanced N and P programs",
    ],
    bestFor: ["Potato", "Banana", "Sugarcane", "Cotton", "Fruit trees"],
  },
  {
    id: "npk-19-19-19",
    category: "fertilizer",
    name: "NPK 19-19-19 (water soluble)",
    tags: ["balanced", "fertigation", "foliar", "NPK"],
    summary: "Balanced water-soluble NPK for fertigation and foliar sprays.",
    composition: [
      { nutrient: "N", value: "19%" },
      { nutrient: "P₂O₅", value: "19%" },
      { nutrient: "K₂O", value: "19%" },
    ],
    pros: [
      "Even NPK ratio for general vegetative growth",
      "Dissolves cleanly for drip fertigation",
      "Useful when soil tests show no single extreme deficiency",
    ],
    cons: [
      "More expensive per nutrient than bulk urea/DAP/MOP",
      "Not a substitute for correcting severe single-nutrient gaps",
      "Foliar rates must stay dilute to avoid leaf burn",
    ],
    tips: [
      "Use in drip systems in small frequent doses",
      "Match schedule to crop stage — switch to high-K grades near fruiting",
      "Flush drip lines periodically",
    ],
    bestFor: ["Vegetables", "Greenhouse crops", "Orchards"],
  },
  {
    id: "ssp",
    category: "fertilizer",
    name: "SSP (Single super phosphate)",
    tags: ["phosphorus", "sulphur", "basal"],
    summary: "Phosphorus fertilizer that also supplies sulphur and calcium.",
    composition: [
      { nutrient: "P₂O₅", value: "16%" },
      { nutrient: "Sulphur (S)", value: "~11–12%" },
      { nutrient: "Calcium", value: "Present as gypsum fraction" },
    ],
    pros: [
      "Adds sulphur — helpful for oilseeds and pulses",
      "Good basal option where both P and S are low",
      "Generally safer near seed than highly concentrated MAP/DAP if rates are moderate",
    ],
    cons: [
      "Lower P concentration than DAP — bulkier to transport",
      "Dusty handling",
      "Not a nitrogen source",
    ],
    tips: [
      "Ideal for mustard, groundnut, soybean where S matters",
      "Broadcast and incorporate before sowing",
    ],
    bestFor: ["Mustard", "Groundnut", "Soybean", "Pulses"],
  },
  {
    id: "compost",
    category: "amendment",
    name: "Farmyard manure / compost",
    tags: ["organic", "carbon", "microbes", "soil health"],
    summary: "Organic matter that feeds soil life and improves structure.",
    composition: [
      { nutrient: "N-P-K", value: "Low & variable (~0.5–1.5% N)" },
      { nutrient: "Organic carbon", value: "High" },
      { nutrient: "Microbes", value: "Present if well composted" },
    ],
    pros: [
      "Builds soil structure, water holding, and biology",
      "Slow nutrient release reduces leaching spikes",
      "Improves response to mineral fertilizers over seasons",
    ],
    cons: [
      "Low nutrient density — cannot meet full NPK alone for high-yield crops",
      "Immature compost can burn roots or tie up nitrogen",
      "Weed seeds if not properly heated",
    ],
    tips: [
      "Aim for well-rotted material (dark, earthy smell)",
      "Apply weeks before sowing when possible",
      "Combine with soil tests and mineral fertilizers for yield crops",
    ],
    bestFor: ["All crops", "Degraded soils", "Vegetable beds"],
  },
  {
    id: "gypsum",
    category: "amendment",
    name: "Gypsum (CaSO₄·2H₂O)",
    tags: ["calcium", "sulphur", "sodic", "structure"],
    summary: "Amendment for sodic soils and calcium/sulphur supply without raising pH much.",
    composition: [
      { nutrient: "Calcium", value: "~23%" },
      { nutrient: "Sulphur", value: "~18%" },
    ],
    pros: [
      "Helps reclaim sodic soils by displacing sodium",
      "Improves flocculation in some heavy clays",
      "Supplies S without liming effect of CaCO₃",
    ],
    cons: [
      "Not a lime substitute for acidic soils needing pH rise",
      "Needs moisture and time to react",
      "Overuse without diagnosis wastes money",
    ],
    tips: [
      "Use after soil test confirms sodicity or S deficiency",
      "Irrigate after application to move gypsum into the root zone",
    ],
    bestFor: ["Sodic soils", "Groundnut", "Pulses"],
  },
  {
    id: "lime",
    category: "amendment",
    name: "Agricultural lime",
    tags: ["pH", "acidic", "calcium", "liming"],
    summary: "Raises pH of acidic soils so nutrients become more available.",
    composition: [
      { nutrient: "Calcium carbonate / oxide", value: "Varies by product" },
      { nutrient: "Effect", value: "Increases soil pH" },
    ],
    pros: [
      "Corrects acid soils that lock up P and micronutrients",
      "Improves microbial activity in strongly acidic fields",
      "Long-lasting when incorporated well",
    ],
    cons: [
      "Wrong choice for already alkaline / sodic soils",
      "Slow — effects take weeks to months",
      "Can induce micronutrient shortages if over-limed",
    ],
    tips: [
      "Always lime based on soil test target pH",
      "Incorporate into topsoil; don’t leave as surface dust only",
    ],
    bestFor: ["Acid soils", "Tea regions (careful rates)", "Vegetables on low-pH land"],
  },

  // —— Soil types ——
  {
    id: "soil-loam",
    category: "soil",
    name: "Loam",
    tags: ["balanced", "ideal", "structure"],
    summary: "Balanced sand–silt–clay mix — often the most forgiving farm soil.",
    composition: [
      { nutrient: "Texture", value: "~40% sand, 40% silt, 20% clay (typical)" },
      { nutrient: "Drainage", value: "Good" },
      { nutrient: "Water holding", value: "Moderate–high" },
    ],
    pros: [
      "Easy to till when moisture is right",
      "Holds nutrients and water without staying waterlogged",
      "Suitable for a wide crop range",
    ],
    cons: [
      "Still needs organic matter and fertility management",
      "Can compact under heavy machinery when wet",
    ],
    tips: [
      "Maintain cover or residues to protect structure",
      "Add compost yearly to keep organic carbon rising",
    ],
    bestFor: ["Wheat", "Vegetables", "Maize", "Pulses", "Orchards"],
    growsBest: ["Most field and horticultural crops with balanced fertility"],
  },
  {
    id: "soil-clay",
    category: "soil",
    name: "Clay soil",
    tags: ["heavy", "sticky", "nutrient-rich"],
    summary: "Fine particles that hold water and nutrients but drain slowly.",
    composition: [
      { nutrient: "Texture", value: "High clay fraction" },
      { nutrient: "Drainage", value: "Slow" },
      { nutrient: "CEC", value: "High (holds nutrients well)" },
    ],
    pros: [
      "Naturally fertile if not waterlogged",
      "Retains moisture through dry spells",
      "Good for rice paddies when leveled",
    ],
    cons: [
      "Hard when dry, sticky when wet — narrow working window",
      "Poor aeration can stress roots",
      "Slow to warm in cool seasons",
    ],
    tips: [
      "Add organic matter and gypsum where sodic",
      "Avoid tillage when wet to prevent compaction",
      "Raised beds help vegetables",
    ],
    bestFor: ["Rice", "Wheat", "Cotton", "Sugarcane"],
    growsBest: ["Rice (with water control), deep-rooted crops once structure improves"],
  },
  {
    id: "soil-sandy",
    category: "soil",
    name: "Sandy soil",
    tags: ["light", "drainage", "leaching"],
    summary: "Coarse texture — drains fast, warms early, leaches nutrients.",
    composition: [
      { nutrient: "Texture", value: "High sand" },
      { nutrient: "Drainage", value: "Very fast" },
      { nutrient: "Water holding", value: "Low" },
    ],
    pros: [
      "Easy to work and plant",
      "Good for root crops that dislike wet feet",
      "Warms quickly for early sowing",
    ],
    cons: [
      "Nutrients and water leach quickly",
      "Drought stress is common",
      "Low organic matter unless constantly rebuilt",
    ],
    tips: [
      "Split fertilizer doses; prefer fertigation if possible",
      "Mulch and compost to raise water holding",
      "Choose drought-tolerant varieties",
    ],
    bestFor: ["Groundnut", "Potato", "Carrot", "Watermelon", "Millet"],
    growsBest: ["Root crops and drought-tolerant cereals with frequent light irrigation"],
  },
  {
    id: "soil-silt",
    category: "soil",
    name: "Silty soil",
    tags: ["fertile", "smooth", "erosion"],
    summary: "Fine fertile particles, often along river plains — productive but erodible.",
    composition: [
      { nutrient: "Texture", value: "High silt" },
      { nutrient: "Fertility", value: "Often high" },
      { nutrient: "Structure", value: "Can crust or erode" },
    ],
    pros: [
      "Naturally productive alluvial zones",
      "Good moisture retention vs sand",
      "Smooth seedbed when managed well",
    ],
    cons: [
      "Crusting after rain can block seedlings",
      "Wind/water erosion risk when bare",
      "Compaction possible",
    ],
    tips: [
      "Keep residue cover; avoid bare fallow on slopes",
      "Light cultivation after crusting rains if needed for emergence",
    ],
    bestFor: ["Wheat", "Rice", "Vegetables", "Sugarcane"],
    growsBest: ["Cereals and vegetables with erosion control"],
  },
  {
    id: "soil-black",
    category: "soil",
    name: "Black cotton / Vertisol",
    tags: ["cracking", "clay", "cotton belt"],
    summary: "Dark cracking clays common in cotton belts — fertile but swell/shrink.",
    composition: [
      { nutrient: "Clay minerals", value: "Smectite-rich" },
      { nutrient: "Behavior", value: "Swells wet, cracks dry" },
      { nutrient: "pH", value: "Often neutral–alkaline" },
    ],
    pros: [
      "High inherent fertility",
      "Excellent for cotton, sorghum, soybean in rainfed systems",
      "Stores substantial moisture",
    ],
    cons: [
      "Difficult tillage timing",
      "Waterlogging in depressions",
      "Can be hard on seedlings if crusted",
    ],
    tips: [
      "Broad-bed furrows help drainage and sowing windows",
      "Don’t work when overly wet",
    ],
    bestFor: ["Cotton", "Sorghum", "Soybean", "Chickpea"],
    growsBest: ["Cotton and rainfed pulses/oilseeds with moisture management"],
  },
  {
    id: "soil-red",
    category: "soil",
    name: "Red soil",
    tags: ["iron", "acidic", "porous"],
    summary: "Iron-rich soils, often porous and sometimes acidic — need fertility care.",
    composition: [
      { nutrient: "Color cause", value: "Iron oxides" },
      { nutrient: "Fertility", value: "Variable; often low organic matter" },
      { nutrient: "pH", value: "Often slightly acidic" },
    ],
    pros: [
      "Good drainage in many upland red soils",
      "Workable for millets, groundnut, pulses",
      "Responds well to organic matter + balanced NPK",
    ],
    cons: [
      "Nutrient and organic matter often deficient",
      "Erosion on slopes",
      "May need lime if strongly acidic",
    ],
    tips: [
      "Soil test for pH, P, and micronutrients (Zn, Fe)",
      "Contour farming on slopes",
    ],
    bestFor: ["Groundnut", "Millets", "Pulses", "Cotton (some regions)"],
    growsBest: ["Millets and legumes with compost + phosphorus"],
  },

  // —— Crops ——
  {
    id: "crop-wheat",
    category: "crop",
    name: "Wheat",
    tags: ["cereal", "rabi", "cool season"],
    summary: "Cool-season cereal — thrives on loams with timely nitrogen and irrigation.",
    composition: [
      { nutrient: "Key nutrients", value: "N (split), P basal, K as needed" },
      { nutrient: "Water", value: "Critical at crown root, flowering, grain fill" },
    ],
    pros: [
      "Wide adaptation with right variety",
      "Strong market demand",
      "Fits well after rice or pulses in rotations",
    ],
    cons: [
      "Heat stress at grain fill cuts yield sharply",
      "Lodging if excess N + wind/rain",
      "Disease pressure (rusts) needs resistant varieties",
    ],
    tips: [
      "Sow in the recommended window for your zone",
      "Split urea — avoid dumping all N at once",
      "Watch last irrigation near maturity",
    ],
    bestFor: ["Loam", "Clay loam", "Alluvial silt"],
    growsBest: ["Well-drained loams; avoid waterlogged heavy clay without leveling"],
  },
  {
    id: "crop-rice",
    category: "crop",
    name: "Rice",
    tags: ["cereal", "kharif", "paddy"],
    summary: "Needs reliable water; clay and clay-loam paddies excel when leveled.",
    composition: [
      { nutrient: "Key nutrients", value: "N in splits; P & K basal" },
      { nutrient: "Water", value: "Standing or saturated soil for most systems" },
    ],
    pros: [
      "High calories per hectare under good water control",
      "Uses heavy soils that challenge other crops",
    ],
    cons: [
      "High water demand",
      "Methane / continuous flooding tradeoffs",
      "Blast and pests in humid seasons",
    ],
    tips: [
      "Laser leveling saves water and boosts uniformity",
      "Alternate wetting and drying where advised",
      "Don’t skip potassium on high-yield hybrids",
    ],
    bestFor: ["Clay", "Clay loam", "Lowland silt"],
    growsBest: ["Level clay paddies with dependable irrigation or monsoon"],
  },
  {
    id: "crop-maize",
    category: "crop",
    name: "Maize",
    tags: ["cereal", "kharif", "feed"],
    summary: "Warm-season cereal hungry for nitrogen and good drainage.",
    composition: [
      { nutrient: "Key nutrients", value: "High N; P & K for roots and grain" },
      { nutrient: "Water", value: "Sensitive at tasseling / silking" },
    ],
    pros: [
      "Fast biomass and versatile markets (food, feed, starch)",
      "Fits many rotations",
    ],
    cons: [
      "Drought at flowering hurts grain badly",
      "Heavy feeder — depletes fertility without returns",
      "Stem borers and fall armyworm pressure",
    ],
    tips: [
      "Side-dress N around knee-high",
      "Ensure drainage — maize hates waterlogging",
    ],
    bestFor: ["Loam", "Sandy loam", "Well-drained clay loam"],
    growsBest: ["Warm, well-drained soils with split nitrogen"],
  },
  {
    id: "crop-cotton",
    category: "crop",
    name: "Cotton",
    tags: ["fiber", "black soil", "cash crop"],
    summary: "Cash crop suited to black cotton soils and warm long seasons.",
    composition: [
      { nutrient: "Key nutrients", value: "Balanced NPK; watch K and micronutrients" },
      { nutrient: "Water", value: "Critical at flowering and boll formation" },
    ],
    pros: [
      "High value when pest pressure is managed",
      "Deep roots use stored moisture in vertisols",
    ],
    cons: [
      "Heavy pest / bollworm management cost",
      "Long season — weather risk",
      "Quality depends on picking and storage",
    ],
    tips: [
      "Prefer Bt / recommended hybrids for your zone",
      "Avoid excess early N that creates soft, pest-prone growth",
    ],
    bestFor: ["Black cotton", "Well-drained loam"],
    growsBest: ["Vertisols with warm temperatures and managed pests"],
  },
  {
    id: "crop-chickpea",
    category: "crop",
    name: "Chickpea (gram)",
    tags: ["pulse", "rabi", "nitrogen-fixing"],
    summary: "Rabi pulse that fixes nitrogen and likes well-drained soils.",
    composition: [
      { nutrient: "Key nutrients", value: "P & K important; modest starter N" },
      { nutrient: "Biology", value: "Rhizobium inoculation helps" },
    ],
    pros: [
      "Improves soil N for the next cereal",
      "Lower water need than many cereals",
      "Good rotation break crop",
    ],
    cons: [
      "Wilt and root rot in poorly drained fields",
      "Frost or heat at flowering can cut pods",
    ],
    tips: [
      "Inoculate seed with rhizobium when fields are new to chickpea",
      "Avoid waterlogging — raised beds help on heavy soils",
    ],
    bestFor: ["Sandy loam", "Light clay", "Black soil (drained)"],
    growsBest: ["Cool dry season on drained soils after monsoon crops"],
  },
  {
    id: "crop-tomato",
    category: "crop",
    name: "Tomato",
    tags: ["vegetable", "high value", "fertigation"],
    summary: "High-value vegetable needing fertile, well-drained beds and steady water.",
    composition: [
      { nutrient: "Key nutrients", value: "Balanced NPK; calcium to reduce blossom-end rot" },
      { nutrient: "pH", value: "Slightly acidic to neutral preferred" },
    ],
    pros: [
      "Strong market if quality and timing are right",
      "Responds very well to drip + fertigation",
    ],
    cons: [
      "Disease pressure (blights, viruses)",
      "Sensitive to irregular irrigation",
      "Labor intensive",
    ],
    tips: [
      "Mulch and drip to steady moisture",
      "Don’t overdo nitrogen in fruiting — favor K and Ca",
    ],
    bestFor: ["Loam", "Sandy loam"],
    growsBest: ["Raised beds on loam with drip irrigation"],
  },

  // —— Other farm inputs ——
  {
    id: "input-neem-cake",
    category: "input",
    name: "Neem cake",
    tags: ["organic", "pest", "nitrogen slow"],
    summary: "Oil-seed cake used as organic manure with mild pest-suppression benefits.",
    composition: [
      { nutrient: "N-P-K", value: "Low–moderate, slow release" },
      { nutrient: "Azadirachtin traces", value: "Variable" },
    ],
    pros: [
      "Adds organic matter and slow nutrients",
      "May discourage some soil pests / nematodes when used consistently",
      "Fits organic and integrated programs",
    ],
    cons: [
      "Not a standalone cure for severe pest outbreaks",
      "Quality varies by processor",
      "Smell and dust during handling",
    ],
    tips: [
      "Mix into soil before sowing rather than surface-only dumps",
      "Combine with soil tests — still need mineral nutrients for yield crops",
    ],
    bestFor: ["Vegetables", "Nurseries", "Organic plots"],
  },
  {
    id: "input-rhizobium",
    category: "input",
    name: "Rhizobium inoculant",
    tags: ["biofertilizer", "pulses", "nitrogen"],
    summary: "Living bacteria that help pulses fix atmospheric nitrogen in root nodules.",
    composition: [
      { nutrient: "Active ingredient", value: "Rhizobium / Bradyrhizobium strains" },
      { nutrient: "Form", value: "Carrier-based powder or liquid" },
    ],
    pros: [
      "Cheap biological nitrogen for legumes",
      "Improves nodulation on fields new to a pulse",
      "Reduces need for heavy starter N",
    ],
    cons: [
      "Strain must match the crop",
      "Heat, sun, and old stock kill the culture",
      "Won’t fix N for cereals",
    ],
    tips: [
      "Treat seed in shade; sow soon after inoculation",
      "Check expiry and keep cool",
      "Avoid mixing with harsh chemicals on seed unless label allows",
    ],
    bestFor: ["Chickpea", "Soybean", "Groundnut", "Lentil"],
  },
  {
    id: "input-mulch",
    category: "input",
    name: "Organic mulch",
    tags: ["water", "weeds", "soil cover"],
    summary: "Crop residue or straw cover that saves water and protects soil.",
    composition: [
      { nutrient: "Material", value: "Straw, leaves, residue (not plastic)" },
      { nutrient: "Effect", value: "Moisture + temperature + weed buffer" },
    ],
    pros: [
      "Cuts evaporation and weed pressure",
      "Feeds soil as it breaks down",
      "Reduces erosion and soil crusting",
    ],
    cons: [
      "Can harbor pests if too thick and wet",
      "May tie up nitrogen temporarily if high-carbon and mixed into soil",
      "Labor to apply",
    ],
    tips: [
      "Keep a few centimeters around stems, not piled against trunks",
      "Prefer locally available residue",
    ],
    bestFor: ["Vegetables", "Orchards", "Sandy soils"],
  },
];

export function searchEntries(query, category = "all") {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  return ENTRIES.filter((e) => {
    if (category !== "all" && e.category !== category) return false;
    if (!q) return true;
    const blob = [
      e.name,
      e.summary,
      ...(e.tags || []),
      ...(e.bestFor || []),
      ...(e.pros || []),
      ...(e.cons || []),
      ...(e.growsBest ? [e.growsBest] : []),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}

export function getEntry(id) {
  return ENTRIES.find((e) => e.id === id) || null;
}

export function soils() {
  return ENTRIES.filter((e) => e.category === "soil");
}

export function cropsForSoil(soilName) {
  const key = String(soilName || "").toLowerCase();
  return ENTRIES.filter(
    (e) =>
      e.category === "crop" &&
      (e.bestFor || []).some((b) => b.toLowerCase().includes(key) || key.includes(b.toLowerCase().split(" ")[0]))
  );
}
