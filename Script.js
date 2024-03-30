/*=========================================================================================== 
  SINDH FLOOD DETECTION PROJECT
  ===========================================================================================
  A major flood occured in Sindh, Pakistan in mid 2022 following heavy monsoon rains. 
  This event led to the deaths of over 1,000 people, with more than 10 million individuals being displaced
  ===========================================================================================
  This script used Sentinel-2 satellite imagery to determine the flood extent.
  Two water indices were used to identify water pixels which are Normalized Difference Water Index (NDWI) 
  and Modified Normalized Difference Water Index (MNDWI).
  NDWI = (Green - NIR) / (Green + NIR)
  MNDWI = (Green - SWIR) / (Green + SWIR)
  The use of two indices increase the accurcay of the analysis*/
  

// Function to calculate and threshold NDWI/MNDWI, and create confidence raster
function calculateConfidence(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  var mndwi = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');
  
  // Define fixed threshold values (can be adjusted as needed)
  var ndwiThreshold = 0.3;
  var mndwiThreshold = 0.2;
  
  //Thresholding NDWI and MNDWI
  var ndwiThresholded = ndwi.gt(ndwiThreshold);
  var mndwiThresholded = mndwi.gt(mndwiThreshold);
  
  //Creating confidence raster by adding the threshold raters
  // values of 2 are pixels where both indices identified water
  // values of 1 are pixels where only one index identified water
  // values of 0 are pixels where neither of the indices identified water
  var confidence = ndwiThresholded.add(mndwiThresholded);
  
  //remaping values (value of 1 is water while 0 is non-water)
  var confidenceRaster = confidence.remap([0, 1, 2], [0, 0, 1]);
  
  return confidenceRaster;
}

 // Define the study area geometry
var studyArea = ee.FeatureCollection('users/adewaleolayemi004/sindh');

// Define date ranges for before and after flood
var beforeFloodStartDate = '2022-01-01';
var beforeFloodEndDate = '2022-01-30';
var afterFloodStartDate = '2022-09-01';
var afterFloodEndDate = '2022-09-30';

// Filter Sentinel-2 image collection for before and after flood dates
var beforeFloodImage = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(studyArea)
  .filterDate(beforeFloodStartDate, beforeFloodEndDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .mean()
  .clip(studyArea);

var afterFloodImage = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(studyArea)
  .filterDate(afterFloodStartDate, afterFloodEndDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .mean()
  .clip(studyArea);

// Apply false color visualization to before and after flood images
var falseColorBeforeFlood = beforeFloodImage.visualize({
  bands: ['B11', 'B8', 'B3'],
  min: 0,
  max: 3000,
  gamma: 1.4
});

var falseColorAfterFlood = afterFloodImage.visualize({
  bands: ['B11', 'B8', 'B3'],
  min: 0,
  max: 3000,
  gamma: 1.4
});
// Calculate confidence raster for before and after flood
var confidenceRasterBefore = calculateConfidence(beforeFloodImage);
var confidenceRasterAfter = calculateConfidence(afterFloodImage);

// Change detection by subtracting before flood from after flood
var floodDetection = confidenceRasterAfter.subtract(confidenceRasterBefore);

// Mask out non-flood areas in change detection result
var floodedArea = floodDetection.updateMask(floodDetection.eq(1));



// Display false color images and the flooded area on the map
Map.centerObject(studyArea, 6.5);
//Map.addLayer(falseColorBeforeFlood, {}, 'False Color Before Flood');
//Map.addLayer(falseColorAfterFlood, {}, 'False Color After Flood');
Map.addLayer(floodedArea, { palette: 'blue' }, 'Flooded Area'); //The flooded area is displayed in blue colour
