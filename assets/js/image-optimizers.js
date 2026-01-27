/**
 * Image Optimizers - Core utilities for image processing
 * This file provides shared utility functions for background removal tools
 */

// ============================================
// IMAGE UTILITIES
// ============================================

class ImageUtils {
    /**
     * Resize image to fit within max dimensions while maintaining aspect ratio
     */
    static resizeToFit(canvas, maxWidth, maxHeight) {
        const width = canvas.width;
        const height = canvas.height;
        
        if (width <= maxWidth && height <= maxHeight) {
            return canvas;
        }
        
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);
        
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        
        const ctx = resizedCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        return resizedCanvas;
    }
    
    /**
     * Convert image to canvas
     */
    static imageToCanvas(image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        return canvas;
    }
    
    /**
     * Get image data from canvas
     */
    static getImageData(canvas) {
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    /**
     * Apply image data to canvas
     */
    static putImageData(canvas, imageData) {
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Clone image data
     */
    static cloneImageData(imageData) {
        return new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
    }
}

// ============================================
// COLOR UTILITIES
// ============================================

class ColorUtils {
    /**
     * Convert RGB to HSL
     */
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    /**
     * Convert HSL to RGB
     */
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    /**
     * Calculate color distance (Euclidean)
     */
    static colorDistance(r1, g1, b1, r2, g2, b2) {
        return Math.sqrt(
            Math.pow(r1 - r2, 2) +
            Math.pow(g1 - g2, 2) +
            Math.pow(b1 - b2, 2)
        );
    }
    
    /**
     * Check if color is grayscale
     */
    static isGrayscale(r, g, b, tolerance = 10) {
        return Math.abs(r - g) <= tolerance && 
               Math.abs(g - b) <= tolerance && 
               Math.abs(r - b) <= tolerance;
    }
    
    /**
     * Get luminance from RGB
     */
    static getLuminance(r, g, b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }
}

// ============================================
// MASK UTILITIES
// ============================================

class MaskUtils {
    /**
     * Apply Gaussian blur to mask
     */
    static blurMask(imageData, radius = 1) {
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(imageData.data);
        
        const kernel = this.createGaussianKernel(radius);
        const kernelSize = radius * 2 + 1;
        
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let sum = 0;
                let weightSum = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const idx = ((y - radius + ky) * width + (x - radius + kx)) * 4 + 3;
                        const weight = kernel[ky][kx];
                        sum += imageData.data[idx] * weight;
                        weightSum += weight;
                    }
                }
                
                const idx = (y * width + x) * 4 + 3;
                result[idx] = Math.round(sum / weightSum);
            }
        }
        
        return new ImageData(result, width, height);
    }
    
    /**
     * Create Gaussian kernel
     */
    static createGaussianKernel(radius) {
        const size = radius * 2 + 1;
        const kernel = [];
        const sigma = radius / 2;
        let sum = 0;
        
        for (let y = 0; y < size; y++) {
            kernel[y] = [];
            for (let x = 0; x < size; x++) {
                const dx = x - radius;
                const dy = y - radius;
                const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                kernel[y][x] = value;
                sum += value;
            }
        }
        
        // Normalize
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        
        return kernel;
    }
    
    /**
     * Dilate mask
     */
    static dilateMask(imageData, iterations = 1) {
        const width = imageData.width;
        const height = imageData.height;
        let result = new Uint8ClampedArray(imageData.data);
        
        for (let iter = 0; iter < iterations; iter++) {
            const current = new Uint8ClampedArray(result);
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4 + 3;
                    
                    // Check neighbors
                    let maxAlpha = current[idx];
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = ((y + dy) * width + (x + dx)) * 4 + 3;
                            maxAlpha = Math.max(maxAlpha, current[nIdx]);
                        }
                    }
                    
                    result[idx] = maxAlpha;
                }
            }
        }
        
        return new ImageData(result, width, height);
    }
    
    /**
     * Erode mask
     */
    static erodeMask(imageData, iterations = 1) {
        const width = imageData.width;
        const height = imageData.height;
        let result = new Uint8ClampedArray(imageData.data);
        
        for (let iter = 0; iter < iterations; iter++) {
            const current = new Uint8ClampedArray(result);
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4 + 3;
                    
                    // Check neighbors
                    let minAlpha = current[idx];
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = ((y + dy) * width + (x + dx)) * 4 + 3;
                            minAlpha = Math.min(minAlpha, current[nIdx]);
                        }
                    }
                    
                    result[idx] = minAlpha;
                }
            }
        }
        
        return new ImageData(result, width, height);
    }
    
    /**
     * Invert mask
     */
    static invertMask(imageData) {
        const result = new Uint8ClampedArray(imageData.data);
        
        for (let i = 3; i < result.length; i += 4) {
            result[i] = 255 - result[i];
        }
        
        return new ImageData(result, imageData.width, imageData.height);
    }
}

// ============================================
// EDGE DETECTION
// ============================================

class EdgeDetection {
    /**
     * Sobel edge detection
     */
    static sobel(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const result = new Float32Array(width * height);
        
        // Convert to grayscale
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            gray[j] = ColorUtils.getLuminance(data[i], data[i + 1], data[i + 2]);
        }
        
        // Apply Sobel operator
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Horizontal gradient
                const gx = (
                    -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
                    -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
                    -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)]
                );
                
                // Vertical gradient
                const gy = (
                    -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
                    gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)]
                );
                
                result[idx] = Math.sqrt(gx * gx + gy * gy);
            }
        }
        
        return result;
    }
    
    /**
     * Canny edge detection (simplified)
     */
    static canny(imageData, lowThreshold = 20, highThreshold = 50) {
        const edges = this.sobel(imageData);
        const width = imageData.width;
        const height = imageData.height;
        const result = new Uint8ClampedArray(width * height);
        
        // Apply thresholds
        for (let i = 0; i < edges.length; i++) {
            if (edges[i] > highThreshold) {
                result[i] = 255;
            } else if (edges[i] > lowThreshold) {
                result[i] = 128;
            } else {
                result[i] = 0;
            }
        }
        
        // Hysteresis
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                if (result[idx] === 128) {
                    // Check if connected to strong edge
                    let hasStrongNeighbor = false;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (result[(y + dy) * width + (x + dx)] === 255) {
                                hasStrongNeighbor = true;
                                break;
                            }
                        }
                        if (hasStrongNeighbor) break;
                    }
                    
                    result[idx] = hasStrongNeighbor ? 255 : 0;
                }
            }
        }
        
        return result;
    }
}

// ============================================
// PERFORMANCE UTILITIES
// ============================================

class PerformanceUtils {
    /**
     * Measure execution time
     */
    static async measureTime(fn, label = 'Operation') {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
    
    /**
     * Check available memory (approximate)
     */
    static checkMemory() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
    
    /**
     * Debounce function
     */
    static debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle function
     */
    static throttle(fn, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Export classes for use in other files
if (typeof window !== 'undefined') {
    window.ImageUtils = ImageUtils;
    window.ColorUtils = ColorUtils;
    window.MaskUtils = MaskUtils;
    window.EdgeDetection = EdgeDetection;
    window.PerformanceUtils = PerformanceUtils;
}
