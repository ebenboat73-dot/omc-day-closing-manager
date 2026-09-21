import { PumpId, PUMP_SEQUENCE } from '../../types/report';

export interface SampleMeterPhoto {
  pumpId: PumpId;
  pumpLabel: string;
  expectedReading: number;
  dataUrl: string;
  fileName: string;
}

// Sample expected closing readings based on PRD Appendix A:
// PMS1: 30945.20, PMS2: 29200.00, PMS3: 31420.10, PMS4: 29850.60
// AGO1: 45100.00, AGO2: 52320.50, AGO3: 38900.00, AGO4: 41200.10, AGO5: 39810.00, AGO6: 44150.30
// KERO1: 12450.00, KERO2: 10880.20
export const SAMPLE_CLOSING_READINGS: Record<PumpId, number> = {
  PMS1: 30945.20,
  PMS2: 29200.00,
  PMS3: 31420.10,
  PMS4: 29850.60,
  AGO1: 45100.00,
  AGO2: 52320.50,
  AGO3: 38900.00,
  AGO4: 41200.10,
  AGO5: 39810.00,
  AGO6: 44150.30,
  KERO1: 12450.00,
  KERO2: 10880.20,
};

/**
 * Draws an authentic dispenser meter display on a canvas and exports as data URL
 */
export function generateSyntheticMeterImage(
  pumpId: PumpId,
  reading: number,
  productType: 'PMS' | 'AGO' | 'KERO'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background: Brushed steel / industrial dispenser housing
  const grad = ctx.createLinearGradient(0, 0, 0, 420);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 420);

  // Outer bezel border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 620, 400);

  // Top header plate
  const accentColor =
    productType === 'PMS' ? '#10b981' : productType === 'AGO' ? '#f59e0b' : '#06b6d4';
  ctx.fillStyle = accentColor;
  ctx.fillRect(16, 16, 608, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ONYXMA DISPENSER • ${pumpId} (${productType})`, 36, 49);

  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('DISPENSER TOTALIZER', 600, 46);

  // LCD / LED Digital Meter Window
  const lcdGrad = ctx.createLinearGradient(0, 80, 0, 360);
  lcdGrad.addColorStop(0, '#090d16');
  lcdGrad.addColorStop(1, '#020408');
  ctx.fillStyle = lcdGrad;
  ctx.fillRect(40, 90, 560, 270);

  // LCD Inner border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 90, 560, 270);

  // Glass reflection highlight
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.moveTo(40, 90);
  ctx.lineTo(600, 90);
  ctx.lineTo(500, 220);
  ctx.lineTo(40, 220);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Unit Label
  ctx.fillStyle = '#64748b';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CUMULATIVE VOLUME (LITRES)', 70, 140);

  // Ghost 88888.88 behind for realistic 7-segment digital look
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.font = '700 76px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('888888.88', 570, 240);

  // Active glowing numerical reading
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 12;
  const formattedNumber = reading.toFixed(2);
  ctx.fillText(formattedNumber, 570, 240);
  ctx.shadowBlur = 0; // reset

  // Bottom stats plate
  ctx.fillStyle = '#334155';
  ctx.fillRect(40, 290, 560, 2);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FLOW RATE: 42.5 L/MIN', 70, 330);
  ctx.textAlign = 'right';
  ctx.fillText(`SERIAL: ONX-MTR-${pumpId}-2026`, 570, 330);

  // Return PNG data URL
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function generateAllSamplePhotos(): SampleMeterPhoto[] {
  return PUMP_SEQUENCE.map(({ id, product, name }) => {
    const expected = SAMPLE_CLOSING_READINGS[id];
    return {
      pumpId: id,
      pumpLabel: name,
      expectedReading: expected,
      dataUrl: generateSyntheticMeterImage(id, expected, product),
      fileName: `meter_reading_${id}.jpg`,
    };
  });
}
