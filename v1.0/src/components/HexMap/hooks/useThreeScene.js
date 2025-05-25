// src/components/HexMap/hooks/useThreeScene.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import useThreeCore from './useThreeCore';
import useSunAndSky from './useSunAndSky';
import useWorldGeometry from './useWorldGeometry';
import useWater from './useWater';
import useFoxes from './useFoxes';
import useWeatherEffects from './useWeatherEffects';
import useBuildings from '../buildings/useBuildings'; // UPDATED PATH
import { SEASONS, WEATHER_TYPES, SNOW_ACCUMULATION_SECONDS, SNOW_MELT_SECONDS, BUILDABLE_TILE_TYPES, BUILDING_TYPES } from '../constants';

// ... (rest of the useThreeScene hook remains the same as the last fully working version)
// The only change is the import path for useBuildings.
// For brevity, I'm not pasting the whole file again.
// Ensure the rest of useThreeScene.js is identical to the version provided in your previous "okay, thanks..." message's correct version.

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

    systemsRef.current.buildings = useBuildings( // This hook is now imported from the new path
        systemsRef.current.core,
        snowAccumulationRatio,
        timeOfDay
    );

    systemsRef.current.worldGeometry = useWorldGeometry(
        systemsRef.current.core,
        islandHeightData, weatherCondition, season, snowAccumulationRatio,
        systemsRef.current.buildings?.getBuildingOnTile
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
        if (systemsRef.current.core && systemsRef.current.sunSky) {
            systemsRef.current.core.sunSky = systemsRef.current.sunSky;
        }
    }, [systemsRef.current.core, systemsRef.current.sunSky]);


    useEffect(() => {
        const isSnowingInWinter = season === SEASONS.WINTER && weatherCondition === WEATHER_TYPES.SNOW;
        targetSnowAccumulationRef.current = isSnowingInWinter ? 1 : 0;
    }, [season, weatherCondition]);


    const raycasterRef = useRef(new THREE.Raycaster());
    const mousePositionRef = useRef(new THREE.Vector2());

    const handleCanvasClick = useCallback((event) => {
        const { core, worldGeometry, buildings } = systemsRef.current;
        if (!core || !core.isReady || !worldGeometry || !worldGeometry.isReady || !mountRef.current) return;

        const { camera } = core;
        const { hexMeshesForRaycasting } = worldGeometry;

        if (!hexMeshesForRaycasting || hexMeshesForRaycasting.length === 0) return;

        const rect = mountRef.current.getBoundingClientRect();
        mousePositionRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mousePositionRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mousePositionRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(hexMeshesForRaycasting, false);

        if (intersects.length > 0) {
            const firstIntersect = intersects[0].object;
            if (firstIntersect.userData && firstIntersect.userData.isHexTile) {
                const tileData = firstIntersect.userData.tileData;

                if (BUILDABLE_TILE_TYPES.includes(tileData.type)) {
                    setSelectedTileForBuilding(tileData);
                    const existingBuilding = buildings && typeof buildings.getBuildingOnTile === 'function'
                        ? buildings.getBuildingOnTile(tileData.c, tileData.r)
                        : undefined;
                    setExistingBuildingOnSelectedTile(existingBuilding ? existingBuilding.type : null);
                    setIsBuildingPaletteOpen(true);
                } else {
                    setIsBuildingPaletteOpen(false);
                    setSelectedTileForBuilding(null);
                }
            }
        } else {
            setIsBuildingPaletteOpen(false);
            setSelectedTileForBuilding(null);
        }
    }, []);

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
        const worldRdyCheck = worldGeometry?.isReady &&
            worldGeometry?.landTiles &&
            worldGeometry?.landTileMap &&
            worldGeometry?.hexMeshesForRaycasting;
        const waterRdy = water?.isReady;
        const buildingsRdy = buildings?.isReady && typeof buildings?.getBuildingOnTile === 'function';

        const baseSystemsRdy = !!(coreRdy && sunSkyRdy && worldRdyCheck && waterRdy && buildingsRdy);

        const foxesActuallyRdy = !foxes || foxes.isReady;
        const weatherEffectsActuallyRdy = !weatherEffects || weatherEffects.isReady;

        const allSystemsGo = baseSystemsRdy && foxesActuallyRdy && weatherEffectsActuallyRdy;

        if (allSystemsGo !== isFullyInitialized) {
            if (allSystemsGo) console.log("useThreeScene: All systems GO! Fully initialized.");
            else console.log("useThreeScene: Waiting for systems...", { coreRdy, sunSkyRdy, worldRdy: worldRdyCheck, waterRdy, buildingsRdy: buildings?.isReady, getBuildingFuncReady: typeof buildings?.getBuildingOnTile === 'function', foxesActuallyRdy, weatherEffectsActuallyRdy });
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

        if (animationFrameIdRef.current) {
            return;
        }

        console.log("useThreeScene: Starting Animation Loop.");
        clockRef.current = new THREE.Clock(true);

        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);
            const { core, sunSky, worldGeometry, water, buildings, foxes, weatherEffects } = systemsRef.current;

            if (!core || !core.isReady || !isFullyInitialized) {
                return;
            }

            const deltaTime = clockRef.current.getDelta();
            const elapsedTime = clockRef.current.getElapsedTime();

            setSnowAccumulationRatio(prevRatio => {
                let newRatio = prevRatio;
                const target = targetSnowAccumulationRef.current;
                if (newRatio < target) {
                    newRatio += deltaTime / SNOW_ACCUMULATION_SECONDS;
                    newRatio = Math.min(newRatio, target);
                } else if (newRatio > target) {
                    newRatio -= deltaTime / SNOW_MELT_SECONDS;
                    newRatio = Math.max(newRatio, target);
                }
                return newRatio;
            });

            if (water?.isReady && water?.updateAnimation) water.updateAnimation(deltaTime);
            if (worldGeometry?.isReady && worldGeometry?.updateAnimations) worldGeometry.updateAnimations(elapsedTime);
            if (buildings?.isReady && buildings?.updateBuildingAnimations) buildings.updateBuildingAnimations(elapsedTime);
            if (foxes?.isReady && foxes?.updateFoxes) foxes.updateFoxes(deltaTime, elapsedTime);

            if (weatherEffects?.isReady) {
                if (weatherEffects?.updateRain) weatherEffects.updateRain(deltaTime);
                if (weatherEffects?.updateSnow) weatherEffects.updateSnow(deltaTime);
            }

            if (core.controls) core.controls.update();
            if (core.renderer && core.scene && core.camera) {
                core.renderer.render(core.scene, core.camera);
            }
        };

        animate();

        return () => {
            console.log("useThreeScene: Cleaning up Animation Loop.");
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            if (clockRef.current) {
                clockRef.current.stop();
            }
        };
    }, [isFullyInitialized, mountRef]);


    const handleBuildRequest = useCallback((tile, buildingType) => {
        const { buildings } = systemsRef.current;
        if (buildings && buildings.addBuilding) {
            buildings.addBuilding(tile, buildingType);
        }
        setIsBuildingPaletteOpen(false);
        setSelectedTileForBuilding(null);
    }, []);

    const handleCancelBuild = useCallback(() => {
        setIsBuildingPaletteOpen(false);
        setSelectedTileForBuilding(null);
    }, []);

    return {
        isBuildingPaletteOpen,
        selectedTileForBuilding,
        existingBuildingOnSelectedTile,
        onBuild: handleBuildRequest,
        onCancel: handleCancelBuild,
    };
};

export default useThreeScene;