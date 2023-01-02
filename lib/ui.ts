import L from "leaflet";
import "leaflet-control-geocoder";

const leafletMap = L.map("map", {
  zoomSnap: 0,
  zoomControl: false,
}).setView({ lat: 37.500258, lng: -77.49663 }, 15);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(leafletMap);

L.Control.geocoder().addTo(leafletMap).setPosition("topleft");

const message = document.getElementById("message")!;

addEventListener("message", (evt) => {
  switch (evt.data?.pluginMessage?.type) {
    case "ratio": {
      const { width, height } = evt.data?.pluginMessage || {};
      setRatio(width, height);
      break;
    }
    case "message": {
      message.innerHTML = evt.data?.pluginMessage?.message;
      message.className = evt.data?.pluginMessage?.className || "";
      break;
    }
    case "fatal-error": {
      message.innerHTML = evt.data?.pluginMessage?.message;
      message.className = "";
      break;
    }
  }
});

document.getElementById("capture")!.onclick = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "render-map",
        bbox: leafletMap.getBounds().toBBoxString(),
      },
    },
    "*"
  );
};

function setRatio(width: number, height: number) {
  const map = document.getElementById("map")!;
  map.style.height = `${(
    map.getBoundingClientRect().width * (height / width) +
    30
  ).toFixed(3)}px`;
  leafletMap.invalidateSize();
}
