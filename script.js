Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0NDUyYWFkZC0zOGEzLTQ3N2QtYjAxMC1iZWY1NDg0NDZiNDkiLCJpZCI6MzkyMDMxLCJpYXQiOjE3NzE1MTc2OTF9.pd3vujDpfl4fv0VgWsFHWn6ypFjqmTrLmX5dWkKm33I';

const viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    animation: false,
    timeline: false,
    infoBox: false,
    selectionIndicator: false
});

viewer.scene.globe.enableLighting = false;

// Fokus awal
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
        107.6357248550467,
        -6.897560133094622,
        500.0
    )
});

const geoServerUrl =
    'http://localhost:8080/geoserver/icavim/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=icavim:titik_wisata&outputFormat=application/json';

Cesium.GeoJsonDataSource.load(geoServerUrl)
    .then(function (dataSource) {
        viewer.dataSources.add(dataSource);

        const entities = dataSource.entities.values;

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            const props = entity.properties || {};

            const nama = props.nama ? props.nama.getValue(Cesium.JulianDate.now()) : 'Tanpa Nama';
            const modelPath = props.url_model_3d
                ? props.url_model_3d.getValue(Cesium.JulianDate.now())
                : null;

            const heading = props.heading
                ? Number(props.heading.getValue(Cesium.JulianDate.now())) || 0
                : 0;

            const tinggiManual = props.tinggi_manual
                ? Number(props.tinggi_manual.getValue(Cesium.JulianDate.now())) || 0
                : 0;

            let finalPosition = entity.position
                ? entity.position.getValue(viewer.clock.currentTime)
                : null;

            if (!finalPosition) {
                console.warn('Entity tidak memiliki posisi:', entity);
                continue;
            }

            const cartographic = Cesium.Cartographic.fromCartesian(finalPosition);

            finalPosition = Cesium.Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                (cartographic.height || 0) + tinggiManual
            );

            entity.position = finalPosition;

            if (modelPath) {
                const hpr = Cesium.HeadingPitchRoll.fromDegrees(heading, 0, 0);
                entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
                    finalPosition,
                    hpr
                );

                entity.model = {
                    uri: modelPath,
                    minimumPixelSize: 32,
                    maximumScale: 200,
                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                };

                entity.billboard = undefined;
            } else {
                entity.billboard = {
                    image: 'https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Widgets/Images/NavigationHelp/MouseLeft.svg',
                    width: 32,
                    height: 32,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM
                };
            }

            entity.label = {
                text: nama,
                font: '14pt sans-serif',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 2,
                showBackground: true,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, 20),
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            };
        }
    })
    .catch(function (error) {
        console.error('Error memuat data WFS:', error);
    });
