# Field classifier — model ops (3.1)

## Goals
- Retrain from EuroSAT (or prepared folders)
- Version every artifact
- Keep a local registry with accuracy metadata
- Fall back to RGB heuristics when the model is missing

## Train (Windows)

```bat
ml\train_eurosat.bat
```

Or:

```bat
python -m ml.train_field_classifier --eurosat "D:\Kushal\EuroSAT_RGB\EuroSAT_RGB"
```

## Artifacts

| Path | Purpose |
|------|---------|
| `ml/models/field_classifier.joblib` | Active model (latest) |
| `ml/models/field_classifier_meta.json` | Active metadata (version, accuracy, F1, confusion matrix) |
| `ml/models/versions/field_classifier_<version>.joblib` | Immutable versioned copy |
| `ml/models/registry.json` | Append-only local registry; `active` flags the current model |

## Fallback
`ml/infer_field.py` and Cloud Function `classifyLocation` use vegetation heuristics (`heuristic_v1`) when no trained weights are available.

## Production roadmap
1. CI job: download EuroSAT → train → unit-test accuracy floor → upload artifact
2. Store models in Artifact Registry / GCS
3. A/B: route % of `classifyLocation` traffic by `model.version`
4. Promote only if accuracy/F1 ≥ previous active + no latency regression

## Edge (3.6)
Export path (future): convert sklearn/CNN → ONNX or TensorFlow Lite for on-device photo classification.
