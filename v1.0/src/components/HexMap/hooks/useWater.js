// src/components/HexMap/hooks/useWater.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    TRANSPARENT_LAYER_Y, TRANSPARENT_LAYER_OPACITY, TRANSPARENT_LAYER_COLOR,
    MAX_WAVE_SPEED_COMPONENT, WAVE_DIRECTION_CHANGE_INTERVAL_MIN,
    WAVE_DIRECTION_CHANGE_INTERVAL_MAX, WAVE_SPEED_LERP_FACTOR,
    SKYBOX_IMAGE_BASE_PATH, SKYBOX_IMAGE_NAMES, WATER_NORMAL_MAP_URL
} from '../constants';

const useWater = (coreElements) => {
    const [waterState, setWaterState] = useState(null);
    const waveAnimParamsRef = useRef(null);

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            coreElements.worldMapWidth === undefined || coreElements.worldMapDepth === undefined) {
            if (waterState) setWaterState(null);
            return;
        }

        const { scene, worldMapWidth, worldMapDepth } = coreElements;
        console.log("useWater: Initializing...");

        const textureLoader = new THREE.TextureLoader();
        const cubeTextureLoader = new THREE.CubeTextureLoader();

        const waterMaterial = new THREE.MeshStandardMaterial({
            color: TRANSPARENT_LAYER_COLOR,
            opacity: TRANSPARENT_LAYER_OPACITY,
            transparent: true,
            side: THREE.DoubleSide,
            roughness: 0.1,
            metalness: 0.2,
            normalScale: new THREE.Vector2(0.2, 0.2),
            envMapIntensity: 0.7,
            depthWrite: false,
        });

        const environmentMap = cubeTextureLoader.load(
            SKYBOX_IMAGE_NAMES.map(name => `${SKYBOX_IMAGE_BASE_PATH}${name}`),
            (texture) => {
                waterMaterial.envMap = texture;
                waterMaterial.needsUpdate = true;
                console.log("useWater: Skybox env map loaded for water reflections.");
            },
            undefined,
            (err) => console.error("useWater: Error loading env map for water:", err)
        );

        const waterNormalMap = textureLoader.load(WATER_NORMAL_MAP_URL,
            (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                waterMaterial.normalMap = texture;
                waterMaterial.needsUpdate = true;
                console.log('useWater: Water normal map loaded.');
            },
            undefined,
            (err) => console.error('useWater: Error loading water normal map:', err)
        );

        const waterGeometry = new THREE.PlaneGeometry(worldMapWidth * 1.05, worldMapDepth * 1.05, 10, 10);
        const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.y = TRANSPARENT_LAYER_Y - 0.05;
        waterMesh.receiveShadow = true;
        waterMesh.renderOrder = 1;
        scene.add(waterMesh);

        waveAnimParamsRef.current = {
            currentSpeedX: (Math.random() - 0.5) * MAX_WAVE_SPEED_COMPONENT * 0.5,
            currentSpeedY: (Math.random() - 0.5) * MAX_WAVE_SPEED_COMPONENT * 0.5,
            targetSpeedX: (Math.random() - 0.5) * MAX_WAVE_SPEED_COMPONENT,
            targetSpeedY: (Math.random() - 0.5) * MAX_WAVE_SPEED_COMPONENT,
            timeToNextDirectionChange: Math.random() * (WAVE_DIRECTION_CHANGE_INTERVAL_MAX - WAVE_DIRECTION_CHANGE_INTERVAL_MIN) + WAVE_DIRECTION_CHANGE_INTERVAL_MIN,
        };

        console.log("useWater: Water system created, setting state.");
        setWaterState({
            waterMesh,
            waterMaterial,
            waterNormalMap,
            environmentMap,
            isReady: true
        });

        return () => {
            console.log("useWater: Cleaning up...");
            if (waterMesh && scene && waterMesh.parent === scene) scene.remove(waterMesh);
            if (waterGeometry) waterGeometry.dispose();
            if (waterMaterial) waterMaterial.dispose();
            if (waterNormalMap) waterNormalMap.dispose();
            if (environmentMap) environmentMap.dispose();

            waveAnimParamsRef.current = null;
            setWaterState(null);
        };
    }, [coreElements]);

    const updateAnimation = useCallback((deltaTime) => {
        if (!waterState || !waterState.isReady || !waveAnimParamsRef.current || !waterState.waterMaterial) return;

        const { waterMaterial } = waterState;
        const params = waveAnimParamsRef.current;

        if (waterMaterial.normalMap && waterMaterial.normalMap.image) {
            params.timeToNextDirectionChange -= deltaTime;
            if (params.timeToNextDirectionChange <= 0) {
                params.targetSpeedX = (Math.random() - 0.5) * MAX_WAVE_SPEED_COMPONENT * 2;
                params.targetSpeedY = (Math.random() - 0.5) * MAX_WAVE_SPEED_COMPONENT * 2;
                params.timeToNextDirectionChange = Math.random() * (WAVE_DIRECTION_CHANGE_INTERVAL_MAX - WAVE_DIRECTION_CHANGE_INTERVAL_MIN) + WAVE_DIRECTION_CHANGE_INTERVAL_MIN;
            }
            params.currentSpeedX = THREE.MathUtils.lerp(params.currentSpeedX, params.targetSpeedX, WAVE_SPEED_LERP_FACTOR);
            params.currentSpeedY = THREE.MathUtils.lerp(params.currentSpeedY, params.targetSpeedY, WAVE_SPEED_LERP_FACTOR);
            waterMaterial.normalMap.offset.x += params.currentSpeedX * deltaTime;
            waterMaterial.normalMap.offset.y += params.currentSpeedY * deltaTime;
        }
    }, [waterState]);

    return waterState ? { ...waterState, updateAnimation } : null;
};

export default useWater;