// src/components/HexMap/hooks/useWorldGeometry.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    HEX_SIZE, HEX_HEIGHT_MAX, TILE_TYPES, TILE_COLORS,
    SNOW_COVER_COLOR, MAX_SNOW_COVER_LERP_FACTOR, BUILDING_TYPES,
    MIN_TREES_PER_FOREST_TILE, MAX_ADDITIONAL_TREES_PER_FOREST_TILE, PROBABILITY_OF_ADDITIONAL_TREE,
    ROCKS_PER_STONE_TILE_MIN, ROCKS_PER_STONE_TILE_MAX, PROBABILITY_OF_ROCK_ON_STONE_TILE,
    REED_CLUMPS_PER_ELIGIBLE_TILE_MIN, REED_CLUMPS_PER_ELIGIBLE_TILE_MAX, PROBABILITY_OF_REEDS_ON_ELIGIBLE_TILE,
    TRANSPARENT_LAYER_Y
} from '../constants'; // Removed SEASONS, WEATHER_TYPES as not directly used here
import { createHexagonGeometry, createHexagonInstance } from '../utils/threeUtils';
import { createCypressTree, disposeTreeMaterial, updateTreeMaterialsForSnow } from '../utils/treeUtils';
import { createRock, disposeRockMaterials, updateRockMaterialsForSnow } from '../utils/rockUtils';
import { createReedClump, disposeReedMaterial, updateReedMaterialsForSnow } from '../utils/reedsUtils';

const POINTY_HEX_TRUE_WIDTH_CALC = HEX_SIZE * Math.sqrt(3);
const POINTY_HEX_TRUE_HEIGHT_CALC = HEX_SIZE * 2;
const POINTY_HEX_VERT_SPACING_CALC = POINTY_HEX_TRUE_HEIGHT_CALC * 0.75;

// const getTileKey = (c, r) => `${c},${r}`; // Not used locally

const useWorldGeometry = (coreElements, islandHeightData, weatherCondition, season, snowAccumulationRatio, getBuildingOnTileFromParent) => {
    const [worldGeoState, setWorldGeoState] = useState(null);
    const treeAnimationIndexRef = useRef(0);
    const reedAnimationIndexRef = useRef(0);
    const originalHexMaterialColorsRef = useRef(new Map());

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            !islandHeightData || islandHeightData.size === 0) {
            if (worldGeoState) {
                setWorldGeoState(null);
            }
            return;
        }

        const { scene, worldMapWidth, worldMapDepth } = coreElements;

        console.log(`useWorldGeometry: Initializing. Scene ID: ${scene.uuid}`);
        originalHexMaterialColorsRef.current.clear();

        const hexGridGroup = new THREE.Group(); hexGridGroup.renderOrder = 0; hexGridGroup.name = "HexGridGroup";
        // Clear previous group if exists (e.g., from hot reload)
        const oldGridGroup = scene.getObjectByName("HexGridGroup");
        if (oldGridGroup) {
            oldGridGroup.traverse(node => {
                if (node.isMesh) {
                    if (node.geometry) node.geometry.dispose();
                    if (node.material) {
                        if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
                        else node.material.dispose();
                    }
                }
            });
            oldGridGroup.clear();
            scene.remove(oldGridGroup);
        }
        scene.add(hexGridGroup);

        const treeGroup = new THREE.Group(); treeGroup.renderOrder = 0; treeGroup.name = "TreeGroup"; scene.add(treeGroup);
        const rockGroup = new THREE.Group(); rockGroup.renderOrder = 0; rockGroup.name = "RockGroup"; scene.add(rockGroup);
        const reedGroup = new THREE.Group(); reedGroup.renderOrder = 0; reedGroup.name = "ReedGroup"; scene.add(reedGroup);

        const animatedTrees = [];
        const animatedReeds = [];
        const landTiles = [];
        const landTileMap = new Map();
        const hexMeshesForRaycasting = [];

        const gridOffsetX = worldMapWidth / 2 - POINTY_HEX_TRUE_WIDTH_CALC / 2;
        const gridOffsetZ = worldMapDepth / 2 - POINTY_HEX_VERT_SPACING_CALC / 2;

        islandHeightData.forEach((tileData, key) => {
            const [c_str, r_str] = key.split(',');
            const c = parseInt(c_str, 10);
            const r = parseInt(r_str, 10);
            const totalWorldHeightFromBase = tileData.normalizedElevation * HEX_HEIGHT_MAX;

            const xOffsetForRow = (r % 2 === 1) ? POINTY_HEX_TRUE_WIDTH_CALC / 2 : 0;
            const worldX = c * POINTY_HEX_TRUE_WIDTH_CALC + xOffsetForRow - gridOffsetX;
            const worldZ = r * POINTY_HEX_VERT_SPACING_CALC - gridOffsetZ;

            const currentTileFullData = {
                x: worldX, z: worldZ, y: 0,
                r: r, c: c,
                type: tileData.type,
                normalizedElevation: tileData.normalizedElevation,
                tileKey: key
            };

            if (tileData.type !== TILE_TYPES.DEEP_WATER && tileData.type !== TILE_TYPES.SHALLOW_WATER) {
                const hexRenderHeight = Math.max(0.05, totalWorldHeightFromBase);
                const hexYPosition = hexRenderHeight / 2; // Center of the hex body
                currentTileFullData.y = hexRenderHeight; // Top surface of the hex

                const hexGeometry = createHexagonGeometry(HEX_SIZE, hexRenderHeight);
                const tileHexColor = TILE_COLORS[tileData.type] || 0x7F7F7F;

                const tileMaterial = new THREE.MeshStandardMaterial({
                    color: tileHexColor,
                    metalness: 0.1,
                    roughness: 0.85,
                    flatShading: true,
                });
                originalHexMaterialColorsRef.current.set(tileMaterial, { color: tileMaterial.color.clone(), c, r, type: tileData.type });

                const hexInstance = createHexagonInstance(hexGeometry, tileMaterial, worldX, hexYPosition, worldZ);
                hexInstance.userData = {
                    isHexTile: true,
                    c: c,
                    r: r,
                    tileKey: key,
                    tileData: currentTileFullData // Pass full data for raycasting
                };
                hexGridGroup.add(hexInstance);
                hexMeshesForRaycasting.push(hexInstance);
                landTiles.push(currentTileFullData);

                if (tileData.type === TILE_TYPES.FOREST) {
                    const placeSingleTree = () => {
                        const treeObject = createCypressTree(undefined, undefined, tileData.normalizedElevation);
                        const maxOffsetFactor = 0.75;
                        const r_offset = Math.sqrt(Math.random()) * HEX_SIZE * maxOffsetFactor;
                        const angle_offset = Math.random() * Math.PI * 2;
                        const randomXOffset = r_offset * Math.cos(angle_offset);
                        const randomZOffset = r_offset * Math.sin(angle_offset);
                        treeObject.position.set(worldX + randomXOffset, currentTileFullData.y, worldZ + randomZOffset); // Place base of tree on hex surface
                        treeObject.rotation.y = Math.random() * Math.PI * 2;
                        treeObject.userData.windPhaseOffset = Math.random() * Math.PI * 2;
                        treeObject.userData.windSpeedMultiplier = 0.8 + Math.random() * 0.4;
                        treeGroup.add(treeObject); animatedTrees.push(treeObject);
                    };
                    for (let i = 0; i < MIN_TREES_PER_FOREST_TILE; i++) placeSingleTree();
                    for (let i = 0; i < MAX_ADDITIONAL_TREES_PER_FOREST_TILE; i++) {
                        if (Math.random() < PROBABILITY_OF_ADDITIONAL_TREE) placeSingleTree();
                    }
                }
                if (tileData.type === TILE_TYPES.STONE || tileData.type === TILE_TYPES.MOUNTAIN_PEAK) {
                    if (Math.random() < PROBABILITY_OF_ROCK_ON_STONE_TILE) {
                        const numRocks = Math.floor(Math.random() * (ROCKS_PER_STONE_TILE_MAX - ROCKS_PER_STONE_TILE_MIN + 1)) + ROCKS_PER_STONE_TILE_MIN;
                        for (let i = 0; i < numRocks; i++) {
                            const rock = createRock();
                            const maxOffsetFactor = 0.8;
                            const r_offset = Math.sqrt(Math.random()) * HEX_SIZE * maxOffsetFactor;
                            const angle_offset = Math.random() * Math.PI * 2;
                            const randomXOffset = r_offset * Math.cos(angle_offset);
                            const randomZOffset = r_offset * Math.sin(angle_offset);
                            rock.position.set(worldX + randomXOffset, currentTileFullData.y, worldZ + randomZOffset); // Place base of rock on hex surface
                            rock.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
                            rockGroup.add(rock);
                        }
                    }
                }

            } else if (tileData.type === TILE_TYPES.SHALLOW_WATER) {
                currentTileFullData.y = TRANSPARENT_LAYER_Y; // Shallow water tiles are effectively at water surface level
                if (Math.random() < PROBABILITY_OF_REEDS_ON_ELIGIBLE_TILE) {
                    const numClumps = Math.floor(Math.random() * (REED_CLUMPS_PER_ELIGIBLE_TILE_MAX - REED_CLUMPS_PER_ELIGIBLE_TILE_MIN + 1)) + REED_CLUMPS_PER_ELIGIBLE_TILE_MIN;
                    const reedBedY = TRANSPARENT_LAYER_Y - 0.04; // Reeds sit slightly below water surface visually
                    for (let i = 0; i < numClumps; i++) {
                        const reedClump = createReedClump();
                        const maxOffsetFactor = 0.85;
                        const r_offset = Math.sqrt(Math.random()) * HEX_SIZE * maxOffsetFactor;
                        const angle_offset = Math.random() * Math.PI * 2;
                        const randomXOffset = r_offset * Math.cos(angle_offset);
                        const randomZOffset = r_offset * Math.sin(angle_offset);
                        reedClump.position.set(worldX + randomXOffset, reedBedY, worldZ + randomZOffset);
                        reedClump.userData.windPhaseOffset = Math.random() * Math.PI * 2;
                        reedClump.userData.windSpeedMultiplier = 0.7 + Math.random() * 0.6;
                        reedGroup.add(reedClump); animatedReeds.push(reedClump);
                    }
                }
            } else { // DEEP_WATER
                currentTileFullData.y = TRANSPARENT_LAYER_Y - 0.5; // Deep water tiles are conceptually below water surface
            }
            landTileMap.set(key, currentTileFullData);
        });

        console.log("useWorldGeometry: Geometry created. Land Tile Map size:", landTileMap.size, "Hex meshes:", hexMeshesForRaycasting.length);
        setWorldGeoState({
            hexGridGroup, treeGroup, rockGroup, reedGroup,
            animatedTrees, animatedReeds, landTiles, landTileMap,
            hexMeshesForRaycasting,
            isReady: true
        });

        return () => {
            console.log(`useWorldGeometry: Cleaning up from scene: ${scene.uuid}.`);

            const disposeGroupContents = (group) => {
                if (group) {
                    group.traverse(node => {
                        if (node.isMesh) {
                            if (node.geometry) node.geometry.dispose();
                            // Materials on hexes are unique instances here, so dispose them.
                            // Shared materials for trees, rocks, reeds are handled by their specific dispose functions.
                            if (node.material && originalHexMaterialColorsRef.current.has(node.material)) {
                                node.material.dispose();
                            }
                        }
                    });
                    group.clear();
                    if (scene && group.parent === scene) scene.remove(group);
                }
            };

            disposeGroupContents(hexGridGroup);
            // For trees, rocks, reeds, the group itself is cleared and removed,
            // but the shared materials are disposed separately to avoid multiple disposals.
            if (treeGroup) { treeGroup.clear(); if (scene && treeGroup.parent === scene) scene.remove(treeGroup); }
            if (rockGroup) { rockGroup.clear(); if (scene && rockGroup.parent === scene) scene.remove(rockGroup); }
            if (reedGroup) { reedGroup.clear(); if (scene && reedGroup.parent === scene) scene.remove(reedGroup); }

            disposeTreeMaterial();
            disposeRockMaterials();
            disposeReedMaterial();

            originalHexMaterialColorsRef.current.clear();
            treeAnimationIndexRef.current = 0;
            reedAnimationIndexRef.current = 0;
            setWorldGeoState(null);
        };
    }, [coreElements, islandHeightData]); // islandHeightData dependency for regeneration if map changes

    useEffect(() => {
        if (!worldGeoState || !worldGeoState.isReady || snowAccumulationRatio === undefined || typeof getBuildingOnTileFromParent !== 'function') {
            return;
        }

        const snowCoverMainColor = new THREE.Color(SNOW_COVER_COLOR);

        originalHexMaterialColorsRef.current.forEach((matInfo, materialInstance) => {
            let currentLerpFactor = snowAccumulationRatio * MAX_SNOW_COVER_LERP_FACTOR;

            const buildingOnTile = getBuildingOnTileFromParent(matInfo.c, matInfo.r);
            if (buildingOnTile && buildingOnTile.type === BUILDING_TYPES.CAMPFIRE && buildingOnTile.isLit) {
                currentLerpFactor *= 0.05; // Reduce snow on tile if campfire is lit
            }

            materialInstance.color.copy(matInfo.color).lerp(snowCoverMainColor, currentLerpFactor);
            // materialInstance.needsUpdate = true; // Usually not needed for MeshStandardMaterial color change
        });


        updateTreeMaterialsForSnow(snowAccumulationRatio);
        updateRockMaterialsForSnow(snowAccumulationRatio);
        updateReedMaterialsForSnow(snowAccumulationRatio);

    }, [worldGeoState, snowAccumulationRatio, getBuildingOnTileFromParent, weatherCondition, season]);


    const updateAnimations = useCallback((elapsedTime) => {
        if (!worldGeoState || !worldGeoState.isReady) return;
        const { animatedTrees, animatedReeds } = worldGeoState;

        const ANIMATION_UPDATE_STRIDE = 3; // Process 1/3rd of items per frame
        const TREE_WIND_SPEED = 0.7;
        const TREE_WIND_STRENGTH = 0.03;
        const REED_WIND_SPEED = 1.2;
        const REED_WIND_STRENGTH = 0.07;

        const animateStaggered = (items, indexRef, speed, strength, axis = 'z', secondAxis = null, secondAxisFactor = 0.6) => {
            if (!items || items.length === 0) return;
            const numItems = items.length;
            const itemsToUpdate = Math.max(1, Math.floor(numItems / ANIMATION_UPDATE_STRIDE)); // Ensure at least 1 item updated
            for (let i = 0; i < itemsToUpdate; i++) {
                const currentIndex = (indexRef.current + i) % numItems;
                const item = items[currentIndex];
                if (item?.userData) {
                    const phase = item.userData.windPhaseOffset || 0;
                    const speedMult = item.userData.windSpeedMultiplier || 1;
                    item.rotation[axis] = Math.sin(elapsedTime * speed * speedMult + phase) * strength;
                    if (secondAxis) {
                        item.rotation[secondAxis] = Math.cos(elapsedTime * speed * 0.8 * speedMult + phase + Math.PI / 2) * strength * secondAxisFactor;
                    }
                }
            }
            indexRef.current = (indexRef.current + itemsToUpdate) % numItems;
        };
        animateStaggered(animatedTrees, treeAnimationIndexRef, TREE_WIND_SPEED, TREE_WIND_STRENGTH);
        animateStaggered(animatedReeds, reedAnimationIndexRef, REED_WIND_SPEED, REED_WIND_STRENGTH, 'z', 'x');
    }, [worldGeoState]);

    return worldGeoState ? { ...worldGeoState, updateAnimations } : null;
};

export default useWorldGeometry;