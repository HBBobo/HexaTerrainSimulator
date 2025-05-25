// src/components/HexMap/hooks/useThreeCore.js
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEX_SIZE, TRANSPARENT_LAYER_Y, GRID_COLUMNS, GRID_ROWS } from '../constants';

const POINTY_HEX_TRUE_WIDTH_CALC = HEX_SIZE * Math.sqrt(3);
const POINTY_HEX_TRUE_HEIGHT_CALC = HEX_SIZE * 2;
const POINTY_HEX_VERT_SPACING_CALC = POINTY_HEX_TRUE_HEIGHT_CALC * 0.75;

const useThreeCore = (mountRef, gridColumns, gridRows) => {
    const [coreState, setCoreState] = useState(null);
    const sceneIdRef = useRef(null); // To track scene instance

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) {
            if (coreState) {
                console.log("useThreeCore: Mount ref cleared, clearing core state.");
                setCoreState(null);
            }
            return;
        }

        console.log("useThreeCore: Initializing...");

        const scene = new THREE.Scene();
        if (sceneIdRef.current !== scene.uuid) {
            console.log(`useThreeCore: New Scene ID: ${scene.uuid} (Previous: ${sceneIdRef.current})`);
            sceneIdRef.current = scene.uuid;
        } else {
            console.log(`useThreeCore: Re-running useEffect but Scene ID is the same: ${scene.uuid}`);
        }
        scene.fog = new THREE.Fog(0x111122, 50, 300);

        const worldMapWidth = gridColumns * POINTY_HEX_TRUE_WIDTH_CALC;
        const worldMapDepth = gridRows * POINTY_HEX_VERT_SPACING_CALC;

        const camera = new THREE.PerspectiveCamera(60, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1500);
        camera.position.set(worldMapWidth * 0.4, Math.max(worldMapWidth, worldMapDepth) * 0.5, worldMapDepth * 0.8);
        camera.lookAt(0, TRANSPARENT_LAYER_Y, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace; // Corrected from outputEncoding

        // Clear previous renderer DOM element if any
        while (currentMount.firstChild) {
            currentMount.removeChild(currentMount.firstChild);
        }
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, TRANSPARENT_LAYER_Y, 0);
        controls.maxDistance = Math.max(worldMapWidth, worldMapDepth) * 1.5;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        console.log("useThreeCore: Core initialized, setting state with scene:", scene.uuid);
        setCoreState({
            scene, camera, renderer, controls, ambientLight,
            worldMapWidth, worldMapDepth,
            isReady: true,
        });

        const handleResize = () => {
            // Use the camera and renderer instances from this effect's closure
            // to avoid issues if coreState hasn't updated yet.
            if (camera && renderer && currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            console.log("useThreeCore: Cleaning up scene:", scene.uuid);
            window.removeEventListener('resize', handleResize);

            if (controls) controls.dispose();
            // scene.remove(ambientLight); // Ambient light is part of this scene, will be disposed with it
            if (renderer) {
                if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
                    try { currentMount.removeChild(renderer.domElement); } catch (e) {/*ignore*/ }
                }
                renderer.dispose();
            }
            // scene.dispose(); // Dispose scene resources if necessary, though Three.js often handles children.
            // Forcing a clear of coreState might be too aggressive if other hooks depend on its stability.
            // setCoreState(null); // Let's see if not nulling it out helps, and rely on new instance replacing.
            sceneIdRef.current = null; // Reset for next potential init
        };
    }, [mountRef, gridColumns, gridRows]); // Dependencies

    return coreState;
};

export default useThreeCore;