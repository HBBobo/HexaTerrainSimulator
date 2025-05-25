// src/components/HexMap/buildings/models/createCampfireModel.js
import * as THREE from 'three';
import { BUILDING_TYPES } from '../BuildingTypes' // Adjust path
import { getCachedMaterial } from '../utils/materialManager'; // Adjust path

const CAMPFIRE_WOOD_COLOR = 0x8B4513;
const CAMPFIRE_STONE_COLOR = 0x808080;
const FLAME_COLOR_YELLOW = 0xFFFFAA;
const FLAME_COLOR_ORANGE = 0xFFAA33;

export const createCampfireModel = (tileY) => {
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