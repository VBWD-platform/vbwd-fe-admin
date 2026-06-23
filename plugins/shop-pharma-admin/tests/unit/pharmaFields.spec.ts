import { describe, it, expect } from 'vitest';
import {
  PRODUCT_CLASSES,
  fieldRelevance,
  visibleFieldsForClass,
  requiredFieldsForClass,
  isPrescriptionRequired,
} from '../../src/pharmaFields';

describe('RequiredFieldsByClass policy (mirror of S101.1 matrix)', () => {
  it('lists the 5 product classes', () => {
    expect(PRODUCT_CLASSES).toEqual([
      'RX',
      'OTC',
      'MEDICAL_DEVICE',
      'FMCG_PERSONAL',
      'FMCG_HOSPITAL',
    ]);
  });

  it('requires the OTC medicine regulated fields (matches backend 400 set)', () => {
    const required = requiredFieldsForClass('OTC');
    expect(required).toEqual(
      expect.arrayContaining([
        'active_substances',
        'strength',
        'pharmaceutical_form',
        'leaflet_url',
      ]),
    );
  });

  it('requires marketing_authorisation_holder for RX but only optional for OTC', () => {
    expect(fieldRelevance('marketing_authorisation_holder', 'RX')).toBe('required');
    expect(fieldRelevance('marketing_authorisation_holder', 'OTC')).toBe('optional');
  });

  it('requires device_marking for MEDICAL_DEVICE and hides medicine substance fields', () => {
    expect(fieldRelevance('device_marking', 'MEDICAL_DEVICE')).toBe('required');
    expect(fieldRelevance('active_substances', 'MEDICAL_DEVICE')).toBe('na');
    expect(visibleFieldsForClass('MEDICAL_DEVICE')).not.toContain('active_substances');
    expect(visibleFieldsForClass('MEDICAL_DEVICE')).toContain('device_marking');
  });

  it('FMCG_PERSONAL has no required regulated fields (commerce + class only)', () => {
    expect(requiredFieldsForClass('FMCG_PERSONAL')).toEqual([]);
  });

  it('drives a different visible-field subset per class', () => {
    const rx = visibleFieldsForClass('RX');
    const device = visibleFieldsForClass('MEDICAL_DEVICE');
    expect(rx).toContain('active_substances');
    expect(rx).not.toContain('device_marking');
    expect(device).toContain('device_marking');
    expect(device).not.toContain('active_substances');
  });

  it('flags RX as prescription-required (blocked online, D2)', () => {
    expect(isPrescriptionRequired('RX')).toBe(true);
    expect(isPrescriptionRequired('OTC')).toBe(false);
  });
});
