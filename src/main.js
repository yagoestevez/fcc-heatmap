require( "babel-runtime/regenerator" );
require( './index.html'              );
require( './main.scss'               );

////////////////////////////////////////////////////////////////////////////////////////////////////
//                        by Yago Estévez. https://twitter.com/yagoestevez                        //
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////


// Here the data is fetched from the API or throws an error. If everything is OK,
// the Heat Map is built using the data from the API.
d3.json(
  'https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json'
).then( data => {
  // Hides preloader.
  document.getElementById( 'preloader' ).classList.add( 'hidden' ); 
  // Builds the Heat Map.
  const getTheChart = new ChartBuilder( data );
  getTheChart.makeCanvas().drawlabels().setScales().drawAxes().drawRects().paintColors().setLegend().setTooltip().and.animate();
} )
.catch( error => { throw new Error( error ) } );

// The Chart Builder class.
// Owns all the methods and properties required to build the Heat Map.
class ChartBuilder {

  constructor ( data ) {
    // Sets up sizes.
    this.chartWidth  = 1000;
    this.chartHeight = 400;
    this.margin      = { top: 50, bottom: 70, left: 80, right: 10 };
    this.innerWidth  = this.chartWidth  - this.margin.left - this.margin.right;
    this.innerHeight = this.chartHeight - this.margin.top  - this.margin.bottom;

    // Cleans up the received data.
    this.data = this.cleanUpData( data );

    // For chaining methods.
    this.and = this;
  }

  // Cleans up the fetched data array.
  cleanUpData ( rawData ) {
    this.baseTemp = rawData.baseTemperature;
    return rawData.monthlyVariance.map( (data,i) => {
      return {
        month   : +data.month,
        variance: +data.variance,
        year    : +data.year
      };
    } );
  }

  // Creates the canvas for the chart.
  makeCanvas ( ) {
    this.chart = d3.select( '#chart' )
      .attr( 'viewBox' , `0 0 ${this.chartWidth} ${this.chartHeight}` );
    this.canvas = this.chart.append( 'g' )
      .attr( 'transform', `translate( ${this.margin.left}, ${this.margin.top} )` );
    return this;
  }

  // Puts a label for the Y axis.
  drawlabels ( ) {
    this.labelX = this.canvas
      .append( 'text' )
      .attr( 'class'    , 'label' )
      .attr( 'x'        , this.innerWidth / 2 )
      .attr( 'y'        , this.innerHeight + this.margin.bottom - 20 )
      .html( 'YEARS' );
    this.labelY = this.canvas
      .append( 'text' )
      .attr( 'class'    , 'label' )
      .attr( 'transform', 'rotate(-90)' )
      .attr( 'x'        , -this.innerHeight / 2 )
      .attr( 'y'        , -50 )
      .html( 'MONTHS' );
    return this;
  }

  // Sets up scales for X and Y axes.
  setScales ( ) {
    this.x = d3.scaleLinear( )
      .domain( d3.extent( this.data, d => d.year ) )
      .range( [ 0, this.innerWidth ] );
    this.y = d3.scaleLinear( )
      .domain( [ 0, d3.map( this.data, d => d.month ).keys( ).length-1 ] )
      .range( [ 0, this.innerHeight - ( this.innerHeight / 12 ) ] );
    return this;
  }

  // Creates the bottom and left axes.
  drawAxes ( ) {
    const xAxis = d3.axisBottom( this.x )
      .tickFormat( d => d );
    const yAxis = d3.axisLeft( this.y )
      .tickFormat( d => d3.utcFormat( '%B' )( new Date( 1970, d+1, 1, 0, 0, 0, 0 ) ) );
    
    this.xAxisLine = this.canvas.append( 'g' )
      .call( xAxis )
      .attr( 'class'    , 'x axis' )
      .attr( 'id'       , 'x-axis' )
      .attr( 'transform', `translate( 0, ${this.innerHeight + 5} )` )
      .selectAll( 'text' )
        .attr( 'class', 'x-tick' );
    this.yAxisLine = this.canvas.append( 'g' )
      .call( yAxis )
      .attr( 'class'    , 'y axis' )
      .attr( 'id'       , 'y-axis' )
      .attr( 'transform', `translate( -5, ${this.innerHeight/24} )`);
    return this;
  }

  // Drawing the dots for the chart.
  drawRects ( ) {
    const rectHeight  = this.innerHeight / 12;
    this.allRects = this.canvas.selectAll( 'rect' )
    this.singleRect = this.allRects
      .data( this.data )
      .enter( )
      .append( 'rect' )
        .attr( 'class'     , 'cell' )
        .attr( 'data-month', d => d.month-1 )
        .attr( 'data-year' , d => d.year )
        .attr( 'data-temp' , d => this.baseTemp + d.variance )
        .attr( 'x'         , 0 )
        .attr( 'y'         , d => ( d.month - 1 ) * rectHeight )
        .attr( 'width'     , 1 )
        .attr( 'height'    , d => rectHeight );
    return this;
  }

  paintColors ( ) {
    const minMaxT   = d3.extent( this.data, d => this.baseTemp + d.variance );
    const stepSize = ( minMaxT[1] - minMaxT[0] ) / 11;
    const steps    = [ ];
    for ( let i=1; i <= 11; i++ )
      steps.push( ( minMaxT[0] + ( stepSize * i ) ).toFixed( 1 )  );
    this.colorScale = [
      { temp:  steps[0], val: '#313695' },
      { temp:  steps[1], val: '#4575b4' },
      { temp:  steps[2], val: '#74add1' },
      { temp:  steps[3], val: '#abd9e9' },
      { temp:  steps[4], val: '#e0f3f8' },
      { temp:  steps[5], val: '#ffffbf' },
      { temp:  steps[6], val: '#fee090' },
      { temp:  steps[7], val: '#fdae61' },
      { temp:  steps[8], val: '#f46d43' },
      { temp:  steps[9], val: '#d73027' },
      { temp: steps[10], val: '#a50026' }
    ];
    this.singleRect.style( 'fill', d => 
      this.colorScale.find( color => ( this.baseTemp + d.variance ) <= color.temp ).val
    );
    return this;
  }

  // Animates the dots.
  animate ( ) {
    const duration    = 1000;
    const easing      = d3.easeBack;
    const yearsExtent = d3.extent( this.data, d => d.year );
    const rectWidth   = this.innerWidth / ( yearsExtent[1] - yearsExtent[0] )
    this.singleRect.transition( )
      .duration( duration )
      .ease( easing )
        .attr( 'x'         , d => ( d.year - yearsExtent[0] ) * rectWidth )
        .attr( 'width'     , rectWidth )
    return this;
  }

  // Creates the tooltip to be shown when hover each dot.
  setTooltip ( ) {
    this.tip = d3.tip( )
      .attr( 'id'       , 'tooltip' )
      .html( d => d );
    this.canvas.call( this.tip );
    this.handleEvents( );
    return this;
  }

  // Creates the legend items from the chart.
  setLegend ( ) {
    const legend = this.canvas.append( 'g' )
      .attr( 'id', 'legend' );
    legend.selectAll( 'rect' )
      .data( this.colorScale )
      .enter( )
      .append( 'rect' )
        .attr( 'class' , 'legend' )
        .attr( 'width' , 30 )
        .attr( 'height', 10 )
        .attr( 'x'     , ( d, i ) => -i * 30 + this.innerWidth -30 )
        .attr( 'y'     , this.innerHeight + 40 )
        .attr( 'fill'  , ( d, i ) => this.colorScale[this.colorScale.length-1-i].val );
    legend.selectAll( 'text' )
      .data( this.colorScale )
      .enter( )
      .append( 'text' )
        .attr( 'class' , 'legend-text' )
        .attr( 'x'     , ( d, i ) => -i * 30 + this.innerWidth - 7 )
        .attr( 'y'     , this.innerHeight + 60 )
        .text( ( d, i ) => this.colorScale[this.colorScale.length-1-i].temp );
    return this;
  }

  // Sets up the event handlers for each date.
  handleEvents ( ) {
    let _self = this;
    this.singleRect.on( 'mouseover', function ( d,i ) {
      d3.select( this ).classed( 'active', true )
      const date     = d3.timeFormat( '%B, %Y' )( new Date( d.year, d.month-1 ) );
      const temp     = d3.format( '.2f' )( _self.baseTemp + d.variance );
      const variance = d3.format( '+.2f' )( d.variance );
      const positive = variance >= 0;
      const str = `
        <h4 class="title">${date}</h4>
        <div class="temperatures">
          <p>Month's average temperature was <b>${temp}C</b>.</p>
          <p><b class="${positive && 'positive'}">${variance}C</b> compared to the base temperature.</p>
        </div>
      `;
      _self.tip.attr( 'data-year', d.year )
      _self.tip.show( str );
    } )
    this.singleRect.on( 'mouseout', function ( d ) {
      d3.select( this ).classed( 'active', false )
      _self.tip.hide();
    } );
    return this;
  }

}