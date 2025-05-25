// src/components/HexMap/buildings/models/createHarbourModel.js
import * as THREE from 'three';
// Ensure PIER_LAMP_EMISSIVE_COLOR_HEX is imported correctly from constants
import { TRANSPARENT_LAYER_Y, HEX_SIZE, TILE_TYPES, PIER_LAMP_EMISSIVE_COLOR_HEX } from '../../constants';
import { getCachedMaterial } from '../utils/materialManager';
import { BUILDING_TYPES } from '../BuildingTypes';


const PIER_WOOD_COLOR = 0x8B7355;
const BOAT_WOOD_COLOR = 0xA0522D;
const BOAT_TRIM_COLOR = 0xD2B48C;

const WATER_SURFACE_Y = TRANSPARENT_LAYER_Y;

const PIER_LAMP_POST_COLOR = 0x554433;
const PIER_LAMP_SHADE_COLOR = 0xD2B48C;


const createPierLampModel = (baseY) => {
    const lampGroup = new THREE.Group();
    lampGroup.name = "PierLampAssembly";

    const lampPostMaterial = getCachedMaterial(PIER_LAMP_POST_COLOR, { roughness: 0.8 });
    const lampShadeMaterial = getCachedMaterial(PIER_LAMP_SHADE_COLOR, {
        roughness: 0.7,
        emissive: new THREE.Color(PIER_LAMP_EMISSIVE_COLOR_HEX),
        emissiveIntensity: 0.0
    }, true); // isSpecialEmissive = true

    const postHeight = 0.7;
    const postRadius = 0.035;
    const lampPostGeo = new THREE.CylinderGeometry(postRadius, postRadius * 0.9, postHeight, 6);
    const lampPost = new THREE.Mesh(lampPostGeo, lampPostMaterial);
    lampPost.position.y = postHeight / 2;
    lampPost.castShadow = true;
    lampPost.userData.isPierLampComponent = true;
    lampGroup.add(lampPost);

    const armLength = 0.20;
    const armThickness = 0.03;
    const lampArmGeo = new THREE.BoxGeometry(armThickness, armThickness, armLength);
    const lampArm = new THREE.Mesh(lampArmGeo, lampPostMaterial);
    lampArm.position.set(0, postHeight - armThickness * 2.5, armLength / 2 - armThickness / 2);
    lampArm.castShadow = true;
    lampArm.userData.isPierLampComponent = true;
    lampGroup.add(lampArm);

    const shadeRadiusTop = 0.06;
    const shadeRadiusBottom = 0.09;
    const shadeHeight = 0.12;
    const lampShadeGeo = new THREE.CylinderGeometry(shadeRadiusTop, shadeRadiusBottom, shadeHeight, 8);
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMaterial);
    lampShade.position.set(0, -shadeHeight / 2 - armThickness, armLength - armThickness * 1.5);
    lampShade.castShadow = true;
    // lampShade.userData.isPierLampComponent = true; // Material is special, snow won't apply
    lampArm.add(lampShade);

    const pierLampLight = new THREE.PointLight(new THREE.Color(PIER_LAMP_EMISSIVE_COLOR_HEX), 0, 1.8, 2.0);
    pierLampLight.castShadow = false; // Optimization: disable shadow for pier lamp
    pierLampLight.position.copy(lampShade.position);
    pierLampLight.position.y -= shadeHeight * 0.3;
    lampArm.add(pierLampLight);

    lampGroup.userData.light = pierLampLight;
    lampGroup.userData.shadeMaterial = lampShadeMaterial;
    lampGroup.position.y = baseY;

    return lampGroup;
};


export const createHarbourModel = (tileY, tileData, landTileMap, gridColumns, gridRows) => {
    const harbourGroup = new THREE.Group();
    harbourGroup.userData.isBuilding = true;
    harbourGroup.userData.buildingType = BUILDING_TYPES.HARBOUR;

    const woodMaterial = getCachedMaterial(PIER_WOOD_COLOR, { roughness: 0.8 });
    woodMaterial.userData = { isRoof: true };
    const boatBodyMaterial = getCachedMaterial(BOAT_WOOD_COLOR, { roughness: 0.7 });
    const boatTrimMaterial = getCachedMaterial(BOAT_TRIM_COLOR, { roughness: 0.65 });
    boatTrimMaterial.userData = { isRoof: true };

    let pierDirectionVector = new THREE.Vector3(0, 0, 1);
    let validWaterNeighborsDirections = [];
    const getAdjacentHexInfo = (c, r) => {
        const isOddRow = r % 2 === 1;
        return [
            { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
            { dc: isOddRow ? 1 : 0, dr: 1 }, { dc: isOddRow ? 0 : -1, dr: 1 },
            { dc: isOddRow ? 1 : 0, dr: -1 }, { dc: isOddRow ? 0 : -1, dr: -1 }
        ].map(n => ({ nc: c + n.dc, nr: r + n.dr }));
    };
    const neighbors = getAdjacentHexInfo(tileData.c, tileData.r);
    for (const neighbor of neighbors) {
        if (neighbor.nc >= 0 && neighbor.nc < gridColumns && neighbor.nr >= 0 && neighbor.nr < gridRows) {
            const key = `${neighbor.nc},${neighbor.nr}`;
            const adjacentTile = landTileMap.get(key);
            if (adjacentTile && (adjacentTile.type === TILE_TYPES.DEEP_WATER || adjacentTile.type === TILE_TYPES.SHALLOW_WATER)) {
                const directionToWater = new THREE.Vector3(adjacentTile.x - tileData.x, 0, adjacentTile.z - tileData.z).normalize();
                validWaterNeighborsDirections.push(directionToWater);
            }
        }
    }
    if (validWaterNeighborsDirections.length > 0) {
        pierDirectionVector = validWaterNeighborsDirections[Math.floor(Math.random() * validWaterNeighborsDirections.length)];
    } else {
        console.warn(`Harbour at (${tileData.c},${tileData.r}) couldn't find adjacent water tile for pier direction. Using default Z+ locally.`);
    }

    const pierGroup = new THREE.Group();
    pierGroup.name = "PierStructure";
    const pierStartOffset = HEX_SIZE * 0.55;
    const pierLength = HEX_SIZE * 2.0;
    const pierWidth = HEX_SIZE * 0.5;
    const plankThickness = 0.04;
    const postRadius = 0.03;
    const pierDeckY = tileY + 0.05;

    const deckGeo = new THREE.BoxGeometry(pierWidth, plankThickness, pierLength);
    const deckMesh = new THREE.Mesh(deckGeo, woodMaterial);
    deckMesh.position.set(0, pierDeckY - plankThickness / 2, pierStartOffset + pierLength / 2);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    pierGroup.add(deckMesh);

    const numPostPairs = Math.max(3, Math.floor(pierLength / (HEX_SIZE * 0.55))) + 1;
    for (let i = 0; i < numPostPairs; i++) {
        const fractionAlongPier = (numPostPairs > 1) ? (i / (numPostPairs - 1)) : 0.5;
        const localZForPost = pierStartOffset + (fractionAlongPier * pierLength);
        const postBaseYForPier = 0.0;
        const actualPostHeight = (pierDeckY + plankThickness) - postBaseYForPier;
        const postGeo = new THREE.CylinderGeometry(postRadius, postRadius * 0.9, actualPostHeight, 6);
        [-pierWidth / 2 + postRadius * 1.2, pierWidth / 2 - postRadius * 1.2].forEach(xOffset => {
            const post = new THREE.Mesh(postGeo, woodMaterial);
            post.position.set(xOffset, postBaseYForPier + actualPostHeight / 2, localZForPost);
            post.castShadow = true;
            pierGroup.add(post);
        });
    }

    const pierLamp = createPierLampModel(pierDeckY);
    pierLamp.position.set(0, tileY, pierStartOffset + pierLength - HEX_SIZE * 0.20);
    pierLamp.rotation.y = Math.PI;
    pierGroup.add(pierLamp);


    harbourGroup.userData.pierLampLight = pierLamp.userData.light;
    harbourGroup.userData.pierLampShadeMaterial = pierLamp.userData.shadeMaterial;

    pierGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pierDirectionVector);
    harbourGroup.add(pierGroup);

    const boatGroup = new THREE.Group();
    boatGroup.name = "PierBoat";
    const boatLength = HEX_SIZE * 0.85;
    const boatOuterWidth = HEX_SIZE * 0.40;
    const boatWallHeight = HEX_SIZE * 0.20;
    const boatFloorThickness = HEX_SIZE * 0.05;
    const wallThickness = HEX_SIZE * 0.03;
    const epsilon = wallThickness * 0.1;

    const floorWidth = (boatOuterWidth - 2 * wallThickness) + epsilon;
    const floorLength = boatLength;
    const floorGeo = new THREE.BoxGeometry(floorWidth, boatFloorThickness, floorLength);
    const floorMesh = new THREE.Mesh(floorGeo, boatBodyMaterial);
    boatGroup.add(floorMesh);

    const sideWallLength = boatLength + epsilon;
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, boatWallHeight, sideWallLength);
    const wallPositionY = boatFloorThickness / 2 + boatWallHeight / 2;

    const portWall = new THREE.Mesh(sideWallGeo, boatBodyMaterial);
    portWall.position.set(-(boatOuterWidth / 2 - wallThickness / 2), wallPositionY, 0);
    boatGroup.add(portWall);

    const starboardWall = new THREE.Mesh(sideWallGeo, boatBodyMaterial);
    starboardWall.position.set(boatOuterWidth / 2 - wallThickness / 2, wallPositionY, 0);
    boatGroup.add(starboardWall);

    const endWallWidth = (boatOuterWidth - 2 * wallThickness) + epsilon;
    const endWallGeo = new THREE.BoxGeometry(endWallWidth, boatWallHeight, wallThickness);

    const sternWall = new THREE.Mesh(endWallGeo, boatBodyMaterial);
    sternWall.position.set(0, wallPositionY, -boatLength / 2 + wallThickness / 2);
    boatGroup.add(sternWall);

    const bowWall = new THREE.Mesh(endWallGeo, boatBodyMaterial);
    bowWall.position.set(0, wallPositionY, boatLength / 2 - wallThickness / 2);
    boatGroup.add(bowWall);

    const seatWidth = (boatOuterWidth - 2 * wallThickness) - epsilon;
    const seatDepth = wallThickness * 2.5;
    const seatHeight = wallThickness * 0.8;
    const seatGeo = new THREE.BoxGeometry(seatWidth, seatHeight, seatDepth);
    const seatBaseY = boatFloorThickness / 2 + seatHeight / 2;

    const seat1 = new THREE.Mesh(seatGeo, boatTrimMaterial);
    seat1.position.set(0, seatBaseY + boatWallHeight * 0.15, boatLength * 0.22);
    boatGroup.add(seat1);

    const seat2 = seat1.clone();
    seat2.position.set(0, seatBaseY + boatWallHeight * 0.15, -boatLength * 0.22);
    boatGroup.add(seat2);

    const boatPlacementT = 0.65 + Math.random() * 0.3;
    const pierPointForBoat = pierDirectionVector.clone().multiplyScalar(pierStartOffset + pierLength * boatPlacementT);
    const sideOffsetDirection = new THREE.Vector3().crossVectors(pierDirectionVector, new THREE.Vector3(0, 1, 0)).normalize();
    const boatSideOffsetMagnitude = (pierWidth / 2 + boatOuterWidth / 2 + HEX_SIZE * 0.15);
    const boatSideOffsetFinal = boatSideOffsetMagnitude * (Math.random() < 0.5 ? 1 : -1);

    boatGroup.position.copy(pierPointForBoat);
    boatGroup.position.addScaledVector(sideOffsetDirection, boatSideOffsetFinal);
    boatGroup.position.y = WATER_SURFACE_Y - boatFloorThickness * 0.7;
    boatGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pierDirectionVector);
    boatGroup.rotation.y += (Math.random() - 0.5) * 0.4;
    harbourGroup.add(boatGroup);
    harbourGroup.userData.boat = boatGroup;

    harbourGroup.userData.animate = (time, timeOfDay) => {
        const boat = harbourGroup.userData.boat;
        if (boat) {
            const baseBobY = WATER_SURFACE_Y - boatFloorThickness * 0.7;
            boat.position.y = baseBobY + Math.sin(time * 0.75 + tileData.x + tileData.z) * 0.03;
            boat.rotation.x = Math.sin(time * 0.55 + tileData.z) * 0.035;
            boat.rotation.z = Math.cos(time * 0.65 + tileData.x * 0.5) * 0.03;
        }

        const pierLight = harbourGroup.userData.pierLampLight;
        const pierShadeMat = harbourGroup.userData.pierLampShadeMaterial;

        if (pierLight && pierShadeMat) {
            let targetLampIntensity = 0.0;
            let targetLampEmissive = 0.0;
            const eveningStart = 18.0;
            const nightStart = 19.5;
            const morningEnd = 6.5;
            const peakLampLightIntensity = 0.7;
            const peakLampEmissiveIntensity = 0.6;

            if (timeOfDay >= eveningStart && timeOfDay < nightStart) {
                const factor = (timeOfDay - eveningStart) / (nightStart - eveningStart);
                targetLampIntensity = THREE.MathUtils.lerp(0, peakLampLightIntensity, factor);
                targetLampEmissive = THREE.MathUtils.lerp(0, peakLampEmissiveIntensity, factor);
            } else if (timeOfDay >= nightStart || timeOfDay < morningEnd - 0.5) {
                targetLampIntensity = peakLampLightIntensity;
                targetLampEmissive = peakLampEmissiveIntensity;
            } else if (timeOfDay >= morningEnd - 0.5 && timeOfDay < morningEnd) {
                const factor = (timeOfDay - (morningEnd - 0.5)) / 0.5;
                targetLampIntensity = THREE.MathUtils.lerp(peakLampLightIntensity, 0, factor);
                targetLampEmissive = THREE.MathUtils.lerp(peakLampEmissiveIntensity, 0, factor);
            }

            if (targetLampIntensity > 0.05) {
                targetLampIntensity += Math.sin(time * 4.2 + tileData.z * 0.3) * 0.10 * targetLampIntensity;
                targetLampIntensity = Math.max(0.02, targetLampIntensity);
                targetLampEmissive = targetLampIntensity * 0.80;
            }

            pierLight.intensity = THREE.MathUtils.lerp(pierLight.intensity, targetLampIntensity, 0.1);
            pierShadeMat.emissiveIntensity = THREE.MathUtils.lerp(pierShadeMat.emissiveIntensity, targetLampEmissive, 0.1);
            pierLight.visible = pierLight.intensity > 0.01;
            pierShadeMat.needsUpdate = true;
        }
    };

    harbourGroup.castShadow = true;
    harbourGroup.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return harbourGroup;
};