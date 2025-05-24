// src/components/HexMap/hooks/useSunAndSky.js
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
    SHADOW_MAP_SIZE, WEATHER_TYPES,
    MAX_SUN_ELEVATION_SUMMER, MAX_SUN_ELEVATION_WINTER, SUN_AZIMUTH_SWING,
    MOON_LIGHT_INTENSITY, MOON_COLOR, MOON_SIZE_FACTOR,
    SUN_INTENSITY_CLOUDY_FACTOR, MOON_INTENSITY_CLOUDY_FACTOR
} from '../constants';
import { calculateSunPosition, getSunLightColor, getMoonLightColor, getSkyAndFogColor } from '../utils/colorUtils';

const useSunAndSky = (coreElements, timeOfDay, season, weatherCondition) => {
    const [celestialState, setCelestialState] = useState(null);

    const originalShadowSettingsRef = useRef({
        sun: { castShadow: true, bias: -0.0000, normalBias: 0.02, mapSize: SHADOW_MAP_SIZE, radius: 1 },
        moon: { castShadow: true, bias: -0.000, normalBias: 0.03, mapSize: SHADOW_MAP_SIZE / 2, radius: 1 }
    });

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            coreElements.worldMapWidth === undefined || coreElements.worldMapDepth === undefined) {
            if (celestialState) setCelestialState(null);
            return;
        }

        const { scene, worldMapWidth, worldMapDepth } = coreElements;
        console.log("useSunAndSky: Initializing...");

        const sunLight = new THREE.DirectionalLight(0xFFFDD0, 2.8);
        sunLight.castShadow = originalShadowSettingsRef.current.sun.castShadow;
        sunLight.shadow.mapSize.width = originalShadowSettingsRef.current.sun.mapSize;
        sunLight.shadow.mapSize.height = originalShadowSettingsRef.current.sun.mapSize;
        const shadowCamSize = Math.max(worldMapWidth, worldMapDepth) * 0.9;
        sunLight.shadow.camera.left = -shadowCamSize; sunLight.shadow.camera.right = shadowCamSize;
        sunLight.shadow.camera.top = shadowCamSize; sunLight.shadow.camera.bottom = -shadowCamSize;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = Math.max(worldMapWidth, worldMapDepth) * 3;
        sunLight.shadow.bias = originalShadowSettingsRef.current.sun.bias;
        sunLight.shadow.normalBias = originalShadowSettingsRef.current.sun.normalBias;
        scene.add(sunLight); scene.add(sunLight.target); sunLight.target.position.set(0, 0, 0);

        const sunMeshGeometry = new THREE.SphereGeometry(Math.max(worldMapWidth, worldMapDepth) * MOON_SIZE_FACTOR, 32, 32);
        const sunMeshMaterial = new THREE.MeshBasicMaterial({ fog: false });
        const sunMesh = new THREE.Mesh(sunMeshGeometry, sunMeshMaterial);
        sunMesh.name = "SunMesh"; scene.add(sunMesh);

        const moonLight = new THREE.DirectionalLight(MOON_COLOR, MOON_LIGHT_INTENSITY);
        moonLight.castShadow = originalShadowSettingsRef.current.moon.castShadow;
        moonLight.shadow.mapSize.width = originalShadowSettingsRef.current.moon.mapSize;
        moonLight.shadow.mapSize.height = originalShadowSettingsRef.current.moon.mapSize;
        moonLight.shadow.camera.left = -shadowCamSize; moonLight.shadow.camera.right = shadowCamSize;
        moonLight.shadow.camera.top = shadowCamSize; moonLight.shadow.camera.bottom = -shadowCamSize;
        moonLight.shadow.camera.near = 0.5; moonLight.shadow.camera.far = Math.max(worldMapWidth, worldMapDepth) * 3;
        moonLight.shadow.bias = originalShadowSettingsRef.current.moon.bias;
        moonLight.shadow.normalBias = originalShadowSettingsRef.current.moon.normalBias;
        moonLight.visible = false; scene.add(moonLight); scene.add(moonLight.target); moonLight.target.position.set(0, 0, 0);

        const moonMeshGeometry = new THREE.SphereGeometry(Math.max(worldMapWidth, worldMapDepth) * MOON_SIZE_FACTOR, 32, 32);
        const moonMeshMaterial = new THREE.MeshBasicMaterial({ color: MOON_COLOR, fog: false });
        const moonMesh = new THREE.Mesh(moonMeshGeometry, moonMeshMaterial);
        moonMesh.name = "MoonMesh"; moonMesh.visible = false; scene.add(moonMesh);

        console.log("useSunAndSky: Celestial objects created, setting state.");
        setCelestialState({ sunLight, sunMesh, moonLight, moonMesh, isReady: true });

        return () => {
            console.log("useSunAndSky: Cleaning up...");
            if (sunLight?.parent) scene.remove(sunLight);
            if (sunLight?.target?.parent) scene.remove(sunLight.target);
            if (sunLight?.shadow?.map) sunLight.shadow.map.dispose();
            if (sunMesh?.parent) scene.remove(sunMesh);
            if (sunMesh?.geometry) sunMesh.geometry.dispose();
            if (sunMesh?.material) sunMesh.material.dispose();
            if (moonLight?.parent) scene.remove(moonLight);
            if (moonLight?.target?.parent) scene.remove(moonLight.target);
            if (moonLight?.shadow?.map) moonLight.shadow.map.dispose();
            if (moonMesh?.parent) scene.remove(moonMesh);
            if (moonMesh?.geometry) moonMesh.geometry.dispose();
            if (moonMesh?.material) moonMesh.material.dispose();
            setCelestialState(null);
        };
    }, [coreElements]);

    useEffect(() => {
        if (!celestialState || !celestialState.isReady ||
            !coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            !coreElements.ambientLight ||
            coreElements.worldMapWidth === undefined || coreElements.worldMapDepth === undefined) {
            return;
        }

        const { scene, worldMapWidth, worldMapDepth, ambientLight } = coreElements;
        const { sunLight, sunMesh, moonLight, moonMesh } = celestialState;

        const isCloudyType = weatherCondition === WEATHER_TYPES.CLOUDY || weatherCondition === WEATHER_TYPES.RAINY;
        const isClear = weatherCondition === WEATHER_TYPES.CLEAR;

        if (isCloudyType) {
            ambientLight.intensity = 0.7;
        } else {
            ambientLight.intensity = 0.4;
        }

        const { elevation: sunElevation, azimuth: sunAzimuth } = calculateSunPosition(
            timeOfDay, season, MAX_SUN_ELEVATION_SUMMER, MAX_SUN_ELEVATION_WINTER, SUN_AZIMUTH_SWING
        );
        const sunAzimuthRad = THREE.MathUtils.degToRad(sunAzimuth);
        const sunElevationRad = THREE.MathUtils.degToRad(sunElevation);
        const celestialDistance = Math.max(worldMapWidth, worldMapDepth) * 1.5;

        const sunY = celestialDistance * Math.sin(sunElevationRad);
        const sunX = celestialDistance * Math.cos(sunElevationRad) * Math.cos(sunAzimuthRad);
        const sunZ = celestialDistance * Math.cos(sunElevationRad) * Math.sin(sunAzimuthRad);
        sunLight.position.set(sunX, sunY, sunZ);

        const currentSunLightColor = getSunLightColor(sunElevation);
        sunLight.color.set(currentSunLightColor);
        let sunBaseIntensity = sunElevation > -5 ? 2.8 : 0.05;
        sunLight.intensity = isCloudyType ? sunBaseIntensity * SUN_INTENSITY_CLOUDY_FACTOR : sunBaseIntensity;
        sunLight.visible = sunElevation > -8;

        if (sunLight.visible && sunLight.intensity > 0.1) {
            if (isCloudyType) {
                if (sunLight.castShadow) sunLight.castShadow = false;
            } else {
                if (!sunLight.castShadow) sunLight.castShadow = originalShadowSettingsRef.current.sun.castShadow;
                sunLight.shadow.bias = originalShadowSettingsRef.current.sun.bias;
                sunLight.shadow.normalBias = originalShadowSettingsRef.current.sun.normalBias;
            }
        } else {
            if (sunLight.castShadow) sunLight.castShadow = false;
        }

        if (sunMesh?.material) {
            sunMesh.position.copy(sunLight.position).normalize().multiplyScalar(Math.max(worldMapWidth, worldMapDepth) * 2.5);
            sunMesh.material.color.set(currentSunLightColor);
            sunMesh.visible = sunElevation > -2 && isClear;
        }

        const moonTime = (timeOfDay + 12) % 24;
        const { elevation: moonElevation, azimuth: moonAzimuth } = calculateSunPosition(
            moonTime, season, 65, 65, 100
        );
        const moonAzimuthRad = THREE.MathUtils.degToRad(moonAzimuth);
        const moonElevationRad = THREE.MathUtils.degToRad(moonElevation);
        const moonYPos = celestialDistance * Math.sin(moonElevationRad);
        const moonXPos = celestialDistance * Math.cos(moonElevationRad) * Math.cos(moonAzimuthRad);
        const moonZPos = celestialDistance * Math.cos(moonElevationRad) * Math.sin(moonAzimuthRad);
        moonLight.position.set(moonXPos, moonYPos, moonZPos);

        const currentMoonLightColor = getMoonLightColor(moonElevation);
        moonLight.color.set(currentMoonLightColor);
        let moonBaseIntensity = MOON_LIGHT_INTENSITY * Math.max(0, Math.sin(moonElevationRad));
        moonLight.intensity = isCloudyType ? moonBaseIntensity * MOON_INTENSITY_CLOUDY_FACTOR : moonBaseIntensity;
        moonLight.visible = moonElevation > -5 && sunElevation < 5 && moonLight.intensity > 0.01;

        if (moonLight.visible && moonLight.intensity > 0.05) {
            if (isCloudyType) {
                if (moonLight.castShadow) moonLight.castShadow = false;
            } else {
                if (!moonLight.castShadow) moonLight.castShadow = originalShadowSettingsRef.current.moon.castShadow;
                moonLight.shadow.bias = originalShadowSettingsRef.current.moon.bias;
                moonLight.shadow.normalBias = originalShadowSettingsRef.current.moon.normalBias;
            }
        } else {
            if (moonLight.castShadow) moonLight.castShadow = false;
        }

        if (moonMesh?.material) {
            moonMesh.position.copy(moonLight.position).normalize().multiplyScalar(Math.max(worldMapWidth, worldMapDepth) * 2.0);
            moonMesh.material.color.set(MOON_COLOR);
            moonMesh.visible = moonElevation > -2 && isClear;
        }

        const skyAndFogColor = getSkyAndFogColor(sunElevation, moonElevation, currentSunLightColor, weatherCondition);
        if (!(scene.background instanceof THREE.CubeTexture)) {
            if (!scene.background || !(scene.background instanceof THREE.Color)) {
                scene.background = new THREE.Color();
            }
            scene.background.set(skyAndFogColor);
        }
        if (scene.fog) {
            scene.fog.color.set(skyAndFogColor);
        }

    }, [celestialState, coreElements, timeOfDay, season, weatherCondition]);

    return celestialState;
};

export default useSunAndSky;