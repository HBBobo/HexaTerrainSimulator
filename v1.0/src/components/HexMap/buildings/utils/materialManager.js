// src/components/HexMap/buildings/utils/materialManager.js
import * as THREE from 'three';
import { SNOW_COVER_COLOR, MAX_SNOW_COVER_LERP_FACTOR, BUILDING_TYPES } from '../../constants';

const buildingMaterialsCache = new Map(); // Key: material, Value: { originalColor: Color, originalEmissive?: Color }

export const getCachedMaterial = (colorHex, props = {}, isSpecialEmissive = false) => {
    const material = new THREE.MeshStandardMaterial({ color: colorHex, ...props });
    material.userData.isSpecialEmissive = isSpecialEmissive; // Store this flag directly on material

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

    let isHarbourPierLampOn = false;
    if (buildingType === BUILDING_TYPES.HARBOUR && buildingInstance.userData.pierLampLight) {
        isHarbourPierLampOn = buildingInstance.userData.pierLampLight.intensity > 0.05;
    }


    buildingInstance.traverse((node) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => {
                // Skip materials that handle their own appearance (emissive parts of lights/flames)
                if (material.userData?.isSpecialEmissive) {
                    return;
                }

                const cacheEntry = buildingMaterialsCache.get(material);
                if (cacheEntry) {
                    let currentLerpFactor = 0;
                    let effectiveSnowRatio = snowAccumulationRatio;

                    // Specific conditions for less snow
                    if (buildingType === BUILDING_TYPES.CAMPFIRE && isCampfireLit) {
                        effectiveSnowRatio *= 0.05; // Campfire melts snow around it
                    }

                    // Check for lamp components being active
                    if (node.userData?.isLampComponent && isHouseLampOn) { // House Lamp parts
                        effectiveSnowRatio *= 0.3;
                    }
                    if (node.userData?.isMineLampComponent && isMineLampOn) { // Mine Lamp parts
                        effectiveSnowRatio *= 0.3;
                    }
                    if (node.userData?.isPierLampComponent && isHarbourPierLampOn) { // Harbour Pier Lamp parts
                        effectiveSnowRatio *= 0.3;
                    }

                    // Apply snow based on roof status and effective ratio
                    if (material.userData?.isRoof) {
                        currentLerpFactor = effectiveSnowRatio * MAX_SNOW_COVER_LERP_FACTOR;
                    } else {
                        currentLerpFactor = effectiveSnowRatio * MAX_SNOW_COVER_LERP_FACTOR * 0.25; // Less snow on non-roof parts
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