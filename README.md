![MapBiomas Venezuela](./mapbiomas-venezuela.png)

[![Back to Venezuela All Initiatives](https://img.shields.io/badge/←%20Venezuela%20All%20Initiatives-gray?style=for-the-badge)](https://github.com/mapbiomas/venezuela-all-initiatives)
[![Back to Collection 3](https://img.shields.io/badge/←%20Venezuela%20Collection%203-gray?style=for-the-badge)](https://github.com/mapbiomas/venezuela-collection-3)

# MapBiomas Venezuela

_**Natural vegetation loss and secondary vegetation Module**_

This module detects and maps **vegetation loss and secondary vegetation dynamics** across Venezuela from **1985 to 2024**, as part of the **MapBiomas Venezuela Collection 3** pipeline. It runs on **Google Earth Engine (GEE)** and processes annual Land Use and Land Cover (LULC) classifications to identify pixel-level transitions between primary vegetation, secondary vegetation, and anthropic areas.

The output is a multi-band image where each band represents a year (1985–2024), and each pixel is assigned one of the following transition classes:

| ID | Class |
|----|-------|
| 0 | No data |
| 1 | Anthropic |
| 2 | Primary Vegetation |
| 3 | Secondary Vegetation |
| 4 | Primary Vegetation Suppression |
| 5 | Recovery to Secondary Vegetation |
| 6 | Secondary Vegetation Suppression |
| 7 | Other transitions |

## Repository Structure

```text
venezuela-sec-vegetation-veg-loss/
    └── 03-1-natural-vegetation-loss-secondary-vegetation.js
```

## How It Works

### 1. Temporal Noise Filtering

Before any transition analysis, a **temporal filter** is applied to reduce classification noise. For a defined set of anthropic classes (`classesToFilter`), isolated pixels that differ from both their previous and following year are replaced by the value of the previous year. This 3-year kernel filter runs from 1986 to 2022 and removes spurious single-year anomalies in the time series.

### 2. Class Aggregation

The filtered classification is remapped from the original MapBiomas Venezuela classes into 3 aggregated categories used for transition detection:

- `1` — Anthropic
- `2` — Primary Vegetation
- `3` — Secondary Vegetation

### 3. Transition Rules

Transitions are detected using **sliding windows** of 3, 4, or 5 years applied sequentially across the time series. Each rule defines an input pattern (what was observed) and an output pattern (how it should be reclassified).

The following rule sets are applied in order:

**Primary Vegetation Suppression (`rules` — 4-year kernel)**  
Detects deforestation and corrects isolated noise:

```text
[2, 2, 1, 2] → [2, 2, 2, 2]   // Noise correction
[2, 1, 2, 2] → [2, 2, 2, 2]   // Noise correction
[2, 2, 1, 1] → [2, 2, 4, 1]   // Deforestation
```

**Secondary Vegetation Recovery (`rulesSecVegK5` — 5-year kernel)**  
Detects recovery to secondary vegetation with a longer confirmation window:

```text
[1, 1, 2, 2, 2] → [1, 1, 5, 3, 3]
```

**Secondary Vegetation Dynamics (`rulesSecVegK4` — 4-year kernel)**  
Detects secondary vegetation consolidation and suppression:

```text
[3, 2, 2, 2] → [3, 3, 3, 3]   // Vegetation consolidation
[3, 3, 2, 4] → [3, 3, 3, 6]   // Secondary vegetation suppression
[1, 2, 2, 4] → [1, 1, 1, 1]   // Noise correction
```

**Deforestation within Secondary Vegetation (`rulesDefSecVeg` — 3-year kernel)**

```text
[3, 4, 1] → [3, 6, 1]
```

**End-of-Series Rules (`rulesEnd`)**  
Applied only to the most recent years (2021 onward), where future observations are unavailable to confirm changes. Requires 3 consecutive prior years of vegetation to reduce false positives:

```text
[2, 2, 2, 1] → [2, 2, 2, 4]   // Primary vegetation suppression
[3, 3, 3, 1] → [3, 3, 3, 6]   // Secondary vegetation suppression
```

### 4. Post-processing Corrections

After all rules are applied, additional pixel-level corrections handle edge cases:

- Pixels with more than 1 year of anthropic history flagged as primary suppression (`4`) are reclassified as secondary suppression (`6`).
- Pixels with any anthropic history flagged as primary vegetation (`2`) are reclassified as secondary vegetation (`3`).
- In the last 3 years of the series, additional corrections adjust unconfirmed vegetation recovery and deforestation based on prior-year context.

## Inputs

| Parameter | Description |
|-----------|-------------|
| `assetInput` | GEE asset path for the integrated LULC image |
| `version` | Module version |
| `vegetation` | Vegetation type targeted |
| `years` | Annual sequence from 1985 to 2024 |
| `classesToFilter` | Classes subjected to temporal noise filtering |

## Outputs

| Parameter | Description |
|-----------|-------------|
| `assetOutput` | GEE asset path: `perdida-de-vegetacion/natural-3` |
| `outputName` | Output identifier: `natural-3` |

The output is exported as a **single multi-band image** covering Venezuela's full extent at **30-meter spatial resolution**, using `mode` pyramiding.

## More iformation about MapBiomas Venezuela

If you are not familiar with MapBiomas workflows, check the [official methodology documentation](https://venezuela.mapbiomas.org/descripcion-general-de-la-metodologia/).

For more information about MapBiomas Venezuela, visit [venezuela.mapbiomas.org](https://venezuela.mapbiomas.org).

To explore the products from the available modules, visit [plataforma.venezuela.mapbiomas.org](https://plataforma.venezuela.mapbiomas.org).
