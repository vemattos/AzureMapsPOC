const subscriptionKey = '8kiYyBoWlFM84MOs1Yy5k7JM1mwzXNfuasBxiIKFBupnsDkSh0luJQQJ99BJACYeBjFKvTHPAAAgAZMP3XE8';

let map, datasource, routeDatasource;

function initializeMap() {
  map = new atlas.Map('map', {
    center: [-49.07, -26.92],
    zoom: 12,
    authOptions: {
      authType: 'subscriptionKey',
      subscriptionKey: subscriptionKey
    }
  });

  map.events.add('ready', () => {
    datasource = new atlas.source.DataSource();
    map.sources.add(datasource);
    map.layers.add(new atlas.layer.SymbolLayer(datasource, null));

    routeDatasource = new atlas.source.DataSource();
    map.sources.add(routeDatasource);
    map.layers.add(new atlas.layer.LineLayer(routeDatasource, null, {
      strokeColor: '#0078D4',
      strokeWidth: 5
    }));
  });
}

async function procurarEndereco() {
  const query = document.getElementById('searchBox').value;
  const routeInfo = document.getElementById('route-info');
  if (!query) return alert("Digite um endereço!");

  routeInfo.classList.add('hidden');

  const response = await fetch(
    `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${subscriptionKey}&query=${encodeURIComponent(query)}`
  );
  const data = await response.json();

  if (data.results.length > 0) {
    const result = data.results[0];
    const position = result.position;
    datasource.clear();
    routeDatasource.clear();

    const point = new atlas.data.Feature(new atlas.data.Point([position.lon, position.lat]));
    datasource.add(point);
    map.setCamera({ center: [position.lon, position.lat], zoom: 14 });
  } else {
    alert("Endereço não encontrado.");
  }
}

async function tracarRota() {
  const origem = document.getElementById('origin').value;
  const destino = document.getElementById('destination').value;
  const routeInfo = document.getElementById('route-info');
  const distanceElem = document.getElementById('distance');
  const durationElem = document.getElementById('duration');

  if (!origem || !destino) return alert("Digite origem e destino!");

  routeInfo.classList.add('hidden');

  try {
    const origemRes = await fetch(`https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${subscriptionKey}&query=${encodeURIComponent(origem)}`);
    const origemData = await origemRes.json();
    if (!origemData.results.length) return alert("Origem não encontrada!");
    const origemPos = origemData.results[0].position;

    const destinoRes = await fetch(`https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${subscriptionKey}&query=${encodeURIComponent(destino)}`);
    const destinoData = await destinoRes.json();
    if (!destinoData.results.length) return alert("Destino não encontrada!");
    const destinoPos = destinoData.results[0].position;

    const rotaRes = await fetch(`https://atlas.microsoft.com/route/directions/json?subscription-key=${subscriptionKey}&api-version=1.0&query=${origemPos.lat},${origemPos.lon}:${destinoPos.lat},${destinoPos.lon}`);
    const rotaData = await rotaRes.json();

    if (rotaData.routes && rotaData.routes.length > 0) {
      const rota = rotaData.routes[0];
      const coordinates = rota.legs[0].points.map(p => [p.longitude, p.latitude]);

      routeDatasource.clear();
      datasource.clear();

      routeDatasource.add(new atlas.data.Feature(new atlas.data.LineString(coordinates)));
      datasource.add([
        new atlas.data.Feature(new atlas.data.Point([origemPos.lon, origemPos.lat])),
        new atlas.data.Feature(new atlas.data.Point([destinoPos.lon, destinoPos.lat]))
      ]);

      const midLat = (origemPos.lat + destinoPos.lat) / 2;
      const midLon = (origemPos.lon + destinoPos.lon) / 2;

      const dist = Math.sqrt(Math.pow(origemPos.lat - destinoPos.lat, 2) + Math.pow(origemPos.lon - destinoPos.lon, 2));
      let zoom = 10;
      if (dist < 0.2) zoom = 13;
      else if (dist < 1) zoom = 11;
      else if (dist < 5) zoom = 9;
      else zoom = 7;

      map.setCamera({
        center: [midLon, midLat],
        zoom: zoom,
        type: 'ease',
        duration: 1500
      });

      const distanciaKm = (rota.summary.lengthInMeters / 1000).toFixed(2);
      const duracaoMin = Math.round(rota.summary.travelTimeInSeconds / 60);
      const duracaoHoras = Math.round(duracaoMin / 60);

      distanceElem.textContent = `${distanciaKm}km`;
      if (duracaoMin < 60) {
        durationElem.textContent = `${duracaoMin}min`;
      } else if (duracaoMin % 60 === 0) {
        durationElem.textContent = `${duracaoHoras}hr`;
      } else {
        const duracaoMinRestantes = duracaoMin % 60;
        durationElem.textContent = `${duracaoHoras}hr${duracaoMinRestantes}min`;
      }

      routeInfo.classList.remove('hidden');
    } else {
      alert("Não foi possível traçar a rota.");
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao buscar rota. Verifique sua conexão ou chave de API.");
  }
}


initializeMap();
