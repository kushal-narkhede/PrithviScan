"use strict";

/**
 * Run a sklearn RandomForest exported as JSON (see ml/export_rf_json.py).
 */

const fs = require("fs");
const path = require("path");

const MODEL_PATH = path.join(__dirname, "..", "models", "field_classifier.json");

let cached = null;

function loadRfModel() {
  if (cached) return cached;
  if (!fs.existsSync(MODEL_PATH)) return null;
  cached = JSON.parse(fs.readFileSync(MODEL_PATH, "utf8"));
  return cached;
}

function walkTree(tree, x) {
  let node = 0;
  const { children_left, children_right, feature, threshold, value } = tree;
  while (children_left[node] !== -1) {
    const f = feature[node];
    node = x[f] <= threshold[node] ? children_left[node] : children_right[node];
  }
  const counts = value[node];
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return counts.map((c) => c / total);
}

/**
 * @param {number[]} featureVector length = model.n_features
 * @returns {{ fieldProbability: number, model: object } | null}
 */
function predictRf(featureVector) {
  const model = loadRfModel();
  if (!model?.trees?.length) return null;

  const classIndex = model.classes.indexOf(1);
  if (classIndex < 0) return null;

  let sum = 0;
  for (const tree of model.trees) {
    const proba = walkTree(tree, featureVector);
    sum += proba[classIndex] || 0;
  }
  const fieldProbability = sum / model.trees.length;
  return {
    fieldProbability,
    model,
  };
}

function featureVectorFromDict(features, order) {
  return order.map((k) => Number(features[k]) || 0);
}

module.exports = {
  loadRfModel,
  predictRf,
  featureVectorFromDict,
  MODEL_PATH,
};
