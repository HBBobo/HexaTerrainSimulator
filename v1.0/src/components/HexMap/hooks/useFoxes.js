// src/components/HexMap/hooks/useFoxes.js
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    NUMBER_OF_FOXES, FOX_MAX_JUMP_HEIGHT_DIFFERENCE, TILE_TYPES, SEASONS,
    FOX_FOOTPRINT_TEXTURE_URL, FOX_FOOTPRINT_SIZE, FOX_FOOTPRINT_LIFETIME_SECONDS,
    FOX_FOOTPRINT_INTERVAL_SECONDS, FOX_FOOTPRINT_OPACITY, MIN_SNOW_FOR_FOOTPRINTS,
    FOX_FOOTPRINT_Y_OFFSET, TRANSPARENT_LAYER_Y // Import TRANSPARENT_LAYER_Y
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
const FOX_MODEL_GROUND_OFFSET = 0.05; // This is how much the fox's origin is above the tile's y

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

const useFoxes = (coreElements, landTiles, landTileMap, gridColumns, gridRows, season, snowAccumulationRatio) => {
    const [foxSystemData, setFoxSystemData] = useState(null);
    const foxesArrayRef = useRef([]);
    const textureLoaderRef = useRef(null);
    const footprintTextureRef = useRef(null);
    const footprintMaterialRef = useRef(null);
    const footprintGeometryRef = useRef(null);
    const footprintsGroupRef = useRef(null);
    const activeFootprintsRef = useRef([]);

    useEffect(() => {
        if (!coreElements || !coreElements.isReady || !coreElements.scene || !(coreElements.scene instanceof THREE.Scene) ||
            !landTiles || landTiles.length === 0 || !landTileMap || landTileMap.size === 0 ||
            gridColumns === undefined || gridRows === undefined) {
            if (foxSystemData) setFoxSystemData(null);
            return;
        }

        const { scene } = coreElements;
        textureLoaderRef.current = new THREE.TextureLoader();
        footprintTextureRef.current = textureLoaderRef.current.load(FOX_FOOTPRINT_TEXTURE_URL,
            () => console.log("Fox footprint texture loaded."),
            undefined,
            (err) => console.error("Error loading fox footprint texture:", err)
        );
        footprintMaterialRef.current = new THREE.MeshBasicMaterial({
            map: footprintTextureRef.current,
            transparent: true,
            opacity: FOX_FOOTPRINT_OPACITY,
            depthWrite: false,
            alphaTest: 0.1, // Adjust if needed for better edges
            side: THREE.DoubleSide, // Can be FrontSide if footprints are always on top
        });
        footprintGeometryRef.current = new THREE.PlaneGeometry(FOX_FOOTPRINT_SIZE, FOX_FOOTPRINT_SIZE);

        footprintsGroupRef.current = new THREE.Group();
        scene.add(footprintsGroupRef.current);

        const foxGroupInstance = new THREE.Group();
        foxGroupInstance.renderOrder = 0; // Ensure foxes render correctly with other elements
        scene.add(foxGroupInstance);

        // Clear previous foxes if any (e.g., from hot reload)
        foxesArrayRef.current.forEach(existingFox => {
            if (existingFox.model && existingFox.model.parent) {
                existingFox.model.parent.remove(existingFox.model);
                // Dispose geometry/material if fox models are unique, but foxUtils shares materials
            }
        });
        foxesArrayRef.current = [];

        for (let i = 0; i < NUMBER_OF_FOXES; i++) {
            const spawnTileIndex = Math.floor(Math.random() * landTiles.length);
            const spawnTile = landTiles[spawnTileIndex]; // spawnTile.y is the top surface of the land hex

            // Ensure spawn tile is not water, even though landTiles should filter this
            if (spawnTile.type === TILE_TYPES.DEEP_WATER || spawnTile.type === TILE_TYPES.SHALLOW_WATER) {
                console.warn("Fox tried to spawn on a water tile from landTiles array. Skipping this fox.", spawnTile);
                continue;
            }

            const foxModel = createFoxModel();

            // foxModel's origin is at its "feet" level conceptually.
            // spawnTile.y is the height of the tile.
            // FOX_MODEL_GROUND_OFFSET is any additional lift needed.
            foxModel.position.set(spawnTile.x, spawnTile.y + FOX_MODEL_GROUND_OFFSET, spawnTile.z);
            foxGroupInstance.add(foxModel);

            foxesArrayRef.current.push({
                model: foxModel,
                currentTile: spawnTile,
                startTileY: spawnTile.y, // Height of the current tile's surface
                targetTileY: spawnTile.y, // Height of the target tile's surface
                startPosition: foxModel.position.clone(),
                targetPosition: new THREE.Vector3().copy(foxModel.position),
                movementProgress: 0,
                state: 'idle',
                idleTimer: Math.random() * (ACTUAL_FOX_IDLE_TIME_MAX - ACTUAL_FOX_IDLE_TIME_MIN) + ACTUAL_FOX_IDLE_TIME_MIN,
                animationTime: Math.random() * 100,
                footprintCooldown: 0,
                nextFootprintSide: Math.random() < 0.5 ? 'left' : 'right',
            });
        }

        setFoxSystemData({
            foxGroup: foxGroupInstance,
            isReady: true
        });

        return () => {
            if (foxGroupInstance && scene && foxGroupInstance.parent === scene) scene.remove(foxGroupInstance);
            // disposeFoxMaterials(); // Materials are shared, dispose once globally if app closes
            foxesArrayRef.current = [];

            if (footprintsGroupRef.current && scene && footprintsGroupRef.current.parent === scene) {
                activeFootprintsRef.current.forEach(fp => footprintsGroupRef.current.remove(fp.mesh));
                scene.remove(footprintsGroupRef.current);
            }
            activeFootprintsRef.current = [];
            if (footprintGeometryRef.current) footprintGeometryRef.current.dispose();
            if (footprintMaterialRef.current) footprintMaterialRef.current.dispose();
            if (footprintTextureRef.current) footprintTextureRef.current.dispose();
            footprintGeometryRef.current = null;
            footprintMaterialRef.current = null;
            footprintTextureRef.current = null;
            footprintsGroupRef.current = null;
            setFoxSystemData(null);
        };
    }, [coreElements, landTiles, landTileMap, gridColumns, gridRows]); // Removed season, snowAccumulationRatio from main deps


    const updateFoxes = useCallback((deltaTime, elapsedTime) => {
        if (!foxSystemData || !foxSystemData.isReady || foxesArrayRef.current.length === 0 ||
            !landTileMap || !coreElements || !coreElements.isReady ||
            season === undefined || snowAccumulationRatio === undefined || // Keep these for footprint logic
            !footprintsGroupRef.current || !footprintMaterialRef.current || !footprintGeometryRef.current) {
            return;
        }

        const canLeaveFootprints = season === SEASONS.WINTER && snowAccumulationRatio >= MIN_SNOW_FOR_FOOTPRINTS;

        foxesArrayRef.current.forEach((fox) => {
            fox.animationTime += deltaTime;
            if (fox.footprintCooldown > 0) fox.footprintCooldown -= deltaTime;

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
                        // *** ADDED WATER CHECKS ***
                        potentialTile.type !== TILE_TYPES.DEEP_WATER &&
                        potentialTile.type !== TILE_TYPES.SHALLOW_WATER &&
                        // Ensure the potential tile's y is not significantly below water if it's near water
                        // (This check is more robust if potentialTile.y is always ground level)
                        // potentialTile.y > (TRANSPARENT_LAYER_Y - 0.1) && // Example: don't jump to something just below water surface
                        Math.abs(potentialTile.y - fox.currentTile.y) <= FOX_MAX_JUMP_HEIGHT_DIFFERENCE) {
                        possibleTargets.push(potentialTile);
                    }
                });

                if (possibleTargets.length > 0) {
                    fox.targetTile = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                    // fox.targetTile.y is the top surface of the target hex tile.
                    fox.targetPosition.set(fox.targetTile.x, fox.targetTile.y + FOX_MODEL_GROUND_OFFSET, fox.targetTile.z);
                    fox.startPosition.copy(fox.model.position);
                    fox.startTileY = fox.currentTile.y; // Surface height of start tile
                    fox.targetTileY = fox.targetTile.y; // Surface height of target tile
                    fox.state = 'moving';
                    fox.movementProgress = 0;
                } else {
                    fox.idleTimer = Math.random() * (STUCK_FOX_IDLE_TIME_MAX - STUCK_FOX_IDLE_TIME_MIN) + STUCK_FOX_IDLE_TIME_MIN;
                    fox.state = 'idle';
                }
            }

            if (fox.state === 'moving' && fox.targetTile) {
                const direction = new THREE.Vector3().subVectors(fox.targetPosition, fox.model.position);
                // Y component of direction is now based on tile heights + offset, so keep it for vertical arc
                // direction.y = 0; // No longer zeroing out Y for distance calc, use it for the jump arc
                const distanceToTargetXZ = new THREE.Vector2(direction.x, direction.z).length();


                if (distanceToTargetXZ > 0.05) { // Check XZ distance for completion
                    const targetWorldAngle = Math.atan2(direction.z, direction.x); // For XZ movement
                    const rotTargetAngle = Math.atan2(-direction.z, direction.x); // For model rotation

                    let currentModelRotationY = fox.model.rotation.y;
                    while (rotTargetAngle - currentModelRotationY > Math.PI) currentModelRotationY += 2 * Math.PI;
                    while (rotTargetAngle - currentModelRotationY < -Math.PI) currentModelRotationY -= 2 * Math.PI;
                    const turnLerpFactor = Math.min(FOX_TURN_SPEED * deltaTime, 1);
                    fox.model.rotation.y = THREE.MathUtils.lerp(currentModelRotationY, rotTargetAngle, turnLerpFactor);

                    let angleDiff = Math.abs(rotTargetAngle - fox.model.rotation.y);
                    // Ensure angleDiff considers wrapping around PI
                    angleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);


                    if (angleDiff < Math.PI / 2.5) { // Start moving if mostly facing target
                        const moveDistanceXZ = Math.min(FOX_SPEED * deltaTime, distanceToTargetXZ);
                        fox.model.position.x += Math.cos(targetWorldAngle) * moveDistanceXZ;
                        fox.model.position.z += Math.sin(targetWorldAngle) * moveDistanceXZ;

                        const currentPosXZ = new THREE.Vector2(fox.model.position.x, fox.model.position.z);
                        const startPosXZ = new THREE.Vector2(fox.startPosition.x, fox.startPosition.z);
                        const targetPosXZ_vec = new THREE.Vector2(fox.targetPosition.x, fox.targetPosition.z);

                        const distCoveredXZ = startPosXZ.distanceTo(currentPosXZ);
                        const totalDistForSegmentXZ = startPosXZ.distanceTo(targetPosXZ_vec);

                        fox.movementProgress = totalDistForSegmentXZ > 0.01 ? Math.min(distCoveredXZ / totalDistForSegmentXZ, 1.0) : (distanceToTargetXZ <= 0.05 ? 1.0 : 0);

                        // Y position calculation using the step interpolation for an arc
                        // startPosition.y and targetPosition.y already include FOX_MODEL_GROUND_OFFSET
                        const yProgressArc = stepInterpolationMidpoint(fox.movementProgress, 0.3); // Smoother arc
                        fox.model.position.y = THREE.MathUtils.lerp(fox.startPosition.y, fox.targetPosition.y, yProgressArc);


                        // Footprints are placed relative to the fox's current Y, minus its ground offset.
                        const foxFeetGroundLevelY = fox.model.position.y - FOX_MODEL_GROUND_OFFSET;

                        if (canLeaveFootprints && fox.footprintCooldown <= 0) {
                            const footprintY = foxFeetGroundLevelY + FOX_FOOTPRINT_Y_OFFSET;

                            const footprintForwardOffset = 0.03;
                            const footprintSideOffsetVal = 0.035;
                            let sideMultiplier = (fox.nextFootprintSide === 'left') ? 1 : -1;

                            const print = new THREE.Mesh(footprintGeometryRef.current, footprintMaterialRef.current.clone()); // Clone material for opacity fade

                            const localOffsetX = footprintSideOffsetVal * sideMultiplier;
                            const localOffsetZ = -footprintForwardOffset; // Footprints slightly behind center of model

                            // Transform local offset to world offset based on fox model's rotation
                            const worldOffsetX = localOffsetX * Math.cos(fox.model.rotation.y) - localOffsetZ * Math.sin(fox.model.rotation.y);
                            const worldOffsetZ = localOffsetX * Math.sin(fox.model.rotation.y) + localOffsetZ * Math.cos(fox.model.rotation.y);

                            print.position.x = fox.model.position.x + worldOffsetX;
                            print.position.y = footprintY;
                            print.position.z = fox.model.position.z + worldOffsetZ;

                            print.rotation.x = -Math.PI / 2; // Align plane with ground
                            print.rotation.z = fox.model.rotation.y - Math.PI / 2; // Align with fox's body direction
                            footprintsGroupRef.current.add(print);
                            activeFootprintsRef.current.push({ mesh: print, creationTime: elapsedTime });

                            fox.footprintCooldown = FOX_FOOTPRINT_INTERVAL_SECONDS;
                            fox.nextFootprintSide = (fox.nextFootprintSide === 'left') ? 'right' : 'left';
                        }
                    }
                } else { // XZ distance is small, snap to target
                    fox.model.position.copy(fox.targetPosition);
                    fox.currentTile = fox.targetTile;
                    fox.startTileY = fox.targetTile.y; // Update startY for next move
                    fox.targetTile = null;
                    fox.state = 'idle';
                    fox.idleTimer = Math.random() * (ACTUAL_FOX_IDLE_TIME_MAX - ACTUAL_FOX_IDLE_TIME_MIN) + ACTUAL_FOX_IDLE_TIME_MIN;
                    fox.movementProgress = 0;
                }
            }

            // Animation of fox parts
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
                    head.position.y = headOriginalY + headBob; // headOriginalY is relative to fox model's origin
                    head.rotation.y = 0; // Head faces forward when moving
                }
                if (tail && tailOriginalZRotation !== undefined) {
                    const tailWag = Math.sin(fox.animationTime * FOX_TAIL_WAG_SPEED_FACTOR) * FOX_TAIL_WAG_ANGLE_Z;
                    tail.rotation.z = tailOriginalZRotation + tailWag;
                }
            } else { // Idle state animations
                if (legs) { // Legs to neutral position
                    if (legs.frontLeft) legs.frontLeft.rotation.z = 0;
                    if (legs.backRight) legs.backRight.rotation.z = 0;
                    if (legs.frontRight) legs.frontRight.rotation.z = 0;
                    if (legs.backLeft) legs.backLeft.rotation.z = 0;
                }
                if (head && headOriginalY !== undefined) {
                    head.position.y = headOriginalY; // Reset bob
                    const headTurn = Math.sin(elapsedTime * FOX_HEAD_IDLE_SPEED_FACTOR + fox.animationTime * 0.1) * FOX_HEAD_IDLE_TURN_Y_ANGLE;
                    head.rotation.y = headTurn; // Random head turns
                }
                if (tail && tailOriginalZRotation !== undefined) {
                    const tailSwish = Math.sin(elapsedTime * FOX_TAIL_IDLE_SPEED_FACTOR + fox.animationTime * 0.1) * FOX_TAIL_IDLE_SWISH_Z_ANGLE;
                    tail.rotation.z = tailOriginalZRotation + tailSwish; // Gentle tail swish
                }
            }
        });

        // Manage footprint lifetime and fading
        const newActiveFootprints = [];
        for (const fp of activeFootprintsRef.current) {
            const age = elapsedTime - fp.creationTime;
            if (age < FOX_FOOTPRINT_LIFETIME_SECONDS) {
                fp.mesh.material.opacity = FOX_FOOTPRINT_OPACITY * (1 - (age / FOX_FOOTPRINT_LIFETIME_SECONDS));
                newActiveFootprints.push(fp);
            } else {
                footprintsGroupRef.current.remove(fp.mesh);
                if (fp.mesh.material) fp.mesh.material.dispose(); // Dispose cloned material
                // Geometry is shared, don't dispose footprintGeometryRef.current here
            }
        }
        activeFootprintsRef.current = newActiveFootprints;

    }, [foxSystemData, landTileMap, gridColumns, gridRows, coreElements, season, snowAccumulationRatio]); // Added season/snow back for footprint logic

    // Expose only what's needed by useThreeScene
    if (foxSystemData && foxSystemData.isReady) {
        return {
            // No need to expose foxGroup from here if useThreeScene doesn't directly interact with it
            isReady: true,
            updateFoxes
        };
    }
    return null;
};

export default useFoxes;