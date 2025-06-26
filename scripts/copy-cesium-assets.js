const fs = require('fs');
const path = require('path');

/**
 * Recursively copy directory contents
 * Fallback for environments where symlinks don't work (like Vercel)
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    // Copy all contents recursively
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // Copy file
    fs.copyFileSync(src, dest);
  }
}

/**
 * Main function to copy Cesium assets
 */
function copyCesiumAssets() {
  const cesiumSource = path.join(__dirname, '../node_modules/cesium/Build/Cesium');
  const cesiumDest = path.join(__dirname, '../public/cesium');
  
  try {
    // Check if source exists
    if (!fs.existsSync(cesiumSource)) {
      throw new Error(`Cesium source directory not found: ${cesiumSource}`);
    }
    
    console.log('📦 Copying Cesium assets...');
    console.log(`Source: ${cesiumSource}`);
    console.log(`Destination: ${cesiumDest}`);
    
    // Remove existing destination if it exists
    if (fs.existsSync(cesiumDest)) {
      fs.rmSync(cesiumDest, { recursive: true, force: true });
    }
    
    // Copy assets
    copyRecursiveSync(cesiumSource, cesiumDest);
    
    // Verify copy was successful
    const copiedFiles = fs.readdirSync(cesiumDest);
    console.log(`✅ Cesium assets copied successfully (${copiedFiles.length} items)`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to copy Cesium assets:', error.message);
    console.log('🔄 Will attempt to fall back to symlink strategy');
    return false;
  }
}

// Execute if run directly
if (require.main === module) {
  const success = copyCesiumAssets();
  process.exit(success ? 0 : 1);
}

module.exports = { copyCesiumAssets, copyRecursiveSync };