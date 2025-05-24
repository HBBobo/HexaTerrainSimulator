// src/components/HexMap/utils/rockUtils.js
import * as THREE from 'three';

// --- Rock Constants ---
const ROCK_SIZE_MIN = 0.25;
const ROCK_SIZE_MAX = 0.7;
const ROCK_DETAIL = 0;

const ROCK_COLORS = [
    0x808080, // Grey
    0x778899, // LightSlateGray
    0x696969, // DimGray
    0x8B8682, // DarkGray-ish Brown
];

const rockMaterials = ROCK_COLORS.map(color => new THREE.MeshStandardMaterial({
    color: color,
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

export const disposeRockMaterials = () => {
    rockMaterials.forEach(material => material.dispose());
};