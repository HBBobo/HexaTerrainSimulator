// src/components/HexMap/hooks/useWeatherEffects.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    WEATHER_TYPES, RAIN_PARTICLE_COUNT, RAIN_AREA_XZ_FACTOR,
    RAIN_AREA_Y_MAX, RAIN_FALL_SPEED, RAIN_PARTICLE_SIZE,
    RAIN_PARTICLE_OPACITY, RAIN_COLOR
} from '../constants';

const useWeatherEffects = (coreElements, weatherCondition) => {
    const [weatherEffectsState, setWeatherEffectsState] = useState(null);
    const rainParticlesRef = useRef(null);
    const rainMaterialRef = useRef(null);

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            coreElements.worldMapWidth === undefined || coreElements.worldMapDepth === undefined) {
            if (weatherEffectsState) setWeatherEffectsState(null);
            return;
        }

        const { scene, worldMapWidth, worldMapDepth } = coreElements;
        console.log("useWeatherEffects: Initializing Rain...");

        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(RAIN_PARTICLE_COUNT * 3);
        const velocities = new Float32Array(RAIN_PARTICLE_COUNT * 3);

        const spawnAreaWidth = worldMapWidth * RAIN_AREA_XZ_FACTOR;
        const spawnAreaDepth = worldMapDepth * RAIN_AREA_XZ_FACTOR;

        for (let i = 0; i < RAIN_PARTICLE_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * spawnAreaWidth;
            positions[i * 3 + 1] = Math.random() * RAIN_AREA_Y_MAX;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spawnAreaDepth;
            velocities[i * 3 + 1] = -(Math.random() * 0.5 + 0.5) * RAIN_FALL_SPEED;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const material = new THREE.PointsMaterial({
            color: RAIN_COLOR,
            size: RAIN_PARTICLE_SIZE,
            transparent: true,
            opacity: RAIN_PARTICLE_OPACITY,
            depthWrite: false,
            sizeAttenuation: true,
        });
        rainMaterialRef.current = material;

        const particles = new THREE.Points(particleGeometry, material);
        particles.visible = false;
        particles.name = "RainParticles";
        scene.add(particles);
        rainParticlesRef.current = particles;

        console.log("useWeatherEffects: Rain system created, setting state.");
        setWeatherEffectsState({
            isReady: true
        });

        return () => {
            console.log("useWeatherEffects: Cleaning up Rain...");
            if (rainParticlesRef.current && scene && rainParticlesRef.current.parent === scene) {
                scene.remove(rainParticlesRef.current);
            }
            if (rainParticlesRef.current?.geometry) rainParticlesRef.current.geometry.dispose();
            rainParticlesRef.current = null;

            if (rainMaterialRef.current) {
                rainMaterialRef.current.dispose();
                rainMaterialRef.current = null;
            }
            setWeatherEffectsState(null);
        };
    }, [coreElements]);

    const updateRain = useCallback((deltaTime) => {
        if (!weatherEffectsState || !weatherEffectsState.isReady || !rainParticlesRef.current ||
            !coreElements || !coreElements.isReady || !coreElements.camera) {
            return;
        }

        const { camera, worldMapWidth, worldMapDepth } = coreElements;
        const particles = rainParticlesRef.current;
        particles.visible = (weatherCondition === WEATHER_TYPES.RAINY);

        if (!particles.visible) return;

        particles.position.x = camera.position.x;
        particles.position.z = camera.position.z;

        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.geometry.attributes.velocity.array;

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
        particles.geometry.attributes.position.needsUpdate = true;

    }, [weatherEffectsState, weatherCondition, coreElements]);

    return weatherEffectsState ? { isReady: weatherEffectsState.isReady, updateRain } : null;
};

export default useWeatherEffects;