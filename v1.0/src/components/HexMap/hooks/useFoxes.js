// src/components/HexMap/hooks/useFoxes.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    NUMBER_OF_FOXES, FOX_MAX_JUMP_HEIGHT_DIFFERENCE, TILE_TYPES
} from '../constants';
import {
    createFoxModel, disposeFoxMaterials, FOX_SPEED, FOX_TURN_SPEED,
    FOX_MAX_LEG_SWING_X, FOX_LEG_ANIM_SPEED_FACTOR,
    FOX_HEAD_BOB_AMOUNT, FOX_HEAD_BOB_SPEED_FACTOR,
    FOX_TAIL_WAG_ANGLE_Z, FOX_TAIL_WAG_SPEED_FACTOR,
    FOX_HEAD_IDLE_TURN_Y_ANGLE, FOX_HEAD_IDLE_SPEED_FACTOR,
    FOX_TAIL_IDLE_SWISH_Z_ANGLE, FOX_TAIL_IDLE_SPEED_FACTOR
} from '../utils/foxUtils';

const ACTUAL_FOX_IDLE_TIME_MIN = 0.5;
const ACTUAL_FOX_IDLE_TIME_MAX = 2.5;
const STUCK_FOX_IDLE_TIME_MIN = 0.3;
const STUCK_FOX_IDLE_TIME_MAX = 0.8;

const getTileKey = (c, r) => `${c},${r}`;

const getAdjacentTileCoordinates = (c, r, gridColumns, gridRows) => {
    const isOddRow = r % 2 === 1;
    const potentialNeighbors = [
        { nc: c + 1, nr: r }, { nc: c - 1, nr: r },
        { nc: isOddRow ? c + 1 : c, nr: r + 1 }, { nc: isOddRow ? c : c - 1, nr: r + 1 },
        { nc: isOddRow ? c + 1 : c, nr: r - 1 }, { nc: isOddRow ? c : c - 1, nr: r - 1 }
    ];
    return potentialNeighbors.filter(n =>
        n.nc >= 0 && n.nc < gridColumns && n.nr >= 0 && n.nr < gridRows
    );
};

const stepInterpolationMidpoint = (t, transitionWindow = 0.2) => {
    const midPoint = 0.5;
    const halfWindow = transitionWindow / 2;
    const startTransition = midPoint - halfWindow;
    const endTransition = midPoint + halfWindow;

    if (t <= startTransition) return 0;
    if (t >= endTransition) return 1;

    const progressInWindow = (t - startTransition) / transitionWindow;
    return progressInWindow < 0.5
        ? 2 * progressInWindow * progressInWindow
        : 1 - Math.pow(-2 * progressInWindow + 2, 2) / 2;
};

const useFoxes = (coreElements, landTiles, landTileMap, gridColumns, gridRows) => {
    const [foxSystemData, setFoxSystemData] = useState(null);
    const foxesArrayRef = useRef([]);

    useEffect(() => {
        console.log("useFoxes: useEffect for setup. Core ready:", !!(coreElements && coreElements.isReady), "LandTiles count:", landTiles?.length);

        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            !landTiles || landTiles.length === 0 || !landTileMap || landTileMap.size === 0 ||
            gridColumns === undefined || gridRows === undefined) {

            if (foxSystemData) setFoxSystemData(null);
            return;
        }

        const { scene } = coreElements;
        console.log("useFoxes: Initializing Three.js objects for foxes...");

        const foxGroupInstance = new THREE.Group();
        foxGroupInstance.renderOrder = 0;
        scene.add(foxGroupInstance);

        foxesArrayRef.current.forEach(existingFox => {
            if (existingFox.model && existingFox.model.parent === foxGroupInstance) {
                foxGroupInstance.remove(existingFox.model);
            }
        });
        foxesArrayRef.current = [];

        for (let i = 0; i < NUMBER_OF_FOXES; i++) {
            const spawnTileIndex = Math.floor(Math.random() * landTiles.length);
            const spawnTile = landTiles[spawnTileIndex];
            const foxModel = createFoxModel();
            const foxYOffset = 0.05;
            foxModel.position.set(spawnTile.x, spawnTile.y + foxYOffset, spawnTile.z);
            foxGroupInstance.add(foxModel);

            foxesArrayRef.current.push({
                model: foxModel,
                currentTile: spawnTile,
                targetTile: null,
                startPosition: foxModel.position.clone(),
                targetPosition: new THREE.Vector3().copy(foxModel.position),
                movementProgress: 0,
                state: 'idle',
                idleTimer: Math.random() * (ACTUAL_FOX_IDLE_TIME_MAX - ACTUAL_FOX_IDLE_TIME_MIN) + ACTUAL_FOX_IDLE_TIME_MIN,
                animationTime: Math.random() * 100,
            });
        }

        console.log("useFoxes: Foxes created, setting state to ready.");
        setFoxSystemData({
            foxGroup: foxGroupInstance,
            isReady: true
        });

        return () => {
            console.log("useFoxes: Cleaning up fox system...");
            if (foxGroupInstance && scene && foxGroupInstance.parent === scene) {
                foxGroupInstance.traverse(node => {
                    if (node.isMesh && node.geometry) {
                        node.geometry.dispose();
                    } else if (node !== foxGroupInstance && node.userData && node.userData.legs) {
                        node.traverse(childMesh => {
                            if (childMesh.isMesh && childMesh.geometry) {
                                childMesh.geometry.dispose();
                            }
                        });
                    }
                });
                scene.remove(foxGroupInstance);
            }
            disposeFoxMaterials();
            foxesArrayRef.current = [];
            setFoxSystemData(null);
        };
    }, [coreElements, landTiles, landTileMap, gridColumns, gridRows]);


    const updateFoxes = useCallback((deltaTime, elapsedTime) => {
        if (!foxSystemData || !foxSystemData.isReady || foxesArrayRef.current.length === 0 ||
            !landTileMap || !coreElements || !coreElements.isReady) {
            return;
        }

        foxesArrayRef.current.forEach((fox, index) => {
            fox.animationTime += deltaTime;

            if (fox.state === 'idle') {
                fox.idleTimer -= deltaTime;
                if (fox.idleTimer <= 0) {
                    fox.state = 'wandering';
                }
            }

            if (fox.state === 'wandering') {
                const adjacentCoords = getAdjacentTileCoordinates(fox.currentTile.c, fox.currentTile.r, gridColumns, gridRows);
                const possibleTargets = [];
                adjacentCoords.forEach(coord => {
                    const key = getTileKey(coord.nc, coord.nr);
                    const potentialTile = landTileMap.get(key);
                    if (potentialTile &&
                        potentialTile.type !== TILE_TYPES.MOUNTAIN_PEAK &&
                        potentialTile.type !== TILE_TYPES.STONE &&
                        Math.abs(potentialTile.y - fox.currentTile.y) <= FOX_MAX_JUMP_HEIGHT_DIFFERENCE) {
                        possibleTargets.push(potentialTile);
                    }
                });

                if (possibleTargets.length > 0) {
                    fox.targetTile = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                    const foxYOffset = 0.05;
                    fox.targetPosition.set(fox.targetTile.x, fox.targetTile.y + foxYOffset, fox.targetTile.z);
                    fox.startPosition.copy(fox.model.position);
                    fox.state = 'moving';
                    fox.movementProgress = 0;
                } else {
                    fox.idleTimer = Math.random() * (STUCK_FOX_IDLE_TIME_MAX - STUCK_FOX_IDLE_TIME_MIN) + STUCK_FOX_IDLE_TIME_MIN;
                    fox.state = 'idle';
                }
            }

            if (fox.state === 'moving' && fox.targetTile) {
                const direction = new THREE.Vector3().subVectors(fox.targetPosition, fox.model.position);
                direction.y = 0;
                const distanceToTargetXZ = direction.length();

                if (distanceToTargetXZ > 0.05) {
                    const targetWorldAngle = Math.atan2(direction.z, direction.x);
                    const rotTargetAngle = Math.atan2(-direction.z, direction.x);

                    let currentModelRotationY = fox.model.rotation.y;
                    while (rotTargetAngle - currentModelRotationY > Math.PI) currentModelRotationY += 2 * Math.PI;
                    while (rotTargetAngle - currentModelRotationY < -Math.PI) currentModelRotationY -= 2 * Math.PI;

                    const turnLerpFactor = Math.min(FOX_TURN_SPEED * deltaTime, 1);
                    fox.model.rotation.y = THREE.MathUtils.lerp(currentModelRotationY, rotTargetAngle, turnLerpFactor);

                    let angleDiff = rotTargetAngle - fox.model.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    angleDiff = Math.abs(angleDiff);

                    if (angleDiff < Math.PI / 3) {
                        const moveDistance = Math.min(FOX_SPEED * deltaTime, distanceToTargetXZ);
                        fox.model.position.x += Math.cos(targetWorldAngle) * moveDistance;
                        fox.model.position.z += Math.sin(targetWorldAngle) * moveDistance;

                        const currentPosXZ = fox.model.position.clone().setY(0);
                        const startPosXZ = fox.startPosition.clone().setY(0);
                        const targetPosXZ = fox.targetPosition.clone().setY(0);
                        const distCoveredXZ = startPosXZ.distanceTo(currentPosXZ);
                        const totalDistForSegmentXZ = startPosXZ.distanceTo(targetPosXZ);
                        let actualMovementProgressThisSegment = 0;
                        if (totalDistForSegmentXZ > 0.01) {
                            actualMovementProgressThisSegment = Math.min(distCoveredXZ / totalDistForSegmentXZ, 1.0);
                        } else if (distanceToTargetXZ <= 0.05) {
                            actualMovementProgressThisSegment = 1.0;
                        }
                        fox.movementProgress = actualMovementProgressThisSegment;
                        const yProgress = stepInterpolationMidpoint(fox.movementProgress, 0.2);
                        fox.model.position.y = THREE.MathUtils.lerp(fox.startPosition.y, fox.targetPosition.y, yProgress);
                    }
                } else {
                    fox.model.position.copy(fox.targetPosition);
                    fox.currentTile = fox.targetTile;
                    fox.targetTile = null;
                    fox.state = 'idle';
                    fox.idleTimer = Math.random() * (ACTUAL_FOX_IDLE_TIME_MAX - ACTUAL_FOX_IDLE_TIME_MIN) + ACTUAL_FOX_IDLE_TIME_MIN;
                    fox.movementProgress = 0;
                }
            }

            const { legs, head, tail, headOriginalY, tailOriginalZRotation } = fox.model.userData;
            if (fox.state === 'moving') {
                if (legs) {
                    const legSwing = Math.sin(fox.animationTime * FOX_LEG_ANIM_SPEED_FACTOR) * FOX_MAX_LEG_SWING_X;
                    if (legs.frontLeft) legs.frontLeft.rotation.z = legSwing;
                    if (legs.backRight) legs.backRight.rotation.z = legSwing;
                    if (legs.frontRight) legs.frontRight.rotation.z = -legSwing;
                    if (legs.backLeft) legs.backLeft.rotation.z = -legSwing;
                }
                if (head && headOriginalY !== undefined) {
                    const headBob = Math.cos(fox.animationTime * FOX_HEAD_BOB_SPEED_FACTOR) * FOX_HEAD_BOB_AMOUNT;
                    head.position.y = headOriginalY + headBob;
                    head.rotation.y = 0;
                }
                if (tail && tailOriginalZRotation !== undefined) {
                    const tailWag = Math.sin(fox.animationTime * FOX_TAIL_WAG_SPEED_FACTOR) * FOX_TAIL_WAG_ANGLE_Z;
                    tail.rotation.z = tailOriginalZRotation + tailWag;
                }
            } else {
                if (legs) {
                    if (legs.frontLeft) legs.frontLeft.rotation.z = 0;
                    if (legs.backRight) legs.backRight.rotation.z = 0;
                    if (legs.frontRight) legs.frontRight.rotation.z = 0;
                    if (legs.backLeft) legs.backLeft.rotation.z = 0;
                }
                if (head && headOriginalY !== undefined) {
                    head.position.y = headOriginalY;
                    const headTurn = Math.sin(elapsedTime * FOX_HEAD_IDLE_SPEED_FACTOR + fox.animationTime * 0.1) * FOX_HEAD_IDLE_TURN_Y_ANGLE;
                    head.rotation.y = headTurn;
                }
                if (tail && tailOriginalZRotation !== undefined) {
                    const tailSwish = Math.sin(elapsedTime * FOX_TAIL_IDLE_SPEED_FACTOR + fox.animationTime * 0.1) * FOX_TAIL_IDLE_SWISH_Z_ANGLE;
                    tail.rotation.z = tailOriginalZRotation + tailSwish;
                }
            }
        });
    }, [foxSystemData, landTileMap, gridColumns, gridRows, coreElements]);

    if (foxSystemData && foxSystemData.isReady) {
        return {
            ...foxSystemData,
            updateFoxes
        };
    }
    return null;
};

export default useFoxes;