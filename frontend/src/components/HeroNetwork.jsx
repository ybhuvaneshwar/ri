import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/** Lightweight WebGL animated network — no react-three-fiber dep required.
 * Renders instanced points + lines with subtle mouse parallax. */
export default function HeroNetwork() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.z = 60;

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // Nodes
    const NODE_COUNT = 90;
    const positions = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 90;
      positions[i*3+1] = (Math.random() - 0.5) * 55;
      positions[i*3+2] = (Math.random() - 0.5) * 40;
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const nodeMat = new THREE.PointsMaterial({ color: 0x00E5FF, size: 1.3, transparent: true, opacity: 0.9 });
    const points = new THREE.Points(nodeGeo, nodeMat);
    scene.add(points);

    // Lines (connect near nodes)
    const linePositions = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i+1; j < NODE_COUNT; j++) {
        const dx = positions[i*3] - positions[j*3];
        const dy = positions[i*3+1] - positions[j*3+1];
        const dz = positions[i*3+2] - positions[j*3+2];
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (d < 14) {
          linePositions.push(positions[i*3], positions[i*3+1], positions[i*3+2]);
          linePositions.push(positions[j*3], positions[j*3+1], positions[j*3+2]);
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.18 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Mouse parallax
    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    let t = 0;
    const loop = () => {
      t += reduced ? 0 : 0.0025;
      points.rotation.y = t;
      lines.rotation.y = t;
      points.rotation.x = mouse.y * 0.15;
      lines.rotation.x = mouse.y * 0.15;
      camera.position.x += (mouse.x * 6 - camera.position.x) * 0.02;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      nodeGeo.dispose(); nodeMat.dispose(); lineGeo.dispose(); lineMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" data-testid="hero-network-canvas" />;
}
