// src/components/HexMap/utils/mapGenerator.js
import {
    TILE_TYPES, BIOME_THRESHOLDS,
    WATER_SURFACE_ELEVATION_NORMALIZED,
    SHALLOW_WATER_DEPTH_FOR_REEDS_NORMALIZED,
    MAP_GENERATOR_DEFAULTS
} from '../constants';

const randomFloat = (min, max) => Math.random() * (max - min) + min;

const isNearLandEdge = (finalNormalizedElevation) =>
    finalNormalizedElevation < BIOME_THRESHOLDS[TILE_TYPES.SAND];

export const generateCoolIslandMap = (
    columns,
    rows,
    numIslands = MAP_GENERATOR_DEFAULTS.NUM_ISLANDS,
    islandSizeFactor = MAP_GENERATOR_DEFAULTS.ISLAND_SIZE_FACTOR,
    noiseStrength = MAP_GENERATOR_DEFAULTS.NOISE_STRENGTH,
    warpFactor = MAP_GENERATOR_DEFAULTS.WARP_FACTOR,
    islandBorderFactor = MAP_GENERATOR_DEFAULTS.ISLAND_BORDER_FACTOR,
    randomnessFactor = MAP_GENERATOR_DEFAULTS.RANDOMNESS_FACTOR
) => {
    const mapData = new Map();

    const islandSeeds = [];
    for (let i = 0; i < numIslands; i++) {
        islandSeeds.push({
            x: Math.random() * columns,
            y: Math.random() * rows,
            strength: 0.7 + Math.random() * 0.6
        });
    }

    const maxDistForSeedInfluence = Math.sqrt(columns * columns + rows * rows) * islandSizeFactor;
    const mapCenterX = (columns - 1) / 2.0;
    const mapCenterY = (rows - 1) / 2.0;
    const effectiveIslandRadiusX = mapCenterX * islandBorderFactor;
    const effectiveIslandRadiusY = mapCenterY * islandBorderFactor;

    for (let r_iter = 0; r_iter < rows; r_iter++) {
        for (let c_iter = 0; c_iter < columns; c_iter++) {
            const c = c_iter;
            const r = r_iter;

            const warpX = (Math.sin(c * 0.15 + r * 0.25) + Math.cos(c * 0.08 - r * 0.18)) * columns * warpFactor;
            const warpY = (Math.sin(r * 0.15 - c * 0.22) + Math.cos(r * 0.07 + c * 0.15)) * rows * warpFactor;
            const wc = c + warpX;
            const wr = r + warpY;

            let baseElevation = 0;
            for (const seed of islandSeeds) {
                const dx_seed = wc - seed.x;
                const dy_seed = wr - seed.y;
                const dist_seed = Math.sqrt(dx_seed * dx_seed + dy_seed * dy_seed);
                const influence = seed.strength * Math.exp(- (dist_seed * dist_seed) / (maxDistForSeedInfluence * maxDistForSeedInfluence * 0.5));
                baseElevation += influence;
            }
            baseElevation = Math.min(baseElevation, 1.0);

            let noiseValue = 0;
            noiseValue += 0.5 * (Math.sin(wc * 0.05 + wr * 0.07) + Math.cos(wc * 0.03 - wr * 0.06));
            noiseValue += 0.25 * (Math.sin(wc * 0.12 + wr * 0.15) + Math.cos(wc * 0.08 - wr * 0.11));
            noiseValue += 0.125 * (Math.sin(wc * 0.25 + wr * 0.3) + Math.cos(wc * 0.18 - wr * 0.22));
            noiseValue = (noiseValue / (0.5 + 0.25 + 0.125)) * 0.5 + 0.5;

            let combinedElevation = baseElevation * (0.6 + noiseValue * 0.4 * noiseStrength);
            combinedElevation += 0.05 * Math.sin(c * 0.02 + r * 0.015);

            if (baseElevation > 0.2) {
                combinedElevation = Math.max(combinedElevation, 0.01);
            }

            const dx_mapCenter = c - mapCenterX;
            const dy_mapCenter = r - mapCenterY;
            const normDistX = effectiveIslandRadiusX > 0 ? (dx_mapCenter / effectiveIslandRadiusX) : 0;
            const normDistY = effectiveIslandRadiusY > 0 ? (dy_mapCenter / effectiveIslandRadiusY) : 0;
            const radialDist = Math.sqrt(normDistX * normDistX + normDistY * normDistY);

            let islandShapeMultiplier = 0.0;
            if (radialDist < 1.0) {
                islandShapeMultiplier = (Math.cos(radialDist * Math.PI) + 1.0) / 2.0;
                islandShapeMultiplier = Math.pow(islandShapeMultiplier, 1.5);
            }

            let finalNormalizedElevation = combinedElevation * islandShapeMultiplier;
            finalNormalizedElevation = Math.min(Math.max(finalNormalizedElevation, 0.0), 1.0);

            let tileType;
            const randomInfluence = randomFloat(-randomnessFactor, randomnessFactor);
            const biomeCheckElevation = finalNormalizedElevation + randomInfluence;

            const lowerShallowWaterLimit = WATER_SURFACE_ELEVATION_NORMALIZED - SHALLOW_WATER_DEPTH_FOR_REEDS_NORMALIZED;

            if (finalNormalizedElevation < lowerShallowWaterLimit) {
                tileType = TILE_TYPES.DEEP_WATER;
            } else if (finalNormalizedElevation < WATER_SURFACE_ELEVATION_NORMALIZED) {
                tileType = TILE_TYPES.SHALLOW_WATER;
            } else {
                if (biomeCheckElevation < BIOME_THRESHOLDS[TILE_TYPES.SAND]) {
                    tileType = TILE_TYPES.SAND;
                } else if (biomeCheckElevation < BIOME_THRESHOLDS[TILE_TYPES.CLAY]) {
                    if (finalNormalizedElevation < BIOME_THRESHOLDS[TILE_TYPES.SAND] * 1.05 && Math.random() < 0.4) {
                        tileType = TILE_TYPES.SAND;
                    } else {
                        tileType = TILE_TYPES.CLAY;
                    }
                } else if (biomeCheckElevation < BIOME_THRESHOLDS[TILE_TYPES.PASTURE]) {
                    if (isNearLandEdge(finalNormalizedElevation) && Math.random() < 0.25) {
                        tileType = TILE_TYPES.CLAY;
                    } else {
                        tileType = TILE_TYPES.PASTURE;
                    }
                } else if (biomeCheckElevation < BIOME_THRESHOLDS[TILE_TYPES.FOREST]) {
                    if (isNearLandEdge(finalNormalizedElevation) && finalNormalizedElevation < BIOME_THRESHOLDS[TILE_TYPES.CLAY] && Math.random() < 0.7) {
                        tileType = TILE_TYPES.PASTURE;
                    } else if (islandShapeMultiplier < 0.7 && baseElevation < 0.55 && Math.random() < 0.4) {
                        tileType = TILE_TYPES.PASTURE;
                    } else {
                        tileType = TILE_TYPES.FOREST;
                    }
                } else if (biomeCheckElevation < BIOME_THRESHOLDS[TILE_TYPES.STONE]) {
                    if (biomeCheckElevation < BIOME_THRESHOLDS[TILE_TYPES.FOREST] * 1.08 && Math.random() < 0.3) {
                        tileType = TILE_TYPES.FOREST;
                    } else {
                        tileType = TILE_TYPES.STONE;
                    }
                } else {
                    tileType = TILE_TYPES.MOUNTAIN_PEAK;
                }
            }

            mapData.set(`${c},${r}`, {
                normalizedElevation: finalNormalizedElevation,
                type: tileType
            });
        }
    }
    console.log("Generated island map data:", mapData.size > 0 ? `${mapData.size} tiles` : "Empty");
    return mapData;
};