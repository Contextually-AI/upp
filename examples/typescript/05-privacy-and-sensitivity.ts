/**
 * UPP Privacy and Sensitivity — Working with Sensitivity Tiers.
 *
 * Demonstrates how UPP handles privacy through sensitivity tiers on labels:
 * 1. Loading the ontology and examining sensitivity tiers
 * 2. Understanding the tier hierarchy
 * 3. Filtering labels by sensitivity for access policies
 * 4. Label metadata summary (cardinality, durability distributions)
 *
 * Sensitivity Tiers (least to most sensitive):
 *     tier_public    — Safe to share broadly
 *     tier_work      — Professional context
 *     tier_personal  — Personal but non-sensitive
 *     tier_sensitive — Sensitive personal data
 *     tier_internal  — Never shared externally
 *
 * Expected output:
 *     === Loaded Ontology ===
 *     Loaded N labels from the default ontology
 *
 *     === Labels by Sensitivity Tier ===
 *     tier_public (N labels):
 *       ...
 *     tier_work (N labels):
 *       ...
 *     ...
 *
 *     === Sensitivity Hierarchy ===
 *     tier_public < tier_work < tier_personal < tier_sensitive < tier_internal
 *
 *     === Access Policy Example ===
 *     Shareable labels (public + work): N
 *     Restricted labels (personal + sensitive + internal): N
 *
 *     === Label Metadata Summary ===
 *     Categories: HOW, META, PREF, ...
 *     Singular: N, Plural: N
 *     Permanent: N, Transient: N, Ephemeral: N
 */

import {
  loadDefaultOntology,
  SENSITIVITY_TIER_VALUES,
  type LabelDefinition,
  type SensitivityTier,
} from "../../implementations/typescript/src/index.js";

function main(): void {
  // =========================================================================
  // 1. Load the ontology
  // =========================================================================
  console.log("=== Loaded Ontology ===");
  const labels = loadDefaultOntology();
  console.log(`Loaded ${labels.length} labels from the default ontology`);
  console.log();

  // =========================================================================
  // 2. Group labels by sensitivity tier
  // =========================================================================
  console.log("=== Labels by Sensitivity Tier ===");

  const byTier: Record<string, LabelDefinition[]> = {};
  for (const label of labels) {
    const tier = label.sensitivity;
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(label);
  }

  // Display in order from least to most sensitive
  const tierOrder: SensitivityTier[] = [
    "tier_public",
    "tier_work",
    "tier_personal",
    "tier_sensitive",
    "tier_internal",
  ];

  for (const tier of tierOrder) {
    const tierLabels = byTier[tier] ?? [];
    console.log(`\n  ${tier} (${tierLabels.length} labels):`);
    const sorted = [...tierLabels].sort((a, b) => a.name.localeCompare(b.name));
    for (const label of sorted.slice(0, 5)) {
      console.log(`    - ${label.name}: ${label.description}`);
    }
    if (sorted.length > 5) {
      console.log(`    ... and ${sorted.length - 5} more`);
    }
  }
  console.log();

  // =========================================================================
  // 3. Sensitivity hierarchy
  // =========================================================================
  console.log("=== Sensitivity Hierarchy ===");
  console.log(`  ${tierOrder.join(" < ")}`);
  console.log();

  // =========================================================================
  // 4. Access policy example
  // =========================================================================
  console.log("=== Access Policy Example ===");
  console.log();

  // A vendor might have a policy: "Only share tier_public and tier_work labels"
  const shareableTiers = new Set<SensitivityTier>(["tier_public", "tier_work"]);
  const shareable = labels.filter((l) => shareableTiers.has(l.sensitivity));
  const restricted = labels.filter((l) => !shareableTiers.has(l.sensitivity));

  console.log(`  Shareable labels (public + work): ${shareable.length}`);
  for (const l of [...shareable].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5)) {
    console.log(`    - ${l.name} [${l.sensitivity}]`);
  }
  if (shareable.length > 5) {
    console.log(`    ... and ${shareable.length - 5} more`);
  }

  console.log(`  Restricted labels (personal + sensitive + internal): ${restricted.length}`);
  for (const l of [...restricted].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5)) {
    console.log(`    - ${l.name} [${l.sensitivity}]`);
  }
  if (restricted.length > 5) {
    console.log(`    ... and ${restricted.length - 5} more`);
  }
  console.log();

  // =========================================================================
  // 5. Label metadata summary
  // =========================================================================
  console.log("=== Label Metadata Summary ===");
  console.log();

  const categories = [...new Set(labels.map((l) => l.category))].sort();
  console.log(`  Categories: ${categories.join(", ")}`);

  const singular = labels.filter((l) => l.cardinality === "singular").length;
  const plural = labels.filter((l) => l.cardinality === "plural").length;
  console.log(`  Singular: ${singular}, Plural: ${plural}`);

  const permanent = labels.filter((l) => l.durability === "permanent").length;
  const transient = labels.filter((l) => l.durability === "transient").length;
  const ephemeral = labels.filter((l) => l.durability === "ephemeral").length;
  console.log(`  Permanent: ${permanent}, Transient: ${transient}, Ephemeral: ${ephemeral}`);
}

main();
