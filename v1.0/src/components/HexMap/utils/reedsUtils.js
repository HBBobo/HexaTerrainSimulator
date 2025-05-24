// src/components/HexMap/utils/reedsUtils.js
import * as THREE from 'three';
import { SNOW_COVER_COLOR, MAX_SNOW_COVER_LERP_FACTOR } from '../constants';

const REED_STALK_HEIGHT_MIN = 0.5;
const REED_STALK_HEIGHT_MAX = 1.2;
const REED_STALK_RADIUS = 0.015;
const REED_STALKS_PER_CLUMP_MIN = 3;
const REED_STALKS_PER_CLUMP_MAX = 7;
const REED_CLUMP_SPREAD_RADIUS = 0.15;
const REED_COLOR_HEX = 0x8FBC8F;

const reedMaterial = new THREE.MeshStandardMaterial({
    color: REED_COLOR_HEX,
    roughness: 0.7,
    metalness: 0.0,
    flatShading: false,
    side: THREE.DoubleSide,
});
const originalReedColor = reedMaterial.color.clone();

export const createReedClump = () => {
    const clump = new THREE.Group();
    const numStalks = Math.floor(Math.random() * (REED_STALKS_PER_CLUMP_MAX - REED_STALKS_PER_CLUMP_MIN + 1)) + REED_STALKS_PER_CLUMP_MIN;

    for (let i = 0; i < numStalks; i++) {
        const stalkHeight = Math.random() * (REED_STALK_HEIGHT_MAX - REED_STALK_HEIGHT_MIN) + REED_STALK_HEIGHT_MIN;
        const stalkGeometry = new THREE.CylinderGeometry(REED_STALK_RADIUS, REED_STALK_RADIUS, stalkHeight, 5);
        const stalkMesh = new THREE.Mesh(stalkGeometry, reedMaterial);
        stalkMesh.castShadow = true;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * REED_CLUMP_SPREAD_RADIUS;
        const xOffset = Math.cos(angle) * radius;
        const zOffset = Math.sin(angle) * radius;
        stalkMesh.position.set(xOffset, stalkHeight / 2, zOffset);
        stalkMesh.rotation.x = (Math.random() - 0.5) * 0.15;
        stalkMesh.rotation.z = (Math.random() - 0.5) * 0.15;
        clump.add(stalkMesh);
    }
    return clump;
};

// snowAccumulationRatio is 0 (no snow) to 1 (full snow)
export const updateReedMaterialsForSnow = (snowAccumulationRatio) => {
    const snowColor = new THREE.Color(SNOW_COVER_COLOR);
    // Reeds get more heavily 'snowed' or appear frosted
    const currentLerp = snowAccumulationRatio * MAX_SNOW_COVER_LERP_FACTOR * 1.15; // Slightly more effect
    reedMaterial.color.copy(originalReedColor).lerp(snowColor, Math.min(currentLerp, 1.0)); // Cap lerp at 1
    reedMaterial.needsUpdate = true;
};

export const disposeReedMaterial = () => {
    if (reedMaterial) reedMaterial.dispose();
};