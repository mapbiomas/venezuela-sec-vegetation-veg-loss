/**
 * @fileoverview Natural vegetation loss and secondary vegetation detection
 * for MapBiomas Venezuela Collection 3. Analyzes temporal transitions in 
 * classification time series to identify deforestation events and 
 * secondary vegetation growth patterns.
 * 
 * @author MapBiomas Venezuela Team
 * @version 3.0.0
 * @see {@link https://venezuela.mapbiomas.org|MapBiomas Venezuela}
 * @module loss-vegetation
 * 
 * @requires users/Mosaico_Clasification/global-modules:mapbiomas/loss-vegetation-api
 */

/**
 * Configuration parameters and constants
 * - `{string}` `version`: Version identifier for the output dataset.
 * - `{string}` `vegetation`: Type of vegetation analyzed (e.g., 'natural').
 * - `{Array<number>}` `years`: List of years in the classification time series.
 * - `{Array<number>}` `yearsVis`: Subset of years to visualize on the map.
 * - `{Array<number>}` `targetYearsKernel3`: Years used for 3-year kernel analysis (deforestation).
 * - `{Array<number>}` `yearsEnd`: Recent years to apply end-of-series rules.
 * - `{string}` `prefix`: Prefix for classification band names.
 * - `{string}` `outputName`: Name for the output asset.
 * - `{string}` `basePath`, `{string}` `assetInput`, `{string}` `assetOutput`: Paths for input and output assets.
 * - `{Object}` `functions`: Imported module with functions for loss and vegetation analysis.
 * - `{Array<string>}` `transitions_palette`: Color palette for visualizing transition classes.
 * - `{Array<number>}` `classesToFilter`: List of class IDs to apply noise filtering on.
 * - `{number}` `last_year_id`: Class ID to assign to recent unconfirmed losses.
 * - `{Array<Object>}` `rules`, `{Array<Object>}` `rulesEnd`, `{Array<Object>}` `rulesSecVegK5`, `{Array<Object>}` `rulesSecVegK4`, `{Array<Object>}` `rulesDefSecVeg`: Arrays of rules for detecting transitions.
 * - `{Object}` `classes`: Mapping of original class IDs to new class IDs for processing.
 */
var version = '3';
 
var vegetation = 'natural';
 
var years = ee.List.sequence(1985, 2024).getInfo();
 
var yearsVis = [2020, 2023, 2024];
 
var targetYearsKernel3 = ee.List.sequence(1986, 2022).getInfo().reverse();
 
var yearsEnd = [2021];
 
var prefix = 'classification';
 
var outputName = vegetation + '-' + version;
 
var basePath = 'projects/mapbiomas-venezuela/assets/LANDSAT/VENEZUELA-3';
 
var assetInput = basePath + '/integracion/VENEZUELA-8';
 
var assetOutput = basePath + '/perdida-de-vegetacion';
 
var functions = require('users/Mosaico_Clasification/global-modules:mapbiomas/loss-vegetation-api');

var transitions_palette = [
    '#ffffff',
    '#faf5d1',
    '#3f7849',
    '#5bcf20',
    '#ea1c1c',
    '#b4f792',
    '#fe9934',
    '#303149'
];

var classesToFilter = [
    15, 18, 9, 21, 24, 25, 31 
];

var last_year_id = 4;

var rules = [
    [[2, 2, 1, 2], [2, 2, 2, 2]],
    [[2, 1, 2, 2], [2, 2, 2, 2]],
    [[2, 2, 1, 1], [2, 2, 4, 1]]
];

var rulesEnd = [
    [[2, 2, 2, 1], [2, 2, 2, 4]],
    [[3, 3, 3, 1], [3, 3, 3, 6]]
];

var rulesSecVegK5 = [
    [[1, 1, 2, 2, 2], [1, 1, 5, 3, 3]]
];

var rulesSecVegK4 = [
    [[5, 3, 3, 2], [5, 3, 3, 3]],
    [[3, 2, 2, 2], [3, 3, 3, 3]],
    [[3, 2, 2, 4], [3, 3, 3, 6]],
    [[3, 3, 2, 4], [3, 3, 3, 6]],
    [[3, 3, 2, 2], [3, 3, 3, 3]],
    [[3, 3, 3, 2], [3, 3, 3, 3]],
    [[1, 2, 2, 4], [1, 1, 1, 1]]
];

var rulesDefSecVeg = [
    [[3, 4, 1], [3, 6, 1]]
];

var classes = [
    [3, 2],[4, 2],[5, 2],[6, 2],[9, 1],[11, 2],[12, 2],[13, 2],
    [15, 1],[18, 1],[21, 1],[23, 7],[24, 1],[25, 1],[29, 7],[30, 1],
    [31, 1],[32, 7],[33, 7],[34, 7],[50, 2],[66, 2],[68, 7],[81, 2],
    [82, 2],[0, 0],[27, 0]
];



/**
 * Processing pipeline. Detects
 * - Primary vegetation loss using a 4-year kernel to identify deforestation events.
 * - Secondary vegetation recovery using a 5-year kernel to find regrowth patterns.
 * - Secondary vegetation dynamics with a 4-year kernel to track changes in regrowth areas.
 * - Deforestation within secondary vegetation using a 3-year kernel to find recent losses in regrowth zones.
 * - End-of-series rules to classify unconfirmed recent years based on previous trends.
 */
var lookupIn = classes.map(function (class_ids_list) { return class_ids_list[0] });

var lookupOut = classes.map(function (class_ids_list) { return class_ids_list[1] });

var integrated = ee.Image(assetInput);

var integratedList = ee.List(classesToFilter).iterate(applyRules, integrated);

var integratedFtd = ee.Image(integratedList);

var classificationAgg = functions.aggregateClasses(integratedFtd, lookupIn, lookupOut);

var anthropicFreq = functions.getClassFrequency(classificationAgg, 1);

var obj = ee.Dictionary({ classification: null });


// Step 1 — Primary vegetation suppression (4-year kernel)
rules.forEach(function(rule) {
    
    var object = {
        classification: classificationAgg, 
        years: ee.List(years).slice(0, years.length - 3)
    };
    
    obj = functions.getDeforestation(rule, object);
    
});

var transitions = ee.Image(obj.get(prefix));


// Step 2 — Secondary vegetation recovery (5-year kernel)
rulesSecVegK5.forEach(function(rule) {

    var object = { 
        classification: transitions, 
        years: ee.List(years).slice(0, years.length - 4)
    };
    
    obj = functions.getSecondaryVegetationK5(rule, object);
    
});
    
    
transitions = ee.Image(obj.get(prefix));


// Step 3 — Secondary vegetation dynamics (4-year kernel)
rulesSecVegK4.forEach(function(rule) {

    var object = {
        classification: transitions, 
        years: ee.List(years).slice(0, years.length - 3)
    };
    
    obj = functions.getSecondaryVegetationK4(rule, object);
    
});

transitions = ee.Image(obj.get(prefix));


// Step 4 — Deforestation within secondary vegetation (3-year kernel)
rulesDefSecVeg.forEach(function(rule) {
    
    var object = {
        classification: transitions,
        years: ee.List(years).slice(0, years.length - 2)
    };
    
    obj = functions.getDeforestationInSecondaryVegetation(rule, object);
    
});

transitions = ee.Image(obj.get(prefix));


// Step 5 — End-of-series rules (unconfirmed recent years)
rulesEnd.forEach(function(rule) {
    
    var object = {
        classification: transitions, 
        years: yearsEnd
    };
    
    obj = functions.getDeforestation(rule, object);
    
});

transitions = ee.Image(obj.get(prefix));


/**
 * Post-processing corrections
 */
var yearReverse = years.reverse();

transitions = transitions.where(anthropicFreq.gt(1).and(transitions.eq(4)), 6);

transitions = transitions.where(anthropicFreq.gt(0).and(transitions.eq(2)), 3);

var transitionsLastYearMinus2 = transitions.select(prefix + '_' + yearReverse[2]);

var transitionsLastYearMinus1 = transitions.select(prefix + '_' + yearReverse[1]);

var transitionsLastYear = transitions.select(prefix + '_' + yearReverse[0]);

var loss_n_1 = transitionsLastYearMinus2.eq(2).and(transitionsLastYearMinus1.eq(1));

transitionsLastYearMinus1 = transitionsLastYearMinus1.where(loss_n_1, last_year_id);

var loss_n = transitionsLastYearMinus1.eq(2).and(transitionsLastYear.eq(1));

transitionsLastYear = transitionsLastYear.where(loss_n, last_year_id);

transitionsLastYearMinus1 = transitionsLastYearMinus1
    .where(transitionsLastYearMinus2.eq(1).and(transitionsLastYearMinus1.eq(3)), 1);

transitionsLastYear = transitionsLastYear
    .where(transitionsLastYearMinus2.eq(1).and(transitionsLastYear.eq(3)), 1);

transitionsLastYear = transitionsLastYear
    .where(transitionsLastYearMinus1.eq(3).and(transitionsLastYear.eq(1)), 3);

transitions = transitions.addBands(transitionsLastYearMinus1, null, true);

transitions = transitions.addBands(transitionsLastYear, null, true);


/**
 * Adds transition layers to the map for the years defined in `yearsVis`.
 * Each layer is styled using the `transitions_palette`.
 */
yearsVis.forEach(function(year) {
    var strYear = year.toString();
    Map.addLayer(transitions.byte(), {
        bands: [prefix + '_' + strYear],
        min: 0,
        max: transitions_palette.length - 1,
        palette: transitions_palette
    }, 'TRANSITIONS: ' + strYear);
});


/**
 * Exports the final transitions image as a GEE asset.
 *
 * @param {ee.Image} transitions - Multi-band byte image with transition classes (0–7).
 * @param {string} outputName - Asset name: `natural-3`.
 * @param {string} assetOutput - Destination asset folder path.
 * @param {number} scale - Spatial resolution in meters (30m).
 * @param {number} maxPixels - Maximum number of pixels allowed in the export.
 */
Export.image.toAsset({
    image: transitions.byte(),
    description: outputName,
    assetId: assetOutput + '/' + outputName,
    pyramidingPolicy: { '.default': 'mode' },
    region: integrated.geometry().bounds(),
    scale: 30,
    maxPixels: 1e13
});


/**
 * Applies a temporal noise filter to a specific land cover class.
 *
 * For each target year, checks if the classified value at year `t` differs
 * from both `t-1` and `t+1`. If so (isolated pixel), it replaces the value
 * at `t` with the value at `t-1`. This removes single-year classification
 * noise for a given class ID.
 *
 * @param {ee.Number} class_id - The MapBiomas class ID to filter.
 * @param {ee.Image} classificationFtd - The current multi-band LULC image.
 * @returns {ee.Image} Updated classification image with noise removed for `class_id`.
 *
 * @example
 * // Applied iteratively over classesToFilter via ee.List.iterate()
 * var integratedList = ee.List(classesToFilter).iterate(applyRules, integrated);
 */
function applyRules(class_id, classificationFtd) {
  
    var prefix = 'classification';
    
    class_id = ee.Number(class_id);
    
    classificationFtd = ee.Image(classificationFtd);
    
    var tCurrentFtd = ee.List(targetYearsKernel3).iterate(
            
        function (year, classificationFtd) {
          
            year = ee.Number(year).int();
            
            classificationFtd = ee.Image(classificationFtd);
            
            var b1 = ee.String(prefix + '_').cat(ee.String(year.subtract(1)));
            
            var b2 = ee.String(prefix + '_').cat(ee.String(year));
            
            var b3 = ee.String(prefix + '_').cat(ee.String(year.add(1)));
            
            var t1 = classificationFtd.select(b1);
            
            var t2 = classificationFtd.select(b2);
            
            var t3 = classificationFtd.select(b3);
            
            var mask = t2.neq(t1).and(t2.neq(t3));
            
            var tCurrentFtd = t2.where(mask.and(t2.eq(class_id)), t1).rename(b2);
            
            return classificationFtd.addBands(ee.Image(tCurrentFtd), null, true);
            
        }, classificationFtd);
        
        return classificationFtd.addBands(ee.Image(tCurrentFtd), null, true);
        
}