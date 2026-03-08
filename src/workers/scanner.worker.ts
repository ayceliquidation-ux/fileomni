// @ts-nocheck
self.importScripts("https://docs.opencv.org/4.8.0/opencv.js");

self.onmessage = async (e) => {
  const { imageData, width, height } = e.data;

  // Poll until OpenCV is fully initialized in the worker
  const waitForCv = () => {
    return new Promise((resolve) => {
      const check = () => {
        if (self.cv && self.cv.Mat) {
          resolve(self.cv);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  };

  try {
    const cv = await waitForCv();

    // 1. Create Mats
    const src = cv.matFromImageData(new ImageData(new Uint8ClampedArray(imageData), width, height));
    const dst = new cv.Mat();

    // 2. Grayscale & Blur for edge detection
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(src, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    
    // 3. Canny Edge Detection
    cv.Canny(dst, dst, 75, 200, 3, false);

    // 4. Find Contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // 5. Approx Polygon to find the document (largest 4-point contour)
    let maxArea = 0;
    const approx = new cv.Mat();
    let bestApprox = null;

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      
      // Threshold for minimum document size
      if (area > 5000) {
        const peri = cv.arcLength(cnt, true);
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          if (bestApprox) bestApprox.delete();
          bestApprox = approx.clone();
        }
      }
      cnt.delete();
    }

    let warped = src.clone();
    let outWidth = width;
    let outHeight = height;

    // 6. Perspective Transform if document is found
    if (bestApprox) {
      const pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({ x: bestApprox.data32S[i * 2], y: bestApprox.data32S[i * 2 + 1] });
      }

      // Sort points to: top-left, top-right, bottom-right, bottom-left
      pts.sort((a, b) => a.y - b.y);
      const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
      const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
      const ordered = [top[0], top[1], bottom[1], bottom[0]];

      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        ordered[0].x, ordered[0].y,
        ordered[1].x, ordered[1].y,
        ordered[2].x, ordered[2].y,
        ordered[3].x, ordered[3].y
      ]);

      const widthA = Math.sqrt((ordered[2].x - ordered[3].x) ** 2 + (ordered[2].y - ordered[3].y) ** 2);
      const widthB = Math.sqrt((ordered[1].x - ordered[0].x) ** 2 + (ordered[1].y - ordered[0].y) ** 2);
      outWidth = Math.max(Math.floor(widthA), Math.floor(widthB));

      const heightA = Math.sqrt((ordered[1].x - ordered[2].x) ** 2 + (ordered[1].y - ordered[2].y) ** 2);
      const heightB = Math.sqrt((ordered[0].x - ordered[3].x) ** 2 + (ordered[0].y - ordered[3].y) ** 2);
      outHeight = Math.max(Math.floor(heightA), Math.floor(heightB));

      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        outWidth - 1, 0,
        outWidth - 1, outHeight - 1,
        0, outHeight - 1
      ]);

      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      const newSize = new cv.Size(outWidth, outHeight);
      cv.warpPerspective(src, warped, M, newSize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      srcTri.delete();
      dstTri.delete();
      M.delete();
    }

    // 7. Adaptive Thresholding to create "Scan" look (Black/White high contrast)
    const finalImg = new cv.Mat();
    cv.adaptiveThreshold(warped, finalImg, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);

    // 8. Convert to RGBA for ImageData back to Canvas
    const rgba = new cv.Mat();
    cv.cvtColor(finalImg, rgba, cv.COLOR_GRAY2RGBA, 0);

    const outData = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows);

    // Cleanup memory
    src.delete();
    dst.delete();
    contours.delete();
    hierarchy.delete();
    approx.delete();
    if (bestApprox) bestApprox.delete();
    warped.delete();
    finalImg.delete();
    rgba.delete();

    // Post exactly the buffer back
    self.postMessage(
      { 
        success: true, 
        imageData: outData.data.buffer, 
        width: outData.width, 
        height: outData.height 
      }, 
      [outData.data.buffer]
    );

  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
