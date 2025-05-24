// src/components/HexMap/hooks/useWeatherEffects.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    WEATHER_TYPES, SEASONS,
    RAIN_PARTICLE_COUNT, RAIN_AREA_XZ_FACTOR, RAIN_AREA_Y_MAX, RAIN_FALL_SPEED,
    RAIN_PARTICLE_SIZE, RAIN_PARTICLE_OPACITY, RAIN_COLOR,
    SNOW_PARTICLE_COUNT, SNOW_AREA_XZ_FACTOR, SNOW_AREA_Y_MAX, SNOW_FALL_SPEED,
    SNOW_PARTICLE_SIZE, SNOW_PARTICLE_OPACITY, SNOW_PARTICLE_TEXTURE_URL,
    SNOW_DRIFT_SPEED_X_FACTOR, SNOW_DRIFT_SPEED_Z_FACTOR
} from '../constants';

const useWeatherEffects = (coreElements, weatherCondition, season) => {
    const [weatherEffectsState, setWeatherEffectsState] = useState({ isReady: false, hasInitializedOnce: false });
    const rainParticlesRef = useRef(null);
    const rainMaterialRef = useRef(null);
    const snowParticlesRef = useRef(null);
    const snowMaterialRef = useRef(null);
    const snowTextureRef = useRef(null);
    const textureLoaderRef = useRef(null);


    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            coreElements.worldMapWidth === undefined || coreElements.worldMapDepth === undefined) {
            if (weatherEffectsState.isReady) setWeatherEffectsState(prev => ({ ...prev, isReady: false }));
            return;
        }
        if (weatherEffectsState.hasInitializedOnce) { // Prevent re-initialization if coreElements reference changes but is still valid
            if (!weatherEffectsState.isReady) setWeatherEffectsState(prev => ({ ...prev, isReady: true }));
            return;
        }


        const { scene, worldMapWidth, worldMapDepth } = coreElements;
        console.log("useWeatherEffects: Initializing weather systems...");
        textureLoaderRef.current = new THREE.TextureLoader();

        // --- Rain Setup ---
        const rainParticleGeometry = new THREE.BufferGeometry();
        const rainPositions = new Float32Array(RAIN_PARTICLE_COUNT * 3);
        const rainVelocities = new Float32Array(RAIN_PARTICLE_COUNT * 3);
        const rainSpawnAreaWidth = worldMapWidth * RAIN_AREA_XZ_FACTOR;
        const rainSpawnAreaDepth = worldMapDepth * RAIN_AREA_XZ_FACTOR;

        for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
            rainPositions[i * 3 + 0] = (Math.random() - 0.5) * rainSpawnAreaWidth;
            rainPositions[i * 3 + 1] = Math.random() * RAIN_AREA_Y_MAX;
            rainPositions[i * 3 + 2] = (Math.random() - 0.5) * rainSpawnAreaDepth;
            rainVelocities[i * 3 + 1] = -(Math.random() * 0.5 + 0.5) * RAIN_FALL_SPEED;
        }
        rainParticleGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        rainParticleGeometry.setAttribute('velocity', new THREE.BufferAttribute(rainVelocities, 3));
        rainMaterialRef.current = new THREE.PointsMaterial({
            color: RAIN_COLOR, size: RAIN_PARTICLE_SIZE, transparent: true,
            opacity: RAIN_PARTICLE_OPACITY, depthWrite: false, sizeAttenuation: true,
        });
        rainParticlesRef.current = new THREE.Points(rainParticleGeometry, rainMaterialRef.current);
        rainParticlesRef.current.visible = false; rainParticlesRef.current.name = "RainParticles";
        scene.add(rainParticlesRef.current);

        // --- Snow Setup ---
        snowTextureRef.current = textureLoaderRef.current.load(SNOW_PARTICLE_TEXTURE_URL, (texture) => {
            console.log("useWeatherEffects: Snow texture loaded.");
            if (snowMaterialRef.current) {
                snowMaterialRef.current.map = texture;
                snowMaterialRef.current.needsUpdate = true;
            }
        });
        const snowParticleGeometry = new THREE.BufferGeometry();
        const snowPositions = new Float32Array(SNOW_PARTICLE_COUNT * 3);
        const snowVelocities = new Float32Array(SNOW_PARTICLE_COUNT * 3); // x, y, z for drift
        const snowSpawnAreaWidth = worldMapWidth * SNOW_AREA_XZ_FACTOR;
        const snowSpawnAreaDepth = worldMapDepth * SNOW_AREA_XZ_FACTOR;

        for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
            snowPositions[i * 3 + 0] = (Math.random() - 0.5) * snowSpawnAreaWidth;
            snowPositions[i * 3 + 1] = Math.random() * SNOW_AREA_Y_MAX;
            snowPositions[i * 3 + 2] = (Math.random() - 0.5) * snowSpawnAreaDepth;

            snowVelocities[i * 3 + 0] = (Math.random() - 0.5) * SNOW_DRIFT_SPEED_X_FACTOR * SNOW_FALL_SPEED; // Horizontal drift
            snowVelocities[i * 3 + 1] = -(Math.random() * 0.4 + 0.6) * SNOW_FALL_SPEED; // Vertical fall
            snowVelocities[i * 3 + 2] = (Math.random() - 0.5) * SNOW_DRIFT_SPEED_Z_FACTOR * SNOW_FALL_SPEED; // Horizontal drift
        }
        snowParticleGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
        snowParticleGeometry.setAttribute('velocity', new THREE.BufferAttribute(snowVelocities, 3));
        snowMaterialRef.current = new THREE.PointsMaterial({
            map: snowTextureRef.current, size: SNOW_PARTICLE_SIZE, transparent: true,
            opacity: SNOW_PARTICLE_OPACITY, depthWrite: false, sizeAttenuation: true,
            blending: THREE.AdditiveBlending, // Brighter snowflakes
        });
        snowParticlesRef.current = new THREE.Points(snowParticleGeometry, snowMaterialRef.current);
        snowParticlesRef.current.visible = false; snowParticlesRef.current.name = "SnowParticles";
        scene.add(snowParticlesRef.current);

        console.log("useWeatherEffects: Weather systems created, setting state.");
        setWeatherEffectsState({ isReady: true, hasInitializedOnce: true });

        return () => {
            console.log("useWeatherEffects: Cleaning up weather systems...");
            if (rainParticlesRef.current) {
                if (rainParticlesRef.current.parent) scene.remove(rainParticlesRef.current);
                rainParticlesRef.current.geometry?.dispose();
            }
            if (rainMaterialRef.current) rainMaterialRef.current.dispose();
            rainParticlesRef.current = null; rainMaterialRef.current = null;

            if (snowParticlesRef.current) {
                if (snowParticlesRef.current.parent) scene.remove(snowParticlesRef.current);
                snowParticlesRef.current.geometry?.dispose();
            }
            if (snowMaterialRef.current) snowMaterialRef.current.dispose();
            if (snowTextureRef.current) snowTextureRef.current.dispose();
            snowParticlesRef.current = null; snowMaterialRef.current = null; snowTextureRef.current = null;

            setWeatherEffectsState({ isReady: false, hasInitializedOnce: false });
        };
    }, [coreElements]); // Only re-init if coreElements itself changes identity and is not ready.

    const updateRain = useCallback((deltaTime) => {
        if (!weatherEffectsState.isReady || !rainParticlesRef.current || !coreElements?.isReady || !coreElements.camera) return;

        const isRainActive = weatherCondition === WEATHER_TYPES.RAINY;
        rainParticlesRef.current.visible = isRainActive;
        if (!isRainActive) return;

        const { camera, worldMapWidth, worldMapDepth } = coreElements;
        rainParticlesRef.current.position.set(camera.position.x, 0, camera.position.z);

        const positions = rainParticlesRef.current.geometry.attributes.position.array;
        const velocities = rainParticlesRef.current.geometry.attributes.velocity.array;
        const spawnAreaWidth = worldMapWidth * RAIN_AREA_XZ_FACTOR;
        const spawnAreaDepth = worldMapDepth * RAIN_AREA_XZ_FACTOR;

        for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
            positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 0] = (Math.random() - 0.5) * spawnAreaWidth;
                positions[i * 3 + 1] = RAIN_AREA_Y_MAX * (0.8 + Math.random() * 0.4);
                positions[i * 3 + 2] = (Math.random() - 0.5) * spawnAreaDepth;
            }
        }
        rainParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }, [weatherEffectsState.isReady, weatherCondition, coreElements]);

    const updateSnow = useCallback((deltaTime) => {
        if (!weatherEffectsState.isReady || !snowParticlesRef.current || !coreElements?.isReady || !coreElements.camera) return;

        const isSnowActive = weatherCondition === WEATHER_TYPES.SNOW && season === SEASONS.WINTER;
        snowParticlesRef.current.visible = isSnowActive;
        if (!isSnowActive) return;

        const { camera, worldMapWidth, worldMapDepth } = coreElements;
        snowParticlesRef.current.position.set(camera.position.x, 0, camera.position.z);

        const positions = snowParticlesRef.current.geometry.attributes.position.array;
        const velocities = snowParticlesRef.current.geometry.attributes.velocity.array;
        const spawnAreaWidth = worldMapWidth * SNOW_AREA_XZ_FACTOR;
        const spawnAreaDepth = worldMapDepth * SNOW_AREA_XZ_FACTOR;
        const spawnAreaY = SNOW_AREA_Y_MAX;

        for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
            positions[i * 3 + 0] += velocities[i * 3 + 0] * deltaTime;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;

            if (positions[i * 3 + 1] < 0) { // Particle has fallen below ground
                positions[i * 3 + 0] = (Math.random() - 0.5) * spawnAreaWidth; // Reset X
                positions[i * 3 + 1] = spawnAreaY * (0.9 + Math.random() * 0.2);   // Reset Y to top
                positions[i * 3 + 2] = (Math.random() - 0.5) * spawnAreaDepth; // Reset Z
            }
            // Optional: boundary checks for X and Z if particles drift too far from camera-centered spawn
            // This simple reset works well if the spawn area is large enough relative to drift.
        }
        snowParticlesRef.current.geometry.attributes.position.needsUpdate = true;

    }, [weatherEffectsState.isReady, weatherCondition, season, coreElements]);

    return weatherEffectsState.isReady ? { isReady: true, updateRain, updateSnow } : { isReady: false };
};

export default useWeatherEffects;