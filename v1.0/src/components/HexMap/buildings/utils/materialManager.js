// src/components/HexMap/buildings/utils/materialManager.js
import * as THREE from 'three';
import { SNOW_COVER_COLOR, MAX_SNOW_COVER_LERP_FACTOR, BUILDING_TYPES } from '../../constants'; // Adjust path

// Specific emissive colors to identify special materials that shouldn't be snowed over
// or have their own animation logic.
const FLAME_COLOR_ORANGE_HEX = 0xFFAA33;
const FLAME_COLOR_YELLOW_HEX = 0xFFFFAA;
const HOUSE_WINDOW_EMISSIVE_COLOR_HEX = 0xFFFFAA;
const HOUSE_LAMP_EMISSIVE_COLOR_HEX = 0xFFE082;
const MINE_LAMP_EMISSIVE_COLOR_HEX = 0xFFB74D;


const buildingMaterialsCache = new Map(); // Key: material, Value: { originalColor: Color, originalEmissive?: Color }

export const getCachedMaterial = (colorHex, props = {}, isSpecialEmissive = false) => {
    // For truly unique materials (like animated flames, specific lamp glows),
    // isSpecialEmissive = true bypasses caching or uses a more specific key if needed.
    // For now, we cache all non-flame/glow materials.
    const material = new THREE.MeshStandardMaterial({ color: colorHex, ...props });

    if (!isSpecialEmissive) { // Only cache standard, reusable materials
        const cacheEntry = { originalColor: material.color.clone() };
        if (material.emissive) {
            cacheEntry.originalEmissive = material.emissive.clone();
        }
        buildingMaterialsCache.set(material, cacheEntry);
    }
    return material;
};

export const updateBuildingInstanceSnow = (buildingInstance, snowAccumulationRatio) => {
    if (!buildingInstance || !buildingInstance.userData?.isBuilding) return;

    const snowColor = new THREE.Color(SNOW_COVER_COLOR);
    const buildingType = buildingInstance.userData.buildingType;

    let isCampfireLit = false;
    if (buildingType === BUILDING_TYPES.CAMPFIRE && typeof buildingInstance.userData.isLit === 'function') {
        isCampfireLit = buildingInstance.userData.isLit();
    }

    let isHouseLampOn = false;
    if (buildingType === BUILDING_TYPES.HOUSE && buildingInstance.userData.doorLampLight) {
        isHouseLampOn = buildingInstance.userData.doorLampLight.intensity > 0.05;
    }

    let isMineLampOn = false;
    if (buildingType === BUILDING_TYPES.MINE && buildingInstance.userData.mineLampLight) {
        isMineLampOn = buildingInstance.userData.mineLampLight.intensity > 0.05;
    }

    buildingInstance.traverse((node) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => {
                // Skip materials that handle their own appearance (emissive parts of lights/flames)
                if (material.emissive && material.emissiveIntensity > 0) {
                    const emissiveHex = material.emissive.getHex();
                    if (
                        emissiveHex === FLAME_COLOR_ORANGE_HEX ||
                        emissiveHex === FLAME_COLOR_YELLOW_HEX ||
                        emissiveHex === HOUSE_WINDOW_EMISSIVE_COLOR_HEX ||
                        (material.userData?.isLampShade && emissiveHex === HOUSE_LAMP_EMISSIVE_COLOR_HEX) ||
                        (material.userData?.isLampShade && emissiveHex === MINE_LAMP_EMISSIVE_COLOR_HEX)
                    ) {
                        return;
                    }
                }

                const cacheEntry = buildingMaterialsCache.get(material);
                if (cacheEntry) {
                    let currentLerpFactor = 0;
                    let effectiveSnowRatio = snowAccumulationRatio;

                    if (buildingType === BUILDING_TYPES.CAMPFIRE && isCampfireLit) {
                        effectiveSnowRatio *= 0.05;
                    }

                    // Check for house lamp post. The parent of doorLampLight is the lampGroup.
                    if (buildingType === BUILDING_TYPES.HOUSE &&
                        buildingInstance.userData.doorLampLight &&
                        node.parent === buildingInstance.userData.doorLampLight.parent && // Check if node is part of the lamp assembly
                        isHouseLampOn) {
                        effectiveSnowRatio *= 0.3;
                    }
                    // Use the userData flag for mine lamp components
                    if (node.userData?.isMineLampComponent && isMineLampOn) {
                        effectiveSnowRatio *= 0.3;
                    }


                    if (material.userData?.isRoof) {
                        currentLerpFactor = effectiveSnowRatio * MAX_SNOW_COVER_LERP_FACTOR;
                    } else {
                        currentLerpFactor = effectiveSnowRatio * MAX_SNOW_COVER_LERP_FACTOR * 0.25;
                    }
                    material.color.copy(cacheEntry.originalColor).lerp(snowColor, Math.min(currentLerpFactor, 1.0));
                    material.needsUpdate = true;
                }
            });
        }
    });
};

export const disposeAllCachedMaterials = () => {
    buildingMaterialsCache.forEach((value, material) => {
        material.dispose();
    });
    buildingMaterialsCache.clear();
    console.log("Disposed all cached building materials.");
};