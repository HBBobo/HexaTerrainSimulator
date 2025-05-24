// src/components/HexMap/utils/reedsUtils.js
import * as THREE from 'three';

// --- Reed Constants ---
const REED_STALK_HEIGHT_MIN = 0.5;
const REED_STALK_HEIGHT_MAX = 1.2;
const REED_STALK_RADIUS = 0.015;
const REED_STALKS_PER_CLUMP_MIN = 3;
const REED_STALKS_PER_CLUMP_MAX = 7;
const REED_CLUMP_SPREAD_RADIUS = 0.15; // How far stalks spread from clump center
const REED_COLOR = 0x8FBC8F;

const reedMaterial = new THREE.MeshStandardMaterial({
    color: REED_COLOR,
    roughness: 0.7,
    metalness: 0.0,
    flatShading: false, // Reeds are thin, flat shading might not be noticeable or desired
    side: THREE.DoubleSide, // Good for thin geometry if camera can go inside clumps
});

export const createReedClump = () => {
    const clump = new THREE.Group();
    const numStalks = Math.floor(Math.random() * (REED_STALKS_PER_CLUMP_MAX - REED_STALKS_PER_CLUMP_MIN + 1)) + REED_STALKS_PER_CLUMP_MIN;

    for (let i = 0; i < numStalks; i++) {
        const stalkHeight = Math.random() * (REED_STALK_HEIGHT_MAX - REED_STALK_HEIGHT_MIN) + REED_STALK_HEIGHT_MIN;

        const stalkGeometry = new THREE.CylinderGeometry(
            REED_STALK_RADIUS,
            REED_STALK_RADIUS,
            stalkHeight,
            5
        );
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

export const disposeReedMaterial = () => {
    if (reedMaterial) reedMaterial.dispose();
};