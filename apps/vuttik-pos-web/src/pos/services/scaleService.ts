
/**
 * Servicio para comunicación con balanzas mediante Web Serial API.
 * Permite leer el peso de balanzas compatibles que envían datos por puerto serie.
 */
export const ScaleService = {
  isSupported() {
    return 'serial' in navigator;
  },

  async getWeight(): Promise<number> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API no soportada en este navegador.');
    }

    try {
      // Solicitar puerto al usuario
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });

      const decoder = new TextDecoderStream();
      const inputDone = port.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();

      let accumulatedData = '';
      const timeout = setTimeout(() => {
        reader.releaseLock();
      }, 5000); // 5 segundos de espera máximo

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          accumulatedData += value;

          // Muchas balanzas envían el peso seguido de una unidad y un salto de línea (e.g. "  1.25 lb\n")
          // Buscamos un patrón que parezca un número
          const match = accumulatedData.match(/(\d+\.\d+|\d+)/);
          if (match) {
            clearTimeout(timeout);
            await reader.cancel();
            await port.close();
            return parseFloat(match[1]);
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return 0;
    } catch (error) {
      console.error('Error leyendo balanza:', error);
      throw error;
    }
  }
};
