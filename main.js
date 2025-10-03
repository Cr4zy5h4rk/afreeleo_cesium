import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
  timeline: true,
  animation: true,
});

// For a simple demo, let's create a basic satellite entity
const satelliteEntity = viewer.entities.add({
  name: "AFREELEO Satellite",
  position: Cesium.Cartesian3.fromDegrees(-17.4, 14.7, 400000), // Dakar launch, 400km altitude

  model: {
    uri: "./satellite_modul.glb",
    minimumPixelSize: 64,
    maximumScale: 20000,
    scale: 10000,
  },

  label: {
    text: "AFREELEO",
    font: "14pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -40),
    fillColor: Cesium.Color.CYAN,
  },

  path: {
    resolution: 1,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.1,
      color: Cesium.Color.CYAN,
    }),
    width: 3,
  },
});

// Add Dakar launch site marker
viewer.entities.add({
  name: "Dakar Launch Site",
  position: Cesium.Cartesian3.fromDegrees(-17.477989, 14.733128),
  point: {
    pixelSize: 15,
    color: Cesium.Color.YELLOW,
  },
  label: {
    text: "Dakar Launch Site",
    font: "12pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20),
  },
});

// Create orbital path
const positions = [];
const startTime = Cesium.JulianDate.now();
const totalSeconds = 5400; // 90 minutes orbit

for (let i = 0; i <= totalSeconds; i += 60) {
  const time = Cesium.JulianDate.addSeconds(startTime, i, new Cesium.JulianDate());
  const angle = (i / totalSeconds) * Math.PI * 2;
  const longitude = -17.4 + Math.cos(angle) * 30;
  const latitude = 14.7 + Math.sin(angle) * 20 * Math.cos(0.257); // 14.7° inclination
  positions.push(Cesium.Cartesian3.fromDegrees(longitude, latitude, 400000));
}

// Add orbital path visualization
viewer.entities.add({
  polyline: {
    positions: positions,
    width: 2,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.2,
      color: Cesium.Color.CYAN.withAlpha(0.5),
    }),
  },
});

// Set camera view to Dakar area
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(-17.4, 14.7, 3000000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0.0,
  },
  duration: 3,
});

console.log("AFREELEO Mission Simulator loaded successfully!");
