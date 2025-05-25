// src/components/HexMap/hooks/useThreeCore.js
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HEX_SIZE, TRANSPARENT_LAYER_Y } from '../constants';

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

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        while (currentMount.firstChild) {
            currentMount.removeChild(currentMount.firstChild);
        }
        currentMount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, TRANSPARENT_LAYER_Y, 0);
        controls.maxDistance = Math.max(worldMapWidth, worldMapDepth) * 1.5;
        controls.minDistance = HEX_SIZE * 5; // Prevent zooming in too close

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Initial intensity
        scene.add(ambientLight);

        console.log("useThreeCore: Core initialized, setting state with scene:", scene.uuid);
        setCoreState({
            scene, camera, renderer, controls, ambientLight,
            worldMapWidth, worldMapDepth,
            isReady: true,
        });

        const handleResize = () => {
            if (camera && renderer && currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            console.log("useThreeCore: Cleaning up scene:", scene.uuid);
            window.removeEventListener('resize', handleResize);

            if (controls) controls.dispose();
            if (renderer) {
                if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
                    try { currentMount.removeChild(renderer.domElement); } catch (e) {/*ignore error if already removed*/ }
                }
                renderer.dispose();
            }
            // Scene children and geometries/materials should be disposed by their respective hooks/managers
            sceneIdRef.current = null;
        };
    }, [mountRef, gridColumns, gridRows]);

    return coreState;
};

export default useThreeCore;