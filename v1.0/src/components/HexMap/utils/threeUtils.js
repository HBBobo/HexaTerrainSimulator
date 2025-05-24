// src/components/HexMap/utils/threeUtils.js
import * as THREE from 'three';

export const createHexagonGeometry = (size, height) => {
    return new THREE.CylinderGeometry(size, size, height, 6);
};

export const createHexagonInstance = (geometry, material, x, y, z) => {
    const hexMesh = new THREE.Mesh(geometry, material);
    hexMesh.position.set(x, y, z);
    hexMesh.castShadow = true;
    hexMesh.receiveShadow = true;
    return hexMesh;
};