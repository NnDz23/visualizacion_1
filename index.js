// Obtener la posición del mouse para mostrar tooltip
let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

let aniosMostrar = 2;

// Obteniendo dimensiones de la pantalla
let w = 750;
let h = 600;
let m = w*0.05
let s = 5;

let paisSeleccionado = '';

let meses = {
    'Enero'     : 1,
    'Febrero'   : 2,
    'Marzo'     : 3,
    'Abril'     : 4,
    'Mayo'      : 5,
    'Junio'     : 6,
    'Julio'     : 7,
    'Agosto'    : 8,
    'Septiembre': 9,
    'Octubre'   : 10,
    'Noviembre' : 11,
    'Diciembre' : 12
};

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

let lblPaisSeleccionado = d3.select('#pais-seleccionado');

let tooltip = d3.select('#viz')
    .append('div')
        .style('opacity', 0)
        .attr('class', 'tooltip')
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '1px')
        .style('border-radius', '5px')
        .style('padding', '10px')

let dataInflacion;
  
// Leer datos de inflación de los países
d3.json('inflacion_paises.json', function (error, data) {
    if (error) throw error;
    
    // Agregar fecha de cada dato y almacenar la data
    dataInflacion = data.map(function(e){
        return {...e,
            Fecha:new Date(`${e.Agno}-${meses[e.Periodo]}-02`)
        };
    })
});

// Leer topojson del mapa
d3.json('map.json', function (error, data) {
    if (error) throw error;

    // Obtiene la data que representa la tierra
    let geometrias = data.objects.Latam.geometries
    let land = topojson.feature(data, {
        type: 'GeometryCollection',
        geometries: geometrias
    });

    // Definiendo como graficar el mapa
    let path = d3.geoPath()
        .projection(d3.geoTransverseMercator()
            .rotate([74 + 30 / 60, -38 - 50 / 60])
            .fitExtent([[m, m], [w - m, h - m]], land));

    // Graficando los países
    svgMapa.selectAll('path')
        .data(land.features)
        .enter().append('path')
        .attr('id', function (d) { return d.properties.name; })
        .attr('class', 'tract')
        .attr('d', path)
        .on('click', graficarBarras)
        .on('mouseover', tooltipMouseOver)
        .on('mousemove', tooltipMouseMove)
        .on('mouseleave', tooltipMouseLeave)
        //.append('title')
            //.text(function (d) { return d.properties.name; });
    
    //Graficando las fronteras
    svgMapa.append('path')
        .datum(topojson.mesh(data, data.objects.Latam, function (a, b) { return a !== b; }))
        .attr('class', 'tract-border')
        .attr('d', path);

    svgMapa.append("text")
        .attr("x", (w / 2))             
        .attr("y", m/2)
        .attr("text-anchor", "middle")  
        .style("font-size", "20px")
        .text("Mapa");

    console.log('Seleccionando un país por defecto');
    graficarBarras(geometrias.sort(compararOrdenGeometriasNombrePais)[0])
});

// Función encargada de graficar las barras una vez se seleccione un país
function graficarBarras(d){
    console.log(`Se ha seleccionado ${d.properties.name}`);

    // País seleccionado es el mismo, no graficar nuevamente
    if (paisSeleccionado == d.properties.name) {
        console.log(`No se ha graficado, ${d.properties.name} ya estaba seleccionado`);
        return;
    };

    d3.select('.tract-selected')
        .attr('class','tract')
    d3.select(`#${d.properties.name}`)
        .attr('class','tract-selected')
    
    // País seleccionado es diferente, graficar nuevos datos
    console.log(`Graficando datos de ${d.properties.name}`);

    // Guardar en una variable el nombre del país seleccionado
    paisSeleccionado = d.properties.name;

    // Limpiar el SVG donde se grafican las barras para graficar la nueva selección
    svgBarras.html('');

    // Obtener data del país seleccionado
    let dataInflacionPais = dataInflacion.filter(e => e.Pais == paisSeleccionado);
    // Obtener los años para los que se cuenta con data
    let aniosData = Array.from(new Set(dataInflacionPais.map((item) => item.Agno)));
    // Obtener aniosMostrar años más recientes donde hay data disponible del país para no saturar el gráfico
    aniosData = aniosData.sort().reverse().slice(0,aniosMostrar);
    dataInflacionPais = dataInflacionPais.filter(e => aniosData.includes(e.Agno));
    
    // DEBUG
    //console.log(dataInflacionPais);

    // TODO
    // Graficar datos del país seleccionado
    // Eje X
    var x = d3.scaleTime()
        .domain(d3.extent(dataInflacionPais, (d) => new Date(d.Fecha)))
        //.domain([sumarMeses(d3.min(dataInflacionPais, (d) => new Date(d.Fecha)),-1),d3.max(dataInflacionPais, (d) => new Date(d.Fecha))])
        .range([m, w-m])
        .nice()
        //.ticks(d3.timeMonth, formatDate);

    // Eje Y
    var y = d3.scaleLinear()
        //.domain(d3.extent(dataInflacionPais, (d) => d.Valor))
        .domain([(d3.min(dataInflacionPais, (d) => d.Valor) < 0 ? d3.min(dataInflacionPais, (d) => d.Valor) : 0), d3.max(dataInflacionPais, (d) => d.Valor)])
        .range([h-m, m]);
    // Ticks Eje Y
    var yLineasTicks = d3.axisLeft(y)
        .tickSize((w-(2*m)))
        .tickFormat('')
        //.ticks(10);

    // Mostrando Ticks Eje Y
    svgBarras.append('g')
        .attr('class', 'y axis-grid')
        .attr('transform', `translate(${w-m},0)`)
        .call(yLineasTicks)
        .call(g => g.select(".domain").remove());
    // Mostrando Eje Y
    svgBarras.append('g')
        .attr('transform', `translate(${m},0)`)
        .call(d3.axisLeft(y));
    // Mostrando Eje X
    svgBarras.append('g')
        .attr('transform', `translate(0,${h-m})`)
        .call(d3.axisBottom(x))
        //.selectAll('text')
        //.attr('transform', 'translate(-10,0)rotate(-45)')
        //.style('text-anchor', 'end');
  
    // Barras
    svgBarras.selectAll('mibarra')
        .data(dataInflacionPais)
        .enter()
        .append('rect')
            .attr('class', 'barra')
            .attr('x', function(d) { return x(d.Fecha) + 1; })
            // La formula para determinar el ancho de cada barra es: ((w-2m)/n) - s + 1
            // w : ancho disponible en el svg
            // m : margen en el svg
            // n : cantidad de barras a graficar (el eje registra n meses, entonces podemos obtener al contar la diferencia de meses del dominio)
            // s : separación que se le quiere dar a las gráficas
            //.attr('width', ((w-2*m)/dataInflacionPais.length) - s + 1)
            .attr('width', ((w-2*m)/obtenerMesesDiferencia(x.domain()[0],x.domain()[1])) - s + 1)
            //.attr("width", x.rangeBand()-2)
            // No mostrar barra al inicio:
            .attr('height', function(d) { return 0; })
            .attr('y', function(d) { return y(0); })
            .on('mouseover', tooltipMouseOver)
            .on('mousemove', tooltipMouseMove)
            .on('mouseleave', tooltipMouseLeave);
  
    // Animación
    svgBarras.selectAll('rect')
        .transition()
        .duration(500)
        //.attr('y', function(d) { return y(d.Valor); })
        //.attr('height', function(d) { return h -m - y(d.Valor); })
        .attr('y', function(d) { 
            let coorY = d.Valor >= 0 ? y(d.Valor) : y(0);
            return coorY; 
        })
        .attr('height', function(d) { 
            let altura = d.Valor >= 0 ? y(0) - y(d.Valor) : y(d.Valor) - y(0);
            return altura;
            //return h -m - y(d.Valor); 
        })
        .delay(function(d,i){return(i*100)});

    // Label para primer y último valor
    let cantidadDatos = dataInflacionPais.length;
    let maximo = d3.max(dataInflacionPais,d => d.Valor);
    let minimo = d3.min(dataInflacionPais,d => d.Valor);
    svgBarras.selectAll('mibarra') 
        .data(dataInflacionPais)
        .enter()
        .append('text')
            .attr('class','label')
            .attr('x', (function(d) { return x(d.Fecha); }  ))
            .attr('y', function(d) { return y(d.Valor) - 15; })
            .attr('dy', '.75em')
            // Agregar label para el primer y último valor, para los máximos y mínimos
            .text(function(d,i) {return i == 0 || i == cantidadDatos - 1 || d.Valor == maximo || d.Valor == minimo ? d.Valor+'%' : ''; });
        
    svgBarras.append("text")
        .attr("x", (w / 2))             
        .attr("y", m/2)
        .attr("text-anchor", "middle")  
        .style("font-size", "20px")
        .text(`% Inflación en ${paisSeleccionado}`);

    lblPaisSeleccionado.html(`Mostrando datos de ${d.properties.name}`)
}


// Funciones para cambiar el tooltip en eventos hover, move y leave
function tooltipMouseOver(d) {
    let html;
    // Condiciones para determinar si el tooltip se genera al mapa o a las barras
    // Tooltip para mapa
    if (d.hasOwnProperty('properties')){
        html = `País: ${d.properties.name} <br/>Código: ${d.properties.code} <br/>Población: ${formateoNumero.format(d.properties.pop)}`;
    } 
    // Tooltip para barras
    if (d.hasOwnProperty('Periodo')){
        html = `Fecha: ${d.Periodo} ${d.Agno} <br/>Inflación: ${d.Valor}%`;
    } 
    tooltip
        .html(html)
        .style('opacity', 1)
}
function tooltipMouseMove(d) {
    tooltip
        .style('left', mouseX + 20 + 'px') // It is important to put the +90: other wise the tooltip is exactly where the point is an it creates a weird effect
        .style('top', mouseY - 60 + 'px')
}
function tooltipMouseLeave(d) {
    tooltip
        .style('opacity', 0)
}

// Función para ordenar las geometrías por el nombre del país
// El país por defecto será el primero devuelto en orden dado por esta función
function compararOrdenGeometriasNombrePais(a,b){
    if ( a.properties.name < b.properties.name ) return -1;
    if ( a.properties.name > b.properties.name ) return 1;
    return 0;
}

function obtenerMesesDiferencia(fechaInicio, fechaFin) {
    var anioInicio = fechaInicio.getFullYear();
    var mesInicio = fechaInicio.getMonth();
    var anioFin = fechaFin.getFullYear();
    var mesFin = fechaFin.getMonth();
    var diferencia = (anioFin - anioInicio) * 12 + (mesFin - mesInicio);
    return diferencia;
  }

var formateoNumero = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
});