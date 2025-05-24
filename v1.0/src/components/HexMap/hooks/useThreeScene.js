// src/components/HexMap/hooks/useThreeScene.js
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import useThreeCore from './useThreeCore';
import useSunAndSky from './useSunAndSky';
import useWorldGeometry from './useWorldGeometry';
import useWater from './useWater';
import useFoxes from './useFoxes';
import useWeatherEffects from './useWeatherEffects';
import { SEASONS, WEATHER_TYPES, SNOW_ACCUMULATION_SECONDS, SNOW_MELT_SECONDS } from '../constants';

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
    const allElementsCacheRef = useRef({});

    const [snowAccumulationRatio, setSnowAccumulationRatio] = useState(0);
    const targetSnowAccumulationRef = useRef(0);

    const coreElements = useThreeCore(mountRef, gridColumns, gridRows);
    allElementsCacheRef.current.core = coreElements;

    useEffect(() => {
        const isSnowingInWinter = season === SEASONS.WINTER && weatherCondition === WEATHER_TYPES.SNOW;
        targetSnowAccumulationRef.current = isSnowingInWinter ? 1 : 0;
    }, [season, weatherCondition]);


    const sunSkyElements = useSunAndSky(
        coreElements,
        timeOfDay,
        season,
        weatherCondition,
        snowAccumulationRatio
    );
    allElementsCacheRef.current.sunSky = sunSkyElements;

    const worldGeometryElements = useWorldGeometry(
        coreElements,
        islandHeightData,
        weatherCondition,
        season,
        snowAccumulationRatio
    );
    allElementsCacheRef.current.worldGeometry = worldGeometryElements;

    const waterElements = useWater(
        coreElements
    );
    allElementsCacheRef.current.water = waterElements;

    const foxSystem = useFoxes(
        coreElements,
        worldGeometryElements?.landTiles,
        worldGeometryElements?.landTileMap,
        gridColumns,
        gridRows,
        season, // Pass season
        snowAccumulationRatio // Pass snowAccumulationRatio
    );
    allElementsCacheRef.current.foxes = foxSystem;

    const weatherEffectSystem = useWeatherEffects(
        coreElements,
        weatherCondition,
        season
    );
    allElementsCacheRef.current.weatherEffects = weatherEffectSystem;


    useEffect(() => {
        const coreRdy = coreElements && coreElements.isReady;
        const sunSkyRdy = sunSkyElements && sunSkyElements.isReady;
        const worldRdy = worldGeometryElements && worldGeometryElements.isReady && worldGeometryElements.landTiles && worldGeometryElements.landTileMap;
        const waterRdy = waterElements && waterElements.isReady;
        const baseSystemsRdy = !!(coreRdy && sunSkyRdy && worldRdy && waterRdy);

        const foxesActuallyRdy = foxSystem ? foxSystem.isReady : true;
        const weatherEffectsActuallyRdy = weatherEffectSystem ? weatherEffectSystem.isReady : true;

        const allSystemsGo = baseSystemsRdy && foxesActuallyRdy && weatherEffectsActuallyRdy;

        if (allSystemsGo !== isFullyInitialized) {
            if (allSystemsGo) console.log("useThreeScene: All systems GO! Fully initialized.");
            else console.log("useThreeScene: Waiting for systems...", { coreRdy, sunSkyRdy: sunSkyElements?.isReady, worldRdy, waterRdy, foxesActuallyRdy, weatherEffectsActuallyRdy });
            setIsFullyInitialized(allSystemsGo);
        }
    }, [coreElements, sunSkyElements, worldGeometryElements, waterElements, foxSystem, weatherEffectSystem, isFullyInitialized]);


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

            const elements = allElementsCacheRef.current;
            if (!elements.core || !elements.core.isReady || !isFullyInitialized) {
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

            if (elements.water?.isReady && elements.water?.updateAnimation) elements.water.updateAnimation(deltaTime);
            if (elements.worldGeometry?.isReady && elements.worldGeometry?.updateAnimations) elements.worldGeometry.updateAnimations(elapsedTime);
            if (elements.foxes?.isReady && elements.foxes?.updateFoxes) elements.foxes.updateFoxes(deltaTime, elapsedTime);

            if (elements.weatherEffects?.isReady) {
                if (elements.weatherEffects?.updateRain) elements.weatherEffects.updateRain(deltaTime);
                if (elements.weatherEffects?.updateSnow) elements.weatherEffects.updateSnow(deltaTime);
            }

            if (elements.core.controls) elements.core.controls.update();
            if (elements.core.renderer && elements.core.scene && elements.core.camera) {
                elements.core.renderer.render(elements.core.scene, elements.core.camera);
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

    return null;
};

export default useThreeScene;