// File Utility Functions
class FileUtils {
    /**
     * Download data as file
     */
    static downloadFile(data, filename, type = 'application/json') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Download JSON data
     */
    static downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, filename, 'application/json');
    }

    /**
     * Download canvas as PNG
     */
    static downloadCanvasAsPNG(canvas, filename) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    /**
     * Read file as text
     */
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Read file as data URL
     */
    static readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Validate file type
     */
    static validateFileType(file, allowedTypes) {
        if (!file || !allowedTypes) return false;
        
        return allowedTypes.some(type => {
            if (type.startsWith('.')) {
                return file.name.toLowerCase().endsWith(type.toLowerCase());
            } else {
                return file.type === type;
            }
        });
    }

    /**
     * Validate file size
     */
    static validateFileSize(file, maxSizeInMB) {
        if (!file) return false;
        
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
        return file.size <= maxSizeInBytes;
    }

    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get file extension
     */
    static getFileExtension(filename) {
        if (!filename) return '';
        
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
    }

    /**
     * Get filename without extension
     */
    static getFilenameWithoutExtension(filename) {
        if (!filename) return '';
        
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.slice(0, lastDot) : filename;
    }

    /**
     * Generate unique filename
     */
    static generateUniqueFilename(baseName, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${baseName}_${timestamp}.${extension}`;
    }

    /**
     * Load image from file
     */
    static loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.validateFileType(file, ['image/png', 'image/jpeg', 'image/gif', 'image/webp'])) {
                reject(new Error('Invalid file type. Please select an image file.'));
                return;
            }

            const img = new Image();
            
            img.onload = () => {
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            this.readFileAsDataURL(file).then(dataURL => {
                img.src = dataURL;
            }).catch(reject);
        });
    }

    /**
     * Create file input element
     */
    static createFileInput(accept, multiple = false) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = multiple;
        input.style.display = 'none';
        
        return input;
    }

    /**
     * Open file dialog
     */
    static openFileDialog(accept, multiple = false) {
        return new Promise((resolve) => {
            const input = this.createFileInput(accept, multiple);
            
            input.onchange = (event) => {
                const files = Array.from(event.target.files);
                resolve(multiple ? files : files[0]);
                document.body.removeChild(input);
            };
            
            document.body.appendChild(input);
            input.click();
        });
    }

    /**
     * Save data to localStorage
     */
    static saveToLocalStorage(key, data) {
        try {
            const jsonString = JSON.stringify(data);
            localStorage.setItem(key, jsonString);
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Load data from localStorage
     */
    static loadFromLocalStorage(key) {
        try {
            const jsonString = localStorage.getItem(key);
            return jsonString ? JSON.parse(jsonString) : null;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    }

    /**
     * Remove data from localStorage
     */
    static removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    /**
     * Check localStorage availability
     */
    static isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get localStorage usage
     */
    static getLocalStorageUsage() {
        if (!this.isLocalStorageAvailable()) return null;
        
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        
        return {
            used: total,
            usedFormatted: this.formatFileSize(total),
            // Most browsers limit localStorage to ~5-10MB
            limit: 5 * 1024 * 1024,
            limitFormatted: '5 MB'
        };
    }

    /**
     * Export data with timestamp
     */
    static exportWithTimestamp(data, baseName, extension = 'json') {
        const filename = this.generateUniqueFilename(baseName, extension);
        
        if (extension === 'json') {
            this.downloadJSON(data, filename);
        } else {
            this.downloadFile(data, filename);
        }
        
        return filename;
    }

    /**
     * Batch file operations
     */
    static async processFiles(files, processor) {
        const results = [];
        
        for (const file of files) {
            try {
                const result = await processor(file);
                results.push({ file, result, success: true });
            } catch (error) {
                results.push({ file, error, success: false });
            }
        }
        
        return results;
    }
}

