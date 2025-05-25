// src/components/HexMap/buildings/useBuildings.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BUILDING_TYPES } from './BuildingTypes';
import * as BuildingModels from './models';
import { updateBuildingInstanceSnow, disposeAllCachedMaterials } from './utils/materialManager';

const getTileKey = (c, r) => `${c},${r}`;

const useBuildings = (coreElements, snowAccumulationRatio, timeOfDay, landTileMap, gridColumns, gridRows) => {
    const [buildingsSystemData, setBuildingsSystemData] = useState(null);
    const placedBuildingsRef = useRef(new Map());
    const buildingsGroupRef = useRef(null);

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene) {
            if (buildingsSystemData) {
                setBuildingsSystemData(null);
            }
            return;
        }

        const { scene } = coreElements;
        console.log("useBuildings: Initializing...");

        buildingsGroupRef.current = new THREE.Group();
        buildingsGroupRef.current.name = "BuildingsGroup";
        scene.add(buildingsGroupRef.current);

        setBuildingsSystemData({
            isReady: true,
        });

        return () => {
            console.log("useBuildings: Cleaning up...");
            if (buildingsGroupRef.current) {
                placedBuildingsRef.current.forEach(building => {
                    if (building.model) {
                        // Dispose lights that might be parented to the building model or its children
                        if (building.model.userData.light && building.model.userData.light.parent) {
                            building.model.userData.light.parent.remove(building.model.userData.light);
                        }
                        if (building.model.userData.doorLampLight && building.model.userData.doorLampLight.parent) {
                            building.model.userData.doorLampLight.parent.remove(building.model.userData.doorLampLight);
                        }
                        if (building.model.userData.mineLampLight && building.model.userData.mineLampLight.parent) {
                            building.model.userData.mineLampLight.parent.remove(building.model.userData.mineLampLight);
                        }
                        if (building.model.userData.pierLampLight && building.model.userData.pierLampLight.parent) {
                            building.model.userData.pierLampLight.parent.remove(building.model.userData.pierLampLight);
                        }

                        buildingsGroupRef.current.remove(building.model);
                        building.model.traverse(node => {
                            if (node.isMesh) {
                                if (node.geometry) node.geometry.dispose();
                                // Materials are handled by materialManager or shared, so don't dispose individually here
                                // unless they are uniquely created and not cached.
                            }
                        });
                    }
                });
                if (scene && buildingsGroupRef.current.parent === scene) {
                    scene.remove(buildingsGroupRef.current);
                }
                buildingsGroupRef.current = null;
            }
            placedBuildingsRef.current.clear();
            disposeAllCachedMaterials(); // Centralized disposal of cached materials
            setBuildingsSystemData(null);
        };
    }, [coreElements]);


    const addBuilding = useCallback((tileData, buildingType) => {
        if (!buildingsSystemData || !buildingsSystemData.isReady || !buildingsGroupRef.current || !tileData) {
            console.error("Building system not ready or no tile data provided.");
            return null;
        }

        const tileKey = getTileKey(tileData.c, tileData.r);

        // Remove existing building on the tile, if any
        if (placedBuildingsRef.current.has(tileKey)) {
            const existing = placedBuildingsRef.current.get(tileKey);
            if (existing.model) {
                // Dispose lights that might be parented to the building model or its children
                if (existing.model.userData.light && existing.model.userData.light.parent) {
                    existing.model.userData.light.parent.remove(existing.model.userData.light);
                }
                if (existing.model.userData.doorLampLight && existing.model.userData.doorLampLight.parent) {
                    existing.model.userData.doorLampLight.parent.remove(existing.model.userData.doorLampLight);
                }
                if (existing.model.userData.mineLampLight && existing.model.userData.mineLampLight.parent) {
                    existing.model.userData.mineLampLight.parent.remove(existing.model.userData.mineLampLight);
                }
                if (existing.model.userData.pierLampLight && existing.model.userData.pierLampLight.parent) {
                    existing.model.userData.pierLampLight.parent.remove(existing.model.userData.pierLampLight);
                }
                buildingsGroupRef.current.remove(existing.model);
                existing.model.traverse(node => {
                    if (node.isMesh && node.geometry) node.geometry.dispose();
                });
            }
        }

        let buildingModel;
        const modelArgs = [tileData.y, tileData, landTileMap, gridColumns, gridRows]; // tileData.y is the ground height

        switch (buildingType) {
            case BUILDING_TYPES.HOUSE:
                buildingModel = BuildingModels.createHouseModel(modelArgs[0]);
                break;
            case BUILDING_TYPES.CAMPFIRE:
                buildingModel = BuildingModels.createCampfireModel(modelArgs[0]);
                break;
            case BUILDING_TYPES.FARM:
                buildingModel = BuildingModels.createFarmModel(modelArgs[0]);
                break;
            case BUILDING_TYPES.MINE:
                buildingModel = BuildingModels.createMineModel(modelArgs[0]);
                break;
            case BUILDING_TYPES.HARBOUR:
                buildingModel = BuildingModels.createHarbourModel(...modelArgs); // Passes all args
                break;
            default:
                console.warn(`Building type ${buildingType} model creator not found. Using placeholder.`);
                const placeholderGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x8888FF });
                placeholderMat.userData = { isRoof: true };
                const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
                placeholder.position.y = tileData.y + 0.2; // Position placeholder relative to ground
                placeholder.castShadow = true;
                buildingModel = new THREE.Group();
                buildingModel.add(placeholder);
                buildingModel.userData.isBuilding = true;
                buildingModel.userData.buildingType = 'PLACEHOLDER';
                buildingModel.userData.animate = (time) => { };
        }

        if (!buildingModel) {
            console.error("Failed to create building model for type:", buildingType);
            return null;
        }

        // Set initial rotation (will be overridden by updateBuilding if rotation is passed from palette)
        // Harbours handle their pier rotation internally.
        let initialRotationY = buildingModel.rotation.y; // Use model's default if set by create function
        if (buildingType !== BUILDING_TYPES.HARBOUR && buildingModel.rotation.y === 0) {
            initialRotationY = 0; // Default to 0, palette will set it
            // Or randomize: initialRotationY = Math.random() * Math.PI * 2;
            buildingModel.rotation.y = initialRotationY;
        }


        buildingModel.position.set(tileData.x, 0, tileData.z); // Position building group at tile's X,Z. Y is handled by model parts.
        updateBuildingInstanceSnow(buildingModel, snowAccumulationRatio);
        buildingsGroupRef.current.add(buildingModel);
        placedBuildingsRef.current.set(tileKey, { type: buildingType, model: buildingModel, tileData, rotationY: initialRotationY });

        return buildingModel; // Return the model instance for potential immediate manipulation

    }, [buildingsSystemData, snowAccumulationRatio, landTileMap, gridColumns, gridRows]);


    const updateBuilding = useCallback((tileData, updates) => {
        if (!buildingsSystemData || !buildingsSystemData.isReady || !tileData) {
            console.error("Building system not ready or no tile data for updateBuilding.");
            return;
        }
        const tileKey = getTileKey(tileData.c, tileData.r);
        const buildingData = placedBuildingsRef.current.get(tileKey);

        if (buildingData && buildingData.model) {
            if (updates.rotationY !== undefined) {
                if (buildingData.type !== BUILDING_TYPES.HARBOUR) {
                    buildingData.model.rotation.y = updates.rotationY;
                    placedBuildingsRef.current.set(tileKey, { ...buildingData, rotationY: updates.rotationY });
                } else {
                    // Harbour rotation is determined by pier placement, cannot be manually changed this way
                }
            }
            updateBuildingInstanceSnow(buildingData.model, snowAccumulationRatio);
        }
    }, [buildingsSystemData, snowAccumulationRatio]);


    const updateAllBuildingsSnow = useCallback(() => {
        if (!buildingsSystemData || !buildingsSystemData.isReady || snowAccumulationRatio === undefined) return;
        placedBuildingsRef.current.forEach(building => {
            if (building.model) {
                updateBuildingInstanceSnow(building.model, snowAccumulationRatio);
            }
        });
    }, [buildingsSystemData, snowAccumulationRatio]);

    useEffect(() => {
        updateAllBuildingsSnow();
    }, [snowAccumulationRatio, updateAllBuildingsSnow]);


    const getBuildingOnTile = useCallback((c, r) => {
        const tileKey = getTileKey(c, r);
        const buildingData = placedBuildingsRef.current.get(tileKey);
        if (buildingData && buildingData.model) {
            let isLit = false;
            const lightSources = [
                buildingData.model.userData.light,
                buildingData.model.userData.doorLampLight,
                buildingData.model.userData.mineLampLight,
                buildingData.model.userData.pierLampLight
            ];
            for (const light of lightSources) {
                if (light && light.intensity > 0.05) {
                    isLit = true;
                    break;
                }
            }
            if (typeof buildingData.model.userData.isLit === 'function') {
                isLit = isLit || buildingData.model.userData.isLit();
            }

            return {
                type: buildingData.type,
                // model: buildingData.model, // Avoid exposing entire model if not necessary
                isLit: isLit,
                rotationY: buildingData.rotationY,
            };
        }
        return undefined;
    }, []);


    const updateBuildingAnimations = useCallback((elapsedTime) => {
        if (!buildingsSystemData || !buildingsSystemData.isReady) return;
        placedBuildingsRef.current.forEach(building => {
            if (building.model && building.model.userData && typeof building.model.userData.animate === 'function') {
                building.model.userData.animate(elapsedTime, timeOfDay);
            }
        });
    }, [buildingsSystemData, timeOfDay]);


    if (buildingsSystemData && buildingsSystemData.isReady) {
        return {
            isReady: true,
            addBuilding,
            getBuildingOnTile,
            updateBuildingAnimations,
            updateBuilding,
        };
    }
    return null;
};

export default useBuildings;