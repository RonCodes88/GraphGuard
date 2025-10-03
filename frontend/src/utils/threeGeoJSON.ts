import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";

interface DrawThreeGeoOptions {
  json: any;
  radius: number;
  materialOptions?: any;
}

export function drawThreeGeo({ json, radius, materialOptions }: DrawThreeGeoOptions) {
  const container = new THREE.Object3D();
  container.userData.update = (t: number) => {
    for (let i = 0; i < container.children.length; i++) {
      container.children[i].userData.update?.(t);
    }
  }

  container.rotation.x = -Math.PI * 0.5;
  let featureIndex = 0;
  const x_values: number[] = [];
  const y_values: number[] = [];
  const z_values: number[] = [];
  const json_geom = createGeometryArray(json);

  let coordinate_array: number[][] = [];
  for (let geom_num = 0; geom_num < json_geom.length; geom_num++) {
    const currentFeature = json_geom[geom_num];
    const featureData = {
      ...currentFeature.properties,
      featureIndex: featureIndex++
    };
    
    if (currentFeature.geometry.type == 'Point') {
      convertToSphereCoords(currentFeature.geometry.coordinates, radius);
      drawParticle(x_values[0], y_values[0], z_values[0], materialOptions);

    } else if (currentFeature.geometry.type == 'MultiPoint') {
      for (let point_num = 0; point_num < currentFeature.geometry.coordinates.length; point_num++) {
        convertToSphereCoords(currentFeature.geometry.coordinates[point_num], radius);
        drawParticle(x_values[0], y_values[0], z_values[0], materialOptions);
      }

    } else if (currentFeature.geometry.type == 'LineString') {
      coordinate_array = createCoordinateArray(currentFeature.geometry.coordinates);

      for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
        convertToSphereCoords(coordinate_array[point_num], radius);
      }
      drawLine(x_values, y_values, z_values, materialOptions, featureData);

    } else if (currentFeature.geometry.type == 'Polygon') {
      for (let segment_num = 0; segment_num < currentFeature.geometry.coordinates.length; segment_num++) {
        coordinate_array = createCoordinateArray(currentFeature.geometry.coordinates[segment_num]);

        for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
          convertToSphereCoords(coordinate_array[point_num], radius);
        }
        drawLine(x_values, y_values, z_values, materialOptions, featureData);
      }

    } else if (currentFeature.geometry.type == 'MultiLineString') {
      for (let segment_num = 0; segment_num < currentFeature.geometry.coordinates.length; segment_num++) {
        coordinate_array = createCoordinateArray(currentFeature.geometry.coordinates[segment_num]);

        for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
          convertToSphereCoords(coordinate_array[point_num], radius);
        }
        drawLine(x_values, y_values, z_values, materialOptions, featureData);
      }

    } else if (currentFeature.geometry.type == 'MultiPolygon') {
      for (let polygon_num = 0; polygon_num < currentFeature.geometry.coordinates.length; polygon_num++) {
        for (let segment_num = 0; segment_num < currentFeature.geometry.coordinates[polygon_num].length; segment_num++) {
          coordinate_array = createCoordinateArray(currentFeature.geometry.coordinates[polygon_num][segment_num]);

          for (let point_num = 0; point_num < coordinate_array.length; point_num++) {
            convertToSphereCoords(coordinate_array[point_num], radius);
          }
          drawLine(x_values, y_values, z_values, materialOptions, featureData);
        }
      }
    }
  }

  function createGeometryArray(json: any) {
    let geometry_array = [];

    if (json.type == 'Feature') {
      geometry_array.push({ geometry: json.geometry, properties: json.properties });
    } else if (json.type == 'FeatureCollection') {
      for (let feature_num = 0; feature_num < json.features.length; feature_num++) {
        geometry_array.push({ 
          geometry: json.features[feature_num].geometry,
          properties: json.features[feature_num].properties 
        });
      }
    } else if (json.type == 'GeometryCollection') {
      for (let geom_num = 0; geom_num < json.geometries.length; geom_num++) {
        geometry_array.push({ geometry: json.geometries[geom_num], properties: {} });
      }
    } else {
      throw new Error('The geoJSON is not valid.');
    }
    return geometry_array;
  }

  function createCoordinateArray(feature: number[][]) {
    const temp_array = [];
    let interpolation_array: number[][] = [];

    for (let point_num = 0; point_num < feature.length; point_num++) {
      const point1 = feature[point_num];
      const point2 = feature[point_num - 1];

      if (point_num > 0) {
        if (needsInterpolation(point2, point1)) {
          interpolation_array = [point2, point1];
          interpolation_array = interpolatePoints(interpolation_array);

          for (let inter_point_num = 0; inter_point_num < interpolation_array.length; inter_point_num++) {
            temp_array.push(interpolation_array[inter_point_num]);
          }
        } else {
          temp_array.push(point1);
        }
      } else {
        temp_array.push(point1);
      }
    }
    return temp_array;
  }

  function needsInterpolation(point2: number[], point1: number[]) {
    const lon1 = point1[0];
    const lat1 = point1[1];
    const lon2 = point2[0];
    const lat2 = point2[1];
    const lon_distance = Math.abs(lon1 - lon2);
    const lat_distance = Math.abs(lat1 - lat2);

    if (lon_distance > 5 || lat_distance > 5) {
      return true;
    } else {
      return false;
    }
  }

  function interpolatePoints(interpolation_array: number[][]): number[][] {
    let temp_array: number[][] = [];
    let point1, point2;

    for (let point_num = 0; point_num < interpolation_array.length - 1; point_num++) {
      point1 = interpolation_array[point_num];
      point2 = interpolation_array[point_num + 1];

      if (needsInterpolation(point2, point1)) {
        temp_array.push(point1);
        temp_array.push(getMidpoint(point1, point2));
      } else {
        temp_array.push(point1);
      }
    }

    temp_array.push(interpolation_array[interpolation_array.length - 1]);

    if (temp_array.length > interpolation_array.length) {
      temp_array = interpolatePoints(temp_array);
    } else {
      return temp_array;
    }
    return temp_array;
  }

  function getMidpoint(point1: number[], point2: number[]) {
    const midpoint_lon = (point1[0] + point2[0]) / 2;
    const midpoint_lat = (point1[1] + point2[1]) / 2;
    const midpoint = [midpoint_lon, midpoint_lat];

    return midpoint;
  }

  function convertToSphereCoords(coordinates_array: number[], sphere_radius: number) {
    const lon = coordinates_array[0];
    const lat = coordinates_array[1];

    x_values.push(Math.cos(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180) * sphere_radius);
    y_values.push(Math.cos(lat * Math.PI / 180) * Math.sin(lon * Math.PI / 180) * sphere_radius);
    z_values.push(Math.sin(lat * Math.PI / 180) * sphere_radius);
  }

  function drawParticle(x: number, y: number, z: number, options: any) {
    let geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([x, y, z], 3)
    );

    const particle_material = new THREE.PointsMaterial(options);
    const particle = new THREE.Points(geo, particle_material);
    container.add(particle);

    clearArrays();
  }

  function drawLine(x_values: number[], y_values: number[], z_values: number[], options: any, featureData?: any) {
    const lineGeo = new LineGeometry();
    const verts = [];
    for (let i = 0; i < x_values.length; i++) {
      verts.push(x_values[i], y_values[i], z_values[i]);
    }
    lineGeo.setPositions(verts);
    let hue = 0.3 + Math.random() * 0.2;
    if (Math.random() > 0.5) {
      hue -= 0.3;
    }
    const color = new THREE.Color().setHSL(hue, 1.0, 0.5);
    const lineMaterial = new LineMaterial({
      color: color.getHex(),
      linewidth: 0.002,
      worldUnits: true,
    });
    lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

    const line = new Line2(lineGeo, lineMaterial);
    line.computeLineDistances();
    const rate = Math.random() * 0.0002;
    
    // Store feature data and original color for hover effects
    line.userData.featureData = featureData;
    line.userData.originalColor = color.getHex();
    line.userData.isHoverable = true;
    
    line.userData.update = (t: number) => {
      lineMaterial.dashOffset = t * rate;
    }
    container.add(line);

    clearArrays();
  }

  function clearArrays() {
    x_values.length = 0;
    y_values.length = 0;
    z_values.length = 0;
  }

  return container;
}

