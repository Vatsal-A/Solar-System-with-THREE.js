
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ------ Basic Setup ------
const canvas = document.querySelector('canvas.webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 60, 130);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ------ Stars (simple sky sphere) ------
const starGeo = new THREE.SphereGeometry(900, 32, 32);
const starMat = new THREE.MeshBasicMaterial({ color: 0x05050a, side: THREE.BackSide });
const starField = new THREE.Mesh(starGeo, starMat);
scene.add(starField);

// Add scattered points for a starry feel
{
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    // Random shell between radius 300 and 800
    const r = 300 + Math.random() * 500;
    const theta = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const phi = THREE.MathUtils.randFloatSpread(Math.PI * 2);
    positions[3*i]   = r * Math.sin(theta) * Math.cos(phi);
    positions[3*i+1] = r * Math.cos(theta);
    positions[3*i+2] = r * Math.sin(theta) * Math.sin(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true });
  scene.add(new THREE.Points(pGeo, pMat));
}

// ------ Lighting ------
/*
  The sun will emit light using a PointLight at the sun's position.
  Planets use standard materials so we can see light/shadow cues.
*/
const sunLight = new THREE.PointLight(0xffffff, 15000); 
scene.add(sunLight);

// ambient light
scene.add(new THREE.AmbientLight(0x222233, 0.15));

// ------ Sun ------
const sunGroup = new THREE.Group(); // central reference
scene.add(sunGroup);

const sunGeo = new THREE.SphereGeometry(12, 48, 48);
const sunMat = new THREE.MeshStandardMaterial({
  emissive: 0xffaa33,
  emissiveIntensity: 1.8,
  color: 0x222222,
  roughness: 0.6,
  metalness: 0.0
});
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.castShadow = false;
sun.receiveShadow = false;
sunGroup.add(sun);

// Keep light at sun center
sunLight.position.set(0, 0, 0);
sunGroup.add(sunLight);


function createPlanet({
  name = 'planet',
  radius = 2,
  color = 0xB1B1B1,
  distance = 25,
  orbitalSpeed = 0.5,  
  spinSpeed = 15,      
  tiltDeg = 0,
  ring = null,         
  moons = []           
}) {
  const orbitPivot = new THREE.Group();
  orbitPivot.position.set(0, 0, 0);
  sunGroup.add(orbitPivot);

  // Visual orbit path (thin line)
  const curve = new THREE.EllipseCurve(0, 0, distance, distance, 0, 2 * Math.PI, false, 0);
  const points = curve.getPoints(128).map(p => new THREE.Vector3(p.x, 0, p.y));
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x333344 });
  const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
  orbitPivot.add(orbitLine);

  const planetGroup = new THREE.Group();
  planetGroup.position.set(distance, 0, 0);
  planetGroup.rotation.z = THREE.MathUtils.degToRad(tiltDeg); 
  orbitPivot.add(planetGroup);

  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  planetGroup.add(mesh);

  // ring (e.g., for Saturn-like planet)
  let ringMesh = null;
  if (ring) {
    const ringGeo = new THREE.RingGeometry(ring.inner, ring.outer, 64);
    // rotate to planet's equatorial plane
    ringGeo.rotateX(-Math.PI / 2);
    ringMesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: ring.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    planetGroup.add(ringMesh);
  }

  const moonPivots = [];
  for (const m of moons) {
    const moonPivot = new THREE.Group();
    planetGroup.add(moonPivot);

    const moonGeo = new THREE.SphereGeometry(m.radius, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({ color: m.color ?? 0xaaaaaa, roughness: 0.8 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(m.distance, 0, 0);
    moonPivot.add(moonMesh);

    moonPivots.push({ pivot: moonPivot, speed: m.orbitalSpeed });
  }

  // references for animation
  return {
    name,
    orbitPivot,
    planetGroup,
    mesh,
    ringMesh,
    spinSpeed,
    orbitalSpeed,
    moonPivots
  };
}

// ------ Create Planets ------
const planets = [];

// Mercury
planets.push(createPlanet({
  name: 'mercury',
  radius: 2,
  color: 0xB1B1B1,
  distance: 22,
  orbitalSpeed: 47.8,
  spinSpeed: 3.0,
}));

// Venus
planets.push(createPlanet({
  name: 'venus',
  radius: 3,
  color: 0xEEDC82,
  distance: 34,
  orbitalSpeed: 35,
  spinSpeed: -2.0, 
}));

// Earth
planets.push(createPlanet({
  name: 'earth',
  radius: 3.2,
  color: 0x2E8B57,
  distance: 48,
  orbitalSpeed: 29.7,
  spinSpeed: 18.0,
  tiltDeg: 23.5,
  moons: [{ radius: 0.9, distance: 6, orbitalSpeed: 12.0, color: 0xffffff }]
}));

// Mars
planets.push(createPlanet({
  name: 'mars',
  radius: 2.4,
  color: 0xB22222,
  distance: 62,
  orbitalSpeed: 24.1,
  spinSpeed: 16.0,
  moons: [{ radius: 0.6, distance: 4.5, orbitalSpeed: 18.0, color: 0xdddddd }]
}));

// Jupiter
planets.push(createPlanet({
  name: 'jupiter',
  radius: 7.0,
  color: 0xD2B48C,
  distance: 95,
  orbitalSpeed: 13.1,
  spinSpeed: 19.0,
  moons: [{ radius: 0.6, distance: 4.5, orbitalSpeed: 18.0, color: 0xdddddd }]
}));

// Saturn-like: ringed gas giant
planets.push(createPlanet({
  name: 'saturn',
  radius: 6.5,
  color: 0xF5DEB3,
  distance: 115,
  orbitalSpeed: 9.6,
  spinSpeed: 22.0,
  tiltDeg: 26.7,
  ring: { inner: 8.0, outer: 12.0, color: 0xdccfa0 }
}));

// ------ Animation Loop ------
const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta(); 

  // Sun slow self-rotation for a subtle effect
  sun.rotation.y += THREE.MathUtils.degToRad(2.0) * dt;

  // Animate each planet:
  for (const p of planets) {
    // Revolution: rotate the orbit pivot around the sun (Y-axis)
    p.orbitPivot.rotation.y += THREE.MathUtils.degToRad(p.orbitalSpeed) * dt;

    // Self-rotation (spin)
    p.mesh.rotation.y += THREE.MathUtils.degToRad(p.spinSpeed) * dt;

    // Moons orbiting their planet
    for (const m of p.moonPivots) {
      m.pivot.rotation.y += THREE.MathUtils.degToRad(m.speed) * dt;
    }
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ------ Resize Handling ------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
