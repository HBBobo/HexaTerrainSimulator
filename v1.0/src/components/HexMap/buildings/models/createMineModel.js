// src/components/HexMap/buildings/models/createMineModel.js
import * as THREE from 'three';
import { BUILDING_TYPES } from '../BuildingTypes';
import { getCachedMaterial } from '../utils/materialManager';
import { createRock as createSmallRock } from '../../utils/rockUtils';

const MINE_WOOD_COLOR = 0x654321;
const MINE_ROCK_COLOR = 0x888480;
const MINE_OPENING_COLOR = 0x101010;
const TOOL_HANDLE_COLOR = 0x964B00;
const TOOL_METAL_COLOR = 0x777777;
const ROOF_COLOR = 0x654321;
const LAMP_POST_COLOR = 0x4B3A26; // Dark, weathered wood for mine lamp post
const LAMP_SHADE_COLOR = 0xD2B48C; // Old tan/canvas like shade
const MINE_LAMP_EMISSIVE_COLOR = 0xFFB74D; // Orange-yellow, less bright than house

export const createMineModel = (tileY) => {
    const mineGroup = new THREE.Group();
    mineGroup.userData.isBuilding = true;
    mineGroup.userData.buildingType = BUILDING_TYPES.MINE;

    const woodMaterial = getCachedMaterial(MINE_WOOD_COLOR, { roughness: 0.85, metalness: 0.05 });
    woodMaterial.userData = { isRoof: true };
    const woodMaterial2 = getCachedMaterial(MINE_WOOD_COLOR, { roughness: 0.85, metalness: 0.05 });
    const largeRockMaterial = getCachedMaterial(MINE_ROCK_COLOR, { roughness: 0.9, metalness: 0.1, flatShading: true });
    largeRockMaterial.userData = { isRoof: true };
    const roofMaterial = getCachedMaterial(ROOF_COLOR, { roughness: 0.9, metalness: 0.1, flatShading: true });
    roofMaterial.userData = { isRoof: true };
    const openingMaterial = getCachedMaterial(MINE_OPENING_COLOR, { roughness: 1.0, color: new THREE.Color(MINE_OPENING_COLOR) });

    const mainRockGroup = new THREE.Group();
    const baseRockRadius = 0.5;
    const baseRockGeo = new THREE.DodecahedronGeometry(baseRockRadius, 0);
    const baseRockMesh = new THREE.Mesh(baseRockGeo, largeRockMaterial);
    baseRockMesh.scale.set(1.1, 0.8, 1.0);
    baseRockMesh.position.y = tileY + (baseRockRadius * 0.6 * 0.5) - 0.05;
    mainRockGroup.add(baseRockMesh);
    mainRockGroup.position.z = 0.15;
    mineGroup.add(mainRockGroup);

    const frameHeight = 0.45;
    const frameWidth = 0.35;
    const beamThickness = 0.05;
    const roofHeight = 0.5;
    const roofAngle = Math.PI / 8;

    const verticalBeamGeo = new THREE.BoxGeometry(beamThickness, frameHeight, beamThickness);
    const horizontalBeamGeo = new THREE.BoxGeometry(frameWidth + beamThickness * 1.5, beamThickness, beamThickness);
    const roofGeo = new THREE.BoxGeometry(frameWidth + beamThickness * 2, beamThickness / 2, roofHeight);
    const wallGeo = new THREE.BoxGeometry(beamThickness / 2, frameHeight, roofHeight);

    const entranceZPos = mainRockGroup.position.z - (baseRockRadius * baseRockMesh.scale.z * 0.85) - 0.24;
    const entranceOffsetY = tileY + 0.01;

    const entranceFrameGroup = new THREE.Group();
    entranceFrameGroup.position.z = entranceZPos;
    mineGroup.add(entranceFrameGroup);

    const leftBeam = new THREE.Mesh(verticalBeamGeo, woodMaterial2);
    leftBeam.position.set(-frameWidth / 2, entranceOffsetY + frameHeight / 2, 0);
    entranceFrameGroup.add(leftBeam);

    const leftWall = new THREE.Mesh(wallGeo, woodMaterial2);
    leftWall.position.set(-frameWidth / 2, entranceOffsetY + frameHeight / 2 - Math.sin(roofAngle) * roofHeight / 2 + beamThickness / 2, roofHeight / 2);
    leftWall.rotation.x = roofAngle;
    entranceFrameGroup.add(leftWall);

    const rightBeam = new THREE.Mesh(verticalBeamGeo, woodMaterial2);
    rightBeam.position.set(frameWidth / 2, entranceOffsetY + frameHeight / 2, 0);
    entranceFrameGroup.add(rightBeam);

    const rightWall = new THREE.Mesh(wallGeo, woodMaterial2);
    rightWall.position.set(frameWidth / 2, entranceOffsetY + frameHeight / 2 - Math.sin(roofAngle) * roofHeight / 2 + beamThickness / 2, roofHeight / 2);
    rightWall.rotation.x = roofAngle;
    entranceFrameGroup.add(rightWall);

    const topBeam = new THREE.Mesh(horizontalBeamGeo, woodMaterial);
    topBeam.position.set(0, entranceOffsetY + frameHeight + beamThickness / 2, 0);
    entranceFrameGroup.add(topBeam);

    const roofMesh = new THREE.Mesh(roofGeo, roofMaterial);
    roofMesh.position.set(0, entranceOffsetY + frameHeight + beamThickness / 2 - Math.sin(roofAngle) * (roofHeight / 2) + 0.01, roofHeight / 2);
    roofMesh.rotation.x = roofAngle;
    entranceFrameGroup.add(roofMesh);

    const supportAngle = Math.PI / 6;
    const supportLength = frameHeight * 0.6 / Math.cos(supportAngle);
    const supportBeamGeo = new THREE.BoxGeometry(beamThickness, supportLength, beamThickness);

    const leftSupport = new THREE.Mesh(supportBeamGeo, woodMaterial);
    leftSupport.position.set(-frameWidth / 2 - beamThickness * 0.8, entranceOffsetY + frameHeight * 0.3, beamThickness * 0.5);
    leftSupport.rotation.z = supportAngle;
    entranceFrameGroup.add(leftSupport);

    const rightSupport = new THREE.Mesh(supportBeamGeo, woodMaterial);
    rightSupport.position.set(frameWidth / 2 + beamThickness * 0.8, entranceOffsetY + frameHeight * 0.3, beamThickness * 0.5);
    rightSupport.rotation.z = -supportAngle;
    entranceFrameGroup.add(rightSupport);

    const openingGeo = new THREE.BoxGeometry(frameWidth, frameHeight, roofHeight * 0.8);
    const openingMesh = new THREE.Mesh(openingGeo, openingMaterial);
    openingMesh.position.set(
        0,
        entranceOffsetY + (frameHeight / 2) - (Math.sin(roofAngle) * roofHeight / 2),
        (roofHeight * 0.8) / 2 + Math.cos(roofAngle) * (beamThickness)
    );
    openingMesh.rotation.x = roofAngle;
    entranceFrameGroup.add(openingMesh);

    const toolHandleMaterial = getCachedMaterial(TOOL_HANDLE_COLOR, { roughness: 0.7 });
    const toolMetalMaterial = getCachedMaterial(TOOL_METAL_COLOR, { roughness: 0.5, metalness: 0.6 });
    toolHandleMaterial.userData = { isRoof: true };
    toolMetalMaterial.userData = { isRoof: true };

    const spadeGroup = new THREE.Group();
    const spadeHandleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.35, 6);
    const spadeHandle = new THREE.Mesh(spadeHandleGeo, toolHandleMaterial);
    spadeHandle.position.y = 0.35 / 2;
    spadeGroup.add(spadeHandle);
    const spadeHeadGeo = new THREE.PlaneGeometry(0.08, 0.12);
    const spadeHead = new THREE.Mesh(spadeHeadGeo, toolMetalMaterial);
    spadeHead.position.y = 0;
    spadeHandle.add(spadeHead);
    spadeGroup.position.set(leftBeam.position.x - beamThickness * 0.5, tileY + 0.18, leftBeam.position.z + beamThickness * 0.5);
    spadeGroup.rotation.z = Math.PI / 9;
    spadeGroup.rotation.y = Math.PI / 5;
    entranceFrameGroup.add(spadeGroup);

    const pickaxeGroup = new THREE.Group();
    const pickHandleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6);
    const pickHandle = new THREE.Mesh(pickHandleGeo, toolHandleMaterial);
    pickHandle.position.y = 0.3 / 2;
    pickaxeGroup.add(pickHandle);
    const pickHeadPartWidth = 0.12;
    const pickHeadPartGeo = new THREE.BoxGeometry(pickHeadPartWidth, 0.025, 0.02);
    const pickHeadPart1 = new THREE.Mesh(pickHeadPartGeo, toolMetalMaterial);
    pickHeadPart1.position.set(pickHeadPartWidth / 2 - 0.01, 0, 0);
    pickHeadPart1.rotation.z = Math.PI / 10;
    pickHandle.add(pickHeadPart1);
    const pickHeadPart2 = new THREE.Mesh(pickHeadPartGeo, toolMetalMaterial);
    pickHeadPart2.position.set(-pickHeadPartWidth / 2 + 0.01, 0, 0.005);
    pickHeadPart2.rotation.z = -Math.PI / 10;
    pickHandle.add(pickHeadPart2);
    pickaxeGroup.position.set(rightBeam.position.x + beamThickness * 0.5, tileY + 0.2, rightBeam.position.z + beamThickness * 0.5);
    pickaxeGroup.rotation.z = -Math.PI / 8;
    pickaxeGroup.rotation.y = -Math.PI / 6;
    entranceFrameGroup.add(pickaxeGroup);

    const numSmallRocks = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numSmallRocks; i++) {
        const smallRock = createSmallRock();
        const angle = (Math.random() * Math.PI * 1.4) - (Math.PI * 0.2);
        const dist = baseRockRadius * (mainRockGroup.scale.x || 1) * (0.6 + Math.random() * 0.6);
        const rockSizeY = smallRock.geometry.parameters.height ? smallRock.geometry.parameters.height : (smallRock.geometry.parameters.radius || 0.1) * 1.5;
        smallRock.position.set(
            mainRockGroup.position.x + Math.cos(angle) * dist,
            tileY + rockSizeY * 0.3,
            mainRockGroup.position.z + Math.sin(angle) * dist
        );
        smallRock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        smallRock.scale.set(0.5 + Math.random() * 0.4, 0.5 + Math.random() * 0.4, 0.5 + Math.random() * 0.4);
        mineGroup.add(smallRock);
    }

    const numPlanks = 2 + Math.floor(Math.random() * 3);
    const plankThickness = 0.02;
    const plankWidth = 0.08;
    for (let i = 0; i < numPlanks; i++) {
        const plankLength = 0.3 + Math.random() * 0.25;
        const plankGeo = new THREE.BoxGeometry(plankWidth, plankThickness, plankLength);
        const plank = new THREE.Mesh(plankGeo, woodMaterial);
        const side = Math.random() < 0.5 ? -1 : 1;
        const xOffset = side * (frameWidth * 0.3 + Math.random() * frameWidth * 0.5);
        const zOffset = Math.random() * 0.2 - 0.1;
        plank.position.set(
            xOffset,
            tileY + plankThickness / 2,
            zOffset
        );
        plank.rotation.x = (Math.random() - 0.5) * 0.1;
        plank.rotation.y = Math.random() * Math.PI * 2;
        plank.rotation.z = (Math.random() - 0.5) * 0.1;
        plank.castShadow = true;
        entranceFrameGroup.add(plank);
    }

    const mineLampGroup = new THREE.Group();
    const lampPostMaterial = getCachedMaterial(LAMP_POST_COLOR, { roughness: 0.7 });
    const lampShadeMaterial = getCachedMaterial(LAMP_SHADE_COLOR, {
        roughness: 0.8,
        emissive: new THREE.Color(MINE_LAMP_EMISSIVE_COLOR),
        emissiveIntensity: 0.0
    }, true); // isSpecialEmissive = true
    // lampShadeMaterial.userData = { isRoof: true, isLampShade: true }; // Not needed, isSpecialEmissive handles snow

    const lampPostGeo = new THREE.BoxGeometry(beamThickness * 0.8, frameHeight * 0.6, beamThickness * 0.8);
    const lampPost = new THREE.Mesh(lampPostGeo, lampPostMaterial);
    lampPost.position.y = (frameHeight * 0.6) / 2;
    lampPost.userData.isMineLampComponent = true;
    mineLampGroup.add(lampPost);

    const lampArmGeo = new THREE.BoxGeometry(beamThickness * 0.6, beamThickness * 0.6, 0.15);
    const lampArm = new THREE.Mesh(lampArmGeo, lampPostMaterial);
    lampArm.position.set(0, frameHeight * 0.6 - beamThickness * 0.3, - 0.15 / 2 + beamThickness * 0.4);
    lampArm.userData.isMineLampComponent = true;
    lampPost.add(lampArm);

    const lampShadeSize = 0.07;
    const lampShadeGeo = new THREE.CylinderGeometry(lampShadeSize * 0.6, lampShadeSize, lampShadeSize * 0.8, 6);
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMaterial);
    lampShade.position.set(0, -lampShadeSize * 0.8 / 2 - 0.01, -0.08);
    lampShade.userData.isMineLampComponent = true;
    lampArm.add(lampShade);

    const mineLampLight = new THREE.PointLight(new THREE.Color(MINE_LAMP_EMISSIVE_COLOR), 0, 0.7, 1.2);
    mineLampLight.castShadow = false; // Optimization: disable shadow for small lamp

    const tempShadeWorldPos = new THREE.Vector3();
    lampShade.getWorldPosition(tempShadeWorldPos);
    mineLampLight.position.copy(tempShadeWorldPos);
    mineLampLight.position.y -= 0.02;

    entranceFrameGroup.add(mineLampLight);

    const lampSide = Math.random() < 0.5 ? -1 : 1;
    mineLampGroup.position.set(
        (frameWidth / 2 + beamThickness * 0.5 + 0.02) * lampSide,
        entranceOffsetY,
        -beamThickness / 2
    );
    mineLampGroup.castShadow = true;
    entranceFrameGroup.add(mineLampGroup);

    mineGroup.userData.mineLampLight = mineLampLight;
    mineGroup.userData.mineLampShadeMaterial = lampShadeMaterial;
    mineGroup.userData.lampShadeForLightPosition = lampShade;

    mineGroup.userData.animate = (time, timeOfDay) => {
        let targetLampIntensity = 0.0;
        let targetLampEmissive = 0.0;

        const eveningStart = 18.0;
        const nightStart = 19.5;
        const morningEnd = 6.5;
        const peakLampLightIntensity = 0.5;
        const peakLampEmissiveIntensity = 0.4;

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
            targetLampIntensity += Math.sin(time * 3.5 + mineGroup.id * 0.4) * 0.08 * targetLampIntensity;
            targetLampIntensity = Math.max(0.02, targetLampIntensity);
            targetLampEmissive = targetLampIntensity * 0.7;
        }

        const lampLight = mineGroup.userData.mineLampLight;
        const lampShadeMat = mineGroup.userData.mineLampShadeMaterial;
        const lampShadeMesh = mineGroup.userData.lampShadeForLightPosition;

        if (lampLight && lampShadeMat && lampShadeMesh) {
            lampLight.intensity = THREE.MathUtils.lerp(lampLight.intensity, targetLampIntensity, 0.1);
            lampShadeMat.emissiveIntensity = THREE.MathUtils.lerp(lampShadeMat.emissiveIntensity, targetLampEmissive, 0.1);
            lampLight.visible = lampLight.intensity > 0.01;

            lampShadeMesh.getWorldPosition(lampLight.position);
            lampLight.position.y -= 0.02;

            lampShadeMat.needsUpdate = true;
        }
    };

    mineGroup.castShadow = true;
    mineGroup.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return mineGroup;
};