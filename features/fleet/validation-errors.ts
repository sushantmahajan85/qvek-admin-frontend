import {
  CHASSIS_NO_ERROR,
  COMPONENT_ID_MAX,
  IOP_ID_ERROR,
  IOP_ID_MAX,
  MOTOR_NO_ERROR,
  VEHICLE_NO_ERROR,
  VEHICLE_NO_MAX,
  iopIdError,
  vehicleIdentifierError,
} from './identifiers';

export const ADD_VEHICLE_FIELD_ERROR = {
  vehicleNo: 'Vehicle number is invalid',
  iopId: 'IOP Device ID is invalid',
  chassisRequired: 'Chassis No. is required',
  chassisInvalid: 'Chassis No. is invalid',
  motor: 'Motor No. is invalid',
  controller: 'Controller No. is invalid',
} as const;

const API_PATH_TO_FORM: Record<string, keyof typeof ADD_VEHICLE_FIELD_ERROR | 'chassis'> = {
  vehicleNo: 'vehicleNo',
  iopId: 'iopId',
  chassisNo: 'chassis',
  motorNo: 'motor',
  controllerNo: 'controller',
};

/** Maps backend `VALIDATION_ERROR` message (`field: msg; …`) to Add vehicle form keys. */
export function formErrorsFromApiValidation(message: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of message.split(';')) {
    const bit = part.trim();
    if (!bit) continue;
    const colon = bit.indexOf(':');
    if (colon < 1) continue;
    const path = bit.slice(0, colon).trim().split('.').pop() ?? '';
    const formKey = API_PATH_TO_FORM[path];
    if (!formKey || out[formKey]) continue;
    if (formKey === 'chassis') {
      const detail = bit.slice(colon + 1).toLowerCase();
      out.chassis =
        detail.includes('too small') || detail.includes('required') || detail.includes('string must contain')
          ? ADD_VEHICLE_FIELD_ERROR.chassisRequired
          : ADD_VEHICLE_FIELD_ERROR.chassisInvalid;
    } else {
      out[formKey] = ADD_VEHICLE_FIELD_ERROR[formKey];
    }
  }
  return out;
}

export type AddVehicleFormField = 'vehicleNo' | 'iopId' | 'chassis' | 'motor' | 'controller';

export function addVehicleFieldError(field: AddVehicleFormField, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case 'vehicleNo':
      if (!v || vehicleIdentifierError(v, 2, false, VEHICLE_NO_MAX, VEHICLE_NO_ERROR)) {
        return ADD_VEHICLE_FIELD_ERROR.vehicleNo;
      }
      return null;
    case 'iopId':
      if (!v || iopIdError(v)) return ADD_VEHICLE_FIELD_ERROR.iopId;
      return null;
    case 'chassis':
      if (!v) return ADD_VEHICLE_FIELD_ERROR.chassisRequired;
      if (vehicleIdentifierError(v, 2, false, COMPONENT_ID_MAX, CHASSIS_NO_ERROR)) {
        return ADD_VEHICLE_FIELD_ERROR.chassisInvalid;
      }
      return null;
    case 'motor':
      if (!v || vehicleIdentifierError(v, 1, false, COMPONENT_ID_MAX, MOTOR_NO_ERROR)) {
        return ADD_VEHICLE_FIELD_ERROR.motor;
      }
      return null;
    case 'controller':
      if (!v || vehicleIdentifierError(v, 1, false, COMPONENT_ID_MAX, MOTOR_NO_ERROR)) {
        return ADD_VEHICLE_FIELD_ERROR.controller;
      }
      return null;
    default:
      return null;
  }
}

export function collectAddVehicleErrors(fields: {
  vehicleNo: string;
  iopId: string;
  chassis: string;
  motor: string;
  controller: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  (['vehicleNo', 'iopId', 'chassis', 'motor', 'controller'] as const).forEach((key) => {
    const msg = addVehicleFieldError(key, fields[key]);
    if (msg) e[key] = msg;
  });
  return e;
}