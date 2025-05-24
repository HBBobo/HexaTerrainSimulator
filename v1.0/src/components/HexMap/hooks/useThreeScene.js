// src/components/HexMap/hooks/useThreeScene.js
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import useThreeCore from './useThreeCore';
import useSunAndSky from './useSunAndSky';
import useWorldGeometry from './useWorldGeometry';
import useWater from './useWater';
import useFoxes from './useFoxes';
import useWeatherEffects from './useWeatherEffects';

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

    const coreElements = useThreeCore(mountRef, gridColumns, gridRows);
    allElementsCacheRef.current.core = coreElements;

    const sunSkyElements = useSunAndSky(
        coreElements,
        timeOfDay,
        season,
        weatherCondition
    );
    allElementsCacheRef.current.sunSky = sunSkyElements;

    const worldGeometryElements = useWorldGeometry(
        coreElements,
        islandHeightData
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
        gridRows
    );
    allElementsCacheRef.current.foxes = foxSystem;

    const weatherEffectSystem = useWeatherEffects(
        coreElements,
        weatherCondition
    );
    allElementsCacheRef.current.weatherEffects = weatherEffectSystem;


    useEffect(() => {
        const coreRdy = coreElements && coreElements.isReady;
        const sunSkyRdy = sunSkyElements && sunSkyElements.isReady;
        const worldRdy = worldGeometryElements && worldGeometryElements.isReady && worldGeometryElements.landTiles && worldGeometryElements.landTileMap;
        const waterRdy = waterElements && waterElements.isReady;
        const foxesRdy = foxSystem && foxSystem.isReady;
        const weatherEffectsRdy = weatherEffectSystem && weatherEffectSystem.isReady;

        const allSystemsGo = !!(coreRdy && sunSkyRdy && worldRdy && waterRdy && foxesRdy && weatherEffectsRdy);

        if (allSystemsGo !== isFullyInitialized) {
            if (allSystemsGo) console.log("useThreeScene: All systems GO! Fully initialized.");
            else console.log("useThreeScene: Waiting for one or more systems to initialize...");
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

            if (elements.sunSky?.isReady && elements.sunSky?.update) elements.sunSky.update();
            if (elements.water?.isReady && elements.water?.updateAnimation) elements.water.updateAnimation(deltaTime);
            if (elements.worldGeometry?.isReady && elements.worldGeometry?.updateAnimations) elements.worldGeometry.updateAnimations(elapsedTime);
            if (elements.foxes?.isReady && elements.foxes?.updateFoxes) elements.foxes.updateFoxes(deltaTime, elapsedTime);
            if (elements.weatherEffects?.isReady && elements.weatherEffects?.updateRain) elements.weatherEffects.updateRain(deltaTime);

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