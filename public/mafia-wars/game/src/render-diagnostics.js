function geometryByteLength(geometry) {
  const arrays = new Set();
  for (const attribute of Object.values(geometry.attributes || {})) {
    if (attribute?.array?.byteLength) arrays.add(attribute.array);
  }
  if (geometry.index?.array?.byteLength) arrays.add(geometry.index.array);
  for (const attributes of Object.values(geometry.morphAttributes || {})) {
    for (const attribute of attributes) {
      if (attribute?.array?.byteLength) arrays.add(attribute.array);
    }
  }
  let bytes = 0;
  for (const array of arrays) bytes += array.byteLength;
  return bytes;
}

export function estimateTextureBytes(texture) {
  const image = texture?.image || texture?.source?.data;
  const width = image?.width || image?.naturalWidth || image?.videoWidth || 0;
  const height = image?.height || image?.naturalHeight || image?.videoHeight || 0;
  if (!width || !height) return 0;
  return Math.ceil(width * height * 4 * (texture.generateMipmaps ? 4 / 3 : 1));
}

export function collectSceneRenderMetrics(scene) {
  const geometries = new Set();
  const visibleGeometries = new Set();
  const textures = new Set();
  const visibleTextures = new Set();
  let meshes = 0;
  let visibleMeshes = 0;
  let terrain = 0;
  let visibleTerrain = 0;
  let buildings = 0;
  let visibleBuildings = 0;

  scene.traverse((object) => {
    if (!object.isMesh && !object.isSprite && !object.isPoints && !object.isLine) return;
    const visible = (() => {
      for (let current = object; current; current = current.parent) {
        if (!current.visible) return false;
        if (current === scene) break;
      }
      return true;
    })();
    const name = object.name || '';
    const isTerrain = /ground|road|sidewalk|terrain|lot/i.test(name);
    const isBuilding = /building|house|apartment|kit_/i.test(name);

    meshes++;
    if (visible) visibleMeshes++;
    if (isTerrain) {
      terrain++;
      if (visible) visibleTerrain++;
    }
    if (isBuilding) {
      buildings++;
      if (visible) visibleBuildings++;
    }
    if (object.geometry) {
      geometries.add(object.geometry);
      if (visible) visibleGeometries.add(object.geometry);
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          textures.add(value);
          if (visible) visibleTextures.add(value);
        }
        else if (Array.isArray(value)) {
          for (const item of value) {
            if (!item?.isTexture) continue;
            textures.add(item);
            if (visible) visibleTextures.add(item);
          }
        }
      }
      for (const uniform of Object.values(material.uniforms || {})) {
        const value = uniform?.value;
        if (value?.isTexture) {
          textures.add(value);
          if (visible) visibleTextures.add(value);
        }
        else if (Array.isArray(value)) {
          for (const item of value) {
            if (!item?.isTexture) continue;
            textures.add(item);
            if (visible) visibleTextures.add(item);
          }
        }
      }
    }
  });

  const geometryBytes = (items) => [...items].reduce((total, geometry) => total + geometryByteLength(geometry), 0);
  const textureBytes = (items) => [...items].reduce((total, texture) => total + estimateTextureBytes(texture), 0);
  return {
    meshes,
    visibleMeshes,
    terrain,
    visibleTerrain,
    buildings,
    visibleBuildings,
    geometries: geometries.size,
    geometryBytes: geometryBytes(geometries),
    visibleGeometryBytes: geometryBytes(visibleGeometries),
    textures: textures.size,
    estimatedTextureBytes: textureBytes(textures),
    estimatedVisibleTextureBytes: textureBytes(visibleTextures),
  };
}

export function createRendererDiagnostics({
  canvas,
  renderer,
  scene,
  camera,
  buildId,
  diagnosticsBuildId,
  getWorldState,
  enabled = false,
}) {
  if (!enabled) return { frame() {}, snapshot: () => null, dispose() {} };

  let contextLosses = 0;
  let contextRestorations = 0;
  let contextState = 'available';
  let preventedLastLoss = null;
  let lastContextLostAt = null;
  let lastContextRestoredAt = null;
  let visibilityChanges = 0;
  let lastVisibilityChangeAt = null;
  let lastFrameAt = 0;
  let lastFrameMs = 0;
  let lastPanelUpdate = 0;
  const frameIntervals = [];
  const button = document.createElement('button');
  const panel = document.createElement('pre');
  button.type = 'button';
  button.textContent = 'RENDER DIAGNOSTICS';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'nerdieRenderDiagnosticsPanel');
  panel.id = 'nerdieRenderDiagnosticsPanel';
  button.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;padding:8px 10px;border:1px solid #d7ad58;border-radius:8px;background:#10151fee;color:#f5d78b;font:700 11px monospace';
  panel.hidden = true;
  panel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:48px;z-index:2147483646;max-height:45vh;overflow:auto;margin:0;padding:10px;border:1px solid #d7ad58;border-radius:8px;background:#10151fee;color:#fff;font:10px/1.4 monospace;white-space:pre-wrap;pointer-events:none';
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.body.append(button, panel);

  const onContextLost = (event) => {
    contextLosses++;
    preventedLastLoss = event.defaultPrevented;
    lastContextLostAt = new Date().toISOString();
    contextState = event.defaultPrevented ? 'lost (restoration allowed)' : 'lost (not prevented)';
  };
  const onContextRestored = () => {
    contextRestorations++;
    lastContextRestoredAt = new Date().toISOString();
    contextState = 'restored';
  };
  const onCreationError = () => { contextState = 'creation error'; };
  const onVisibility = () => {
    visibilityChanges++;
    lastVisibilityChangeAt = new Date().toISOString();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  canvas.addEventListener('webglcontextcreationerror', onCreationError);
  document.addEventListener('visibilitychange', onVisibility);

  function snapshot() {
    const gl = renderer.getContext();
    const info = renderer.info;
    const world = getWorldState?.() || {};
    const metrics = collectSceneRenderMetrics(scene);
    return {
      buildId,
      diagnosticsBuildId,
      context: {
        state: gl.isContextLost() ? 'lost' : contextState,
        losses: contextLosses,
        restorations: contextRestorations,
        preventedLastLoss,
        lastLostAt: lastContextLostAt,
        lastRestoredAt: lastContextRestoredAt,
      },
      renderer: {
        engine: canvas.dataset.engine || 'unknown',
        size: `${canvas.width}x${canvas.height}`,
        dpr: renderer.getPixelRatio(),
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        estimatedGeometryBytes: metrics.geometryBytes,
        estimatedVisibleGeometryBytes: metrics.visibleGeometryBytes,
        estimatedUncompressedTextureBytes: metrics.estimatedTextureBytes,
        estimatedVisibleUncompressedTextureBytes: metrics.estimatedVisibleTextureBytes,
      },
      scene: {
        meshes: metrics.meshes,
        visibleMeshes: metrics.visibleMeshes,
        terrain: `${metrics.visibleTerrain}/${metrics.terrain}`,
        buildings: `${metrics.visibleBuildings}/${metrics.buildings}`,
      },
      world,
      camera: {
        x: +camera.position.x.toFixed(2),
        y: +camera.position.y.toFixed(2),
        z: +camera.position.z.toFixed(2),
        near: camera.near,
        far: camera.far,
      },
      frame: {
        fps: frameIntervals.length ? +(1000 / (frameIntervals.reduce((a, b) => a + b, 0) / frameIntervals.length)).toFixed(1) : 0,
        latestMs: +lastFrameMs.toFixed(2),
      },
      visibility: document.visibilityState,
      visibilityChanges,
      lastVisibilityChangeAt,
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
      note: 'Resource byte counts are source-data estimates, not measured GPU VRAM; visible means object visibility, not frustum visibility.',
    };
  }

  function frame(now) {
    if (lastFrameAt) {
      lastFrameMs = now - lastFrameAt;
      frameIntervals.push(lastFrameMs);
      if (frameIntervals.length > 60) frameIntervals.shift();
    }
    lastFrameAt = now;
    if (now - lastPanelUpdate < 1000) return;
    lastPanelUpdate = now;
    if (!panel.hidden) panel.textContent = JSON.stringify(snapshot(), null, 2);
  }

  return {
    frame,
    snapshot,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      canvas.removeEventListener('webglcontextcreationerror', onCreationError);
      document.removeEventListener('visibilitychange', onVisibility);
      button.remove();
      panel.remove();
    },
  };
}
