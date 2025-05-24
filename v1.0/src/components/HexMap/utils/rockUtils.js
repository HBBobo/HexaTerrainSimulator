// src/components/HexMap/utils/rockUtils.js
import * as THREE from 'three';
import { SNOW_COVER_COLOR, MAX_SNOW_COVER_LERP_FACTOR } from '../constants';

const ROCK_SIZE_MIN = 0.25;
const ROCK_SIZE_MAX = 0.7;
const ROCK_DETAIL = 0;

const ROCK_COLORS_HEX = [
    0x808080, 0x778899, 0x696969, 0x8B8682,
];

const originalRockColors = ROCK_COLORS_HEX.map(hex => new THREE.Color(hex));

const rockMaterials = originalRockColors.map(color => new THREE.MeshStandardMaterial({
    color: color.clone(),
    roughness: 0.75,
    metalness: 0.1,
    flatShading: true,
}));

export const createRock = (forcedSize) => {
    const size = forcedSize !== undefined
        ? forcedSize
        : Math.random() * (ROCK_SIZE_MAX - ROCK_SIZE_MIN) + ROCK_SIZE_MIN;

    const geometry = new THREE.DodecahedronGeometry(size / 1.8, ROCK_DETAIL);
    const material = rockMaterials[Math.floor(Math.random() * rockMaterials.length)];
    const rockMesh = new THREE.Mesh(geometry, material);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    return rockMesh;
};

// snowAccumulationRatio is 0 (no snow) to 1 (full snow)
export const updateRockMaterialsForSnow = (snowAccumulationRatio) => {
    const snowColor = new THREE.Color(SNOW_COVER_COLOR);
    const currentLerp = snowAccumulationRatio * MAX_SNOW_COVER_LERP_FACTOR;

    rockMaterials.forEach((material, index) => {
        material.color.copy(originalRockColors[index]).lerp(snowColor, currentLerp);
        material.needsUpdate = true;
    });
};

export const disposeRockMaterials = () => {
    rockMaterials.forEach(material => material.dispose());
};