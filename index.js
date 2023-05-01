var svg = d3.select("#mapa"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    margin = { top: 20, bottom: 20, right: 20, left: 20 };

function clickHandle(d) {
    alert(`Se ha seleccionado ${d.properties.name}`)
}

d3.json("map.json", function (error, data) {
    if (error) throw error;
    var land = topojson.feature(data, {
        type: "GeometryCollection",
        geometries: data.objects.Latam.geometries.filter(function (d) {
            return (d.id / 10000 | 0) % 100 !== 99;
        })
    });

    var path = d3.geoPath()
        .projection(d3.geoTransverseMercator()
            .rotate([74 + 30 / 60, -38 - 50 / 60])
            .fitExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]], land));

    svg.selectAll("path")
        .data(land.features)
        .enter().append("path")
        .attr("class", "tract")
        .attr("d", path)
        .on("click", clickHandle)
        .append("title")
        .text(function (d) { return d.properties.name; });
    svg.append("path")
        .datum(topojson.mesh(data, data.objects.Latam, function (a, b) { return a !== b; }))
        .attr("class", "tract-border")
        .attr("d", path);
});