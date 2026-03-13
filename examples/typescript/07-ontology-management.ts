/**
 * UPP Ontology Management — Loading and Querying Label Definitions.
 *
 * Demonstrates how to work with UPP ontologies:
 * 1. Loading the default ontology (user/v1)
 * 2. Looking up labels by name
 * 3. Browsing labels by category (5W+H)
 * 4. Using DefaultOntology class for server integration
 * 5. Ontology statistics
 *
 * Ontologies define the set of labels available for classifying events.
 * The default ontology is user/v1, containing labels organized in
 * 5W+H categories: WHO, WHAT, WHERE, WHEN, WHY, HOW, PREF, REL, META.
 *
 * Expected output:
 *     === Default Ontology ===
 *     Loaded N labels from user/v1
 *
 *     === Label Lookup ===
 *     who_name: Name (singular, permanent, tier_personal)
 *     what_skills: Skills (plural, transient, tier_work)
 *     ...
 *
 *     === Labels by Category ===
 *     HOW (N labels): ...
 *     META (N labels): ...
 *     ...
 *
 *     === DefaultOntology Class ===
 *     Ontologies: ['user/v1']
 *     Total labels via getLabels(): N
 *     ...
 *
 *     === Ontology Statistics ===
 *     Singular: N, Plural: N
 *     Permanent: N, Transient: N, Ephemeral: N
 */

import {
  loadDefaultOntology,
  getLabel,
  DefaultOntology,
  SENSITIVITY_TIER_VALUES,
  type SensitivityTier,
} from "../../implementations/typescript/src/index.js";

async function main(): Promise<void> {
  // =========================================================================
  // 1. Load the default ontology
  // =========================================================================
  console.log("=== Default Ontology ===");

  const labels = loadDefaultOntology();
  console.log(`Loaded ${labels.length} labels from user/v1`);
  console.log();

  // =========================================================================
  // 2. Look up specific labels
  // =========================================================================
  console.log("=== Label Lookup ===");

  const sampleLabels = ["who_name", "what_skills", "where_home", "what_preferences", "who_languages"];
  for (const name of sampleLabels) {
    const label = getLabel(name);
    if (label) {
      console.log(
        `  ${label.name}: ${label.display_name} ` +
          `(${label.cardinality}, ${label.durability}, ${label.sensitivity})`,
      );
      if (label.examples && label.examples.length > 0) {
        console.log(`    Examples: ${label.examples.slice(0, 3).join(", ")}`);
      }
    } else {
      console.log(`  ${name}: NOT FOUND`);
    }
  }
  console.log();

  // =========================================================================
  // 3. Browse by category
  // =========================================================================
  console.log("=== Labels by Category ===");

  const categories: Record<string, string[]> = {};
  for (const label of labels) {
    const cat = label.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(label.name);
  }

  for (const cat of Object.keys(categories).sort()) {
    const names = categories[cat].sort();
    const preview = names.slice(0, 3).join(", ");
    const suffix = names.length > 3 ? ` ... +${names.length - 3} more` : "";
    console.log(`  ${cat} (${names.length} labels): ${preview}${suffix}`);
  }
  console.log();

  // =========================================================================
  // 4. Use DefaultOntology class (implements OntologyBackend)
  // =========================================================================
  console.log("=== DefaultOntology Class ===");

  const ontology = new DefaultOntology();

  // Configured ontology (used by upp/info)
  const available = await ontology.getOntologies();
  console.log(`  Configured ontology: [${available.map((o) => `"${o}"`).join(", ")}]`);

  // Get all labels (used by upp/labels)
  const allLabels = await ontology.getLabels();
  console.log(`  Total labels via getLabels(): ${allLabels.length}`);

  // Look up a specific label
  const whoName = ontology.getLabel("who_name");
  if (whoName) {
    console.log(`  Lookup 'who_name': ${whoName.display_name} — ${whoName.description}`);
  }
  console.log();

  // =========================================================================
  // 5. Ontology statistics
  // =========================================================================
  console.log("=== Ontology Statistics ===");

  // Cardinality distribution
  const singular = labels.filter((l) => l.cardinality === "singular").length;
  const plural = labels.filter((l) => l.cardinality === "plural").length;
  console.log(`  Singular: ${singular}, Plural: ${plural}`);

  // Durability distribution
  const permanent = labels.filter((l) => l.durability === "permanent").length;
  const transient = labels.filter((l) => l.durability === "transient").length;
  const ephemeral = labels.filter((l) => l.durability === "ephemeral").length;
  console.log(`  Permanent: ${permanent}, Transient: ${transient}, Ephemeral: ${ephemeral}`);

  // Sensitivity distribution
  console.log("  Sensitivity distribution:");
  for (const tier of SENSITIVITY_TIER_VALUES) {
    const count = labels.filter((l) => l.sensitivity === tier).length;
    console.log(`    ${tier}: ${count}`);
  }
}

main().catch(console.error);
