// src/components/HexMap/hooks/useThreeScene.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCore from './useThreeCore';
import useSunAndSky from './useSunAndSky';
import useWorldGeometry from './useWorldGeometry';
import useWater from './useWater';
import useFoxes from './useFoxes';
import useWeatherEffects from './useWeatherEffects';
import useBuildings from '../buildings/useBuildings';
import { BUILDING_TYPES as AllBuildingTypes } from '../buildings/BuildingTypes';
import { TILE_TYPES, SEASONS, WEATHER_TYPES, SNOW_ACCUMULATION_SECONDS, SNOW_MELT_SECONDS, BUILDABLE_TILE_TYPES } from '../constants';


const getAdjacentTileKeys = (c, r) => {
    const isOddRow = r % 2 === 1;
    return [
        { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
        { dc: isOddRow ? 1 : 0, dr: 1 }, { dc: isOddRow ? 0 : -1, dr: 1 },
        { dc: isOddRow ? 1 : 0, dr: -1 }, { dc: isOddRow ? 0 : -1, dr: -1 }
    ].map(n => `${c + n.dc},${r + n.dr}`);
};


const useThreeScene = (
    mountRef,
    islandHeightData,
    gridColumns,
    gridRows,
    timeOfDay,
    season,
    weatherCondition
) => {
    const [isFullyInitialized, setIsFullyInitialized] = useState(false);
    const animationFrameIdRef = useRef(null);
    const clockRef = useRef(null);
    const systemsRef = useRef({});

    const [snowAccumulationRatio, setSnowAccumulationRatio] = useState(0);
    const targetSnowAccumulationRef = useRef(0);

    const [selectedTileForBuilding, setSelectedTileForBuilding] = useState(null);
    const [isBuildingPaletteOpen, setIsBuildingPaletteOpen] = useState(false);
    const [existingBuildingOnSelectedTile, setExistingBuildingOnSelectedTile] = useState(null);

    systemsRef.current.core = useThreeCore(mountRef, gridColumns, gridRows);

    systemsRef.current.sunSky = useSunAndSky(
        systemsRef.current.core, timeOfDay, season, weatherCondition, snowAccumulationRatio
    );

    systemsRef.current.worldGeometry = useWorldGeometry(
        systemsRef.current.core,
        islandHeightData, weatherCondition, season, snowAccumulationRatio,
        (c, r) => {
            const buildings = systemsRef.current.buildings;
            if (buildings && typeof buildings.getBuildingOnTile === 'function') {
                return buildings.getBuildingOnTile(c, r);
            }
            return undefined;
        }
    );

    systemsRef.current.buildings = useBuildings(
        systemsRef.current.core,
        snowAccumulationRatio,
        timeOfDay,
        systemsRef.current.worldGeometry?.landTileMap,
        gridColumns,
        gridRows
    );

    systemsRef.current.water = useWater(systemsRef.current.core);

    systemsRef.current.foxes = useFoxes(
        systemsRef.current.core,
        systemsRef.current.worldGeometry?.landTiles,
        systemsRef.current.worldGeometry?.landTileMap,
        gridColumns, gridRows, season, snowAccumulationRatio
    );

    systemsRef.current.weatherEffects = useWeatherEffects(
        systemsRef.current.core, weatherCondition, season
    );

    useEffect(() => {
        const isSnowingInWinter = season === SEASONS.WINTER && weatherCondition === WEATHER_TYPES.SNOW;
        targetSnowAccumulationRef.current = isSnowingInWinter ? 1 : 0;
    }, [season, weatherCondition]);


    const raycasterRef = useRef(new THREE.Raycaster());
    const mousePositionRef = useRef(new THREE.Vector2());

    const handleCanvasClick = useCallback((event) => {
        const { core, worldGeometry, buildings } = systemsRef.current;
        if (!core?.isReady || !worldGeometry?.isReady || !mountRef.current || !buildings?.isReady) return;

        const { camera } = core;
        const { hexMeshesForRaycasting, landTileMap } = worldGeometry;

        if (!hexMeshesForRaycasting || hexMeshesForRaycasting.length === 0 || !landTileMap) return;

        if (isBuildingPaletteOpen && event.target.closest('.building-palette')) {
            return;
        }

        const rect = mountRef.current.getBoundingClientRect();
        mousePositionRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mousePositionRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mousePositionRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(hexMeshesForRaycasting, false);

        if (intersects.length > 0) {
            const firstIntersect = intersects[0].object;
            if (firstIntersect.userData?.isHexTile) {
                const tileData = firstIntersect.userData.tileData;

                if (BUILDABLE_TILE_TYPES.includes(tileData.type)) {
                    setSelectedTileForBuilding(tileData);
                    const existingBuildingData = buildings.getBuildingOnTile(tileData.c, tileData.r);
                    setExistingBuildingOnSelectedTile(
                        existingBuildingData ? { type: existingBuildingData.type, rotationY: existingBuildingData.rotationY } : null
                    );
                    setIsBuildingPaletteOpen(true);
                } else {
                    setIsBuildingPaletteOpen(false);
                    setSelectedTileForBuilding(null);
                    setExistingBuildingOnSelectedTile(null);
                }
            }
        } else {
            setIsBuildingPaletteOpen(false);
            setSelectedTileForBuilding(null);
            setExistingBuildingOnSelectedTile(null);
        }
    }, [isBuildingPaletteOpen]);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (currentMount) {
            currentMount.addEventListener('click', handleCanvasClick);
        }
        return () => {
            if (currentMount) {
                currentMount.removeEventListener('click', handleCanvasClick);
            }
        };
    }, [handleCanvasClick]);

    useEffect(() => {
        const { core, sunSky, worldGeometry, water, buildings, foxes, weatherEffects } = systemsRef.current;
        const coreRdy = core?.isReady;
        const sunSkyRdy = sunSky?.isReady;
        const worldRdyCheck = worldGeometry?.isReady && worldGeometry?.landTileMap && worldGeometry?.hexMeshesForRaycasting;
        const waterRdy = water?.isReady;
        const buildingsRdy = buildings?.isReady &&
            typeof buildings?.getBuildingOnTile === 'function' &&
            typeof buildings?.addBuilding === 'function' &&
            typeof buildings?.updateBuilding === 'function';

        const baseSystemsRdy = !!(coreRdy && sunSkyRdy && worldRdyCheck && waterRdy && buildingsRdy);
        const foxesActuallyRdy = !foxes || foxes.isReady;
        const weatherEffectsActuallyRdy = !weatherEffects || weatherEffects.isReady;

        const allSystemsGo = baseSystemsRdy && foxesActuallyRdy && weatherEffectsActuallyRdy;

        if (allSystemsGo !== isFullyInitialized) {
            if (allSystemsGo) console.log("useThreeScene: All systems GO! Fully initialized.");
            else console.warn("useThreeScene: Waiting for systems...", { coreRdy, sunSkyRdy, worldRdy: worldRdyCheck, waterRdy, buildingsRdy, foxesActuallyRdy, weatherEffectsActuallyRdy });
            setIsFullyInitialized(allSystemsGo);
        }
    }, [isFullyInitialized, systemsRef.current.core, systemsRef.current.sunSky, systemsRef.current.worldGeometry, systemsRef.current.water, systemsRef.current.buildings, systemsRef.current.foxes, systemsRef.current.weatherEffects]);

    useEffect(() => {
        if (!isFullyInitialized || !mountRef.current) {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            return;
        }
        if (animationFrameIdRef.current) return;

        console.log("useThreeScene: Starting Animation Loop.");
        clockRef.current = new THREE.Clock(true);

        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);
            const { core, worldGeometry, water, buildings, foxes, weatherEffects } = systemsRef.current;

            if (!core?.isReady || !worldGeometry?.isReady || !water?.isReady || !buildings?.isReady) {
                return;
            }

            const deltaTime = clockRef.current.getDelta();
            const elapsedTime = clockRef.current.getElapsedTime();

            setSnowAccumulationRatio(prevRatio => {
                let newRatio = prevRatio;
                const target = targetSnowAccumulationRef.current;
                const rate = target > newRatio ? SNOW_ACCUMULATION_SECONDS : SNOW_MELT_SECONDS;
                if (Math.abs(newRatio - target) < 0.001) return target;

                if (newRatio < target) newRatio += deltaTime / rate;
                else if (newRatio > target) newRatio -= deltaTime / rate;
                return Math.max(0, Math.min(1, newRatio));
            });

            if (water.updateAnimation) water.updateAnimation(deltaTime);
            if (worldGeometry.updateAnimations) worldGeometry.updateAnimations(elapsedTime);
            if (buildings.updateBuildingAnimations) buildings.updateBuildingAnimations(elapsedTime);

            if (foxes?.isReady && foxes.updateFoxes) foxes.updateFoxes(deltaTime, elapsedTime);
            if (weatherEffects?.isReady) {
                if (weatherEffects.updateRain) weatherEffects.updateRain(deltaTime);
                if (weatherEffects.updateSnow) weatherEffects.updateSnow(deltaTime);
            }

            if (core.controls) core.controls.update();
            if (core.renderer && core.scene && core.camera) {
                core.renderer.render(core.scene, core.camera);
            }
        };
        animate();
        return () => {
            console.log("useThreeScene: Cleaning up Animation Loop.");
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
            if (clockRef.current) clockRef.current.stop();
        };
    }, [isFullyInitialized, mountRef]);


    const handleBuildRequest = useCallback((tile, buildingType, rotationY = 0) => {
        const { buildings, worldGeometry } = systemsRef.current;
        if (!buildings?.addBuilding || !worldGeometry?.landTileMap) {
            setIsBuildingPaletteOpen(false);
            setSelectedTileForBuilding(null);
            console.error("Cannot build: Building system or world geometry not ready.");
            return;
        }
        if (buildingType === AllBuildingTypes.HARBOUR) {
            let hasWaterNeighbor = false;
            const adjacentKeys = getAdjacentTileKeys(tile.c, tile.r);
            for (const key of adjacentKeys) {
                const neighborTile = worldGeometry.landTileMap.get(key);
                if (neighborTile && (neighborTile.type === TILE_TYPES.DEEP_WATER || neighborTile.type === TILE_TYPES.SHALLOW_WATER)) {
                    hasWaterNeighbor = true;
                    break;
                }
            }
            if (!hasWaterNeighbor) {
                alert("Harbours must be built on a coastal land tile next to water!");
                return;
            }
        }

        const builtModel = buildings.addBuilding(tile, buildingType);

        if (builtModel && buildingType !== AllBuildingTypes.HARBOUR && rotationY !== undefined) {
            // Apply initial rotation for non-harbour buildings
            buildings.updateBuilding(tile, { rotationY });
        }

        setIsBuildingPaletteOpen(false);
        setSelectedTileForBuilding(null);
        setExistingBuildingOnSelectedTile(null);
    }, []);

    const handleUpdateBuildingRequest = useCallback((tile, updates) => {
        const { buildings } = systemsRef.current;
        if (!buildings?.updateBuilding) {
            console.error("Cannot update building: Building system not ready.");
            return;
        }
        buildings.updateBuilding(tile, updates);
        const updatedBuildingData = buildings.getBuildingOnTile(tile.c, tile.r);
        setExistingBuildingOnSelectedTile(
            updatedBuildingData ? { type: updatedBuildingData.type, rotationY: updatedBuildingData.rotationY } : null
        );
    }, []);


    const handleCancelBuild = useCallback(() => {
        setIsBuildingPaletteOpen(false);
        setSelectedTileForBuilding(null);
        setExistingBuildingOnSelectedTile(null);
    }, []);

    return {
        isBuildingPaletteOpen,
        selectedTileForBuilding,
        existingBuildingOnSelectedTile,
        onBuild: handleBuildRequest,
        onCancel: handleCancelBuild,
        onUpdateBuilding: handleUpdateBuildingRequest,
    };
};

export default useThreeScene;