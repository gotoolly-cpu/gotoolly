/**
 * Advanced Background Removal Optimizations
 * This file contains specialized processors for different image types
 */

// ============================================
// TEXT/LOGO OPTIMIZER
// ============================================

class TextLogoOptimizer {
    /**
     * Process images containing text and logos
     */
    processTextAndLogos(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const result = new Uint8ClampedArray(data.length);
        
        // Copy original data
        result.set(data);
        
        // Detect high-contrast areas (likely text)
        const textMask = this.detectTextAreas(imageData);
        
        // Apply text mask protection
        for (let i = 0; i < data.length; i += 4) {
            const pixelIdx = i / 4;
            
            if (textMask[pixelIdx]) {
                // Preserve text areas with full opacity
                result[i + 3] = 255;
            }
        }
        
        // Fill small holes inside text characters
        this.fillTextHoles(result, width, height, 10);
        
        return new ImageData(result, width, height);
    }
    
    /**
     * Detect text areas using contrast analysis
     */
    detectTextAreas(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const textMask = new Uint8ClampedArray(width * height);
        
        // Convert to grayscale first
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }
        
        // Detect high contrast edges (text edges)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Calculate local contrast
                let maxDiff = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nIdx = (y + dy) * width + (x + dx);
                        const diff = Math.abs(gray[idx] - gray[nIdx]);
                        if (diff > maxDiff) maxDiff = diff;
                    }
                }
                
                // High contrast area = likely text
                if (maxDiff > 80) {
                    textMask[idx] = 1;
                    
                    // Also mark immediate neighbors as text
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = (y + dy) * width + (x + dx);
                            if (nIdx >= 0 && nIdx < textMask.length) {
                                textMask[nIdx] = 1;
                            }
                        }
                    }
                }
            }
        }
        
        // Clean up isolated pixels
        return this.cleanTextMask(textMask, width, height);
    }
    
    /**
     * Fill small holes inside text characters
     */
    fillTextHoles(maskData, width, height, maxHoleSize) {
        const visited = new Set();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // If pixel is transparent and not visited
                if (maskData[idx + 3] === 0 && !visited.has(`${x},${y}`)) {
                    // Flood fill to find hole size
                    const holePixels = this.floodFillTransparent(x, y, maskData, width, height, visited);
                    
                    // If hole is small (inside text), fill it
                    if (holePixels.length <= maxHoleSize) {
                        holePixels.forEach(([hx, hy]) => {
                            const hIdx = (hy * width + hx) * 4;
                            maskData[hIdx + 3] = 255;
                        });
                    }
                }
            }
        }
        
        return maskData;
    }
    
    /**
     * Flood fill for transparent pixels
     */
    floodFillTransparent(startX, startY, maskData, width, height, visited) {
        const stack = [[startX, startY]];
        const holePixels = [];
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited.has(key)) continue;
            
            const idx = (y * width + x) * 4;
            if (maskData[idx + 3] !== 0) continue;
            
            visited.add(key);
            holePixels.push([x, y]);
            
            // 4-direction flood fill
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        return holePixels;
    }
    
    /**
     * Clean text mask by removing noise
     */
    cleanTextMask(mask, width, height) {
        const cleaned = new Uint8ClampedArray(mask.length);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                if (mask[idx]) {
                    // Check neighborhood
                    let neighbors = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            if (mask[(y + dy) * width + (x + dx)]) {
                                neighbors++;
                            }
                        }
                    }
                    
                    // Keep if has enough neighbors (not isolated)
                    if (neighbors >= 2) {
                        cleaned[idx] = 1;
                    }
                }
            }
        }
        
        return cleaned;
    }
}

// ============================================
// HUMAN/PEOPLE OPTIMIZER
// ============================================

class HumanImageOptimizer {
    /**
     * Process images containing people
     */
    async processHumanImage(processedData, originalData) {
        const width = processedData.width;
        const height = processedData.height;
        let result = new Uint8ClampedArray(processedData.data.length);
        
        // Copy original processed data
        result.set(processedData.data);
        
        // 1. Detect skin tones
        const skinMask = this.detectSkinTones(originalData, width, height);
        
        // 2. Protect skin areas (never remove them)
        for (let i = 0; i < result.length; i += 4) {
            const pixelIdx = i / 4;
            
            if (skinMask[pixelIdx] && result[i + 3] < 200) {
                result[i + 3] = 255;
            }
        }
        
        // 3. Enhance hair edges
        result = this.enhanceHairEdges(result, originalData, width, height);
        
        // 4. Protect clothing details
        result = this.protectClothingDetails(result, originalData, width, height);
        
        return new ImageData(result, width, height);
    }
    
    /**
     * Detect skin tone areas
     */
    detectSkinTones(imageData, width, height) {
        const skinMask = new Uint8ClampedArray(width * height);
        const data = imageData.data;
        
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Skin tone detection using YCbCr color space
            const y = 0.299 * r + 0.587 * g + 0.114 * b;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
            
            // Skin tone ranges
            const isSkin = (
                y > 80 && y < 220 &&
                cb > 85 && cb < 135 &&
                cr > 135 && cr < 180
            );
            
            if (isSkin) {
                skinMask[j] = 1;
                
                // Also mark immediate area around skin
                const x = j % width;
                const yPos = Math.floor(j / width);
                
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = x + dx;
                        const ny = yPos + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            skinMask[nIdx] = 1;
                        }
                    }
                }
            }
        }
        
        return skinMask;
    }
    
    /**
     * Enhance hair edges for natural look
     */
    enhanceHairEdges(maskData, originalData, width, height) {
        const result = new Uint8ClampedArray(maskData);
        const hairEdges = this.detectHairEdges(originalData, width, height);
        
        for (let i = 0; i < maskData.length; i += 4) {
            const pixelIdx = i / 4;
            
            if (hairEdges[pixelIdx] > 0.5) {
                // For hair edges, create feather effect
                const featherValue = Math.min(255, 180 + Math.random() * 75);
                
                // Only enhance if currently low opacity
                if (result[i + 3] < featherValue) {
                    result[i + 3] = featherValue;
                }
            }
        }
        
        return result;
    }
    
    /**
     * Detect hair-like edges
     */
    detectHairEdges(imageData, width, height) {
        const edges = new Float32Array(width * height);
        const data = imageData.data;
        
        // Convert to grayscale
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }
        
        // Sobel edge detection for fine details
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Sobel kernels
                const gx = (
                    -1 * gray[(y-1)*width + (x-1)] + 1 * gray[(y-1)*width + (x+1)] +
                    -2 * gray[y*width + (x-1)] + 2 * gray[y*width + (x+1)] +
                    -1 * gray[(y+1)*width + (x-1)] + 1 * gray[(y+1)*width + (x+1)]
                );
                
                const gy = (
                    -1 * gray[(y-1)*width + (x-1)] - 2 * gray[(y-1)*width + x] - 1 * gray[(y-1)*width + (x+1)] +
                    1 * gray[(y+1)*width + (x-1)] + 2 * gray[(y+1)*width + x] + 1 * gray[(y+1)*width + (x+1)]
                );
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[idx] = Math.min(1, magnitude / 100);
            }
        }
        
        return edges;
    }
    
    /**
     * Protect clothing details
     */
    protectClothingDetails(maskData, originalData, width, height) {
        const result = new Uint8ClampedArray(maskData);
        const textureMap = this.analyzeTexture(originalData, width, height);
        
        for (let i = 0; i < maskData.length; i += 4) {
            const pixelIdx = i / 4;
            
            // If area has high texture (likely clothing detail)
            if (textureMap[pixelIdx] > 0.7 && result[i + 3] < 150) {
                // Boost opacity for textured areas
                result[i + 3] = Math.min(255, result[i + 3] + 100);
            }
        }
        
        return result;
    }
    
    /**
     * Analyze texture patterns
     */
    analyzeTexture(imageData, width, height) {
        const texture = new Float32Array(width * height);
        const data = imageData.data;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                let variance = 0;
                
                // Calculate local variance in 3x3 window
                let sumR = 0, sumG = 0, sumB = 0;
                let count = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        sumR += data[nIdx];
                        sumG += data[nIdx + 1];
                        sumB += data[nIdx + 2];
                        count++;
                    }
                }
                
                const meanR = sumR / count;
                const meanG = sumG / count;
                const meanB = sumB / count;
                
                // Calculate variance
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        variance += Math.pow(data[nIdx] - meanR, 2) +
                                   Math.pow(data[nIdx + 1] - meanG, 2) +
                                   Math.pow(data[nIdx + 2] - meanB, 2);
                    }
                }
                
                const pixelIdx = y * width + x;
                texture[pixelIdx] = Math.min(1, variance / 10000);
            }
        }
        
        return texture;
    }
}

// ============================================
// IMAGE TYPE DETECTOR
// ============================================

class ImageTypeDetector {
    /**
     * Automatically detect image type
     */
    detectImageType(imageData, fileName = '') {
        const features = {
            textScore: 0,
            skinScore: 0,
            productScore: 0,
            edgeSharpness: 0,
            colorUniformity: 0
        };
        
        // Analyze image features
        this.analyzeFeatures(imageData, features);
        
        // Check filename for hints
        if (fileName) {
            const lowerName = fileName.toLowerCase();
            if (lowerName.includes('logo') || lowerName.includes('text') || 
                lowerName.includes('brand') || lowerName.includes('icon')) {
                features.textScore += 0.3;
            }
            if (lowerName.includes('portrait') || lowerName.includes('person') || 
                lowerName.includes('face') || lowerName.includes('profile')) {
                features.skinScore += 0.3;
            }
        }
        
        // Determine type based on scores
        if (features.textScore > 0.5) return 'logo';
        if (features.skinScore > 0.4) return 'person';
        if (features.productScore > 0.6) return 'product';
        
        return 'auto';
    }
    
    /**
     * Analyze image features
     */
    analyzeFeatures(imageData, features) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        let skinPixels = 0;
        let textLikePixels = 0;
        let edgePixels = 0;
        const totalPixels = width * height;
        
        // Convert to grayscale for edge detection
        const gray = new Uint8ClampedArray(totalPixels);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            gray[j] = (r * 0.299 + g * 0.587 + b * 0.114);
            
            // Check for skin tones
            if (this.isSkinTone(r, g, b)) {
                skinPixels++;
            }
        }
        
        // Detect edges and text-like patterns
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Simple edge detection
                const contrast = Math.abs(gray[idx] - gray[idx + 1]) + 
                                Math.abs(gray[idx] - gray[idx + width]);
                
                if (contrast > 100) {
                    edgePixels++;
                    
                    // High contrast with small features = likely text
                    if (contrast > 150) {
                        textLikePixels++;
                    }
                }
            }
        }
        
        // Calculate scores
        features.textScore = textLikePixels / totalPixels;
        features.skinScore = skinPixels / totalPixels;
        features.edgeSharpness = edgePixels / totalPixels;
        
        // Estimate product score (uniform backgrounds, centered subject)
        const borderAnalysis = this.analyzeBorders(imageData, width, height);
        features.productScore = borderAnalysis.uniformity;
        
        return features;
    }
    
    isSkinTone(r, g, b) {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        
        return (y > 80 && y < 220 && cb > 85 && cb < 135 && cr > 135 && cr < 180);
    }
    
    analyzeBorders(imageData, width, height) {
        const borderWidth = Math.min(20, Math.floor(width * 0.1));
        let borderUniformity = 0;
        
        // Sample border pixels
        const borderColors = [];
        
        // Top border
        for (let x = 0; x < width; x += 5) {
            for (let y = 0; y < borderWidth; y += 5) {
                const idx = (y * width + x) * 4;
                borderColors.push([
                    imageData.data[idx],
                    imageData.data[idx + 1],
                    imageData.data[idx + 2]
                ]);
            }
        }
        
        // Calculate color variance in borders
        if (borderColors.length > 0) {
            const mean = this.calculateMeanColor(borderColors);
            const variance = this.calculateColorVariance(borderColors, mean);
            borderUniformity = 1 - Math.min(variance / 10000, 1);
        }
        
        return { uniformity: borderUniformity };
    }
    
    calculateMeanColor(colors) {
        let sumR = 0, sumG = 0, sumB = 0;
        
        for (const [r, g, b] of colors) {
            sumR += r;
            sumG += g;
            sumB += b;
        }
        
        return [
            sumR / colors.length,
            sumG / colors.length,
            sumB / colors.length
        ];
    }
    
    calculateColorVariance(colors, mean) {
        let variance = 0;
        
        for (const [r, g, b] of colors) {
            variance += Math.pow(r - mean[0], 2) +
                       Math.pow(g - mean[1], 2) +
                       Math.pow(b - mean[2], 2);
        }
        
        return variance / colors.length;
    }
}

// ============================================
// PRODUCT IMAGE ENHANCER
// ============================================

function enhanceProductImage(processedData, originalData) {
    const width = processedData.width;
    const height = processedData.height;
    const result = new Uint8ClampedArray(processedData.data.length);
    
    result.set(processedData.data);
    
    // Make edges sharper for products
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            if (result[idx + 3] > 128) {
                // Check neighbors
                let transparentNeighbors = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nIdx = ((y + dy) * width + (x + dx)) * 4 + 3;
                        if (result[nIdx] < 128) {
                            transparentNeighbors++;
                        }
                    }
                }
                
                // If edge pixel, make fully opaque
                if (transparentNeighbors > 0) {
                    result[idx + 3] = 255;
                }
            }
        }
    }
    
    return new ImageData(result, width, height);
}

// ============================================
// QUICK FIX FUNCTIONS (Simple Alternatives)
// ============================================

function quickTextLogoFix(processedData) {
    const data = processedData.data;
    const width = processedData.width;
    const height = processedData.height;
    const result = new Uint8ClampedArray(data);
    
    // Simple text preservation
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // If pixel is almost transparent but has high contrast neighbors
            if (data[idx + 3] < 50) {
                let maxDiff = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        const diff = Math.abs(data[nIdx] - data[idx]) +
                                    Math.abs(data[nIdx + 1] - data[idx + 1]) +
                                    Math.abs(data[nIdx + 2] - data[idx + 2]);
                        maxDiff = Math.max(maxDiff, diff);
                    }
                }
                
                if (maxDiff > 100) {
                    result[idx + 3] = 255;
                }
            }
        }
    }
    
    return new ImageData(result, width, height);
}

function quickHumanFix(processedData, originalData) {
    const data = processedData.data;
    const original = originalData.data;
    const width = processedData.width;
    const height = processedData.height;
    const result = new Uint8ClampedArray(data);
    
    // Protect skin tones
    for (let i = 0; i < data.length; i += 4) {
        const r = original[i];
        const g = original[i + 1];
        const b = original[i + 2];
        
        // Simple skin tone detection
        const isSkin = (
            r > 100 && r < 250 &&
            g > 50 && g < 200 &&
            b > 20 && b < 150 &&
            Math.abs(r - g) < 50 &&
            r > g && g > b
        );
        
        if (isSkin && data[i + 3] < 200) {
            result[i + 3] = 255;
        }
    }
    
    return new ImageData(result, width, height);
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

window.ImageOptimizers = {
    TextLogoOptimizer,
    HumanImageOptimizer,
    ImageTypeDetector,
    enhanceProductImage,
    quickTextLogoFix,
    quickHumanFix
};

console.log('Image Optimizers loaded successfully');