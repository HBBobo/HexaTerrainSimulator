// src/components/HexMap/utils/buildingUtils.js
import * as THREE from 'three';
import { SNOW_COVER_COLOR, MAX_SNOW_COVER_LERP_FACTOR, BUILDING_TYPES } from '../constants';

// Store original materials to revert snow or for efficient reuse
const buildingMaterialsCache = new Map(); // Key: material, Value: { originalColor: Color, originalEmissive?: Color }

const getCachedMaterial = (colorHex, props = {}, isFlame = false) => {
    const material = new THREE.MeshStandardMaterial({ color: colorHex, ...props });
    if (!isFlame) {
        const cacheEntry = { originalColor: material.color.clone() };
        if (material.emissive) {
            cacheEntry.originalEmissive = material.emissive.clone();
        }
        buildingMaterialsCache.set(material, cacheEntry);
    }
    return material;
};

// --- House ---
const HOUSE_WALL_COLOR = 0xD2B48C; // Tan
const HOUSE_ROOF_COLOR = 0xA52A2A; // Brown
const HOUSE_DOOR_COLOR = 0x8B4513; // SaddleBrown
const HOUSE_WINDOW_COLOR = 0xADD8E6; // LightBlue - Base color for glass
const HOUSE_WINDOW_EMISSIVE_COLOR = 0xFFFFAA; // Warm yellow glow for windows
const HOUSE_LAMP_EMISSIVE_COLOR = 0xFFE082;  // Slightly different warm glow for lamp
const HOUSE_FRAME_COLOR = 0x7A5230; // Darker brown for frames
const CHIMNEY_COLOR = 0x8B4513;
const ROOF_PANEL_THICKNESS = 0.04;
const LAMP_POST_COLOR = 0x505050; // Dark grey metal for lamp post
const LAMP_SHADE_COLOR = 0xF0E68C; // Khaki / light yellow for shade

const createHouseModel = (tileY) => {
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
    });
    const windowGlassGeo = new THREE.BoxGeometry(windowSize, windowSize, windowDepth / 2);

    const createdWindowGlassMaterials = [windowGlassMaterial]; // Store the shared material instance

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

    // Chimney
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

    // --- Door Lamp ---
    const lampGroup = new THREE.Group();
    const lampPostHeight = 0.25;
    const lampPostRadius = 0.01;
    const lampPostMaterial = getCachedMaterial(LAMP_POST_COLOR, { roughness: 0.6 });
    const lampPostGeo = new THREE.CylinderGeometry(lampPostRadius, lampPostRadius, lampPostHeight, 6);
    const lampPost = new THREE.Mesh(lampPostGeo, lampPostMaterial);
    lampPost.position.y = lampPostHeight / 2; // Base of post on ground
    lampGroup.add(lampPost);

    const lampShadeSize = 0.06;
    const lampShadeMaterial = getCachedMaterial(LAMP_SHADE_COLOR, {
        roughness: 0.7,
        emissive: HOUSE_LAMP_EMISSIVE_COLOR,
        emissiveIntensity: 0.0 // Start off
    });
    // Mark lamp shade as a "roof" like surface for snow, or handle its snow separately if needed
    lampShadeMaterial.userData = { isRoof: true, isLampShade: true };
    const lampShadeGeo = new THREE.BoxGeometry(lampShadeSize, lampShadeSize * 0.8, lampShadeSize); // lantern shape
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMaterial);
    lampShade.position.y = lampPostHeight + (lampShadeSize * 0.8) / 2 - 0.01; // Sit on top of post
    lampGroup.add(lampShade);

    // PointLight for the lamp
    const doorLampLight = new THREE.PointLight(HOUSE_LAMP_EMISSIVE_COLOR, 0, 0.8, 1.5); // color, intensity, distance, decay
    doorLampLight.position.y = lampShade.position.y; // Emanate from shade center
    doorLampLight.castShadow = false; // Keep false for performance unless critical
    lampGroup.add(doorLampLight);

    // Position the lamp group next to the door
    // Decide which side: Math.random() < 0.5 ? -1 : 1;
    const lampSideMultiplier = 1; // Or -1 for other side
    lampGroup.position.set(
        (doorWidth / 2 + frameThickness + lampPostRadius + 0.03) * lampSideMultiplier,
        tileY, // Lamp base on the ground
        baseDepth / 2 + 0.02 // Slightly in front of door frame
    );
    lampGroup.castShadow = true; // Post can cast shadow
    houseGroup.add(lampGroup);
    // Store references for animation
    houseGroup.userData.doorLampLight = doorLampLight;
    houseGroup.userData.doorLampShadeMaterial = lampShadeMaterial;


    // Animation function for house (window lights, door lamp)
    houseGroup.userData.animate = (time, timeOfDay) => {
        let targetWindowIntensity = 0.0;
        let targetLampIntensity = 0.0; // For PointLight
        let targetLampEmissive = 0.0;   // For Lamp Shade Material

        const eveningStart = 17.5;
        const nightStart = 19.5;
        const morningEnd = 7.0;
        const peakWindowIntensity = 0.8;
        const peakLampLightIntensity = 0.7; // For PointLight
        const peakLampEmissiveIntensity = 0.6; // For Shade Material

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
            targetLampEmissive = targetLampIntensity * 0.8; // Link shade emissive to light
        }


        if (createdWindowGlassMaterials.length > 0) {
            const material = createdWindowGlassMaterials[0];
            material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetWindowIntensity, 0.1);
            material.needsUpdate = true;
        }

        // Update door lamp
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

// --- Campfire ---
// (Campfire code remains the same as previous version)
const CAMPFIRE_WOOD_COLOR = 0x8B4513;
const CAMPFIRE_STONE_COLOR = 0x808080;
const FLAME_COLOR_YELLOW = 0xFFFFAA;
const FLAME_COLOR_ORANGE = 0xFFAA33;

const createCampfireModel = (tileY) => {
    const campfireGroup = new THREE.Group();
    campfireGroup.userData.isBuilding = true;
    campfireGroup.userData.buildingType = BUILDING_TYPES.CAMPFIRE;

    const stoneMaterial = getCachedMaterial(CAMPFIRE_STONE_COLOR, { roughness: 0.8, metalness: 0.2 });
    stoneMaterial.userData = { isRoof: true };
    const woodMaterial = getCachedMaterial(CAMPFIRE_WOOD_COLOR, { roughness: 0.9, metalness: 0.05 });
    woodMaterial.userData = { isRoof: true };

    const baseRadius = 0.18;
    const stoneHeight = 0.06;
    const groundY = tileY + stoneHeight / 2;

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const stoneGeo = new THREE.BoxGeometry(0.07, stoneHeight, 0.07);
        const stone = new THREE.Mesh(stoneGeo, stoneMaterial);
        stone.position.set(
            Math.cos(angle) * (baseRadius - 0.035),
            groundY,
            Math.sin(angle) * (baseRadius - 0.035)
        );
        stone.castShadow = true;
        campfireGroup.add(stone);
    }

    const logLength = 0.22;
    const logRadius = 0.025;
    const logGeo = new THREE.CylinderGeometry(logRadius, logRadius, logLength, 5);

    const logPositions = [
        { yOff: logRadius, rotZ: Math.PI / 2, rotY: 0, zOff: -logRadius * 1.2 },
        { yOff: logRadius, rotZ: Math.PI / 2, rotY: Math.PI / 2.5, zOff: 0, xOff: logRadius * 0.8 },
        { yOff: logRadius, rotZ: Math.PI / 2, rotY: -Math.PI / 2.5, zOff: 0, xOff: -logRadius * 0.8 },
        { yOff: logRadius * 3, rotZ: Math.PI / 2, rotY: Math.PI / 6, zOff: -logRadius * 0.5 },
    ];

    logPositions.forEach(p => {
        const log = new THREE.Mesh(logGeo, woodMaterial);
        log.rotation.z = p.rotZ;
        if (p.rotY) log.rotation.y = p.rotY;
        log.position.set(p.xOff || 0, groundY - stoneHeight / 2 + p.yOff, p.zOff || 0);
        log.castShadow = true;
        campfireGroup.add(log);
    });

    const numSittingStones = 3 + Math.floor(Math.random() * 3);
    const sittingStoneMinRadius = baseRadius + 0.12;
    const sittingStoneMaxRadius = baseRadius + 0.22;
    let lastAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < numSittingStones; i++) {
        const angleOffset = (Math.PI * 2 / numSittingStones) * (0.8 + Math.random() * 0.4);
        const angle = lastAngle + angleOffset;
        lastAngle = angle;

        const currentRadius = sittingStoneMinRadius + Math.random() * (sittingStoneMaxRadius - sittingStoneMinRadius);

        const sitStoneSize = 0.08 + Math.random() * 0.07;
        const sitStoneGeo = new THREE.DodecahedronGeometry(sitStoneSize / 1.5, 0);
        const sitStone = new THREE.Mesh(sitStoneGeo, stoneMaterial);
        sitStone.position.set(
            Math.cos(angle) * currentRadius,
            tileY + sitStoneSize / 2,
            Math.sin(angle) * currentRadius
        );
        sitStone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        sitStone.castShadow = true;
        sitStone.receiveShadow = true;
        campfireGroup.add(sitStone);
    }

    const flameGroup = new THREE.Group();
    flameGroup.position.y = groundY + logRadius * 2.5;
    campfireGroup.add(flameGroup);

    const flameMaterialOuter = getCachedMaterial(FLAME_COLOR_ORANGE, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: FLAME_COLOR_ORANGE, emissiveIntensity: 0.5, depthWrite: false }, true);
    const flameMaterialInner = getCachedMaterial(FLAME_COLOR_YELLOW, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: FLAME_COLOR_YELLOW, emissiveIntensity: 0.8, depthWrite: false }, true);

    const createFlamePlane = (material, size, yOffset) => {
        const planeGeo = new THREE.PlaneGeometry(size, size * 1.8);
        const plane = new THREE.Mesh(planeGeo, material);
        plane.position.y = yOffset + (size * 1.8) / 2;
        return plane;
    };

    const flame1Outer = createFlamePlane(flameMaterialOuter, 0.08, 0);
    const flame1Inner = createFlamePlane(flameMaterialInner, 0.05, 0.01);
    flame1Outer.add(flame1Inner);
    flameGroup.add(flame1Outer);

    const flame2Outer = createFlamePlane(flameMaterialOuter, 0.07, 0.02);
    flame2Outer.rotation.y = Math.PI / 2;
    const flame2Inner = createFlamePlane(flameMaterialInner, 0.04, 0.03);
    flame2Outer.add(flame2Inner);
    flameGroup.add(flame2Outer);

    campfireGroup.userData.flames = [flame1Outer, flame2Outer];

    const fireLight = new THREE.PointLight(FLAME_COLOR_ORANGE, 1.5, 3.5, 1.8);
    fireLight.position.copy(flameGroup.position);
    fireLight.position.y += 0.1;
    fireLight.castShadow = true;
    fireLight.shadow.mapSize.width = 256;
    fireLight.shadow.mapSize.height = 256;
    fireLight.shadow.camera.near = 0.1;
    fireLight.shadow.camera.far = 3;
    campfireGroup.add(fireLight);
    campfireGroup.userData.light = fireLight;
    campfireGroup.userData.isLit = () => fireLight.intensity > 0.3 && fireLight.visible;

    campfireGroup.userData.animate = (time, timeOfDay) => {
        const flames = campfireGroup.userData.flames;
        if (flames) {
            flames.forEach((flame, index) => {
                const scaleFactor = 0.9 + Math.sin(time * (5 + index) + index * 0.5) * 0.15;
                flame.scale.set(scaleFactor, scaleFactor, scaleFactor);
                flame.material.opacity = 0.5 + Math.sin(time * (6 + index) + index * 0.7) * 0.2;
                if (flame.children.length > 0 && flame.children[0].material) {
                    flame.children[0].material.opacity = 0.7 + Math.sin(time * (7 + index) + index * 0.9) * 0.25;
                }
            });
        }
        const light = campfireGroup.userData.light;
        if (light) {
            if (timeOfDay > 18 || timeOfDay < 6) {
                light.intensity = THREE.MathUtils.lerp(light.intensity, 2.0 + Math.sin(time * 3) * 0.3, 0.1);
            } else if (timeOfDay > 6 && timeOfDay < 8) {
                light.intensity = THREE.MathUtils.lerp(light.intensity, 1.0 + Math.sin(time * 3) * 0.2, 0.1);
            }
            else {
                light.intensity = THREE.MathUtils.lerp(light.intensity, 0.5 + Math.sin(time * 3) * 0.1, 0.1);
            }
            light.visible = light.intensity > 0.1;
        }
    };

    return campfireGroup;
};

// --- Farm ---
const FARM_SOIL_COLOR = 0x654321;
const FARM_FENCE_COLOR = 0x8B7355;

const createFarmModel = (tileY) => {
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


export const createBuildingModel = (buildingType, tileY) => {
    let model;
    switch (buildingType) {
        case BUILDING_TYPES.HOUSE:
            model = createHouseModel(tileY);
            break;
        case BUILDING_TYPES.CAMPFIRE:
            model = createCampfireModel(tileY);
            break;
        case BUILDING_TYPES.FARM:
            model = createFarmModel(tileY);
            break;
        case BUILDING_TYPES.MINE:
        case BUILDING_TYPES.HARBOUR:
        default:
            console.warn(`Building type ${buildingType} model not implemented yet. Using placeholder.`);
            const placeholderGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const placeholderMat = getCachedMaterial(0x8888FF, { roughness: 0.5 });
            placeholderMat.userData = { isRoof: true };
            const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
            placeholder.position.y = tileY + 0.2;
            placeholder.castShadow = true;
            const group = new THREE.Group();
            group.add(placeholder);
            group.userData.isBuilding = true;
            group.userData.buildingType = 'PLACEHOLDER';
            group.userData.animate = (time) => { };
            model = group;
            break;
    }
    if (model) {
        model.rotation.y = Math.random() * Math.PI * 2;
    }
    return model;
};

export const updateBuildingMaterialsForSnow = (buildingInstance, snowAccumulationRatio) => {
    if (!buildingInstance || !buildingInstance.userData?.isBuilding) return;

    const snowColor = new THREE.Color(SNOW_COVER_COLOR);
    const isCampfire = buildingInstance.userData.buildingType === BUILDING_TYPES.CAMPFIRE;
    const isHouse = buildingInstance.userData.buildingType === BUILDING_TYPES.HOUSE;
    const lightIsOn = isCampfire && typeof buildingInstance.userData.isLit === 'function' && buildingInstance.userData.isLit();

    let houseLampIsOn = false;
    if (isHouse && buildingInstance.userData.doorLampLight) {
        houseLampIsOn = buildingInstance.userData.doorLampLight.intensity > 0.05;
    }


    buildingInstance.traverse((node) => {
        if (node.isMesh && node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(material => {
                // Skip emissive materials that control their own appearance (flames, window glass, lamp shade)
                if (material.emissive &&
                    (material.emissive.equals(new THREE.Color(FLAME_COLOR_ORANGE)) ||
                        material.emissive.equals(new THREE.Color(FLAME_COLOR_YELLOW)) ||
                        material.emissive.equals(new THREE.Color(HOUSE_WINDOW_EMISSIVE_COLOR)) ||
                        (material.userData?.isLampShade && material.emissive.equals(new THREE.Color(HOUSE_LAMP_EMISSIVE_COLOR)))
                    )
                ) {
                    return;
                }

                const cacheEntry = buildingMaterialsCache.get(material);
                if (cacheEntry) {
                    let currentLerp = 0;
                    let effectiveSnowRatio = snowAccumulationRatio;

                    if (isCampfire && lightIsOn) {
                        effectiveSnowRatio *= 0.05;
                    }
                    // If it's a lamp post and the lamp is on, reduce snow slightly
                    if (node.parent === buildingInstance.userData.doorLampLight?.parent && houseLampIsOn) { // Check if node is part of lamp group
                        effectiveSnowRatio *= 0.3; // Lamp post gets less snow if lamp is on
                    }


                    if (material.userData && material.userData.isRoof) {
                        currentLerp = effectiveSnowRatio * MAX_SNOW_COVER_LERP_FACTOR;
                    } else {
                        currentLerp = effectiveSnowRatio * MAX_SNOW_COVER_LERP_FACTOR * 0.25;
                    }
                    material.color.copy(cacheEntry.originalColor).lerp(snowColor, Math.min(currentLerp, 1.0));
                    material.needsUpdate = true;
                }
            });
        }
    });
};

export const disposeBuildingMaterials = () => {
    buildingMaterialsCache.forEach((value, material) => {
        material.dispose();
    });
    buildingMaterialsCache.clear();
};