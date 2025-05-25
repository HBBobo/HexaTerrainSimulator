// src/components/HexMap/buildings/models/createFarmModel.js
import * as THREE from 'three';
import { BUILDING_TYPES } from '../BuildingTypes' // Adjust path
import { getCachedMaterial } from '../utils/materialManager'; // Adjust path

const FARM_SOIL_COLOR = 0x654321;
const FARM_FENCE_COLOR = 0x8B7355;

export const createFarmModel = (tileY) => {
    const farmGroup = new THREE.Group();
    farmGroup.userData.isBuilding = true;
    farmGroup.userData.buildingType = BUILDING_TYPES.FARM;
    farmGroup.userData.animate = (time) => { };

    const soilSize = 0.65;
    const soilHeight = 0.04;
    const soilMaterial = getCachedMaterial(FARM_SOIL_COLOR, { roughness: 0.9 });
    soilMaterial.userData = { isRoof: true };
    const soilGeo = new THREE.BoxGeometry(soilSize, soilHeight, soilSize);
    const soilMesh = new THREE.Mesh(soilGeo, soilMaterial);
    soilMesh.position.y = tileY + soilHeight / 2;
    soilMesh.castShadow = false;
    soilMesh.receiveShadow = true;
    farmGroup.add(soilMesh);

    const fencePostHeight = 0.12;
    const fencePostRadius = 0.012;
    const fenceMaterial = getCachedMaterial(FARM_FENCE_COLOR, { roughness: 0.85 });
    fenceMaterial.userData = { isRoof: true };
    const postGeo = new THREE.CylinderGeometry(fencePostRadius, fencePostRadius, fencePostHeight, 4);

    const s = soilSize / 2;
    const fenceCoords = [
        [-s, -s], [0, -s], [s, -s], [-s, 0], [s, 0], [-s, s], [0, s], [s, s]
    ];

    fenceCoords.forEach(coord => {
        const post = new THREE.Mesh(postGeo, fenceMaterial);
        post.position.set(coord[0], tileY + soilHeight + fencePostHeight / 2 - soilHeight / 2, coord[1]);
        post.castShadow = true;
        farmGroup.add(post);
    });

    return farmGroup;
};