// src/components/HexMap/utils/treeUtils.js
import * as THREE from 'three';

// --- Cypress Tree Constants ---
const CYPRESS_BASE_RADIUS_MIN = 0.2;
const CYPRESS_BASE_RADIUS_MAX = 0.3;
const CYPRESS_HEIGHT_BASE_MIN = 1.2;
const CYPRESS_HEIGHT_BASE_MAX = 2.5;
const CYPRESS_RADIAL_SEGMENTS = 5;
const CYPRESS_FOLIAGE_COLOR = 0x808060;

// --- Trunk Constants ---
const TRUNK_HEIGHT_BASE_MIN = 0.3;
const TRUNK_HEIGHT_BASE_MAX = 0.6;
const TRUNK_RADIUS_FACTOR = 0.45;
const TRUNK_COLOR = 0x5D4037;
const TRUNK_RADIAL_SEGMENTS = 4;

// How much the hex elevation influences tree height. 0 = no influence, 1 = strong influence on range.
const ELEVATION_INFLUENCE_ON_TREE_HEIGHT = 0.6; // Tunable: 0 to 1 (or more)

const foliageMaterial = new THREE.MeshStandardMaterial({
    color: CYPRESS_FOLIAGE_COLOR,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
});

const trunkMaterial = new THREE.MeshStandardMaterial({
    color: TRUNK_COLOR,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
});

export const createCypressTree = (
    forcedFoliageHeight,
    forcedFoliageBaseRadius,
    hexNormalizedElevationFactor = 0.5
) => {
    const minHeightMultiplier = 0.7 + (ELEVATION_INFLUENCE_ON_TREE_HEIGHT * hexNormalizedElevationFactor * 0.6);
    const maxHeightMultiplier = 0.8 + (ELEVATION_INFLUENCE_ON_TREE_HEIGHT * hexNormalizedElevationFactor * 0.5);

    const currentFoliageHeightMin = CYPRESS_HEIGHT_BASE_MIN * minHeightMultiplier;
    const currentFoliageHeightMax = CYPRESS_HEIGHT_BASE_MAX * maxHeightMultiplier;

    const currentTrunkHeightMin = TRUNK_HEIGHT_BASE_MIN * minHeightMultiplier;
    const currentTrunkHeightMax = TRUNK_HEIGHT_BASE_MAX * maxHeightMultiplier;

    const foliageHeight = forcedFoliageHeight !== undefined
        ? forcedFoliageHeight
        : Math.max(0.5, Math.random() * (currentFoliageHeightMax - currentFoliageHeightMin) + currentFoliageHeightMin); // Ensure min foliage height

    const foliageBaseRadius = forcedFoliageBaseRadius !== undefined
        ? forcedFoliageBaseRadius
        : Math.random() * (CYPRESS_BASE_RADIUS_MAX - CYPRESS_BASE_RADIUS_MIN) + CYPRESS_BASE_RADIUS_MIN;

    const trunkHeight = Math.max(0.15, Math.random() * (currentTrunkHeightMax - currentTrunkHeightMin) + currentTrunkHeightMin); // Ensure min trunk height
    const trunkRadius = foliageBaseRadius * TRUNK_RADIUS_FACTOR;
    const minVisibleTrunkRadius = 0.04;
    const finalTrunkRadius = Math.max(minVisibleTrunkRadius, trunkRadius);

    const foliageGeometry = new THREE.ConeGeometry(
        foliageBaseRadius, foliageHeight, CYPRESS_RADIAL_SEGMENTS, 1, false
    );
    const foliageMesh = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliageMesh.castShadow = true;

    const trunkGeometry = new THREE.CylinderGeometry(
        finalTrunkRadius, finalTrunkRadius, trunkHeight, TRUNK_RADIAL_SEGMENTS
    );
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.castShadow = true;
    trunkMesh.position.y = trunkHeight / 2;

    const tree = new THREE.Group();
    tree.add(trunkMesh);

    foliageMesh.position.y = (foliageHeight + trunkHeight) / 2;
    tree.add(foliageMesh);

    const useDebugSpheres = false;
    if (useDebugSpheres) {
        const trunkTopSphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const foliageBaseSphereMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const debugSphereRadius = 0.07;
        const trunkTopSphere = new THREE.Mesh(new THREE.SphereGeometry(debugSphereRadius, 8, 8), trunkTopSphereMat);
        trunkTopSphere.position.set(0, trunkHeight, 0);
        tree.add(trunkTopSphere);
        const foliageBaseSphere = new THREE.Mesh(new THREE.SphereGeometry(debugSphereRadius, 8, 8), foliageBaseSphereMat);
        foliageBaseSphere.position.copy(foliageMesh.position);
        tree.add(foliageBaseSphere);
    }

    return tree;
};

export const disposeTreeMaterial = () => {
    if (foliageMaterial) foliageMaterial.dispose();
    if (trunkMaterial) trunkMaterial.dispose();
};