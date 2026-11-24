import { describe, expect, it } from 'vitest';
import { collectAddVehicleErrors, formErrorsFromApiValidation } from './validation-errors';

describe('formErrorsFromApiValidation', () => {
  it('maps backend VALIDATION_ERROR to form fields', () => {
    const err = formErrorsFromApiValidation(
      'vehicleNo: Please enter valid Vehicle No.; iopId: Please enter valid IOP ID; chassisNo: String must contain at least 2 character(s)',
    );
    expect(err.vehicleNo).toBe('Vehicle number is invalid');
    expect(err.iopId).toBe('IOP Device ID is invalid');
    expect(err.chassis).toBe('Chassis No. is required');
  });
});

describe('collectAddVehicleErrors (Admin_Bug07)', () => {
  it('flags each invalid add-vehicle field', () => {
    const err = collectAddVehicleErrors({
      vehicleNo: '000000000000000000000000000000',
      iopId: 'sssssssssssssssssjjjjjjjjjjjjjj',
      chassis: '',
      motor: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      controller: 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    });
    expect(err.vehicleNo).toBe('Vehicle number is invalid');
    expect(err.iopId).toBe('IOP Device ID is invalid');
    expect(err.chassis).toBe('Chassis No. is required');
    expect(err.motor).toBe('Motor No. is invalid');
    expect(err.controller).toBe('Controller No. is invalid');
  });
});