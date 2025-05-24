// src/components/HexMap/hooks/useSunAndSky.js
import { useEffect, useRef, useState } from 'react'; // Removed useCallback
import * as THREE from 'three';
import {
    SEASONS, SHADOW_MAP_SIZE, WEATHER_TYPES,
    MAX_SUN_ELEVATION_SUMMER, MAX_SUN_ELEVATION_WINTER, SUN_AZIMUTH_SWING,
    MOON_LIGHT_INTENSITY, MOON_COLOR, MOON_SIZE_FACTOR,
    SUN_INTENSITY_CLOUDY_FACTOR, MOON_INTENSITY_CLOUDY_FACTOR
    // Removed SHADOW_FADE_DURATION, SHADOW_MAX_BLUR_RADIUS_FACTOR
} from '../constants';
import { calculateSunPosition, getSunLightColor, getMoonLightColor, getSkyAndFogColor } from '../utils/colorUtils';

const useSunAndSky = (coreElements, timeOfDay, season, weatherCondition, snowAccumulationRatio) => {
    const [celestialSystem, setCelestialSystem] = useState({
        sunLight: null, sunMesh: null, moonLight: null, moonMesh: null,
        originalSunShadowRadius: 1, originalMoonShadowRadius: 0.8, // Store original radius for sharpness
        isReady: false,
    });

    const initialSettingsAppliedRef = useRef(false);

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            coreElements.worldMapWidth === undefined || coreElements.worldMapDepth === undefined) {
            if (celestialSystem.isReady) setCelestialSystem(prev => ({ ...prev, isReady: false }));
            return;
        }
        if (celestialSystem.isReady && initialSettingsAppliedRef.current) {
            return;
        }

        const { scene, worldMapWidth, worldMapDepth } = coreElements;
        console.log("useSunAndSky: Initializing celestial objects (simplified shadows)...");

        const originalSunSettings = { bias: -0.0000, normalBias: 0.02, mapSize: SHADOW_MAP_SIZE, radius: 1 };
        const originalMoonSettings = { bias: -0.000, normalBias: 0.03, mapSize: SHADOW_MAP_SIZE / 2, radius: 0.8 };

        const sunLight = new THREE.DirectionalLight(0xFFFDD0, 2.8);
        sunLight.castShadow = false; // Initially off
        sunLight.shadow.mapSize.width = originalSunSettings.mapSize;
        sunLight.shadow.mapSize.height = originalSunSettings.mapSize;
        const shadowCamSize = Math.max(worldMapWidth, worldMapDepth) * 0.9;
        sunLight.shadow.camera.left = -shadowCamSize; sunLight.shadow.camera.right = shadowCamSize;
        sunLight.shadow.camera.top = shadowCamSize; sunLight.shadow.camera.bottom = -shadowCamSize;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = Math.max(worldMapWidth, worldMapDepth) * 3;
        sunLight.shadow.bias = originalSunSettings.bias;
        sunLight.shadow.normalBias = originalSunSettings.normalBias;
        sunLight.shadow.radius = originalSunSettings.radius; // Set to default sharp radius
        scene.add(sunLight); scene.add(sunLight.target); sunLight.target.position.set(0, 0, 0);

        const sunMeshGeometry = new THREE.SphereGeometry(Math.max(worldMapWidth, worldMapDepth) * MOON_SIZE_FACTOR, 32, 32);
        const sunMeshMaterial = new THREE.MeshBasicMaterial({ fog: false });
        const sunMesh = new THREE.Mesh(sunMeshGeometry, sunMeshMaterial);
        sunMesh.name = "SunMesh"; scene.add(sunMesh);

        const moonLight = new THREE.DirectionalLight(MOON_COLOR, MOON_LIGHT_INTENSITY);
        moonLight.castShadow = false; // Initially off
        moonLight.shadow.mapSize.width = originalMoonSettings.mapSize;
        moonLight.shadow.mapSize.height = originalMoonSettings.mapSize;
        moonLight.shadow.camera.left = -shadowCamSize; moonLight.shadow.camera.right = shadowCamSize;
        moonLight.shadow.camera.top = shadowCamSize; moonLight.shadow.camera.bottom = -shadowCamSize;
        moonLight.shadow.camera.near = 0.5; moonLight.shadow.camera.far = Math.max(worldMapWidth, worldMapDepth) * 3;
        moonLight.shadow.bias = originalMoonSettings.bias;
        moonLight.shadow.normalBias = originalMoonSettings.normalBias;
        moonLight.shadow.radius = originalMoonSettings.radius; // Set to default sharp radius
        moonLight.visible = false; scene.add(moonLight); scene.add(moonLight.target); moonLight.target.position.set(0, 0, 0);

        const moonMeshGeometry = new THREE.SphereGeometry(Math.max(worldMapWidth, worldMapDepth) * MOON_SIZE_FACTOR, 32, 32);
        const moonMeshMaterial = new THREE.MeshBasicMaterial({ color: MOON_COLOR, fog: false });
        const moonMesh = new THREE.Mesh(moonMeshGeometry, moonMeshMaterial);
        moonMesh.name = "MoonMesh"; moonMesh.visible = false; scene.add(moonMesh);

        setCelestialSystem(prev => ({
            ...prev,
            sunLight, sunMesh, moonLight, moonMesh,
            originalSunShadowRadius: originalSunSettings.radius,
            originalMoonShadowRadius: originalMoonSettings.radius,
            isReady: true,
        }));
        initialSettingsAppliedRef.current = true;

        return () => {
            initialSettingsAppliedRef.current = false;
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
            setCelestialSystem(prev => ({ ...prev, isReady: false, sunLight: null, moonLight: null }));
        };
    }, [coreElements]);

    useEffect(() => {
        if (!celestialSystem.isReady || !coreElements?.isReady || !coreElements.scene ||
            !coreElements.ambientLight || snowAccumulationRatio === undefined) {
            return;
        }

        const { scene, worldMapWidth, worldMapDepth, ambientLight } = coreElements;
        const { sunLight, sunMesh, moonLight, moonMesh,
            originalSunShadowRadius, originalMoonShadowRadius
        } = celestialSystem;

        const isActuallySnowing = season === SEASONS.WINTER && weatherCondition === WEATHER_TYPES.SNOW;
        const isCloudyWeather = weatherCondition === WEATHER_TYPES.CLOUDY;
        const isRainyWeather = weatherCondition === WEATHER_TYPES.RAINY;

        let overcastLerpFactor = 0;
        if (isCloudyWeather || isRainyWeather) {
            overcastLerpFactor = 1.0;
        }
        if (isActuallySnowing) {
            overcastLerpFactor = snowAccumulationRatio;
        } else if (snowAccumulationRatio > 0 && (isCloudyWeather || isRainyWeather)) {
            overcastLerpFactor = 1.0;
        } else if (snowAccumulationRatio > 0) {
            overcastLerpFactor = snowAccumulationRatio;
        }

        const baseAmbient = 0.4;
        const overcastAmbient = 0.7;
        const snowTargetAmbient = 0.8;
        let currentAmbient = baseAmbient;
        if (isCloudyWeather || isRainyWeather) currentAmbient = overcastAmbient;
        currentAmbient = THREE.MathUtils.lerp(currentAmbient, snowTargetAmbient, isActuallySnowing ? snowAccumulationRatio : (season === SEASONS.WINTER && weatherCondition !== WEATHER_TYPES.SNOW ? snowAccumulationRatio : 0));
        ambientLight.intensity = currentAmbient;

        const { elevation: sunElevation, azimuth: sunAzimuth } = calculateSunPosition(
            timeOfDay, season, MAX_SUN_ELEVATION_SUMMER, MAX_SUN_ELEVATION_WINTER, SUN_AZIMUTH_SWING
        );
        sunLight.position.set( /* ... */); // Position calculation remains the same
        const sunAzimuthRad = THREE.MathUtils.degToRad(sunAzimuth);
        const sunElevationRad = THREE.MathUtils.degToRad(sunElevation);
        const celestialDistance = Math.max(worldMapWidth, worldMapDepth) * 1.5;
        sunLight.position.set(
            celestialDistance * Math.cos(sunElevationRad) * Math.cos(sunAzimuthRad),
            celestialDistance * Math.sin(sunElevationRad),
            celestialDistance * Math.cos(sunElevationRad) * Math.sin(sunAzimuthRad)
        );

        sunLight.color.set(getSunLightColor(sunElevation));
        const sunBaseIntensityVal = sunElevation > -5 ? 2.8 : 0.05;
        let currentSunIntensityReductionFactor = isCloudyWeather || isRainyWeather || isActuallySnowing ? SUN_INTENSITY_CLOUDY_FACTOR : 1.0;
        if (isActuallySnowing) currentSunIntensityReductionFactor = SUN_INTENSITY_CLOUDY_FACTOR * 1.2; // Snow still dims, but maybe slightly less than pure clouds

        sunLight.intensity = THREE.MathUtils.lerp(sunBaseIntensityVal, sunBaseIntensityVal * currentSunIntensityReductionFactor, overcastLerpFactor);
        sunLight.visible = sunElevation > -8;

        if (sunMesh?.material) {
            sunMesh.position.copy(sunLight.position).normalize().multiplyScalar(Math.max(worldMapWidth, worldMapDepth) * 2.5);
            sunMesh.material.color.copy(sunLight.color);
            sunMesh.visible = sunElevation > -2 && !(isCloudyWeather || isRainyWeather || isActuallySnowing);
        }

        const moonTime = (timeOfDay + 12) % 24;
        const { elevation: moonElevation, azimuth: moonAzimuth } = calculateSunPosition(moonTime, season, 65, 65, 100);
        moonLight.position.set( /* ... */); // Position calculation remains the same
        const moonAzimuthRad = THREE.MathUtils.degToRad(moonAzimuth);
        const moonElevationRad = THREE.MathUtils.degToRad(moonElevation);
        moonLight.position.set(
            celestialDistance * Math.cos(moonElevationRad) * Math.cos(moonAzimuthRad),
            celestialDistance * Math.sin(moonElevationRad),
            celestialDistance * Math.cos(moonElevationRad) * Math.sin(moonAzimuthRad)
        );

        moonLight.color.set(getMoonLightColor(moonElevation));
        const moonBaseIntensityVal = MOON_LIGHT_INTENSITY * Math.max(0, Math.sin(THREE.MathUtils.degToRad(moonElevation)));
        let currentMoonIntensityReductionFactor = isCloudyWeather || isRainyWeather || isActuallySnowing ? MOON_INTENSITY_CLOUDY_FACTOR : 1.0;
        if (isActuallySnowing) currentMoonIntensityReductionFactor = MOON_INTENSITY_CLOUDY_FACTOR * 1.1;

        moonLight.intensity = THREE.MathUtils.lerp(moonBaseIntensityVal, moonBaseIntensityVal * currentMoonIntensityReductionFactor, overcastLerpFactor);
        moonLight.visible = moonElevation > -5 && sunElevation < 5 && moonLight.intensity > 0.01;

        if (moonMesh?.material) {
            moonMesh.position.copy(moonLight.position).normalize().multiplyScalar(Math.max(worldMapWidth, worldMapDepth) * 2.0);
            moonMesh.material.color.set(MOON_COLOR);
            moonMesh.visible = moonElevation > -2 && !(isCloudyWeather || isRainyWeather || isActuallySnowing);
        }

        // Simplified Shadow Logic:
        // Shadows are ON if light is visible and reasonably bright.
        // During snow, shadows might persist if light is strong enough through the overcast.
        const sunShadowsActive = sunLight.visible && sunLight.intensity > (sunBaseIntensityVal * SUN_INTENSITY_CLOUDY_FACTOR * 0.2); // Threshold for sun shadow
        if (sunLight.castShadow !== sunShadowsActive) {
            sunLight.castShadow = sunShadowsActive;
        }
        if (sunShadowsActive && sunLight.shadow.radius !== originalSunShadowRadius) {
            sunLight.shadow.radius = originalSunShadowRadius; // Ensure solid shadow
        }

        const moonShadowsActive = moonLight.visible && moonLight.intensity > (moonBaseIntensityVal * MOON_INTENSITY_CLOUDY_FACTOR * 0.15); // Threshold for moon shadow
        if (moonLight.castShadow !== moonShadowsActive) {
            moonLight.castShadow = moonShadowsActive;
        }
        if (moonShadowsActive && moonLight.shadow.radius !== originalMoonShadowRadius) {
            moonLight.shadow.radius = originalMoonShadowRadius; // Ensure solid shadow
        }


        const skyAndFogColor = getSkyAndFogColor(sunElevation, moonElevation, sunLight.color, weatherCondition, season, snowAccumulationRatio);
        if (!(scene.background instanceof THREE.CubeTexture)) {
            if (!scene.background || !(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
            scene.background.set(skyAndFogColor);
        }
        if (scene.fog) {
            scene.fog.color.set(skyAndFogColor);
            const defaultFogNear = 50; const defaultFogFar = 300;
            const rainyFogNear = 30; const rainyFogFar = 200;
            const snowyFogNear = 20; const snowyFogFar = 150;
            let currentFogNear = defaultFogNear; let currentFogFar = defaultFogFar;

            if (isActuallySnowing) {
                const baseNear = (isRainyWeather && !isActuallySnowing) ? rainyFogNear : defaultFogNear;
                const baseFar = (isRainyWeather && !isActuallySnowing) ? rainyFogFar : defaultFogFar;
                currentFogNear = THREE.MathUtils.lerp(baseNear, snowyFogNear, snowAccumulationRatio);
                currentFogFar = THREE.MathUtils.lerp(baseFar, snowyFogFar, snowAccumulationRatio);
            } else if (isRainyWeather) {
                currentFogNear = rainyFogNear; currentFogFar = rainyFogFar;
                if (snowAccumulationRatio > 0) { // Melting from snow to rain
                    currentFogNear = THREE.MathUtils.lerp(snowyFogNear, rainyFogNear, 1.0 - snowAccumulationRatio);
                    currentFogFar = THREE.MathUtils.lerp(snowyFogFar, rainyFogFar, 1.0 - snowAccumulationRatio);
                }
            } else if (snowAccumulationRatio > 0) { // Melting from snow to clear/cloudy
                currentFogNear = THREE.MathUtils.lerp(snowyFogNear, defaultFogNear, 1.0 - snowAccumulationRatio);
                currentFogFar = THREE.MathUtils.lerp(snowyFogFar, defaultFogFar, 1.0 - snowAccumulationRatio);
            }
            scene.fog.near = currentFogNear; scene.fog.far = currentFogFar;
        }

    }, [
        celestialSystem.isReady, coreElements, timeOfDay, season,
        weatherCondition, snowAccumulationRatio,
        celestialSystem.originalSunShadowRadius, celestialSystem.originalMoonShadowRadius
    ]);

    // updateTransitions function is removed as it's no longer needed for radius animation.
    // The main useEffect now handles direct toggling of castShadow.

    return celestialSystem.isReady ? { ...celestialSystem } : null; // Removed updateTransitions from return
};

export default useSunAndSky;