var wmsSource = new ol.source.ImageWMS({
    url: 'https://ahocevar.com/geoserver/wms',
    params: {
        'LAYERS': 'ne:ne'
    },
    crossOrigin: 'anonymous'
});

var wmsLayerAdmin = new ol.layer.Image({source: wmsSource});

var wmsSourceProvince = new ol.source.ImageWMS({
    url: 'http://35.187.226.77:8080/geoserver/i-bitz/wms?',
    params: {
        'LAYERS': 'i-bitz:Province'
    },
    crossOrigin: 'anonymous'
});

var wmsLayerProvince = new ol.layer.Image({source: wmsSourceProvince});

var wmsSourceAmphoe = new ol.source.ImageWMS({
    url: 'http://35.187.226.77:8080/geoserver/i-bitz/wms?',
    params: {
        'LAYERS': 'i-bitz:Amphoe'
    },
    crossOrigin: 'anonymous'
});

var wmsLayerAmphoe = new ol.layer.Image({source: wmsSourceAmphoe});

var wmsSourceDam = new ol.source.ImageWMS({
    url: 'http://35.187.226.77:8080/geoserver/i-bitz/wms',
    params: {
        'LAYERS': 'training:Dam'
    },
    crossOrigin: 'anonymous'
});

var wmsLayerDam = new ol.layer.Image({source: wmsSourceDam});

var view = new ol.View({
    center: ol.proj.fromLonLat([100.4833, 13.7500]),
    zoom: 6
});

var layers = [new ol.layer.Tile({source: new ol.source.OSM()})];

var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});

closer.onclick = function() {
    overlay.setPosition(undefined);
    closer.blur();
    content.innerHTML = '';
    return false;
};

var source = new ol.source.Vector();

var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.2)'}),
        stroke: new ol.style.Stroke({color: '#ffcc33', width: 2}),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({color: '#ffcc33'})
        })
    })
});

var map = new ol.Map({
    controls: ol.control.defaults().extend([new ol.control.FullScreen({source: 'fullscreen'})]),
    overlays: [
        overlay, vector
    ],
    layers: layers,
    target: 'map',
    view: view
});

function showMapLayer(el) {
    checkedLayer = window[el.value];

    if (el.checked) {
        layers.push(checkedLayer);
        map.addLayer(checkedLayer);
    } else {
        var index = layers.indexOf(checkedLayer);
        layers.splice(index, 1);
        map.removeLayer(checkedLayer);
    }
}

var temp = '';
map.on('singleclick', function(evt) {
    var coordinate = evt.coordinate;
    //document.getElementById('info').innerHTML = '';
    var viewResolution =/** @type {number} */
    (view.getResolution());
    var url = wmsSourceTambon.getGetFeatureInfoUrl(evt.coordinate, viewResolution, 'EPSG:3857', {'INFO_FORMAT': 'application/json'});
    if (url) {
        /* document.getElementById('info').innerHTML = '<iframe id="info-iframe" src="' + url + '"></iframe>'; */
        //console.log(url)
        fetch(url).then(function(response) {
            return response.json();
        }).then(function(response) {
            //console.log(myJson);
            temp = response.features[0];
            var features = temp.properties;
            var resHtml = '';
            console.log(temp)
            if (temp) {
                resHtml += '<table class="table table-hover">';
                for (prop in features) {
                    resHtml += '<tr>';
                    resHtml += '<td> ' + prop + ' </td>';
                    resHtml += '<td> ' + features[prop] + ' </td>';
                    resHtml += '<tr>';
                }

                resHtml += '</table>';
                content.innerHTML = resHtml;
                overlay.setPosition(coordinate);
            } else {
                temp = '';
                closer.click();
            }
        });
    }
});

/* map.on('pointermove', function(evt) {
	if (evt.dragging) {
	  return;
	}
	var pixel = map.getEventPixel(evt.originalEvent);
	var hit = map.forEachLayerAtPixel(pixel, function() {
	  return true;
	});
	map.getTargetElement().style.cursor = hit ? 'pointer' : '';
}); */

document.getElementById('export-png').addEventListener('click', function() {
    map.once('postcompose', function(event) {
        var canvas = event.context.canvas;
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
        } else {
            canvas.toBlob(function(blob) {
                saveAs(blob, 'map.png');
            });
        }
    });
    map.renderSync();
});

// Get the modal
var modal = document.getElementById('myModal');

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
    modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

/**
   * Currently drawn feature.
   * @type {ol.Feature}
   */
var sketch;

/**
   * The help tooltip element.
   * @type {Element}
   */
var helpTooltipElement;

/**
   * Overlay to show the help messages.
   * @type {ol.Overlay}
   */
var helpTooltip;

/**
   * The measure tooltip element.
   * @type {Element}
   */
var measureTooltipElement;

/**
   * Overlay to show the measurement.
   * @type {ol.Overlay}
   */
var measureTooltip;

/**
   * Message to show when the user is drawing a polygon.
   * @type {string}
   */
var continuePolygonMsg = 'Click to continue drawing the polygon';

/**
   * Message to show when the user is drawing a line.
   * @type {string}
   */
var continueLineMsg = 'Click to continue drawing the line';

/**
   * Handle pointer move.
   * @param {ol.MapBrowserEvent} evt The event.
   */
var pointerMoveHandler = function(evt) {
    if (evt.dragging) {
        return;
    }
    /** @type {string} */
    var helpMsg = 'Click to start drawing';

    if (sketch) {
        var geom = (sketch.getGeometry());
        if (geom instanceof ol.geom.Polygon) {
            helpMsg = continuePolygonMsg;
        } else if (geom instanceof ol.geom.LineString) {
            helpMsg = continueLineMsg;
        }
    }

    helpTooltipElement.innerHTML = helpMsg;
    helpTooltip.setPosition(evt.coordinate);

    helpTooltipElement.classList.remove('hidden');
};

map.on('pointermove', pointerMoveHandler);

map.getViewport().addEventListener('mouseout', function() {
    helpTooltipElement.classList.add('hidden');
});

var typeSelect = document.getElementById('type');

var draw; // global so we can remove it later

/**
   * Format length output.
   * @param {ol.geom.LineString} line The line.
   * @return {string} The formatted length.
   */
var formatLength = function(line) {
    var length = ol.Sphere.getLength(line);
    var output;
    if (length > 100) {
        output = (Math.round(length / 1000 * 100) / 100) + ' ' + 'km';
    } else {
        output = (Math.round(length * 100) / 100) + ' ' + 'm';
    }
    return output;
};

/**
   * Format area output.
   * @param {ol.geom.Polygon} polygon The polygon.
   * @return {string} Formatted area.
   */
var formatArea = function(polygon) {
    var area = ol.Sphere.getArea(polygon);
    var output;
    if (area > 10000) {
        output = (Math.round(area / 1000000 * 100) / 100) + ' ' + 'km<sup>2</sup>';
    } else {
        output = (Math.round(area * 100) / 100) + ' ' + 'm<sup>2</sup>';
    }
    return output;
};

function addInteraction() {
    var type = (
        typeSelect.value == 'area'
        ? 'Polygon'
        : 'LineString');
    draw = new ol.interaction.Draw({
        source: source,
        type: type,
        style: new ol.style.Style({
            fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.2)'}),
            stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 0, 0.5)',
                lineDash: [
                    10, 10
                ],
                width: 2
            }),
            image: new ol.style.Circle({
                radius: 5,
                stroke: new ol.style.Stroke({color: 'rgba(0, 0, 0, 0.7)'}),
                fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.2)'})
            })
        })
    });
    map.addInteraction(draw);

    createMeasureTooltip();
    createHelpTooltip();

    var listener;
    draw.on('drawstart', function(evt) {
        // set sketch
        sketch = evt.feature;

        /** @type {ol.Coordinate|undefined} */
        var tooltipCoord = evt.coordinate;

        listener = sketch.getGeometry().on('change', function(evt) {
            var geom = evt.target;
            var output;
            if (geom instanceof ol.geom.Polygon) {
                output = formatArea(geom);
                tooltipCoord = geom.getInteriorPoint().getCoordinates();
            } else if (geom instanceof ol.geom.LineString) {
                output = formatLength(geom);
                tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord);
        });
    }, this);

    draw.on('drawend', function() {
        measureTooltipElement.className = 'tooltip tooltip-static';
        measureTooltip.setOffset([0, -7]);
        // unset sketch
        sketch = null;
        // unset tooltip so that a new one can be created
        measureTooltipElement = null;
        createMeasureTooltip();
        ol.Observable.unByKey(listener);
    }, this);
}

/**
   * Creates a new help tooltip
   */
function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'tooltip hidden';
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [
            15, 0
        ],
        positioning: 'center-left'
    });
    map.addOverlay(helpTooltip);
}

/**
   * Creates a new measure tooltip
   */
function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [
            0, -15
        ],
        positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
}

/**
   * Let user change the geometry type.
   */
typeSelect.onchange = function() {
    map.removeInteraction(draw);
    addInteraction();
};

addInteraction();
