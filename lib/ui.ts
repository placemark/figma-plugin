import * as L from "leaflet";
import GeocoderControl from "leaflet-control-geocoder";
import { fileOpen } from "browser-fs-access";
import { check } from "@placemarkio/check-geojson";

const mapElement = document.getElementById("map")!;

const leafletMap = L.map(mapElement, {
  zoomSnap: 0,
  zoomControl: false,
}).setView({ lat: 37.500258, lng: -77.49663 }, 15);

const layersControl = L.control.layers({}, {});

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(leafletMap);

new GeocoderControl({
  defaultMarkGeocode: false,
})
  .on("markgeocode", function (e: any) {
    var bbox = e.geocode.bbox;
    leafletMap.fitBounds(bbox);
  })
  .addTo(leafletMap)
  .setPosition("topleft");

leafletMap.on("moveend", () => {
  const bbox = leafletMap.getBounds().toBBoxString();
  const center = leafletMap.getCenter();
  const zoom = leafletMap.getZoom();
  parent.postMessage(
    {
      pluginMessage: {
        type: "save-viewport",
        bbox,
      },
    },
    "*"
  );
  document.body.dispatchEvent(
    new CustomEvent("saveviewport", {
      detail: {
        bbox,
        openstreetmap_url: `https://www.openstreetmap.org/#map=${zoom}/${center.lat}/${center.lng}`,
        google_url: `https://www.google.com/maps?ll=${center.lat},${center.lng}&hl=en&t=m&z=${zoom}`,
      },
    })
  );
});

addEventListener("message", (evt) => {
  switch (evt.data?.pluginMessage?.type) {
    case "loaded": {
      captureButton.classList.remove("loading");
      break;
    }
    case "ratio": {
      const { width, height } = evt.data?.pluginMessage || {};
      setRatio(width, height);
      break;
    }
    case "settings": {
      try {
        for (const [name, value] of Object.entries(
          evt.data.pluginMessage.settings
        )) {
          const input = document.body.querySelector(`[name=${name}]`);
          if (input) {
            if ("value" in input) {
              input.value = value;
            }
            if ("checked" in input) {
              input.checked = value === "on";
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
      break;
    }
    case "recover-viewport": {
      const { bbox } = evt.data?.pluginMessage || {};
      const [w, s, e, n] = bbox
        .split(",")
        .map((str: string) => parseFloat(str));
      leafletMap.fitBounds([
        [s, w],
        [n, e],
      ]);
      break;
    }
  }
});

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      resolve(evt.target!.result as string);
    };
    reader.readAsText(file);
  });
}

document.getElementById("add-overlay")!.onclick = () => {
  fileOpen({})
    .then((file) => {
      return readFile(file).then((contents) => {
        const geojson = check(contents);
        const layer = L.geoJson(geojson, {
          pointToLayer(_geojsonPoint, latlng) {
            return L.circleMarker(latlng, { radius: 3 });
          },
        });
        (layer as any).name = file.name;
        layer.addTo(leafletMap);
        layersControl.addOverlay(layer, file.name);
        // This is hopefully idempotent
        layersControl.addTo(leafletMap);
      });
    })
    .catch((e) => {
      console.error(e);
      alert("Failed to add overlay");
    });
};

const captureButton = document.getElementById("capture")!;

captureButton.onclick = () => {
  captureButton.classList.add("loading");

  let overlays: any[] = [];

  leafletMap.eachLayer((layer) => {
    if (layer instanceof L.GeoJSON) {
      overlays.push({
        geojson: layer.toGeoJSON(),
        name: (layer as any).name,
      });
    }
  });

  parent.postMessage(
    {
      pluginMessage: {
        type: "render-map",
        bbox: leafletMap.getBounds().toBBoxString(),
        overlays,
      },
    },
    "*"
  );
};

function setRatio(width: number, height: number) {
  const map = document.getElementById("map")!;
  map.style.height = `${(
    map.getBoundingClientRect().width *
    (height / width)
  ).toFixed(3)}px`;
  leafletMap.invalidateSize();
}

for (const elem of Array.from(document.querySelectorAll("[data-setting]"))) {
  elem.addEventListener("change", (e) => {
    if (!e.target) return;
    const target = e.target as HTMLInputElement;
    parent.postMessage(
      {
        pluginMessage: {
          type: "setting",
          name: target.name,
          value: target.value,
        },
      },
      "*"
    );
  });
}
