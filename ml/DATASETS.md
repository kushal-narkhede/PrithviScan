# Field / non-field image datasets (~10,000+ samples)

Drop images into:

```
ml/data/field/       # agricultural fields / cropland
ml/data/not_field/   # city, water, forest, desert, roads, roofs
```

Then train:

```bash
cd /workspace   # or repo root
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
python -m ml.train_field_classifier
# optional CNN:
# pip install tensorflow
# python -m ml.train_field_classifier --cnn
```

---

## Best sources for ~10,000 labeled patches

### 1) EuroSAT (easiest start — ~27,000 tiles)
- **What:** Sentinel-2 64×64 patches, 10 land-cover classes including **AnnualCrop**, **PermanentCrop**, **Pasture**, plus urban/water/forest.
- **How to use for PrithviScan:** map crop/pasture → `field/`; Industrial/Residential/Highway/River/SeaLake/Forest → `not_field/`.
- **Link:** https://github.com/phelber/eurosat  
- **Size:** ~27k images (enough for your 10k target).

### 2) BigEarthNet
- **What:** Large Sentinel-2 archive with multi-label CORINE land cover.
- **Use:** filter cropland labels vs urban/water.
- **Link:** https://bigearth.net/

### 3) USDA Cropland Data Layer (CDL) + Landsat/Sentinel chips
- **What:** Annual US crop type map (not photos alone — pair with satellite chips you cut yourself).
- **Link:** https://nassgeodata.gmu.edu/CropScape/

### 4) Agriculture-Vision
- **What:** High-res farmland aerial images with anomaly labels.
- **Link:** https://www.agriculture-vision.com/

### 5) SpaceNet (farm / building footprints)
- **What:** Satellite imagery challenges; good non-field (buildings/roads) negatives.
- **Link:** https://spacenet.ai/

### 6) Radiant MLHub
- **What:** Curated geospatial ML datasets (crop type, land cover).
- **Link:** https://mlhub.earth/

### 7) DeepGlobe Land Cover
- **What:** Satellite land-cover segmentation (can sample cropland vs urban patches).
- **Link:** https://deepglobe.org/

### 8) Google Earth Engine exports (custom 10k)
- Sample random points on **MODIS/WorldCover/ESA WorldCover** cropland mask vs urban mask.
- Export 224×224 RGB chips from **Sentinel-2** or **HLS**.
- Best for *your* geography (India / target countries).

### 9) NASA HLS / Earthdata granules
- Cut chips around known farm polygons (your users’ fields once you have consent).
- Use NDVI/EVI bands for stronger features than RGB-only.

---

## Recommended path for PrithviScan

1. **Week 1:** Download **EuroSAT**, split into `field/` vs `not_field/`, train RandomForest (`python -m ml.train_field_classifier`).
2. **Week 2:** Add 2–3k local chips via Earth Engine for your target region.
3. **Week 3:** Train MobileNet CNN (`--cnn`) and replace heuristic in production.
4. Keep heuristic (`heuristic_v1`) as fallback when the model file is missing.

---

## Class balance tip

Aim for roughly:
- 5,000+ field
- 5,000+ not_field (mix city / water / forest / bare soil / roads)

Hard negatives (golf courses, parks, forest clearings) improve city-vs-field accuracy.
