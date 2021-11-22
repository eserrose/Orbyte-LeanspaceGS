window.CESIUM_BASE_URL =  require('path').join(__dirname, "src/static/Cesium/");
const Cesium = require('cesium');
const dayjs  = require('dayjs');
import { SatelliteManager } from "./SatelliteManager.js";

export function setCesiumApiKey(key){
    Cesium.Ion.defaultAccessToken = key;
}

export class CesiumController {
    constructor(options){

        this.viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: Cesium.createWorldTerrain(),
            imageryProvider: this.createImageryProvider().provider,
            baseLayerPicker: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            scene3DOnly: true,
            sceneModePicker: false,
            contextOptions: {
                webgl: {
                  alpha: true,
                },
              },
            ...options
            //imageryProvider: false //this is from ion. you should remove them and find something else (i.e. mapbox for completely free use)
          }); 

        this.viewer._cesiumWidget._creditContainer.style.display = "none"; //remove logo
        this.viewer.clock.shouldAnimate = true;
        this.viewer.scene.globe.enableLighting = true;
        this.viewer.scene.highDynamicRange = true;
        this.viewer.scene.maximumRenderTimeChange = 1 / 30;
        this.viewer.scene.requestRenderMode = true;

        // CesiumController config
        this.imageryProviders = ["Ion"];
        this.terrainProviders = ["None", "Maptiler", "Cesium"];
        this.cameraModes = ["Fixed", "Inertial"];

         // Create Satellite Manager
        this.sats = new SatelliteManager(this.viewer);

        return this;
    }

    set imageryProvider(imageryProviderName) {
        if (!this.imageryProviders.includes(imageryProviderName)) {
          return;
        }
        const layers = this.viewer.scene.imageryLayers;
        layers.removeAll();
        layers.addImageryProvider(this.createImageryProvider(imageryProviderName).provider);
    }

    get imageryProvider(){
        return this.viewer._imageryProvider;
    }

    clearImageryLayers() {
        this.viewer.scene.imageryLayers.removeAll();
    }
    
    addImageryLayer(imageryProviderName, alpha) {
        if (!this.imageryProviders.includes(imageryProviderName)) {
            return;
        }

        const layers = this.viewer.scene.imageryLayers;
        const imagery = this.createImageryProvider(imageryProviderName);
        const layer = layers.addImageryProvider(imagery.provider);
        if (typeof alpha === "undefined") {
            layer.alpha = imagery.alpha;
        } else {
            layer.alpha = alpha;
        }
    }
    
    createImageryProvider() {
        let alpha = 1;
        let provider = new Cesium.IonImageryProvider({ assetId : 2 });

        return { provider, alpha };
    }

    set terrainProvider(terrainProviderName) {
        if (!this.terrainProviders.includes(terrainProviderName)) {
          return;
        }
    
        switch (terrainProviderName) {
          case "None":
            this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            break;
          case "Maptiler":
            this.viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
              url: "https://api.maptiler.com/tiles/terrain-quantized-mesh/?key=8urAyLJIrn6TeDtH0Ubh",
              credit: "<a href=\"https://www.maptiler.com/copyright/\" target=\"_blank\">© MapTiler</a> <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">© OpenStreetMap contributors</a>",
              requestVertexNormals: true,
            });
            break;
          case "ArcGIS":
            this.viewer.terrainProvider = new Cesium.ArcGISTiledElevationTerrainProvider({
              url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
            });
            break;
          case "Cesium":
            this.viewer.terrainProvider = new Cesium.createWorldTerrain();
            break;
          default:
            console.error("Unknown terrain provider");
        }
    }

    set cameraMode(cameraMode) {
        switch (cameraMode) {
            case "Inertial":
            this.viewer.scene.postUpdate.addEventListener(this.cameraTrackEci);
            break;
            case "Fixed":
            this.viewer.scene.postUpdate.removeEventListener(this.cameraTrackEci);
            break;
            default:
            console.error("Unknown camera mode");
        }
    }

    cameraTrackEci(scene, time) {
        if (scene.mode !== Cesium.SceneMode.SCENE3D) {
          return;
        }
    
        const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
        if (Cesium.defined(icrfToFixed)) {
          const { camera } = scene;
          const offset = Cesium.Cartesian3.clone(camera.position);
          const transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
          camera.lookAtTransform(transform, offset);
        }
    }

    setTime(current, start = dayjs.utc(current).subtract(12, "hour").toISOString(), stop = dayjs.utc(current).add(7, "day").toISOString()) {
        this.viewer.clock.startTime = Cesium.JulianDate.fromIso8601(dayjs.utc(start).toISOString());
        this.viewer.clock.stopTime = Cesium.JulianDate.fromIso8601(dayjs.utc(stop).toISOString());
        this.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(dayjs.utc(current).toISOString());
        if (typeof this.viewer.timeline !== "undefined") {
          this.viewer.timeline.updateFromClock();
          this.viewer.timeline.zoomTo(this.viewer.clock.startTime, this.viewer.clock.stopTime);
        }
    }

    setGroundStationFromLatLon(latlon) {
        const [latitude, longitude, height] = latlon.split(",");
        if (!latitude || !longitude) {
          return;
        }
        const coordinates = {};
        coordinates.longitude = parseFloat(longitude);
        coordinates.latitude  = parseFloat(latitude);
        coordinates.height = 0;
        if (height) {
          coordinates.height = parseFloat(height);
        }
        coordinates.cartesian = Cesium.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.height);
        this.sats.setGroundStation(coordinates);
    }

    addSatellite(tle, name, properties){
      this.sats.enableTag(name)
      this.sats.addFromTle(tle, [name], properties)
    }

    trackEntity(name){
     this.sats.trackedSatellite = name;
    }
}