// Obteniendo dimensiones de la pantalla
var w = 750;
var h = 600;
var m = w*0.05

var paisSeleccionado = '';

// Agregando un elemento SVG con sus atributos para dibujar el mapa
let svgMapa = d3.select('#viz')
    .append('svg')
        .attr('width',w)
        .attr('height',h)
        .attr('margin',m)
        .attr('id','mapa');

// Agregando un elemento SVG con sus atributos para dibujar el gráfico de barras
let svgBarras = d3.select('#viz')
    .append('svg')
        .attr('width',w)
        .attr('height',h)
        .attr('margin',m)
        .attr('id','barras');

// Leer topojson del mapa
d3.json('map.json', function (error, data) {
    if (error) throw error;

    // Obtiene la data que representa la tierra
    var geometrias = data.objects.Latam.geometries
    var land = topojson.feature(data, {
        type: 'GeometryCollection',
        geometries: geometrias
    });

    // Definiendo como graficar el mapa
    var path = d3.geoPath()
        .projection(d3.geoTransverseMercator()
            .rotate([74 + 30 / 60, -38 - 50 / 60])
            .fitExtent([[m, m], [w - m, h - m]], land));

    // Graficando los países
    svgMapa.selectAll('path')
        .data(land.features)
        .enter().append('path')
        .attr('class', 'tract')
        .attr('d', path)
        .on('click', graficarBarras)
        .append('title')
            .text(function (d) { return d.properties.name; });
    
    //Graficando las fronteras
    svgMapa.append('path')
        .datum(topojson.mesh(data, data.objects.Latam, function (a, b) { return a !== b; }))
        .attr('class', 'tract-border')
        .attr('d', path);

    console.log('Seleccionando un país por defecto');
    graficarBarras(geometrias.sort(compararOrdenGeometrias)[0])
});

// Función encargada de graficar las barras una vez se seleccione un país
function graficarBarras(d){
    console.log(`Se ha seleccionado ${d.properties.name}`);

    // País seleccionado es el mismo, no graficar nuevamente
    if (paisSeleccionado == d.properties.name) {
        console.log(`No se ha graficado, ${d.properties.name} ya estaba seleccionado`);
        return;
    };

    // País seleccionado es diferente, graficar nuevos datos
    console.log(`Graficando datos de ${d.properties.name}`);

    // Guardar en una variable el nombre del país seleccionado
    paisSeleccionado = d.properties.name;

    // Limpiar el SVG donde se grafican las barras para graficar la nueva selección
    svgBarras.html('');

    svgBarras.append('rect')
        .attr('width', Math.floor(Math.random() * 100))
        .attr('height', Math.floor(Math.random() * 100));
}

// Función para ordenar las geometrías por el nombre del país
// El país por defecto será el primero devuelto en orden dado por esta función
function compararOrdenGeometrias(a,b){
    if ( a.properties.name < b.properties.name ) return -1;
    if ( a.properties.name > b.properties.name ) return 1;
    return 0;
}