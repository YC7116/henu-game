import * as T from './vendor/three.module.mjs';
import { OrbitControls } from './vendor/OrbitControls.mjs';
import { GLTFLoader } from './vendor/GLTFLoader.mjs';

const loading = document.querySelector('#loading');
try {
  const canvas = document.querySelector('#viewer');
  const wrap = document.querySelector('#canvas-wrap');

  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color('#e0b0a0');
  scene.fog = new T.Fog('#e0b0a0', 75, 150);

  const camera = new T.PerspectiveCamera(36, 1, 0.2, 240);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 4.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 10;
  controls.maxDistance = 70;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.7;

  const { scene: gate } = await new GLTFLoader().loadAsync('./models/henu-south-gate.glb');
  gate.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(gate);

  // 与 Blender 里「天空柔光 / 左前方夕照 / 背部暖边光」对应的三点光
  scene.add(new T.HemisphereLight('#ffe9dc', '#7a6258', 1.6));
  const key = new T.DirectionalLight('#ffdcb4', 3.0);
  key.position.set(-13, 20, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new T.DirectionalLight('#f0b49a', 1.2);
  rim.position.set(10, 10, -14);
  scene.add(rim);
  const fill = new T.DirectionalLight('#ffe4cf', 0.7);
  fill.position.set(14, 7, 14);
  scene.add(fill);

  const floor = new T.Mesh(
    new T.PlaneGeometry(400, 400),
    new T.MeshStandardMaterial({ color: '#c69a8a', roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.35;
  floor.receiveShadow = true;
  scene.add(floor);

  const views = {
    front: [0, 5.6, 23],
    side: [23, 6.4, 0.01],
    back: [0.01, 6.4, -23],
    top: [0.01, 30, 0.01],
    reset: [17.0, 11.2, 19.5],
  };
  function setView(name) {
    camera.position.set(...views[name]);
    controls.target.set(0, 4.5, 0);
    controls.update();
  }
  setView('reset');

  document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => setView(b.dataset.view); });
  document.querySelector('#reset').onclick = () => {
    controls.autoRotate = false;
    document.querySelector('#rotate').setAttribute('aria-pressed', 'false');
    setView('reset');
  };
  document.querySelector('#rotate').onclick = (e) => {
    controls.autoRotate = !controls.autoRotate;
    e.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
  };

  new ResizeObserver(() => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(wrap);

  loading.hidden = true;
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    controls.update();
    renderer.render(scene, camera);
  });

  window.addEventListener('pagehide', () => renderer.setAnimationLoop(null));
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });
    }
  });
} catch (error) {
  loading.textContent = '三维预览未能启动，请启用浏览器硬件加速后刷新。模型文件仍可通过上方按钮下载。';
  console.error(error);
}

window.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();window.parent.postMessage({type:'henu-gate-viewer-close'},window.location.origin)}});
