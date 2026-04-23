/**
 * Utilidad para comprimir imágenes en el cliente antes de subirlas.
 * Optimizada para no saturar el Storage y ahorrar datos móviles.
 */
export const imageCompressor = {
    /**
     * Comprime una imagen manteniendo el aspecto.
     * @param {File} file - Archivo original de la cámara o galería.
     * @param {number} maxWidth - Ancho máximo (default 1280px).
     * @param {number} quality - Calidad JPEG (0.1 a 1.0).
     * @returns {Promise<Blob>} - Imagen comprimida.
     */
    async compress(file, maxWidth = 1280, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calcular nuevas dimensiones manteniendo aspecto
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width *= maxWidth / height;
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertir a Blob JPEG
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                // Crear un nuevo archivo a partir del blob para mantener el nombre original si se desea
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                resolve(compressedFile);
                            } else {
                                reject(new Error('Fallo al crear Blob de imagen.'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }
};
