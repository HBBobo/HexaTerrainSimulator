// src/components/HexMap/hooks/useBuildings.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BUILDING_TYPES } from '../constants';
import { createBuildingModel, updateBuildingMaterialsForSnow, disposeBuildingMaterials as disposeSharedBuildingMaterials } from '../utils/buildingUtils';

const getTileKey = (c, r) => `${c},${r}`;

// Removed landTileMap from props initially, as it caused a dependency cycle for initialization.
// If needed later for specific logic, it can be passed via a setter or as a prop to individual functions.
const useBuildings = (coreElements, snowAccumulationRatio, timeOfDay) => {
    const [buildingsSystemData, setBuildingsSystemData] = useState(null);
    const placedBuildingsRef = useRef(new Map());
    const buildingsGroupRef = useRef(null);
    // const landTileMapRef = useRef(null); // If landTileMap is needed later

    useEffect(() => {
        // Removed landTileMap from this guard for initial setup
        if (!coreElements || !coreElements.isReady || !coreElements.scene) {
            if (buildingsSystemData) {
                console.log("useBuildings: Core not ready, clearing state.");
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
            disposeSharedBuildingMaterials();
            setBuildingsSystemData(null);
        };
    }, [coreElements]); // Removed landTileMap from dependency array for this effect


    // Function to update landTileMap if it's provided later
    // const setExternalLandTileMap = useCallback((map) => {
    //     landTileMapRef.current = map;
    // }, []);


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

        const buildingModel = createBuildingModel(buildingType, tileData.y);
        if (!buildingModel) {
            console.error("Failed to create building model for type:", buildingType);
            return;
        }
        buildingModel.position.set(tileData.x, 0, tileData.z);

        updateBuildingMaterialsForSnow(buildingModel, snowAccumulationRatio);

        buildingsGroupRef.current.add(buildingModel);
        placedBuildingsRef.current.set(tileKey, { type: buildingType, model: buildingModel, tileData });
        console.log(`Built ${buildingType} at ${tileKey} with rotation Y: ${buildingModel.rotation.y.toFixed(2)}`);

    }, [buildingsSystemData, snowAccumulationRatio]);


    const updateAllBuildingsSnow = useCallback(() => {
        if (!buildingsSystemData || !buildingsSystemData.isReady || snowAccumulationRatio === undefined) return;
        placedBuildingsRef.current.forEach(building => {
            if (building.model) {
                updateBuildingMaterialsForSnow(building.model, snowAccumulationRatio);
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
            // setExternalLandTileMap, // Expose if you need to set it after worldGeometry is ready
        };
    }
    return null;
};

export default useBuildings;