// src/components/HexMap/buildings/useBuildings.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BUILDING_TYPES } from './BuildingTypes'
import * as BuildingModels from './models'; // Imports all exported models
import { updateBuildingInstanceSnow, disposeAllCachedMaterials } from './utils/materialManager'; // Adjust path

const getTileKey = (c, r) => `${c},${r}`;

const useBuildings = (coreElements, snowAccumulationRatio, timeOfDay) => {
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
                        if (building.model.userData.light && building.model.userData.light.parent) {
                            building.model.userData.light.parent.remove(building.model.userData.light);
                        }
                        buildingsGroupRef.current.remove(building.model);
                        building.model.traverse(node => {
                            if (node.isMesh) {
                                if (node.geometry) node.geometry.dispose();
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
            disposeAllCachedMaterials(); // Use the centralized disposer
            setBuildingsSystemData(null);
        };
    }, [coreElements]);


    const addBuilding = useCallback((tileData, buildingType) => {
        if (!buildingsSystemData || !buildingsSystemData.isReady || !buildingsGroupRef.current || !tileData) {
            console.error("Building system not ready or no tile data provided.");
            return;
        }

        const tileKey = getTileKey(tileData.c, tileData.r);

        if (placedBuildingsRef.current.has(tileKey)) {
            const existing = placedBuildingsRef.current.get(tileKey);
            if (existing.model) {
                if (existing.model.userData.light && existing.model.userData.light.parent) {
                    existing.model.userData.light.parent.remove(existing.model.userData.light);
                }
                buildingsGroupRef.current.remove(existing.model);
                existing.model.traverse(node => {
                    if (node.isMesh && node.geometry) node.geometry.dispose();
                });
            }
        }

        let buildingModel;
        switch (buildingType) {
            case BUILDING_TYPES.HOUSE:
                buildingModel = BuildingModels.createHouseModel(tileData.y);
                break;
            case BUILDING_TYPES.CAMPFIRE:
                buildingModel = BuildingModels.createCampfireModel(tileData.y);
                break;
            case BUILDING_TYPES.FARM:
                buildingModel = BuildingModels.createFarmModel(tileData.y);
                break;
            case BUILDING_TYPES.MINE:
                buildingModel = BuildingModels.createMineModel(tileData.y);
                break;
            default:
                console.warn(`Building type ${buildingType} model creator not found. Using placeholder.`);
                const placeholderGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
                // Use getCachedMaterial for placeholder too for consistency
                const placeholderMat = BuildingModels.getCachedMaterial ? BuildingModels.getCachedMaterial(0x8888FF, { roughness: 0.5 }) : new THREE.MeshStandardMaterial({ color: 0x8888FF });
                if (placeholderMat.userData) placeholderMat.userData.isRoof = true; else placeholderMat.userData = { isRoof: true };

                const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
                placeholder.position.y = tileData.y + 0.2;
                placeholder.castShadow = true;
                buildingModel = new THREE.Group();
                buildingModel.add(placeholder);
                buildingModel.userData.isBuilding = true;
                buildingModel.userData.buildingType = 'PLACEHOLDER';
                buildingModel.userData.animate = (time) => { };
        }

        if (!buildingModel) {
            console.error("Failed to create building model for type:", buildingType);
            return;
        }

        // Apply random rotation if not already applied by model creator (some might want specific default)
        if (buildingModel.rotation.y === 0) { // Check if rotation is default
            buildingModel.rotation.y = Math.random() * Math.PI * 2;
        }
        buildingModel.position.set(tileData.x, 0, tileData.z); // Model origin at tile center, Y=0

        updateBuildingInstanceSnow(buildingModel, snowAccumulationRatio);

        buildingsGroupRef.current.add(buildingModel);
        placedBuildingsRef.current.set(tileKey, { type: buildingType, model: buildingModel, tileData });
        // console.log(`Built ${buildingType} at ${tileKey} with rotation Y: ${buildingModel.rotation.y.toFixed(2)}`);

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
            return {
                type: buildingData.type,
                model: buildingData.model,
                isLit: (buildingData.type === BUILDING_TYPES.CAMPFIRE && typeof buildingData.model.userData.isLit === 'function')
                    ? buildingData.model.userData.isLit()
                    : false,
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
            ...buildingsSystemData,
            addBuilding,
            getBuildingOnTile,
            updateBuildingAnimations,
        };
    }
    return null;
};

export default useBuildings;