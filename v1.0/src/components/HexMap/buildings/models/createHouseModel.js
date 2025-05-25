// src/components/HexMap/buildings/models/createHouseModel.js
import * as THREE from 'three';
import { BUILDING_TYPES } from '../BuildingTypes'
import { getCachedMaterial } from '../utils/materialManager'; // Adjust path

const HOUSE_WALL_COLOR = 0xD2B48C;
const HOUSE_ROOF_COLOR = 0xA52A2A;
const HOUSE_DOOR_COLOR = 0x8B4513;
const HOUSE_WINDOW_COLOR = 0xADD8E6;
const HOUSE_WINDOW_EMISSIVE_COLOR = 0xFFFFAA;
const HOUSE_LAMP_EMISSIVE_COLOR = 0xFFE082;
const HOUSE_FRAME_COLOR = 0x7A5230;
const CHIMNEY_COLOR = 0x8B4513;
const ROOF_PANEL_THICKNESS = 0.04;
const LAMP_POST_COLOR = 0x505050;
const LAMP_SHADE_COLOR = 0xF0E68C;

export const createHouseModel = (tileY) => {
    const houseGroup = new THREE.Group();
    houseGroup.userData.isBuilding = true;
    houseGroup.userData.buildingType = BUILDING_TYPES.HOUSE;

    const baseHeight = 0.6;
    const baseWidth = 0.7;
    const baseDepth = 0.6;

    const wallMaterial = getCachedMaterial(HOUSE_WALL_COLOR, { roughness: 0.8, metalness: 0.1 });
    const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeo, wallMaterial);
    baseMesh.position.y = tileY + baseHeight / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    houseGroup.add(baseMesh);

    const roofMaterial = getCachedMaterial(HOUSE_ROOF_COLOR, { roughness: 0.7, metalness: 0.1 });
    roofMaterial.userData = { isRoof: true };
    const frameMaterial = getCachedMaterial(HOUSE_FRAME_COLOR, { roughness: 0.8 });

    const roofOverhangX = 0.05;
    const roofOverhangZ = 0.05;
    const roofPitchHeight = 0.35;

    const panelCuboidLength = baseDepth + 2 * roofOverhangZ;
    const panelCuboidWidth = Math.sqrt(Math.pow(baseWidth / 2 + roofOverhangX, 2) + Math.pow(roofPitchHeight, 2));

    const roofPanelGeo = new THREE.BoxGeometry(panelCuboidWidth, ROOF_PANEL_THICKNESS, panelCuboidLength);
    const slopeAngle = Math.atan2(roofPitchHeight, baseWidth / 2 + roofOverhangX);

    const panel1CenterX = (baseWidth / 2 + roofOverhangX - ROOF_PANEL_THICKNESS * Math.sin(slopeAngle)) / 2;
    const panel2CenterX = -(baseWidth / 2 + roofOverhangX - ROOF_PANEL_THICKNESS * Math.sin(slopeAngle)) / 2;
    const panelCenterY = tileY + baseHeight + (roofPitchHeight / 2) - (ROOF_PANEL_THICKNESS * Math.cos(slopeAngle)) / 4;

    const roofPanel1 = new THREE.Mesh(roofPanelGeo, roofMaterial);
    roofPanel1.userData.isRoof = true;
    roofPanel1.castShadow = true;
    roofPanel1.position.set(panel1CenterX, panelCenterY, 0);
    roofPanel1.rotation.z = -slopeAngle;
    houseGroup.add(roofPanel1);

    const roofPanel2 = new THREE.Mesh(roofPanelGeo, roofMaterial);
    roofPanel2.userData.isRoof = true;
    roofPanel2.castShadow = true;
    roofPanel2.position.set(panel2CenterX, panelCenterY, 0);
    roofPanel2.rotation.z = slopeAngle;
    houseGroup.add(roofPanel2);

    const ridgeCapLength = panelCuboidLength;
    const ridgeCapWidth = ROOF_PANEL_THICKNESS * 1.5;
    const ridgeCapHeight = ROOF_PANEL_THICKNESS * 1.2;
    const ridgeCapGeo = new THREE.BoxGeometry(ridgeCapWidth, ridgeCapHeight, ridgeCapLength);
    const ridgeCapMesh = new THREE.Mesh(ridgeCapGeo, frameMaterial);
    ridgeCapMesh.userData.isRoof = true;
    ridgeCapMesh.position.set(0, tileY + baseHeight + roofPitchHeight + ROOF_PANEL_THICKNESS / 2 - ridgeCapHeight / 3, 0);
    ridgeCapMesh.castShadow = true;
    houseGroup.add(ridgeCapMesh);

    const gableGeo = new THREE.BufferGeometry();
    const gableVertices = new Float32Array([
        -baseWidth / 2, baseHeight, baseDepth / 2,
        baseWidth / 2, baseHeight, baseDepth / 2,
        0, baseHeight + roofPitchHeight, baseDepth / 2,
        baseWidth / 2, baseHeight, -baseDepth / 2,
        -baseWidth / 2, baseHeight, -baseDepth / 2,
        0, baseHeight + roofPitchHeight, -baseDepth / 2,
    ]);
    for (let i = 0; i < gableVertices.length / 3; i++) {
        gableVertices[i * 3 + 1] += tileY;
    }
    gableGeo.setAttribute('position', new THREE.BufferAttribute(gableVertices, 3));
    gableGeo.computeVertexNormals();
    const gableMesh = new THREE.Mesh(gableGeo, wallMaterial);
    gableMesh.castShadow = true;
    houseGroup.add(gableMesh);

    const doorHeight = 0.35;
    const doorWidth = 0.15;
    const doorDepth = 0.03;
    const doorMaterial = getCachedMaterial(HOUSE_DOOR_COLOR, { roughness: 0.9 });
    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
    const doorMesh = new THREE.Mesh(doorGeo, doorMaterial);
    doorMesh.position.set(0, tileY + doorHeight / 2, baseDepth / 2 - doorDepth / 2 + 0.001);
    doorMesh.castShadow = true;
    houseGroup.add(doorMesh);

    const frameThickness = 0.025;
    const doorFrameSideGeo = new THREE.BoxGeometry(frameThickness, doorHeight + frameThickness, frameThickness);
    const doorFrameTopGeo = new THREE.BoxGeometry(doorWidth + frameThickness * 2, frameThickness, frameThickness);

    const doorFrameLeft = new THREE.Mesh(doorFrameSideGeo, frameMaterial);
    doorFrameLeft.position.set(-doorWidth / 2 - frameThickness / 2, tileY + (doorHeight + frameThickness) / 2, baseDepth / 2 + 0.005);
    houseGroup.add(doorFrameLeft);

    const doorFrameRight = new THREE.Mesh(doorFrameSideGeo, frameMaterial);
    doorFrameRight.position.set(doorWidth / 2 + frameThickness / 2, tileY + (doorHeight + frameThickness) / 2, baseDepth / 2 + 0.005);
    houseGroup.add(doorFrameRight);

    const doorFrameTop = new THREE.Mesh(doorFrameTopGeo, frameMaterial);
    doorFrameTop.position.set(0, tileY + doorHeight + frameThickness / 2, baseDepth / 2 + 0.005);
    houseGroup.add(doorFrameTop);

    const windowSize = 0.15;
    const windowDepth = 0.02;
    const windowGlassMaterial = getCachedMaterial(HOUSE_WINDOW_COLOR, {
        roughness: 0.2,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        emissive: HOUSE_WINDOW_EMISSIVE_COLOR,
        emissiveIntensity: 0.0
    }, true); // Mark as special emissive if it has unique animation logic
    const windowGlassGeo = new THREE.BoxGeometry(windowSize, windowSize, windowDepth / 2);

    const createdWindowGlassMaterials = [windowGlassMaterial];

    const createFramedWindow = (posX, posY, posZ, rotY = 0) => {
        const windowGroup = new THREE.Group();
        windowGroup.position.set(posX, posY, posZ);
        windowGroup.rotation.y = rotY;
        const glass = new THREE.Mesh(windowGlassGeo, windowGlassMaterial);
        windowGroup.add(glass);
        const frameSideGeo = new THREE.BoxGeometry(frameThickness, windowSize + frameThickness * 2, frameThickness);
        const frameTopBottomGeo = new THREE.BoxGeometry(windowSize + frameThickness * 2, frameThickness, frameThickness);
        const frameLeft = new THREE.Mesh(frameSideGeo, frameMaterial);
        frameLeft.position.x = -windowSize / 2 - frameThickness / 2;
        windowGroup.add(frameLeft);
        const frameRight = new THREE.Mesh(frameSideGeo, frameMaterial);
        frameRight.position.x = windowSize / 2 + frameThickness / 2;
        windowGroup.add(frameRight);
        const frameTop = new THREE.Mesh(frameTopBottomGeo, frameMaterial);
        frameTop.position.y = windowSize / 2 + frameThickness / 2;
        windowGroup.add(frameTop);
        const frameBottom = new THREE.Mesh(frameTopBottomGeo, frameMaterial);
        frameBottom.position.y = -windowSize / 2 - frameThickness / 2;
        windowGroup.add(frameBottom);
        const sillGeo = new THREE.BoxGeometry(windowSize + frameThickness * 3, frameThickness * 0.8, frameThickness * 1.5);
        const sill = new THREE.Mesh(sillGeo, frameMaterial);
        sill.position.y = -windowSize / 2 - frameThickness;
        sill.position.z = frameThickness * 0.5;
        windowGroup.add(sill);
        windowGroup.castShadow = true;
        return windowGroup;
    };

    const windowYPos = tileY + baseHeight / 1.7;
    const window1 = createFramedWindow(baseWidth / 2 + frameThickness / 2, windowYPos, 0, Math.PI / 2);
    houseGroup.add(window1);
    const window2 = createFramedWindow(-baseWidth / 2 - frameThickness / 2, windowYPos, 0, -Math.PI / 2);
    houseGroup.add(window2);

    const chimneyWidth = 0.12;
    const chimneyDepth = 0.12;
    const chimneyHeight = 0.4;
    const chimneyMaterial = getCachedMaterial(CHIMNEY_COLOR, { roughness: 0.85 });
    chimneyMaterial.userData = { isRoof: true };
    const chimneyGeo = new THREE.BoxGeometry(chimneyWidth, chimneyHeight, chimneyDepth);
    const chimneyMesh = new THREE.Mesh(chimneyGeo, chimneyMaterial);
    const chimneyPosX = baseWidth / 4;
    chimneyMesh.position.set(
        chimneyPosX,
        tileY + baseHeight + roofPitchHeight - chimneyHeight * 0.1 + ROOF_PANEL_THICKNESS,
        -baseDepth / 4
    );
    chimneyMesh.castShadow = true;
    houseGroup.add(chimneyMesh);

    const lampGroup = new THREE.Group();
    const lampPostHeight = 0.25;
    const lampPostRadius = 0.01;
    const lampPostMaterial = getCachedMaterial(LAMP_POST_COLOR, { roughness: 0.6 });
    const lampPostGeo = new THREE.CylinderGeometry(lampPostRadius, lampPostRadius, lampPostHeight, 6);
    const lampPost = new THREE.Mesh(lampPostGeo, lampPostMaterial);
    lampPost.position.y = lampPostHeight / 2;
    lampGroup.add(lampPost);
    const lampShadeSize = 0.06;
    const lampShadeMaterial = getCachedMaterial(LAMP_SHADE_COLOR, {
        roughness: 0.7,
        emissive: HOUSE_LAMP_EMISSIVE_COLOR,
        emissiveIntensity: 0.0
    }, true); // Mark as special emissive
    lampShadeMaterial.userData = { isRoof: true, isLampShade: true };
    const lampShadeGeo = new THREE.BoxGeometry(lampShadeSize, lampShadeSize * 0.8, lampShadeSize);
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMaterial);
    lampShade.position.y = lampPostHeight + (lampShadeSize * 0.8) / 2 - 0.01;
    lampGroup.add(lampShade);
    const doorLampLight = new THREE.PointLight(HOUSE_LAMP_EMISSIVE_COLOR, 0, 0.8, 1.5);
    doorLampLight.position.y = lampShade.position.y;
    doorLampLight.castShadow = false;
    lampGroup.add(doorLampLight);
    const lampSideMultiplier = 1;
    lampGroup.position.set(
        (doorWidth / 2 + frameThickness + lampPostRadius + 0.03) * lampSideMultiplier,
        tileY,
        baseDepth / 2 + 0.02
    );
    lampGroup.castShadow = true;
    houseGroup.add(lampGroup);
    houseGroup.userData.doorLampLight = doorLampLight;
    houseGroup.userData.doorLampShadeMaterial = lampShadeMaterial;

    houseGroup.userData.animate = (time, timeOfDay) => {
        let targetWindowIntensity = 0.0;
        let targetLampIntensity = 0.0;
        let targetLampEmissive = 0.0;
        const eveningStart = 17.5;
        const nightStart = 19.5;
        const morningEnd = 7.0;
        const peakWindowIntensity = 0.8;
        const peakLampLightIntensity = 0.7;
        const peakLampEmissiveIntensity = 0.6;
        if (timeOfDay >= eveningStart && timeOfDay < nightStart) {
            const factor = (timeOfDay - eveningStart) / (nightStart - eveningStart);
            targetWindowIntensity = THREE.MathUtils.lerp(0, peakWindowIntensity, factor);
            targetLampIntensity = THREE.MathUtils.lerp(0, peakLampLightIntensity, factor);
            targetLampEmissive = THREE.MathUtils.lerp(0, peakLampEmissiveIntensity, factor);
        } else if (timeOfDay >= nightStart || timeOfDay < morningEnd - 1) {
            targetWindowIntensity = peakWindowIntensity;
            targetLampIntensity = peakLampLightIntensity;
            targetLampEmissive = peakLampEmissiveIntensity;
        } else if (timeOfDay >= morningEnd - 1 && timeOfDay < morningEnd) {
            const factor = (timeOfDay - (morningEnd - 1)) / 1;
            targetWindowIntensity = THREE.MathUtils.lerp(peakWindowIntensity, 0, factor);
            targetLampIntensity = THREE.MathUtils.lerp(peakLampLightIntensity, 0, factor);
            targetLampEmissive = THREE.MathUtils.lerp(peakLampEmissiveIntensity, 0, factor);
        }
        if (targetWindowIntensity > 0.05) {
            targetWindowIntensity += Math.sin(time * 5 + houseGroup.id * 0.5) * 0.08 * targetWindowIntensity;
            targetWindowIntensity = Math.max(0.05, targetWindowIntensity);
        }
        if (targetLampIntensity > 0.05) {
            targetLampIntensity += Math.sin(time * 4.5 + houseGroup.id * 0.3) * 0.1 * targetLampIntensity;
            targetLampIntensity = Math.max(0.03, targetLampIntensity);
            targetLampEmissive = targetLampIntensity * 0.8;
        }
        if (createdWindowGlassMaterials.length > 0) {
            const material = createdWindowGlassMaterials[0];
            material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetWindowIntensity, 0.1);
            material.needsUpdate = true;
        }
        const lampLight = houseGroup.userData.doorLampLight;
        const lampShadeMat = houseGroup.userData.doorLampShadeMaterial;
        if (lampLight && lampShadeMat) {
            lampLight.intensity = THREE.MathUtils.lerp(lampLight.intensity, targetLampIntensity, 0.1);
            lampShadeMat.emissiveIntensity = THREE.MathUtils.lerp(lampShadeMat.emissiveIntensity, targetLampEmissive, 0.1);
            lampLight.visible = lampLight.intensity > 0.01;
            lampShadeMat.needsUpdate = true;
        }
    };
    return houseGroup;
};