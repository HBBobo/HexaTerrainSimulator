// src/components/HexMap/utils/foxUtils.js
import * as THREE from 'three';

const FOX_BODY_COLOR = 0xD2691E;
const FOX_SNOUT_COLOR = 0xFFE4C4;
const FOX_LEG_COLOR = 0x4A2A2A;

export const FOX_SPEED = 0.75;
export const FOX_TURN_SPEED = Math.PI * 2;

export const FOX_MAX_LEG_SWING_X = Math.PI / 5;
export const FOX_LEG_ANIM_SPEED_FACTOR = 10;
export const FOX_HEAD_BOB_AMOUNT = 0.015;
export const FOX_HEAD_BOB_SPEED_FACTOR = FOX_LEG_ANIM_SPEED_FACTOR * 1.5;
export const FOX_TAIL_WAG_ANGLE_Z = Math.PI / 18;
export const FOX_TAIL_WAG_SPEED_FACTOR = FOX_LEG_ANIM_SPEED_FACTOR * 0.9;

export const FOX_HEAD_IDLE_TURN_Y_ANGLE = Math.PI / 8;
export const FOX_HEAD_IDLE_SPEED_FACTOR = 0.4;
export const FOX_TAIL_IDLE_SWISH_Z_ANGLE = Math.PI / 24;
export const FOX_TAIL_IDLE_SPEED_FACTOR = 0.6;

const bodyMaterial = new THREE.MeshStandardMaterial({ color: FOX_BODY_COLOR, roughness: 0.7, metalness: 0.1 });
const snoutMaterial = new THREE.MeshStandardMaterial({ color: FOX_SNOUT_COLOR, roughness: 0.7, metalness: 0.1 });
const legMaterial = new THREE.MeshStandardMaterial({ color: FOX_LEG_COLOR, roughness: 0.7, metalness: 0.1 });

export const createFoxModel = () => {
    const foxGroup = new THREE.Group();
    foxGroup.userData = {};

    const bodyGeo = new THREE.BoxGeometry(0.5, 0.2, 0.25);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
    bodyMesh.position.y = 0.12;
    foxGroup.add(bodyMesh);
    foxGroup.userData.body = bodyMesh;

    const headMesh = new THREE.Group();
    headMesh.position.set(0.25, 0.22, 0);
    foxGroup.add(headMesh);
    foxGroup.userData.head = headMesh;
    foxGroup.userData.headOriginalY = headMesh.position.y;

    const headGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const actualHeadMesh = new THREE.Mesh(headGeo, bodyMaterial);
    headMesh.add(actualHeadMesh);

    const snoutGeo = new THREE.ConeGeometry(0.05, 0.15, 4);
    const snoutMesh = new THREE.Mesh(snoutGeo, snoutMaterial);
    snoutMesh.position.set(0.09, 0, 0);
    snoutMesh.rotation.z = -Math.PI / 2;
    headMesh.add(snoutMesh);

    const earGeo = new THREE.ConeGeometry(0.04, 0.1, 3);
    const leftEar = new THREE.Mesh(earGeo, legMaterial);
    leftEar.position.set(-0.02, 0.1, 0.05);
    headMesh.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, legMaterial);
    rightEar.position.set(-0.02, 0.1, -0.05);
    headMesh.add(rightEar);

    const legHeight = 0.15;
    const legGeo = new THREE.CylinderGeometry(0.03, 0.02, legHeight, 4);
    const legPositions = [
        { x: 0.18, y: 0.02, z: 0.09, name: 'frontLeft' },
        { x: 0.18, y: 0.02, z: -0.09, name: 'frontRight' },
        { x: -0.18, y: 0.02, z: 0.09, name: 'backLeft' },
        { x: -0.18, y: 0.02, z: -0.09, name: 'backRight' }
    ];

    foxGroup.userData.legs = {};
    legPositions.forEach(posData => {
        const legPivot = new THREE.Group();
        legPivot.position.set(posData.x, posData.y, posData.z);
        foxGroup.add(legPivot);

        const legMesh = new THREE.Mesh(legGeo, legMaterial);
        legMesh.position.y = -legHeight / 2;
        legPivot.add(legMesh);

        foxGroup.userData.legs[posData.name] = legPivot;
    });

    const tailMesh = new THREE.Group();
    tailMesh.position.set(-0.3, 0.10, 0);
    tailMesh.rotation.z = -Math.PI / 6;
    foxGroup.add(tailMesh);
    foxGroup.userData.tail = tailMesh;
    foxGroup.userData.tailOriginalZRotation = tailMesh.rotation.z;

    const tailGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.25, 5);
    const actualTailMesh = new THREE.Mesh(tailGeo, bodyMaterial);
    tailMesh.add(actualTailMesh);

    const tailTipGeo = new THREE.SphereGeometry(0.065);
    const tailTip = new THREE.Mesh(tailTipGeo, snoutMaterial);
    actualTailMesh.add(tailTip);
    tailTip.position.y = -0.125;


    foxGroup.castShadow = true;
    foxGroup.traverse(child => {
        if (child.isMesh) child.castShadow = true;
    });

    return foxGroup;
};

export const disposeFoxMaterials = () => {
    bodyMaterial.dispose();
    snoutMaterial.dispose();
    legMaterial.dispose();
};