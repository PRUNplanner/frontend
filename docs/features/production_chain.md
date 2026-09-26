# production_chain

**Purpose.** This folder draws the full production dependency graph for a
material: which recipes produce it, and recursively what their inputs need.
It also analyses the required workforce, expertise and materials.

**Used by.** `views/tools/ProductionChainView.vue` (`/production-chain`).

## Key files

| File | Role |
| --- | --- |
| `productionGraph.ts` | `ProductionGraph` class. `init()` builds a node per material from **all** recipes (`useBuildingData().getAllBuildingRecipes()`). It tracks the selected recipes and the terminals |
| `productionNode.ts` | `ProductionNode` (a material and its producing recipes), `setExtractableMaterials` and `isExtractable` |
| `productionEdge.ts` | `ProductionEdge` |
| `useGraph.ts` | `await useGraph()` turns the graph into vue-flow nodes and edges, laid out with dagre |
| `dagre.config.ts` | Layout config and node dimensions |
| `productionGraph.types.ts`, `components/ChainNode.types.ts` | Types |
| `components/GraphVueFlow.vue`, `ChainNode.vue` | Rendering with `@vue-flow/core` and minimap |
| `components/GraphAnalysis{Materials,Workforce,Expertise}.vue` | Side analysis panels |

## Gotchas

- **Graph code is plain classes, not reactive state.** Rebuild or re-run
  `useGraph` for the vue-flow output rather than mutating nodes in place.
- **Extractable materials** (planet resources) are terminal nodes.

## Tests

`src/tests/features/production_chain/`: graph, node, edge, dagre config and
`useGraph`.
